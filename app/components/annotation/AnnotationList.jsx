import Annotation from './Annotation';
import AnnotationAPI from '../../api/AnnotationAPI';
import AnnotationUtil from '../../util/AnnotationUtil';

import AnnotationActions from '../../flux/AnnotationActions';
import AppAnnotationStore from '../../flux/AnnotationStore';

/*
Goal:
	- Shows a list of annotations of a certain target URI
	- Highlights the annotation which is active on the page

Input:
	- annotation target URI (for fetching the annotations of this target)
	- active annotation ID (of the annotation which is active on the page)

Output/emits:
	- nothing, this component only renders data on the screen
*/

class AnnotationList extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			annotations : [],
			expanded : false,
			annotationTarget : this.props.annotationTarget
		}
	}

	componentDidMount() {
		//load the initial annotations
		this.loadAnnotations(this.state.annotationTarget);

		//make sure to reload the list when the target changes
		AppAnnotationStore.bind('change-target', this.changeTarget.bind(this));

		//also make sure to reload the list when annotations are added/removed (to/from the target)
		AppAnnotationStore.bind('save-annotation', this.loadAnnotations.bind(this));
		AppAnnotationStore.bind('del-annotation', this.loadAnnotations.bind(this));
	}

	changeTarget(annotationTarget) {
		this.setState(
			{annotationTarget : annotationTarget},
			this.loadAnnotations.bind(this)
		);
	}

	loadAnnotations() {
		if(this.state.annotationTarget) {
			AppAnnotationStore.getMediaObjectAnnotations(
			   	this.props.annotationTarget.source,
			   	this.props.user,
			   	this.onLoadAnnotations.bind(this)
			);
		}
	}

	//this sets the annotations in the state object
	onLoadAnnotations(annotationData) {
		this.setState(annotationData);
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
			<div>
				<button className={this.state.annotations.length > 0 ? 'btn btn-danger' : 'btn btn-default'}
					onClick={this.toggleAnnotations.bind(this)}>
					Saved annotations&nbsp;{this.state.annotations.length}&nbsp;<span className="glyphicon glyphicon-comment"></span>
				</button>
				<br/>
				{annotationList}
			</div>
		);
	}
};

export default AnnotationList;