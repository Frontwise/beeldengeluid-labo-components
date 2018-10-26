import TimeUtil from '../../util/TimeUtil';
import AnnotationActions from '../../flux/AnnotationActions';
import AnnotationUtil from '../../util/AnnotationUtil';
import IconUtil from '../../util/IconUtil';
import IDUtil from '../../util/IDUtil';
/*
Input:
	- Annotation object (see: TODO)

Output/emits:
	- 'set active annotation' (for letting the page know, which annotation is active)
	- 'edit annotation' (for letting the page know, which annotation to edit)
	- 'play annotation' (for letting the page know, which annotation to play)
	- 'delete annotation' (for letting the page know, which annotation to delete)

HTML markup & CSS attributes:
	- list-group-item (Bootstrap) ==> .bg__annotation:
		- label (.bg__an__label)
		- provenance information (.bg__an__prov-info)
		- (media) fragment information (.bg__an__fragment-info)
*/

class Annotation extends React.Component {

	constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'an';
	}

	//The following AnnotationActions are linked here: set, edit, play, delete
	render() {
		let icon = null;
		let fragInfo = null;

		//determine the fragment information (and the asset ID so it can be possibly used for the label)
		const ad = AnnotationUtil.extractAnnotationTargetDetails(this.props.annotation);
		switch(ad.type) {
			case 'temporal' :
				icon = (<span className={IconUtil.getMimeTypeIcon('video')}></span>);break;
			case 'spatial' :
				icon = (<span className={IconUtil.getMimeTypeIcon('image')}></span>);break;
			default :
				icon = null;
		}
		if(ad.type == 'temporal') {
			fragInfo = (
				<span className={IDUtil.cssClassName('fragment-info', this.CLASS_PREFIX)}>
					{'[' + TimeUtil.formatTime(ad.frag.start) + ' - ' + TimeUtil.formatTime(ad.frag.end) + ']'}
				</span>
			)
		}

		//determine the label of the annotation
		let label = AnnotationUtil.extractAnnotationCardTitle(this.props.annotation);
		if(!label) {
			label = ad.source ? ad.source : this.props.annotation.id
		}

		//determine the css classes for the component
		const classNames = ['list-group-item'];
		if(this.props.active) {
			classNames.push('active');
		}
		classNames.push(IDUtil.cssClassName('annotation'))

		return (
			<li className={classNames.join(' ')}
				onClick={() => {AnnotationActions.set(this.props.annotation)}}
				onDoubleClick={() => {AnnotationActions.edit(this.props.annotation)}}
				title={this.props.annotation.id}
			>
				<span className={IconUtil.getUserActionIcon('remove', false, false, true)}
					onClick={() => {AnnotationActions.delete(this.props.annotation)}}>
				</span>
				<span className={IDUtil.cssClassName('label', this.CLASS_PREFIX)}>{label}</span>
				{fragInfo}
				<span className={IDUtil.cssClassName('prov-info', this.CLASS_PREFIX)}>
					(annotations:
						{this.props.annotation.body ? this.props.annotation.body.length : 0}
					, by:
						{this.props.annotation.user})
				</span>
				{icon}
				<span className={IconUtil.getUserActionIcon('play', false, false, true)}
					onClick={() => AnnotationActions.play(this.props.annotation)}>
				</span>
			</li>
		);
	}
};

export default Annotation;