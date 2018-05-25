import AnnotationAPI from '../api/AnnotationAPI';

const BookmarkUtil = {

	// delete a bookmark and all its annotations
	deleteBookmarks : function(bookmarkList, bookmarkIds, callback) {

		// get the bookmarks to delete
		const bookmarks = bookmarkList.filter(b =>			
			bookmarkIds.includes(b.resourceId)
     );

		// get all annotations to delete
		// as bookmarks are actually annotations, we should collect them here
		
		const deleteAnnotations = {};
		bookmarks.forEach((b) => {
			// add original bookmark
			deleteAnnotations[b.annotationId] = {
					id: b.annotationId
				};

			// add all the annotations
			b.annotations.forEach((a)=>{
				// skip elements already marked
				if (a.parentAnnotationId in deleteAnnotations){
					return;
				}
			
				deleteAnnotations[a.parentAnnotationId] = {
					id: a.parentAnnotationId
				};
												 	
			});
		});
				
		console.debug(deleteAnnotations);
		
		// delete the annotations	
			 
		const deleteCount = Object.keys(deleteAnnotations).length;
		let count = 0;

		Object.keys(deleteAnnotations).map((key)=>(deleteAnnotations[key])).forEach((a)=>{
			AnnotationAPI.deleteAnnotation(a, data => {
				if (data && data.status) {
					if (data.status == 'success') {
						console.debug('success');
					} else {
						console.debug('error');
					}
				} else {
					console.debug('error');
				}
				if(++count == deleteCount) {					
					console.debug('all done calling back the caller');
					callback(true)
				}
			});
		});
	},

	deleteAnnotations(parentAnnotations, annotationList, annotationIds, callback) {
		//intialize the list of annotations
		let count = 0;
		const annotations = annotationList.filter(
			item => annotationIds.includes(item.annotationId)
		)

		annotations.forEach(annotation => {

			console.debug(annotation)

			const childCount = annotationList.filter(
				a => a.parentAnnotationId == annotation.parentAnnotationId
			).length;

			console.debug('CHILD COUNT: ' + childCount)

			let parentAnnotation = parentAnnotations.filter(
				pa => pa.id == annotation.parentAnnotationId
			);
			parentAnnotation = parentAnnotation.length == 1 ? parentAnnotation[0] : null;
			if(parentAnnotation) {
				if(childCount == 1) {
					//delete the parent annotation entirely since the annotation was the last of its body
					AnnotationAPI.deleteAnnotation(parentAnnotation, data => {
						if (data && data.status) {
							if (data.status == 'success') {
								console.debug('success');
							} else {
								console.debug('error');
							}
						} else {
							console.debug('error');
						}
						if(++count == annotations.length) {
							console.debug('all done calling back the caller');
							callback(true)
						}
					});
				} else {
					//update the parent annotation, removing the annotation from its body
					parentAnnotation.body =  parentAnnotation.body.filter(
						b => b.annotationId != annotation.annotationId
					);

					AnnotationAPI.saveAnnotation(parentAnnotation, data => {
						if (data.status == 'success') {
							console.debug('success');
						} else {
							console.debug('error');
						}
						if(++count == annotations.length) {
							console.debug('all done calling back the caller');
							callback(true)
						}
					});
				}
			} else {
				if(++count == annotations.length) {
					console.debug('all done calling back the caller');
					callback(false)
				}
			}
		});
	}

}

export default BookmarkUtil;