import SearchAPI from '../api/SearchAPI';
import CollectionUtil from '../util/CollectionUtil';

const AnnotationUtil = {

	/*************************************************************************************
	 --------------------------  FILTER TARGETS FROM ANNOTATIONS -------------------------
	*************************************************************************************/

	//extracts all contained targets/resources into a list for the bookmark-centric view
	nestedAnnotationListToResourceList(annotations, callback) {
		const resourceList = annotations.map((na, index) => {
			const resourceInfo = AnnotationUtil.getStructuralElementFromSelector(na.target.selector, 'Resource')
			const collectionInfo = AnnotationUtil.getStructuralElementFromSelector(na.target.selector, 'Collection')
			//console.debug(resourceInfo, collectionInfo)
			return {
				// unique bookmark id, used for referencing
				id: na.id,

				// general object (document,fragment,entity) data
				object: {

					// unique object id
					id: resourceInfo ? resourceInfo.id : null,

					// object type: "Video", Video-Fragment", "Image", "Audio", "Entity", ...
					type: na.target.type,

					// short object title
					title: na.id,

					// (Creation) date of the object (nice to have)
					date: "NEED TO FETCH (DEPENDS ON RESOURCE)",

					// dataset the object originates from
					dataset: collectionInfo ? collectionInfo.id : null,

					// placeholder image if available
					placeholderImage: "http://localhost:5304/static/images/placeholder.2b77091b.svg"

				},

				// Bookmark created
				created: na.created,

				// sort position
				sort: index,

				// optional list of annotations here
				// (could also be requested in separate calls)
				annotations: na.body,
			}
		});
		if(callback && resourceList.length > 0) {
			return AnnotationUtil.reconsileResourceList(resourceList, callback)
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
			//the first accumulator is the same as the current object...
			if(acc.resourceId) {
				let temp = {}
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

		//now loop through the clustered (by collectionId) resourceIdLists and call the searchAPI
		const accumulatedData = {}
		Object.keys(resourceIds).forEach((key) => {
			SearchAPI.getItemDetailsMultiple(
				key, //collectionId
				resourceIds[key], //all resourceIds for this collection
				(collectionId, idList, resourceData) => {
					//reconsile and callback the "client"
					const configClass = CollectionUtil.getCollectionClass(collectionId, true);
					const collectionConfig = new configClass(collectionId);
					console.debug(resourceData);
					const mappedResourceData = resourceData.map((doc) => {
						return doc.found ? collectionConfig.getItemDetailData(doc) : null;
					})

					accumulatedData[collectionId] = mappedResourceData;
					if(Object.keys(resourceIds).length == Object.keys(accumulatedData).length) {
						callback(AnnotationUtil.reconsileAll(resourceList, accumulatedData));
					}
				}
			)
		});
		//TODO merge bookmarks that target the same resource!
	},

	//TODO FINISH THIS AND WE'RE ALL DONE!
	reconsileAll(resourceList, resourceData) {
		resourceList.forEach((x) => {
			let temp = resourceData[x.object.dataset].filter((doc) => {
				return doc && doc.resourceId == x.object.id
			});
			x.object.title = 'Resource not found';
			x.object.date = 'N/A';
			if(temp.length == 1) {
				x.object.title = temp[0].title;
				x.object.date = temp[0].date;
				if(temp[0].posterURL) {
					x.object.placeholderImage = temp[0].posterURL
				}
			}
		})
		return resourceList
	},

	//extracts all contained annotations into a list for the annotation-centric view
	nestedAnnotationListToAnnotationList(annotations) {

		// check for empty: can't reduce an empty array
		if (annotations.length === 0){
			return [];
		}

		return annotations.filter(an => an.body).map((an) => {
			// store bookmark to the annotation for later use
			an.body.forEach((b)=>{b.bookmarkAnnotation = an});
			return an.body
		}).reduce((acc, cur) => {
			return acc.concat(cur);
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
		if(url.indexOf('?') != -1) {
			return url.substring(0, url.indexOf('?'));
		}
		return url
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
			let target = {
				source: AnnotationUtil.removeSourceUrlParams(mediaObject.url), //TODO It should be a PID!
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
		let selector = {
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
				id: target.source.substring(target.source.lastIndexOf('/') + 1),
				type: representationTypes,
				property: 'isRepresentation'
			})
		}

		return {
			type : targetType,
			source : target.source,
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