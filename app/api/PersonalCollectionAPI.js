/*
A collection object looks like this:
{
	"id": "0ccdfa08-6f0d-487d-9937-f99d1d78d971",
	"name": "string",
	"description": "string",
	"user": "clariah_test",
	"creator": "string",
	"created": "2018-03-13T16:35:16Z",
	"dateCreated": "2018-03-13",
	"isPrivate": true
}

A collection item looks like this:
{
	"id": "AWIgAVFzQaBIye3atpIZ",
	"title": "string",
	"creator": "jaap",
	"descr": "string",
	"fileUrl": "https://www.openbeelden.nl/files/10/01/1001775.1001770.Artur_Avila.mp4",
	"dateCreated": "2018-03-13",
	"created": "2018-03-13T16:36:20Z",
	"updated": "2018-03-14T08:41:57Z",
	"owner": {
		"id": "clariah_test",
		"name": "clariah_test"
	}
}
*/
const PersonalCollectionAPI = {

	save : function (userId, collection, callback) {
		let url = _config.PERSONAL_COLLECTION_API_BASE + '/' + userId + "/collections";
		let method = 'POST'
		if (collection.id) {
			url += '/' + collection.id;
			method = 'PUT';
		}
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					console.log(xhr);
					const respData = JSON.parse(xhr.responseText);
					if(respData && ! respData.error) {
						callback(JSON.parse(xhr.responseText));
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
		xhr.open(method, url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(collection));
	},

	saveEntry : function(userId, collectionId, entry, callback) {
		let method = 'POST';
		if (entry['id']) {
			var url = _config.PERSONAL_COLLECTION_API_BASE + '/' + userId + "/collections/";
			url += encodeURIComponent(collectionId) + "/entry/" + encodeURIComponent(entry['id']);
			method = 'PUT';
		} else {
			var url = _config.PERSONAL_COLLECTION_API_BASE + '/' + userId + "/collections/";
			url += encodeURIComponent(collectionId) + "/entry";
		}

		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);
					if(respData && ! respData.error) {
						callback(JSON.parse(xhr.responseText));
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
		xhr.open(method, url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(entry));
	},

	delete : function(userId, collectionId, callback) {
		const url = _config.PERSONAL_COLLECTION_API_BASE + '/' + userId + '/collections/' + encodeURIComponent(collectionId);
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);
					if (respData && !respData.error) {
						callback(respData);
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
		xhr.open("DELETE", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	},

	deleteEntry : function(userId, collectionId, entryId, callback) {
		var xhr = new XMLHttpRequest();
	    var url = _config.PERSONAL_COLLECTION_API_BASE + '/' + userId + '/collections/'+ collectionId + '/entry/'+ entryId;

	    xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);
					if (respData && !respData.error) {
						callback(respData);
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
	    xhr.open('DELETE', url, true);
	    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	    xhr.send();
	},

	list : function(userId, filter, callback) {
		const url = _config.PERSONAL_COLLECTION_API_BASE + "/" + userId + "/collections";
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);
					if (respData && !respData.error) {
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

	get : function(userId, collectionId, callback) {
		const url = _config.PERSONAL_COLLECTION_API_BASE + '/' + userId + '/collections/' + encodeURIComponent(collectionId);
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);
					if (respData && !respData.error) {
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

	getEntry : function(userId, collectionId, entryId, callback) {
		const url = _config.PERSONAL_COLLECTION_API_BASE + '/' + userId + '/collections/' + encodeURIComponent(collectionId) + '/entry/' + encodeURIComponent(entryId);
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);
					if (respData && !respData.error) {
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
	}

}

export default PersonalCollectionAPI;