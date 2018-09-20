import DocumentAPI from '../api/DocumentAPI';
import CollectionUtil from '../util/CollectionUtil';
import IDUtil from '../util/IDUtil';

const AnnotationUtil = {

	/*************************************************************************************
	 --------------------------  FILTER TARGETS FROM ANNOTATIONS -------------------------
	*************************************************************************************/

	//extracts all contained targets/resources into a list for the bookmark-centric view
	//TODO add the parentAnnotationId, so the UI knows how to do CRUD
	//TODO get the client ID + user ID!!
	generateBookmarkCentricList(annotations, callback) {
		let resourceList = [];
		annotations.forEach((na, index) => {
			let targets = na.target;
			if(na.target.selector) {
				targets = [na.target]; //there is only a single target
			}

			resourceList = resourceList.concat(targets.map((t) => {
				const resourceInfo = AnnotationUtil.getStructuralElementFromSelector(t.selector, 'Resource')
				const collectionInfo = AnnotationUtil.getStructuralElementFromSelector(t.selector, 'Collection')

				return {
					id : IDUtil.guid(), // unique bookmark id

					resourceId: resourceInfo ? resourceInfo.id : t.source, //needed for deleting, displaying, selecting, merging

					annotationIds: [na.id], //needed for deleting

					// general object (document,fragment,entity) data
					object: {

						// unique object id
						id: resourceInfo ? resourceInfo.id : null,

						// object type: "Resource","MediaObject","Segment"
						type: t.type,

						// short object title
						title: na.id,

						// description, need to fetch
						description: '',

						// (Creation) date of the object (nice to have)
						date: "NEED TO FETCH (DEPENDS ON RESOURCE)",
						dateField: "NEED TO FETCH (DEPENDS ON RESOURCE)",


						// dataset the object originates from
						dataset: collectionInfo ? collectionInfo.id : null,

						// placeholder image
						placeholderImage: "/static/images/placeholder.2b77091b.svg",

						// media types
						mediaTypes: [],
					},

					// Bookmark created
					created: na.created,

					// sort position
					sort: index,

					// list of annotations
					annotations: na.body ? na.body.filter(a => {
						return a.vocabulary != 'clariahwp5-bookmark-group'
					}) : [],

					// bookmark groups
					groups: na.body ? na.body.filter(a => {
						return a.vocabulary == 'clariahwp5-bookmark-group'
					}) : [],

					// Selector details: required for segment information
					selector: na.target.selector
				}
			}))
		});


		// Merge bookmarks and annotations for same resources
		// If only an annotation is available without the resource being bookmarked,
		// offer a fallback, and create this bookmarked resource
		const uniqueList={};

		// move resources to top
		resourceList.sort((a,b)=>(a.object.type == 'Resource' ? -1 : 1));

		resourceList.forEach((b)=>{

			// save information about the annotation origin
			b.annotations = b.annotations ?
				// augment annotations
				b.annotations.map((a)=>(Object.assign({},a,{
					parentAnnotationId: b.annotationId //TODO this does not exist? BAD CODE
				}))) :
				// empty annotation, required for deleting
				[{
					parentAnnotationId: b.annotationId
				}];


			// prepare the bookmark object and add it to the uniquelist
			if (b.resourceId in uniqueList) {
				// existing

				// Add to unique list, based on type
				switch(b.object.type){
					case 'Segment':
						// add to the segment list
						uniqueList[b.resourceId].segments = uniqueList[b.resourceId].segments.concat(b);
					break;
					default:
						// just combine the bookmarks
						uniqueList[b.resourceId].groups = uniqueList[b.resourceId].groups.concat(b.groups);
						uniqueList[b.resourceId].annotations = uniqueList[b.resourceId].annotations.concat(b.annotations);
						uniqueList[b.resourceId].annotationIds = uniqueList[b.resourceId].annotationIds.concat(b.annotationIds);
				}
			} else {
				// new

				if (b.object.type === 'Segment'){

						// Create a new resourceobject for the segment
						const segment = Object.assign({},b,{
							object: Object.assign({},b.object),
							annotations: b.annotations.slice(),
						})
						// add the the segment to the resource
						b.segments = [segment];

						// clear the annotations
						b.annotations = [];
				} else{
					// create the segments placeholder
					b.segments = [];
				}

				// always make the main bookmark a resource
				b.object.type = "Resource";
				uniqueList[b.resourceId] = b;
			}
		});

		resourceList = Object.keys(uniqueList).map((key)=>(uniqueList[key]));

		if(callback){
			if (resourceList.length > 0) {
				return AnnotationUtil.reconsileResourceList(resourceList, callback)
			} else{
				callback([]);
			}
			}
		return resourceList;
	},

	//TODO do a mget to fetch all the resource data from the search API.
	reconsileResourceList(resourceList, callback) {
		const temp = resourceList.map((na) => {
			return {
				resourceId : na.object.id,
				collectionId : na.object.dataset
			}
		})
		const resourceIds = temp.reduce((acc, cur) => {
			//the first accumulator is the same as the current object...|
			if(acc.resourceId) {
				const temp = {}
				temp[acc.collectionId] = [acc.resourceId];
				acc = temp;
			} else {
				//only add a resource one time for the search API to fetch
				if(acc[cur.collectionId]) {
					if(acc[cur.collectionId].indexOf(cur.resourceId) == -1) {
						acc[cur.collectionId].push(cur.resourceId)
					}
				} else {
					acc[cur.collectionId] = [cur.resourceId]
				}
			}
			return acc
		}, temp[0]); //initial value needed in case of one element!

		//now loop through the clustered (by collectionId) resourceIdLists and call the document API
		const accumulatedData = {}
		Object.keys(resourceIds).forEach((key) => {
			//console.debug('KEY: ' + key)
			DocumentAPI.getItemDetailsMultiple(
				key, //collectionId
				resourceIds[key], //all resourceIds for this collection
				(collectionId, idList, resourceData) => {
					//reconsile and callback the "client"
					//TODO get the client ID + user ID!!
					const configClass = CollectionUtil.getCollectionClass(null, null, collectionId, true);
					const collectionConfig = new configClass(collectionId);
					const mappedResourceData = resourceData  && !resourceData.error ? resourceData.map((doc) => {
						return doc.found ? collectionConfig.getItemDetailData(doc) : null;
					}) : [];

					accumulatedData[collectionId] = mappedResourceData;
					if(Object.keys(resourceIds).length == Object.keys(accumulatedData).length) {
						callback(AnnotationUtil.reconsileAll(resourceList, accumulatedData));
					}
				}
			)
		});

	},

	reconsileAll(resourceList, resourceData) {
		resourceList.forEach((x) => {
			const temp = resourceData[x.object.dataset].filter((doc) => {
				return doc && doc.resourceId == x.object.id
			});
			x.object.title = 'Resource not found';
			x.object.date = 'N/A';
			if(temp.length == 1) {
				x.object.title = temp[0].title;
				x.object.date = temp[0].date;
				x.object.dateField = temp[0].dateField;
				x.object.description = temp[0].description;
				x.object.mediaTypes=temp[0].mediaTypes || [];

				if (temp[0].placeholderImage){
					x.object.placeholderImage = temp[0].placeholderImage;
				}

				if(temp[0].posterURL) {
					x.object.placeholderImage = temp[0].posterURL
				}
			}
		})
		return resourceList
	},

	//extracts all contained annotations into a list for the annotation-centric view
	//TODO update this so each body is an item. Use parentAnnotationId to refer to the parent
	generateAnnotationCentricList(annotations, type, callback) {
		// check for empty: can't reduce an empty array
		if (annotations.length === 0){
			return [];
		}

		// -----------------------------------------------
		// Create list of annotations with bookmarks
		// -----------------------------------------------
		annotations = annotations.filter(an => an.body).map((an) => {

			//create a list of bookmarks from the parent annotation's targets
			let targets = an.target;
			if(an.target.selector) {
				targets = [an.target]
			}
			const bookmarks = targets.map((t) => {
				const resourceInfo = AnnotationUtil.getStructuralElementFromSelector(t.selector, 'Resource')
				const collectionInfo = AnnotationUtil.getStructuralElementFromSelector(t.selector, 'Collection')
				return {
					collectionId : collectionInfo ? collectionInfo.id : null,
					type : t.type,
					title : resourceInfo ? resourceInfo.id : null,
					resourceId : resourceInfo ? resourceInfo.id : null,
					groups: [], // populated later, for filtering
					classifications: [], // populated later, for filtering

					// also build the document object, so it can be preview in the annotation list
					// and be used for filtering
					object:{
						id: resourceInfo ? resourceInfo.id : null,
						dataset : collectionInfo ? collectionInfo.id : null,
					},

				}
			})

			//assign the targets as a list of bookmarks to each body/annotation
			an.body.forEach((b) => {
				b.bookmarks = bookmarks;
				b.parentAnnotationId = an.id;
			});

			//assign the parent annotation ID to this (sub)annotation
			return an.body
		}).reduce((acc, cur) => { //concat all annotation bodies into a single array
			return acc.concat(cur);
		},[]);

		// -----------------------------------------------
		// Store bookmark groups and classifications to the objects
		// -----------------------------------------------

		const objectAnnotations = {};

		// Store classification and group data for each bookmark.
		// After filtering and merging the annotations, the data will be merged
		annotations.forEach((a)=>{
			if (a.annotationType === 'classification'){

					a.bookmarks.forEach((b)=>{
						const id = b.collectionId + b.resourceId;
						if (!(id in objectAnnotations)){
							objectAnnotations[id] = {
								groups: [],
								classifications: [],
							}
						}
						switch(a.vocabulary){
						case 'clariahwp5-bookmark-group':
							objectAnnotations[id].groups.push(a);
						break;
						default:
							objectAnnotations[id].classifications.push(a);
						}
			});
			}
		});

		// -----------------------------------------------
		// Filter annotations on selected type
		// -----------------------------------------------

		annotations = annotations.filter((a)=>(
				a.annotationType === type
				// and exclude bookmark groups
				&& (type !== 'classification' || a.vocabulary !== 'clariahwp5-bookmark-group')
		));


		const uniqAnnotations = {};
		const newAnnotations = [];
		let id;

		// -----------------------------------------------
		// Merge equal annotations (classifications, links)
		// -----------------------------------------------
		switch (type){
			case 'classification':{
					// merge classifications with same id
					annotations.forEach((a)=>{
						if (a.id in uniqAnnotations){
							uniqAnnotations[a.id].bookmarks = uniqAnnotations[a.id].bookmarks.concat(a.bookmarks);
						} else{
							uniqAnnotations[a.id] = a;
							newAnnotations.push(a);
						}
					});
					annotations = newAnnotations;
				}
			break;
			case 'link':{
					// merge links with same url
					annotations.forEach((a)=>{
						if (a.url in uniqAnnotations){
							uniqAnnotations[a.url].bookmarks = uniqAnnotations[a.url].bookmarks.concat(a.bookmarks);
						} else{
							uniqAnnotations[a.url] = a;
							newAnnotations.push(a);
						}
					});
					annotations = newAnnotations;
				}
			break;
		}


		// -----------------------------------------------
		// Apply the groups/classifications data to the bookmarks in the annotations list
		// -----------------------------------------------
		annotations.forEach((a)=>{
			a.bookmarks.forEach((b)=>{
				const id = b.collectionId + b.resourceId;
				if (id in objectAnnotations){
					b.groups = objectAnnotations[id].groups;
					b.classifications = objectAnnotations[id].classifications;
				}
			});
		});

		const count = 0;
		const bookmarkCount = 0;


		// -----------------------------------------------
		// Handle empty results
		// -----------------------------------------------
				// if no results are available, call the callback function
		if (annotations.length === 0){
			callback(annotations);
			return;
		}

		// -----------------------------------------------
		// Add object data to annotation bookmarks
		// -----------------------------------------------
		const bookmarks = [];
		const hits = {};

		annotations.forEach((a)=>{
			a.bookmarks.forEach((b)=>{
				const id = b.collectionId + b.resourceId;
				if (!(id in hits)){
					hits[id] = true;
					bookmarks.push(b);
				}
			})
		});

		// retrieve bookmark data
		// The objects in the annotations array are the same objects that have been enriched with the document data;
		// we don't have to store/merge any data; just run reconsileResourcelist callback
		AnnotationUtil.reconsileResourceList(bookmarks, ()=>{
			callback(annotations);
		});

	},

	//the Collection & Resource should always be part of the annotation target
	getStructuralElementFromSelector(selector, resourceType) {
		const tmp = selector.value.filter(rt => rt.type == resourceType);
		return tmp.length > 0 ? tmp[0] : null;
	},

	/*************************************************************************************
	 --------------------------- W3C BUSINESS LOGIC HERE ---------------------------------
	*************************************************************************************/

	//get the index of the segment within a list of annotations of a certain target
	getSegmentIndex(annotations, annotation) {
		if(annotations && annotation) {
			let i = 0;
			for(const a of annotations) {
				if(a.target.selector.refinedBy) {
					if(a.id == annotation.id) {
						return i;
					}
					i++;
				}
			}
		}
		return -1;
	},

	//get the nth segment within a list of annotations of a certain target
	getSegment(annotations, index) {
		if(annotations) {
			index = index < 0 ? 0 : index;
			let i = 0;
			for(const a of annotations) {
				if(a.target.selector.refinedBy) {
					if(i == index) {
						return a;
					}
					i++;
				}
			}
		}
		return null;
	},

	//TODO test na lunch
	toUpdatedAnnotation(user, project, collectionId, resourceId, mediaObject, segmentParams, annotation) {
		if(!annotation) {
			annotation = AnnotationUtil.generateW3CEmptyAnnotation(
				user,
				project,
				collectionId,
				resourceId,
				mediaObject,
				segmentParams
			);
		} else if(segmentParams) {
			if(annotation.target.selector.refinedBy) {
				annotation.target.selector.refinedBy.start = segmentParams.start;
				annotation.target.selector.refinedBy.end = segmentParams.end;
			} else {
				console.debug('should not be here');
			}
		}
		return annotation;
	},

	//MAJOR TODO: DETERMINE WHERE TO SET THE TIDY MEDIA OBJECT URL!
	removeSourceUrlParams(url) {
		if(url.indexOf('?') != -1 && url.indexOf('cgi?') == -1) {
			return url.substring(0, url.indexOf('?'));
		}
		return url
	},

	//currently only used for bookmarking lots of resources
	generateEmptyW3CMultiTargetAnnotation : function(user, project, collectionId, resourceIds, motivation='bookmarking') {
		const annotation = {
			id : null,
			user : user.id,
			project : project ? project.id : null, //no suitable field found in W3C so far
			motivation : motivation,
			target : resourceIds.map((rid) => AnnotationUtil.generateSimpleResourceTarget(rid, collectionId)),
			body : null
		}
		return annotation
	},

	generateSimpleResourceTarget(resourceId, collectionId) {
		return {
			type : 'Resource',
			source : resourceId,
			selector : {
				type: 'NestedPIDSelector',
				value: [
					{
						id: collectionId,
						type: ['Collection'],
						property: 'isPartOf'
					},
					{
						id: resourceId,
						type: ['Resource'],
						property: 'isPartOf'
					}
				]
			}
		}
	},

	//called from components that want to create a new annotation with a proper target
	generateW3CEmptyAnnotation : function(user, project, collectionId, resourceId, mediaObject = null, segmentParams = null) {
		let annotation = null;
		//only try to extract/append the spatio-temporal parameters from the params if there is a mimeType
		if(mediaObject && mediaObject.mimeType) {
			let selector = null; //when selecting a piece of the target
			let mediaType = null;
			if(mediaObject.mimeType.indexOf('video') != -1) {
				mediaType = 'Video';
				if(segmentParams && segmentParams.start && segmentParams.end &&
					segmentParams.start != -1 && segmentParams.end != -1) {
					selector = {
						type: "FragmentSelector",
						conformsTo: "http://www.w3.org/TR/media-frags/",
						value: '#t=' + segmentParams.start + ',' + segmentParams.end,
						start: segmentParams.start,
						end: segmentParams.end
	    			}
				}
			} else if(mediaObject.mimeType.indexOf('audio') != -1) {
				mediaType = 'Audio';
				if(segmentParams && segmentParams.start && segmentParams.end &&
					segmentParams.start != -1 && segmentParams.end != -1) {
					selector = {
						type: "FragmentSelector",
						conformsTo: "http://www.w3.org/TR/media-frags/",
						value: '#t=' + segmentParams.start + ',' + segmentParams.end,
						start: segmentParams.start,
						end: segmentParams.end
	    			}
				}
			} else if(mediaObject.mimeType.indexOf('image') != -1) {
				mediaType = 'Image';
				if(segmentParams && segmentParams.rect) {
					selector = {
						type: "FragmentSelector",
						conformsTo: "http://www.w3.org/TR/media-frags/",
						value: '#xywh=' + segmentParams.rect.x + ',' + segmentParams.rect.y + ',' + segmentParams.rect.w + ',' + segmentParams.rect.h,
						rect : segmentParams.rect
	    			}
				}
			}

			//this is basically the OLD target. It will be transformed using generateTarget
			const target = {
				//FIXME the source params can be important for resolving the URL! In some cases however not.
				//Think of something to tackle this!
				source: AnnotationUtil.removeSourceUrlParams(mediaObject.url), //TODO It should be a PID!
				assetId: mediaObject.assetId || mediaobject.url.substring(target.source.lastIndexOf('/') + 1),
				selector: selector,
				type: mediaType
			}
			annotation = {
				id : null,
				user : user.id, //TODO like the selector, generate the w3c stuff here?
				project : project ? project.id : null, //no suitable field found in W3C so far
				target : AnnotationUtil.generateTarget(collectionId, resourceId, target),
				body : null

			}
		} else {
			annotation = {
				id : null,
				user : user.id,
				project : project ? project.id : null, //no suitable field found in W3C so far
				target : {
					type : 'Resource',
					source : resourceId,
					selector : {
						type: 'NestedPIDSelector',
						value: [
							{
								id: collectionId,
								type: ['Collection'],
								property: 'isPartOf'
							},
							{
								id: resourceId,
								type: ['Resource'],
								property: 'isPartOf'
							}
						]
					}
				},
				body : null
			}
		}
		return annotation
	},

	//TODO make this suitable for resource annotations too (now it's currently only for mediaobject annotations)
	generateTarget : function(collectionId, resourceId, target) {
		let targetType = 'MediaObject';
		const selector = {
			type: 'NestedPIDSelector',
			value: [
				{
					id: collectionId,
					type: ['Collection'],
					property: 'isPartOf'
				}
			]
		}
		if (target.selector) {
			selector['refinedBy'] = target.selector
			targetType = 'Segment'
		}

		if (resourceId){
			selector.value.push({
				id: resourceId,
				type: ['Resource'],
				property: 'isPartOf'
			})
			//check if it's a segment or not
			const representationTypes = ['Representation', 'MediaObject', target.type]
			if (target.selector) {
				representationTypes.push('Segment')
			}
			selector.value.push({
				id: target.assetId,
				type: representationTypes,
				property: 'isRepresentation'
			})
		}

		return {
			type : targetType,
			source : target.source,
			assetId: target.assetId,
			selector : selector
		}
	},

	/*************************************************************************************
	 ************************************* W3C MEDIA FRAGMENTS HELPERS ***************
	*************************************************************************************/

	extractAnnotationTargetDetails : function(annotation) {
		let frag = AnnotationUtil.extractTemporalFragmentFromAnnotation(annotation);
		const assetId = AnnotationUtil.extractAssetIdFromTargetSource(annotation);
		if(frag) {
			return { type : 'temporal', frag : frag, assetId : assetId }
		} else {
			frag = AnnotationUtil.extractSpatialFragmentFromAnnotation(annotation);
			if(frag) {
				return { type : 'spatial', frag : frag, assetId : assetId}
			}
		}
		return {type : 'object', frag : null, assetId : assetId}
	},

	extractAssetIdFromTargetSource : function(annotation) {
		if(annotation && annotation.target && annotation.target.source) {
			if(annotation.target.source.indexOf('/') != -1) {
				return annotation.target.source.substring(annotation.target.source.lastIndexOf('/') + 1);
			}
		}
		return null;
	},

	extractTemporalFragmentFromAnnotation : function(annotation) {
		if(annotation && annotation.target && annotation.target.selector
			&& annotation.target.selector.refinedBy && annotation.target.selector.refinedBy.start) {
			return {
				start : annotation.target.selector.refinedBy.start,
				end : annotation.target.selector.refinedBy.end
			}
		}
		return null;
	},

	extractSpatialFragmentFromAnnotation : function(annotation) {
		if(annotation && annotation.target && annotation.target.selector && annotation.target.selector.refinedBy) {
			return {
				x: annotation.target.selector.refinedBy.x,
				y: annotation.target.selector.refinedBy.y,
				w: annotation.target.selector.refinedBy.w,
				h: annotation.target.selector.refinedBy.h
			}
		}
		return null;
	},

	extractTemporalFragmentFromURI : function(uri) {
		const i = uri.indexOf('#t=');
		if(i != -1) {
			const arr = uri.substring(i + 3).split(',');
			return {
				start : parseFloat(arr[0]),
				end : parseFloat(arr[1])
			}
		}
		return null;
	},

	extractSpatialFragmentFromURI : function(uri) {
		const i = uri.indexOf('#xywh=');
		if(i != -1) {
			const arr = uri.substring(i + 6).split(',');
			return {
				x : arr[0],
				y : arr[1],
				w : arr[2],
				h : arr[3]
			}
		}
		return null;
	},


	/*************************************************************************************
	 *********************EXTRACT STUFF FROM CONTAINED ANNOTATION CARDS ******************
	*************************************************************************************/

	extractAnnotationCardTitle : function(annotation) {
		if(annotation && annotation.body) {
			const cards = annotation.body.filter((a) => {
				return a.annotationType === 'metadata'
			});
			if(cards.length > 0) {
				const title = cards[0].properties.filter((p) => {
					return p.key == 'title' || p.key == 'titel';
				});
				return title.length > 0 ? title[0].value : null;
			}
		}
		return null;
	},

	/*************************************************************************************
	 ************************************* URL VALIDATION ****************************
	*************************************************************************************/

	isValidURL(url) {
		const urlPattern =/^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i;
		return urlPattern.test(url);
	}

}

export default AnnotationUtil;