const DocumentAPI = {

	//Primarily called by the ItemDetailsRecipe for fetching all metadata of a single collection item (ES document)
	getItemDetails :function(collectionId, itemId, callback) {
		const url = _config.DOCUMENT_API_BASE + '/get_doc/' + collectionId;
		const xhr = new XMLHttpRequest();
		const postData = {
			id : itemId
		}
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					callback(collectionId, itemId, JSON.parse(xhr.responseText));
				} else {
					callback(null);
				}
			}
		}
		xhr.open("POST", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(postData));
	},

	//Used by AnnotationUtil.reconsileResourceList to reconsile a list of resourceIds with resource metadata
	getItemDetailsMultiple :function(collectionId, idList, callback) {
		const url = _config.DOCUMENT_API_BASE + '/get_docs/' + collectionId;
		const xhr = new XMLHttpRequest();
		const postData = {
			ids : idList
		}
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					callback(collectionId, idList, JSON.parse(xhr.responseText));
				} else {
					callback(null);
				}
			}
		}
		xhr.open("POST", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(postData));
	}
}

export default DocumentAPI;