const EnrichmentAPI = {
	enrich : function (userId, collection, servicetag, callback) {
		let url = "http://localhost:5500/pipeline/addjob";
		let method = "POST";

		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					console.log(xhr);
					console.log(xhr.responseText);
					const respData = JSON.parse(xhr.responseText);
					
					if(respData && ! respData.error) {
						callback(respData);
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
		
		let data = {};
		data['service'] = servicetag;
		data['collection'] = collection;
		xhr.open(method, url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(data));
	},

	checkStatus : function (userId, collectionId, callback) {
		let url = "http://localhost:5500/pipeline/checkstatus"+"?cid="+collectionId;
		let method = "GET";

		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if (xhr.status == 200) {
					const respData = JSON.parse(xhr.responseText);

					if(respData && ! respData.error) {
						var status = {}
						status['success'] = true
						status['respData'] = respData
						callback(status);
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
		xhr.send(null);
	}
}
export default EnrichmentAPI;