import TimeUtil from '../../../util/TimeUtil';

//TODO rewrite this class so it focuses on showing captions
//TODO this component is currently not used anymore. Either repurpose or scrap
class AutoQueue extends React.Component {

	constructor(props) {
		super(props);
	}

	determineCurrentAnnotation() {
		let currentAnnotation = null;
		if(this.props.annotations) {
			let pos = TimeUtil.playerPosToMillis(this.props.curPosition);
			currentAnnotation = this.props.annotations.filter((a, index)=> {
				if(a.start < pos && a.end > pos) {
					this.annotationIndex = index;
					return true;
				}
			})
		}
		return currentAnnotation;
	}

	previousAnnotation() {
		if(this.annotationIndex > 0) {
			let a = this.props.annotations[--this.annotationIndex];
			console.debug(a);
			this.props.playerAPI.seek(a.start / 1000);
		}
	}

	nextAnnotation() {
		if(this.annotationIndex < this.props.annotations.length) {
			let a = this.props.annotations[++this.annotationIndex];
			this.props.playerAPI.seek(a.start / 1000);
		}
	}

	render() {
		let currentAnnotation = this.determineCurrentAnnotation();
		//this depends on the format of the annotation and should be harmonized in the back-end
		if(currentAnnotation && currentAnnotation.length && currentAnnotation.length === 1) {
			currentAnnotation = currentAnnotation[0].words;
		}
		return (
			<div>
				<div className="input-group">
					<span className="input-group-btn">
						<button className="btn btn-default" type="button" onClick={this.previousAnnotation.bind(this)}
							title="Skip to the previous annotation">
							Previous
						</button>
					</span>
					<textarea ref={input => (this.annotation = input)} type="text" className="form-control" readOnly
						value={currentAnnotation}></textarea>

					<span className="input-group-btn">
						<button className="btn btn-default" type="button" onClick={this.nextAnnotation.bind(this)}
							title="Skip to the next annotation">
							Next
						</button>
					</span>
				</div>
			</div>
		);
	}

}

export default AutoQueue;
