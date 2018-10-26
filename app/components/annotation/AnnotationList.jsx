import Annotation from './Annotation';
import AnnotationAPI from '../../api/AnnotationAPI';

import AnnotationUtil from '../../util/AnnotationUtil';
import IDUtil from '../../util/IDUtil';
import IconUtil from '../../util/IconUtil';

import AnnotationActions from '../../flux/AnnotationActions';
import AppAnnotationStore from '../../flux/AnnotationStore';

import PropTypes from 'prop-types';

/*
Goal:
	- Shows a list of annotations of a certain target URI
	- Highlights the annotation which is active on the page

Input:
	- annotation target URI (for fetching the annotations of this target)
	- active annotation ID (of the annotation which is active on the page)

Output/emits:
	- nothing, this component only renders data on the screen

HTML markup & CSS attributes:
	- regular div => .bg__annotation-list
*/

class AnnotationList extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			annotations : [],
			expanded : false
		}
	}

	componentDidMount() {
		//load the initial annotations
		this.loadAnnotations();

		//make sure to reload the list when the target or project changes
		AppAnnotationStore.bind('change-target', this.loadAnnotations.bind(this));
		AppAnnotationStore.bind('change-project', this.loadAnnotations.bind(this));

		//also make sure to reload the list when annotations are added/removed (to/from the target)
		AppAnnotationStore.bind('save-annotation', this.loadAnnotations.bind(this));
		AppAnnotationStore.bind('del-annotation', this.loadAnnotations.bind(this));
	}

	loadAnnotations() {
		if(this.props.annotationTarget) {
			console.debug(this.props.annotationTarget)
			AppAnnotationStore.getMediaObjectAnnotations(
			   	this.props.annotationTarget.source,
			   	this.props.user,
			   	this.props.project,
			   	this.onLoadAnnotations.bind(this),
			);
		}
	}

	//this sets the annotations in the state object
	onLoadAnnotations(annotationList) {
		this.setState({annotations : annotationList || []});
	}

	toggleAnnotations(event) {
		this.setState({expanded : !this.state.expanded});
	}

	render() {
		let annotationItems = null;
		let annotationList = null;
		if(this.state.annotations) {
			annotationItems = this.state.annotations.map(function(annotation) {
				let active = false;
				if(this.props.activeAnnotation) {
					active = this.props.activeAnnotation.id === annotation.id
				}
				return (
					<Annotation
						key={annotation.id}
						annotation={annotation}
						active={active}/>
				);
			}, this);

			annotationList = (
				<div style={this.state.expanded ? {display :'block'} : {display:'none'}}>
					<ul className="list-group">
						{annotationItems}
					</ul>
				</div>
			);
		}
		return (
			<div className={IDUtil.cssClassName('annotation-list')}>
				<button className={this.state.annotations.length > 0 ? 'btn btn-danger' : 'btn btn-default'}
					onClick={this.toggleAnnotations.bind(this)}>
					Saved annotations&nbsp;{this.state.annotations.length}&nbsp;
					<span className={IconUtil.getUserActionIcon('annotate')}></span>
				</button>
				<br/>
				{annotationList}
			</div>
		);
	}
};

AnnotationList.PropTypes = {
	user: PropTypes.shape({
		id: PropTypes.string.isRequired
	}).isRequired,

	project: PropTypes.shape({
		id: PropTypes.string.isRequired,
		name: PropTypes.string.isRequired
	}).isRequired,

	activeAnnotation : PropTypes.shape({
		id: PropTypes.string.isRequired
	}),

	filter : PropTypes.object.isRequired
}

export default AnnotationList;