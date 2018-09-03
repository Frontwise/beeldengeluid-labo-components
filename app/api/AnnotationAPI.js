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

	getAnnotation : function(annotationId, callback) {
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

	getFilteredAnnotations : function(userId, filters, callback, offset = 0, size = 250, sort = null, dateRange = null) {
		let url = _config.ANNOTATION_API_BASE + '/annotations/filter';
		const postData = {
			filters : filters,
			offset : offset,
			size : size,
			sort : sort,
			dateRange : dateRange,
			user : userId
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