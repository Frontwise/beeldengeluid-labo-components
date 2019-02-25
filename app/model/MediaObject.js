//TODO implement something neat and use it
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

}