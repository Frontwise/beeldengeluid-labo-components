//TODO implement something neat and use it
class MediaObject {

	constructor(id, mimeType, url, assetId) {
		this.id = id;
		this.mimeType = mimeType;
		this.url = url;
		this.assetId = assetId;
	}

	static construct(obj) {
		if(!MediaObject.validateObject(obj)) {
			return null;
		}
		return new MediaObject(
			obj.id,
			obj.url,
			obj.assetId,
			obj.mimeType
		)
	}

	//TODO really bad implementation and never used. Finish & test later
	static validateObject(obj) {
		return
			obj.hasOwnProperty('id') &&
			obj.hasOwnProperty('url') &&
			obj.hasOwnProperty('assetId') &&
			obj.hasOwnProperty('mimeType') &&
			typeof(obj.id) == 'string' &&
			typeof(obj.url) == 'string' &&
			typeof(obj.assetId) == 'string' &&
			typeof(obj.mimeType) == 'string'
	}

}

export default MediaObject;