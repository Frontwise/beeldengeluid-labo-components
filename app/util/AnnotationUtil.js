import DocumentAPI from '../api/DocumentAPI';
import CollectionUtil from '../util/CollectionUtil';
import IDUtil from '../util/IDUtil';

const AnnotationUtil = {

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

	removeSourceUrlParams(url) {
		if(url.indexOf('?') != -1 && url.indexOf('cgi?') == -1) {
			return url.substring(0, url.indexOf('?'));
		}
		return url
	},

	//called from components that want to create a new annotation with a proper target
	generateW3CEmptyAnnotation : function(user, project, collectionId, resourceId, mediaObject = null, segmentParams = null) {
		//Resource or MediaObject annotations ALL start with this as part of the target
		let resourceTarget = AnnotationUtil.__generateResourceLevelTarget(collectionId, resourceId);
		let refinedTarget = null;
		//ALL THESE ARE MANDATORY TO BE ABLE TO PROPERLY ANNOTATE A MEDIA OBJECT!
		//TODO DELETE/UPDATE NON-COMPATIBLE ANNOTATIONS
		console.debug(mediaObject)
		console.debug(segmentParams)
		if(mediaObject && mediaObject.mimeType && mediaObject.assetId) {
			let refinedBy = null; //when selecting a piece of the target
			let mediaType = null;
			if(mediaObject.mimeType.indexOf('video') != -1) {
				mediaType = 'Video';
				refinedBy = AnnotationUtil.__generateSegmentSelector(segmentParams, 'temporal')
			} else if(mediaObject.mimeType.indexOf('audio') != -1) {
				mediaType = 'Audio';
				refinedBy = AnnotationUtil.__generateSegmentSelector(segmentParams, 'temporal')
			} else if(mediaObject.mimeType.indexOf('image') != -1) {
				mediaType = 'Image';
				refinedBy = AnnotationUtil.__generateSegmentSelector(segmentParams, 'spatial')
			}
			refinedTarget = AnnotationUtil.__generateMediaObjectTarget(
				resourceTarget,
				refinedBy,
				mediaType,
				mediaObject.assetId
			)
		}

		return {
			id : null,
			user : user.id,
			project : project ? project.id : null, //no suitable field found in W3C so far
			body : null,
			target : refinedTarget ? refinedTarget : resourceTarget
		}
	},

	//currently only used for bookmarking lots of resources
	generateEmptyW3CMultiTargetAnnotation : function(user, project, collectionId, resourceIds, motivation='bookmarking') {
		const annotation = {
			id : null,
			user : user.id,
			project : project ? project.id : null, //no suitable field found in W3C so far
			motivation : motivation,
			target : resourceIds.map((rid) => AnnotationUtil.__generateResourceLevelTarget(collectionId, rid)),
			body : null
		}
		return annotation
	},

	__generateResourceLevelTarget(collectionId, resourceId) {
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

	__generateSegmentSelector : function(params, segmentType) {
		if(!params) {
			return null
		}

		if(segmentType == 'temporal') {
			if(params.start && params.end &&
				params.start != -1 && params.end != -1) {
				return {
					type: "FragmentSelector",
					conformsTo: "http://www.w3.org/TR/media-frags/",
					value: '#t=' + params.start + ',' + params.end,
					start: params.start,
					end: params.end
    			}
			}
		} else if(segmentType == 'spatial') {
			if(params.rect && typeof(params.rect) == 'object') {
				return {
					type: "FragmentSelector",
					conformsTo: "http://www.w3.org/TR/media-frags/",
					value: '#xywh=' + params.rect.x + ',' + params.rect.y + ',' + params.rect.w + ',' + params.rect.h,
					rect : params.rect
    			}
			}
		}
		return null
	},

	//TODO make this suitable for resource annotations too (now it's currently only for mediaobject annotations)
	__generateMediaObjectTarget : function(basicTarget, refinedBy, mediaType, assetId) {
		let targetType = 'MediaObject';
		if (refinedBy) {
			basicTarget.selector.refinedBy = refinedBy
			targetType = 'Segment'
		}

		const representationTypes = ['Representation', 'MediaObject', mediaType]
		if (refinedBy) {
			representationTypes.push('Segment')
		}
		basicTarget.selector.value.push({
			id: assetId,
			type: representationTypes,
			property: 'isRepresentation'
		})

		basicTarget.type = targetType;
		basicTarget.source = assetId;
		return basicTarget
	},

	/*************************************************************************************
	 ************************************* W3C MEDIA FRAGMENTS HELPERS ***************
	*************************************************************************************/

	extractAnnotationTargetDetails : function(annotation) {
		//check if there is a temporal fragment in the annotation target
		let frag = AnnotationUtil.extractTemporalFragmentFromAnnotation(annotation.target);
		if(frag) {
			return { type : 'temporal', frag : frag, assetId : annotation.target.source }
		} else { //then see if there is a spatial fragment
			frag = AnnotationUtil.extractSpatialFragmentFromAnnotation(annotation);
			if(frag) {
				return { type : 'spatial', frag : frag, assetId : annotation.target.source}
			}
		}
		return {type : 'object', frag : null, assetId : annotation.target.source}
	},

	extractTemporalFragmentFromAnnotation : function(target) {
		if(target && target.selector && target.selector.refinedBy && target.selector.refinedBy.start) {
			return {
				start : target.selector.refinedBy.start,
				end : target.selector.refinedBy.end
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