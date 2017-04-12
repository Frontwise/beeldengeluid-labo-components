const AnnotationUtil = {


	/*************************************************************************************
	 ************************************* W3C BUSINESS LOGIC HERE ********************
	*************************************************************************************/

	//get the index of the segment within a list of annotations of a certain target
	getSegmentIndex(annotations, annotation) {
		if(annotations && annotation) {
			let i = 0;
			for(let a of annotations) {
				if(a.target.selector) {
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
			for(let a of annotations) {
				if(a.target.selector) {
					if(i == index) {
						return a;
					}
					i++;
				}

			}
		}
		return null;
	},

	toUpdatedAnnotation(annotation, user, mediaObject, start, end) {
		if(!annotation) {
			let params = null;
			if(start && end) {
				params = {start : start, end : end}
			}
			annotation = AnnotationUtil.generateW3CEmptyAnnotation(
				user,
				mediaObject.url,
				mediaObject.mimeType,
				params
			);
		} else if(start && end) {
			if(annotation.target.selector) {
				annotation.target.selector.start = start;
				annotation.target.selector.end = end;
			} else {
				console.debug('should not be here');
			}
		}
		return annotation;
	},

	//called from components that want to create a new annotation with a proper target
	generateW3CEmptyAnnotation : function(user, source, mimeType, params) {
		if(!source) {
			return null;
		}
		let selector = null; //when selecting a piece of the target
		let targetType = null;

		//only try to extract/append the spatio-temporal parameters from the params if there is a mimeType
		if(mimeType) {
			if(mimeType.indexOf('video') != -1) {
				targetType = 'Video';
				if(params && params.start && params.end && params.start != -1 && params.end != -1) {
					selector = {
						type: "FragmentSelector",
						conformsTo: "http://www.w3.org/TR/media-frags/",
						value: '#t=' + params.start + ',' + params.end,
						start: params.start,
						end: params.end
	    			}
				}
			} else if(mimeType.indexOf('audio') != -1) {
				targetType = 'Audio';
				if(params && params.start && params.end && params.start != -1 && params.end != -1) {
					selector = {
						type: "FragmentSelector",
						conformsTo: "http://www.w3.org/TR/media-frags/",
						value: '#t=' + params.start + ',' + params.end,
						start: params.start,
						end: params.end
	    			}
				}
			} else if(mimeType.indexOf('image') != -1) {
				targetType = 'Image';
				if(params && params.rect) {
					selector = {
						type: "FragmentSelector",
						conformsTo: "http://www.w3.org/TR/media-frags/",
						value: '#xywh=' + params.rect.x + ',' + params.rect.y + ',' + params.rect.w + ',' + params.rect.h,
						rect : params.rect
	    			}
				}
			}
		}
		return {
			id : null,
			user : user, //TODO like the selector, generate the w3c stuff here?
			target : {
				source: source,
				selector: selector,
				type: targetType
			},
			body : null
		}
	},

	/*************************************************************************************
	 ************************************* W3C MEDIA FRAGMENTS HELPERS ***************
	*************************************************************************************/

	extractAnnotationTargetDetails : function(annotation) {
		let frag = AnnotationUtil.extractTemporalFragmentFromAnnotation(annotation);
		let assetId = AnnotationUtil.extractAssetIdFromTargetSource(annotation);
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
		if(annotation && annotation.target && annotation.target.selector && annotation.target.selector.start) {
			return {
				start : annotation.target.selector.start,
				end : annotation.target.selector.end
			}
		}
		return null;
	},

	extractSpatialFragmentFromAnnotation : function(annotation) {
		if(annotation && annotation.target && annotation.target.selector) {
			return {
				x: annotation.target.selector.x,
				y: annotation.target.selector.y,
				w: annotation.target.selector.w,
				h: annotation.target.selector.h
			}
		}
		return null;
	},

	extractTemporalFragmentFromURI : function(uri) {
		let i = uri.indexOf('#t=');
		if(i != -1) {
			let arr = uri.substring(i + 3).split(',');
			return {
				start : parseFloat(arr[0]),
				end : parseFloat(arr[1])
			}
		}
		return null;
	},

	extractSpatialFragmentFromURI : function(uri) {
		let i = uri.indexOf('#xywh=');
		if(i != -1) {
			let arr = uri.substring(i + 6).split(',');
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
			let cards = annotation.body.filter((a) => {
				return a.annotationType === 'metadata'
			});
			if(cards.length > 0) {
				let title = cards[0].properties.filter((p) => {
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
		var urlPattern =/^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i;
		return urlPattern.test(url);
	}

}

export default AnnotationUtil;