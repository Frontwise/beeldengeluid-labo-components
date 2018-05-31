

import AnnotationAPI from '../api/AnnotationAPI';

const BookmarkUtil = {


	// delete a bookmark and all its annotations
	deleteBookmarks : function(annotationList, bookmarkList, bookmarkIds, callback) {

		// get the bookmarks to delete
		const bookmarks = bookmarkList.filter(b =>
			bookmarkIds.includes(b.resourceId)
    );

		// get annotations belonging to each bookmark
		bookmarks.forEach((b) => {
				b.annotationData = annotationList.filter((a)=>(b.annotationIds.includes(a.id)));
		});

		// Mark target(s) for removal
		bookmarks.forEach((b) => {
			b.annotationData.forEach((annotation)=>{
				if (Array.isArray(annotation.target)){

					// multiple targets (bookmark group)
					annotation.target.forEach((t)=>{
						if (t.source === b.resourceId){
							t.removeMe = true;
						}
					});
				} else{

					// single target, annotation on segment/mediaobject
					if (!annotation.target){
					 	annotation.target={};
					 	annotation.id = annotation.parentAnnotationId;
					}
					annotation.target.removeMe = true;
				}
			});
		});

		// Fully delete, or update annotations
		let fullyDelete = false;
		let deleteCount = 0;
		let count = 0;

		bookmarks.forEach((b) => {
			b.annotationData.forEach((annotation)=>{

				deleteCount++;

				fullyDelete = true;

				// If all the targets are marked for removal, remove the full annotation
				if (Array.isArray(annotation.target)){
					annotation.target = annotation.target.filter((t)=>(!t.removeMe));
					if (annotation.target.length > 0){
						fullyDelete = false;
					}
				}

				if (fullyDelete){

					// Complete removal of the annotation

					console.debug('Fully delete', annotation);
					//return true;
					AnnotationAPI.deleteAnnotation(annotation, data => {
						if (data && data.status) {
							console.debug(data.status == 'success' ? 'success' : 'error');
						} else {
							console.debug('failed');
						}
						if(++count == deleteCount) {
							console.debug('Delete bookmark ready, calling callback');
							callback(true)
						}
					});

				} else{

					// Update current annotation without the bookmark as target

					console.debug('Just remove target',annotation);
					//return true;
					AnnotationAPI.saveAnnotation(annotation, data => {
						if (data && data.status) {
							console.debug(data.status == 'success' ? 'success' : 'error');
						} else {
							console.debug('failed');
						}
						if(++count == deleteCount) {
							console.debug('Delete bookmark ready, calling callback');
							callback(true)
						}
					});
				}

			});
		});
	
	},

	deleteAnnotations(parentAnnotations, annotationList, annotationIds, callback) {
		//initialize the list of annotations
		let count = 0;
		const annotations = annotationList.filter(
			item => annotationIds.includes(item.annotationId)
		)

		annotations.forEach(annotation => {

			const childCount = annotationList.filter(
				a => a.parentAnnotationId == annotation.parentAnnotationId
			).length;

			let parentAnnotation = parentAnnotations.filter(
				pa => pa.id == annotation.parentAnnotationId
			);
			parentAnnotation = parentAnnotation.length == 1 ? parentAnnotation[0] : null;

			if(parentAnnotation) {
				if(childCount == 1) {
					//delete the parent annotation entirely since the annotation was the last of its body
					AnnotationAPI.deleteAnnotation(parentAnnotation, data => {
						if (data && data.status) {
							console.debug(data.status == 'success' ? 'success' : 'error');
						} else {
							console.debug('failed');
						}
						if(++count == annotations.length) {
							console.debug('Delete annotation ready, calling callback');
							callback(true)
						}
					});
				} else {
					//update the parent annotation, removing the annotation from its body
					parentAnnotation.body =  parentAnnotation.body.filter(
						a => a.annotationIds != annotation.annotationId
					);

					AnnotationAPI.saveAnnotation(parentAnnotation, data => {
						console.debug(data.status == 'success' ? 'success' : 'error');
						if(++count == annotations.length) {
							console.debug('Delete annotation ready, calling callback');
							callback(true)
						}
					});
				}
			} else {
				if(++count == annotations.length) {
					console.debug('Delete annotation ready, calling callback');
					callback(false)
				}
			}
		});
	}

}

export default BookmarkUtil;