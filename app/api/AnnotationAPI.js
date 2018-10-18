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

	//TODO remove and user deleteUserAnnotation instead
	deleteAnnotation : function (annotation, callback) {
		if(annotation.id) {
			if(annotation.motivation == 'bookmarking') {
				alert('will not delete a bookmark group annotation!')
				return;
			}
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
		const params = {
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
		xhr.send(JSON.stringify(params));
	},

	getBookmarks : function(userId, projectId, callback) {
		let url = _config.ANNOTATION_API_BASE + '/user/'+userId+'/project/'+projectId+'/bookmarks';
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					const resp = JSON.parse(xhr.responseText)
					//TODO the server should return the proper status code on error!!
					if(resp.hasOwnProperty('error')) {
						callback([]);//return an empty list by default
					} else {
						callback(JSON.parse(xhr.responseText));
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

	getAnnotationCounts : function(userId, projectId, callback) {
		let url = _config.ANNOTATION_API_BASE + '/user/'+userId+'/project/'+projectId+'/bookmarks?o=count';
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

	getAnnotationBodies : function(userId, projectId, annotationType, callback) {
		let url = _config.ANNOTATION_API_BASE + '/user/'+userId+'/project/'+projectId+'/' + annotationType;
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					const resp = JSON.parse(xhr.responseText)
					//TODO the server should return the proper status code on error!!
					if(resp.hasOwnProperty('error')) {
						callback([]);//return an empty list by default
					} else {
						callback(JSON.parse(xhr.responseText));
					}
				} else {
					callback([]);//return an empty list by default
				}
			}
		}
		xhr.open("GET", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send();
	},

	deleteUserAnnotation : function(userId, annotationId, bodyOrTarget=null, partId=null, callback) {
		let url = _config.ANNOTATION_API_BASE + '/user/'+userId;
		let params = null;
		url += '/annotation/' + annotationId;
		if(bodyOrTarget && partId) {
			params = {
				partId : partId,
				partType : bodyOrTarget
			}
		}
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == XMLHttpRequest.DONE) {
				if(xhr.status == 200) {
					callback(JSON.parse(xhr.responseText));
				} else {
					callback([]);//return an empty list by default
				}
			}
		}
		xhr.open("DELETE", url);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		if(params) {
			xhr.send(JSON.stringify(params));
		} else {
			xhr.send();
		}
	}
}

export default AnnotationAPI;