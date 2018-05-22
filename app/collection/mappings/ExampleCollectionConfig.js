import CollectionConfig from './CollectionConfig';

/*
	See CollectionMappingExample.js to map this config to an index
*/

class ExampleCollectionConfig extends CollectionConfig {
	constructor(clientId, user, collectionId, stats, info) {
		super(clientId, user, collectionId, stats, info);
	}

	getVideoBaseUrl() {
		return 'YOUR_BASE_URL';
	}

	//Note: This endpoint does not support-pseudo streaming yet
	getAudioBaseUrl() {
		return 'YOUR_BASE_URL';
	}

	getPreferredDateField() {
		return 'YOUR_BASE_URL';
	}

	getFacets() {
		return [
			{
				field: 'ACTUAL FIELD NAME IN ES',
				title : 'PRETTY TITLE',
				id : 'CLIENT SIDE ID',
				operator : 'AND/OR',
				size : 10,
				type : 'string/date_histogram/nested',
				display: true
			}
		];
	}

	getItemDetailData(result, currentDateField) {
		result = this.formatSearchResult(result);
		let formattedResult = {}
		formattedResult.resourceId = result._id;
		formattedResult.index = result._index;
		formattedResult.docType = result._type;

		//THE BASIC FIELDS SHOWN IN SEARCH SNIPPETS
		formattedResult.title = result.title; //OVERRIDE IF NEEDED
		formattedResult.description = result.description; //OVERRIDE IF NEEDED
		formattedResult.date = result.date; //OVERRIDE IF NEEDED
		//IS THERE A LINK POINTING TO THE ORIGINAL SOURCE CATALOGUE? {url : '', message : ''}
		formattedResult.externalSourceInfo = null;
		formattedResult.specialProperties = [] //ARE THERE PROPERTIES THAT SHOULD BE PUT FORWARD ON THE DETAIL PAGE?


		//MAKE SURE THE PLAYABLE (e.g. AV or images) CONTENT IS IDENTIFIED
		let content = {playableContent : [], mediaTypes : []}; //MAKE SURE THESE ARE PROPERLY FILLED
		/* PLAYABLE CONTENT SHOULD BE AN ARRAY OF (e.g.):
			{
				url : this.getAudioBaseUrl() + '/' + SOME_ID,
				mimeType : mimeType,
				assetId : IDENTIFIES THE ABSTRACT ENTITY THE CONTENT IS RELATED TO
			}
		*/
		formattedResult.playableContent = content.playableContent;
		//MEDIA TYPES IS MADE UP OF A LIST OF MIME-TYPES
		formattedResult.mediaTypes = content.mediaTypes;

		//FINALLY MAKE SURE THE CLIENT ALSO HAS A REFERENCE TO ALL OF THE RAW DATA
		formattedResult.rawData = result;

		return formattedResult;
	}

}

export default ExampleCollectionConfig;