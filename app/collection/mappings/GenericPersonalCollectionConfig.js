import CollectionConfig from './CollectionConfig';

export class GenericPersonalCollectionConfig extends CollectionConfig {

	constructor(clientId, user, collectionId, stats, info) {
		super(clientId, user, collectionId, stats, info);
	}

	getFacets() {
		return [
			{
				field: 'date',
				title : 'Creation date',
				id : 'creation_date',
				type : 'date_histogram'
			}
		];
	}

	getItemDetailData(result, currentDateField) {
		result = this.formatSearchResult(result);
		const formattedResult = {}

		//then add the most basic top level data
		formattedResult.resourceId = result._id;
		formattedResult.index = result._index;
		formattedResult.docType = result._type;

		formattedResult.rawData = result;

		formattedResult.title = result.title;
		formattedResult.description = result.description;
		formattedResult.date = result.date;
		formattedResult.dateField = 'date';

		const content = this.__extractPlayableContent(result);
		if(content) {
			formattedResult.playableContent = content.playableContent;
			formattedResult.mediaTypes = content.mediaTypes;
		}

		return formattedResult;
	}

	//FIXME the weird default mimeType application/json should be replaced with something that makes sense
	__extractPlayableContent(result) {
		if(result['fileUrl'] && result['fileUrl'] != '') {
			let mimeType = 'application/json'
			let url = result['fileUrl']

			if(url.indexOf('dropbox.com') != -1) {
				if(url.indexOf('?dl=') != -1) {
					url = url.substring(0, url.indexOf('?dl='));
					mimeType = this.__extractMimeTypeFromURL(url);
					url = url.replace('www.dropbox.com', 'dl.dropbox.com')
				}
			} else if(url.indexOf('youtube.com') != -1 || url.indexOf('youtu.be') != -1) {
				mimeType = 'video/mp4';
			} else if(url.indexOf('player.vimeo.com') != -1) {
				mimeType = 'video/mp4';
			} else {
				mimeType = this.__extractMimeTypeFromURL(url);
			}

			return {
				playableContent : [{
					url : url,
					mimeType : mimeType,
					assetId : result._id,
					cors : false
				}],
				mediaTypes : ['video']
			}
		}
	}

	//FIXME the weird default mimeType application/json should be replaced with something that makes sense
	__extractMimeTypeFromURL(url) {
		let mimeType = 'application/json';
		switch(url.substring(url.lastIndexOf('.')+1)) {
			case 'mp4': mimeType = 'video/mp4'; break;
			case 'mp3': mimeType = 'audio/mp3'; break;
			case 'wav': mimeType = 'audio/wav'; break;
			case 'jpg': mimeType = 'image/jpeg'; break;
			case 'jpeg': mimeType = 'image/jpeg'; break;
			case 'png': mimeType = 'image/png'; break;
		}
		return mimeType
	}

}

export default GenericPersonalCollectionConfig;