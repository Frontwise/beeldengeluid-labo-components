import PropTypes from 'prop-types';
import MediaSegment from './MediaSegment';

export default class MediaObject {

	constructor(assetId, mimeType, url, contentId, contentServerId, segments, resourceStart, resourceEnd, isRawContent) {
		this.assetId = assetId;
		this.mimeType = mimeType;
		this.url = url;

		this.contentId = contentId;
		this.contentServerId = contentServerId;

		this.segments = segments; //list of MediaSegment
		this.resourceStart = resourceStart;
		this.resourceEnd = resourceEnd;

		this.isRawContent = isRawContent;
	}

	static construct(obj) {
		if(!MediaObject.validateObject(obj)) {
			return null;
		}
		return new MediaObject(
			obj.assetId,
			obj.mimeType,
			obj.url,

			obj.contentId,
			obj.contentServerId,

			obj.segments,

			obj.resourceStart,
			obj.resourceEnd,

			obj.isRawContent
		)
	}

	//TODO really bad implementation and never used. Finish & test later
	static validateObject(obj) {
		return
			obj.hasOwnProperty('assetId') &&
			obj.hasOwnProperty('mimeType') &&
			obj.hasOwnProperty('url') &&

			typeof(obj.assetId) == 'string' &&
			typeof(obj.mimeType) == 'string' &&
			typeof(obj.url) == 'string'

	}

	static getPropTypes() {
		return PropTypes.shape({
	    	url: PropTypes.string.isRequired,
	    	mimeType: PropTypes.string.isRequired,
	    	assetId: PropTypes.string.isRequired, //this should be a persistent ID

	    	contentId: PropTypes.string, //encoded asset ID for the content proxy
	    	contentServerId: PropTypes.string, //ID for the content proxy to decide which server to proxy

	    	segments: PropTypes.arrayOf(MediaSegment.getPropTypes()),
	    	resourceStart: PropTypes.number, //start (sec) of on-air content or related segment
	    	resourceEnd: PropTypes.number, //end (sec) of on-air content or related segment

	    	isRawContent : PropTypes.bool //raw content is material used to created the main media object that reflects the (media) resource
		})
	}

}