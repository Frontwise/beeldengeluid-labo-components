import MicroEvent from 'microevent';
import AnnotationAPI from '../api/AnnotationAPI';
import AppDispatcher from './AppDispatcher';
import AnnotationUtil from '../util//AnnotationUtil';

//See: https://github.com/jeromeetienne/microevent.js


class AnnotationStore {

	/* --------------- FOR FETCHING DATA ------------------- */

	//DEPREACATED, SHOULD BE REPLACED!
	getAll(callback) {
		AnnotationAPI.getAnnotations(callback);
	}

	getMediaObjectAnnotations(mediaObjectURI, user, callback) {
		AnnotationAPI.getFilteredAnnotations({
			'target.source' : AnnotationUtil.removeSourceUrlParams(mediaObjectURI),
			'user' : user.id
		}, callback);
	}

	/* --------------- FOR TRIGGERS LISTENERS ------------------- */

	changeTarget(annotationTarget) {
		this.trigger('change-target', annotationTarget);
		if(annotationTarget) {
			this.trigger(annotationTarget.source, 'change-target', null, null);
		}
	}

	//TODO change the name of the event 'change' --> save-annotation
	save(annotation) {
		AnnotationAPI.saveAnnotation(annotation, (data) => {
			//assign the newly saved ID to the annotation
			if(data.id) {
				annotation.id = data.id;
			}
			//notify all components that just listen to a single target (e.g. FlexPlayer, FlexImageViewer)
			this.trigger(annotation.target.source, 'update', data, annotation);
			//then notify all components that are interested in all annotations
			this.trigger('save-annotation', data, annotation);
		});
	}

	delete(annotation) {
		AnnotationAPI.deleteAnnotation(annotation, (data, annotation) => {
			//notify all components that just listen to a single target (e.g. FlexPlayer, FlexImageViewer)
			this.trigger(annotation.target.source, 'delete', data, annotation);
			//then notify all components that are interested in all annotations
			this.trigger('del-annotation', data, annotation);
		});
	}

	edit(annotation, subAnnotation) {
		this.trigger('edit-annotation', annotation, subAnnotation);
	}

	set(annotation) {
		this.trigger('set-annotation', annotation);
		if(annotation) {
			this.trigger(annotation.target.source, 'set', null, annotation);
		}
	}

	play(annotation) {
		this.trigger('play-annotation', annotation);
		if(annotation) {
			this.trigger(annotation.target.source, 'play', null, annotation);
		}
	}

}

const AppAnnotationStore = new AnnotationStore();

//add support for emitting events
MicroEvent.mixin(AnnotationStore);

AppDispatcher.register( function( action ) {

    switch(action.eventName) {

        case 'save-annotation':
            AppAnnotationStore.save(action.annotation);
            break;
        case 'delete-annotation':
            AppAnnotationStore.delete(action.annotation);
            break;
        case 'edit-annotation':
            AppAnnotationStore.edit(action.annotation, action.subAnnotation);
            break;
        case 'set-annotation':
            AppAnnotationStore.set(action.annotation);
            break;
        case 'play-annotation':
            AppAnnotationStore.play(action.annotation);
            break;
        case 'change-target':
            AppAnnotationStore.changeTarget(action.annotationTarget);
            break;

    }

});

export default AppAnnotationStore;