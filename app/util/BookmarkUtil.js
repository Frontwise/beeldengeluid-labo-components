import AnnotationAPI from '../api/AnnotationAPI';

const BookmarkUtil = {

	deleteBookmarks : function(annotationList, bookmarkList, bookmarkIds, callback) {
		let count = 0;
		const bookmarks = bookmarkList.filter(item =>
			bookmarkIds.includes(item.id)
        )

		bookmarks.forEach((b) => {
			const targets = bookmarkList.filter(
				bookmark => b.annotationId == bookmark.annotationId
				);
			bookmarkList = bookmarkList.filter(
				bookmark => b.targetId != bookmark.targetId
				);

			//if there is only one target it means the selected bookmark was the last target of the parent annotation
			if(targets.length == 1) {
				//set the id to the annotationId so the API knows which actual annotation needs to be deleted
				b.id = b.annotationId;

				//delete the bookmark
				AnnotationAPI.deleteAnnotation(b, data => {
					if (data && data.status) {
						if (data.status == 'success') {
							console.debug('success');
						} else {
							console.debug('error');
						}
					} else {
						console.debug('error');
					}
					if(++count == bookmarks.length) {
						console.debug('all done calling back the caller');
						callback(true)
					}
				});
			} else {
				const annotation = annotationList.filter(a => a.id == b.annotationId)[0];
				annotation.target = annotation.target.filter(t => t.source != b.targetId);
				AnnotationAPI.saveAnnotation(annotation, data => {
					if (data && data.status) {
						if (data.status == 'success') {
							console.debug('success');
						} else {
							console.debug('error');
						}
					} else {
						console.debug('error');
					}
					if(++count == bookmarks.length) {
						console.debug('all done calling back the caller');
						callback(true)
					}
				});
			}
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