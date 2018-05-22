const PlayoutAPI = {

	requestAccess : function(collectionId, videoId, desiredState, callback) {
		var data = {
			videoId: videoId,
			clientId: _clientId,
			at: _chickenStock
		}
		var url = _play + '/api/play/' + collectionId + '/' + videoId;
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					var resp = JSON.parse(xhr.responseText);
					console.debug(resp);
					callback(true, desiredState);
				} else {
					console.debug('no dice', xhr.responseText);
					callback(false, desiredState);
				}
			}
		}
		xhr.open("POST", url);
		xhr.withCredentials = true;
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(data));
	}

}

export default PlayoutAPI;