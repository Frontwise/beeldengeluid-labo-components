

import AnnotationAPI from '../api/AnnotationAPI';

const BookmarkUtil = {


	// delete a bookmark and all its annotations
	deleteBookmarks : function(annotationList, bookmarkList, bookmarkIds, callback) {
		console.log(annotationList, bookmarkList, bookmarkIds);

		const getAnnotations = (id) => (
			annotationList.filter((a)=>(a.id === id))
		);


		// get the bookmarks to delete
		const bookmarks = bookmarkList.filter(b =>			
			bookmarkIds.includes(b.resourceId)
    );

		// get annotations belonging to each bookmark
		bookmarks.forEach((b) => {
				let hits = {};
				b.annotationData = getAnnotations(b.annotationId).concat(
					b.annotations.filter((a)=>{
						if (a.parentAnnotationId in hits){ return false; }
						hits[a.parentAnnotationId] = true; 
						return true;
					})
				);		
		});

		// get all annotations to delete
		bookmarks.forEach((b) => {
			console.log(b.annotationData);
			// mark the target for removal
			b.annotationData.forEach((annotation)=>{ 
				if (Array.isArray(annotation.target)){
					annotation.target.forEach((t)=>{
						if (t.source === b.resourceId){
							console.log(annotation,t,b);
							t.removeMe = true;
						}
					});
				} else{

					// add default annotation for removal
					if (!annotation.target){
					 	annotation.target={};
					 	annotation.id = annotation.parentAnnotationId;
					}
					annotation.target.removeMe = true;						

				}
			});
	
		});

		// Fully delete, or update annotations
		let remainingTargets = [];
		let fullyDelete = false;
		let deleteCount = 0;
		let count = 0;

		bookmarks.forEach((b) => {
				console.log(b.annotationData);
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
					console.debug('fully', annotation); 
					//return true;
					AnnotationAPI.deleteAnnotation(annotation, data => {
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

				} else{

					// Update current annotation without the bookmark as target
					console.debug('update',annotation); 
					//return true;
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
						if(++count == deleteCount) {
							console.debug('all done calling back the caller');
							callback(true)
						}
					});
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