const CKANAPI = {

	//Fetches the list of collections via the LABO proxy (which harvests directly from CKAN)
	listCollections: function(callback) {
	    const url = _config.CKAN_API_BASE + '/list_collections';
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
		xhr.send();
	},

	getCollectionInfo : function(collectionId, callback) {
		const url = _config.CKAN_API_BASE + '/collection_info/' + collectionId;
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);
					if(respData && !respData.error) {
						callback(respData);
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
	}

}

export default CKANAPI;