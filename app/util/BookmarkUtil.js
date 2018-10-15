

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

				if (fullyDelete) {

					// Complete removal of the annotation

					console.debug('Fully delete', annotation);
					//return true;
					AnnotationAPI.deleteAnnotation(annotation, data => {
						if (data.error) {
							console.debug(data.error);
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
						if (data.error) {
							console.debug(data.error);
						}
						if(++count == deleteCount) {
							console.debug('Delete bookmark ready, calling callback');
							callback(true)
						}
					});
				}

			});
		});

	}

}

export default BookmarkUtil;