const AnnotationAPI = {

	saveAnnotation : function(annotation, callback) {
		let url = _config.ANNOTATION_API_BASE + '/annotation';
		let method = 'POST';
		if(annotation.id) {
			url += '/' + annotation.id;
			method = 'PUT';
		}
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					if(callback){
						callback(JSON.parse(xhr.responseText));
					}
				} else {
					if(callback) {
						callback(null);
					}
				}
			}
		}
		xhr.open(method, url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(annotation));
	},

	getAnnotation : function(annotationId) {
		if(annotationId) {
			const url = _config.ANNOTATION_API_BASE + '/annotation/' + annotationId;
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
			xhr.send();
		}
	},

	deleteAnnotation : function (annotation, callback) {
		if(annotation.id) {
			const url = _config.ANNOTATION_API_BASE + '/annotation/' + annotation.id;
			const xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (xhr.readyState == XMLHttpRequest.DONE) {
					if(xhr.status == 200) {
						callback(JSON.parse(xhr.responseText), annotation);
					} else {
						callback(null);
					}
				}
			}
			xhr.open("DELETE", url);
			xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			xhr.send();
		}
	},

	//TODO always add the user too!
	getFilteredAnnotationsOld : function(params, callback) {
		let url = _config.ANNOTATION_API_BASE + '/annotations/filter';
		const temp = [];
		Object.keys(params).forEach((key) => {
			temp.push(key + '=' + params[key]);
		})
		url += '?' + temp.join('&');
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
		xhr.send();
	},

	getFilteredAnnotations : function(filters, callback, offset = 0, size = 10, sort = null, dateRange = null) {
		console.debug(filters);
		let url = _config.ANNOTATION_API_BASE + '/annotations/filter';
		const postData = {
			clientId : _clientId,
			token : _chickenStock,
			filters : filters,
			offset : offset,
			size : size,
			sort : sort,
			dateRange : dateRange
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
	}
}

export default AnnotationAPI;