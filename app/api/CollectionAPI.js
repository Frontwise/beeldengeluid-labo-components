//TODO soms blijven requests op (pending) staan. Deze moeten afgekapt worden
const CollectionAPI = {

	getCollectionStats: function(collectionId, callback) {
	    const url = _config.COLLECTION_API_BASE + '/show_stats/' + collectionId;
	    const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					if(xhr.responseText && xhr.responseText.indexOf('does not exist') == -1) {
						callback(
							CollectionAPI.__filterAggregationStatusDocumentType(JSON.parse(xhr.responseText))
						);
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
		xhr.open("POST", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	},

	__filterAggregationStatusDocumentType(stats) {
		if(stats && stats.collection_statistics && stats.collection_statistics.document_types) {
			let docTypes = stats.collection_statistics.document_types;
			stats.collection_statistics.document_types = docTypes.filter((dt) => dt.doc_type != 'aggregation_status');
		}
		return stats;
	},

	getCollectionTimeLine(collectionId, docType, dateField, callback) {
		let url = _config.COLLECTION_API_BASE + '/show_timeline/' + collectionId;
		const postData = {
			docType: docType,
			dateField : dateField,
			facetField : null, //not yet implemented by the server
			facetValue : null //not yet implemented by the server
		}
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					callback(JSON.parse(xhr.responseText));
				} else {
					callback(null);
				}
			}
		}
		xhr.open("GET", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(postData));
	},

	analyseField: function(collectionId, docType, dateField, analysisField, facets, minYear, nested, callback) {
		const url = _config.COLLECTION_API_BASE + '/analyse_field/' + collectionId;
		const postData = {
			docType : docType,
			dateField : dateField,
			analysisField : analysisField,
			facets : facets,
			minYear : minYear,
			nested : nested
		}
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					callback(JSON.parse(xhr.responseText));
				} else {
					callback(null);
				}
			}
		}
		xhr.open("POST", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(postData));
	},


	//THIS ONE FETCHES THE COLLECTIONS VIA THE SEARCH_API
	listCollections: function(collectionPrefix, callback) {
	    var url = _config.COLLECTION_API_BASE  + "/list_collections";
	    if(collectionPrefix) {
	    	url += '/' + collectionPrefix
	    }
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					callback(JSON.parse(xhr.responseText));
				} else {
					callback(null);
				}
			}
		}
		xhr.open("POST", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	}
}

export default CollectionAPI;
