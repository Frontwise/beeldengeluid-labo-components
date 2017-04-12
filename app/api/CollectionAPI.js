//TODO soms blijven requests op (pending) staan. Deze moeten afgekapt worden
const CollectionAPI = {

	getCollectionStats: function(collectionId, callback) {
	    var url = _config.SEARCH_API_BASE + "/collections/show_stats?collectionId=" + collectionId;
	    var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					if(xhr.responseText && xhr.responseText.indexOf('does not exist') == -1) {
						callback(JSON.parse(xhr.responseText));
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
		xhr.send(JSON.stringify({collectionId : collectionId}));
	},

	/*
	//THIS ONE FETCHES THE COLLECTIONS VIA THE SEARCH_API (check if other projects, like motu/arttube still need this)
	listCollections: function(callback) {
	    var url = _config.SEARCH_API_BASE  + "/collections/list_collections";
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
		xhr.open("GET", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	},*/

	//Fetches the list of collections via the LABO proxy (which harvests directly from CKAN)
	listCollections: function(callback) {
	    var url = '/api/collections';
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
		xhr.open("GET", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	},

	getCollectionInfo : function(collectionId, callback) {
		var url = '/api/collection/' + collectionId;
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					var respData = JSON.parse(xhr.responseText);
					if(!respData.error) {
						callback(respData);
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
		xhr.open("GET", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	},

	getCollectionTimeLine(collectionId, docType, dateField, callback) {
		var url = _config.SEARCH_API_BASE + '/collections/show_timeline';
		url += '?collectionId=' + collectionId;
		url += '&docType=' + docType;
		url += '&dateField=' + dateField;
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
		xhr.open("GET", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	},

	analyseField: function(collectionId, docType, dateField, analysisField, facets, callback) {
		var url = _config.SEARCH_API_BASE + '/collections/analyse_field';
		var query = {
			'collectionId': collectionId,
			'docType': docType,
			'dateField': dateField,
			'analysisField': analysisField,
			'facets': facets
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
		xhr.send(JSON.stringify(query));
	}
}

export default CollectionAPI;