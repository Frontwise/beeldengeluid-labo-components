const LinkedDataAPI = {

	//DESCRIBE does not seem to work in virtuoso (altough their docs do mention it)
	describe : function(resourceId, graphId, callback) {
		let url = _config.SEARCH_API_BASE + '/sparql'
		const params = {
			endpoint : 'http://zorin:8892/sparql',
			query : 'SELECT * WHERE {<'+resourceId+'> ?p ?o}'
		}
	    const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					const resp = JSON.parse(xhr.responseText);
					if(resp.status == 'ok') {
						callback(LinkedDataAPI.__formatResults(resp))
					} else {
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		}
		xhr.open('POST', url);
		xhr.setRequestHeader('Content-Type', 'application/sparql-results+json');//"application/json;charset=UTF-8"
		xhr.send(JSON.stringify(params));
	},

	//format application/sparql-results+json data into something more simpel for the UI
	__formatResults(resp) {
		if(resp.result) {
			let propertyNames = null;
			if(resp.result.head && resp.result.head.vars) {
				propertyNames = resp.result.head.vars;
			}

			if(propertyNames && resp.result.results && resp.result.results.bindings) {
				return resp.result.results.bindings.map(prop => {
					let obj = {}
					propertyNames.forEach(pn => {
						obj[pn] = prop[pn].value
					})
					return obj
				})
			}
		}
		return []
	}

}

export default LinkedDataAPI;