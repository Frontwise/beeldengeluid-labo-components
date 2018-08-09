import moment from 'moment';
import TimeUtil from '../../../util/TimeUtil';
import IconUtil from '../../../util/IconUtil';
import IDUtil from '../../../util/IDUtil';

class SegmentationControls extends React.Component {

	constructor(props) {
		super(props);
	}

	shouldComponentUpdate(nextProps, nextState) {
		if(nextProps.start !== this.props.start || nextProps.end !== this.props.end) {
			return true;
		}
		if(this.props.annotation === null && (nextProps.annotation && nextProps.annotation.id)) {
			return true;
		}
		if(nextProps.annotation === null && (this.props.annotation && this.props.annotation.id)) {
			return true;
		}
		return false;
	}

	componentDidUpdate() {
		this.startTime.value = TimeUtil.formatTime(this.props.start);
		this.endTime.value = TimeUtil.formatTime(this.props.end);
	}

	/* ---------------------- FUNCTION CONTROLS ------------------- */

	setManualStart(e) {
		e.preventDefault();
		this.props.controls.setManualStart(
			moment.duration(this.startTime.value).asSeconds()
		);
		return false;
	}

	setManualEnd(e) {
		e.preventDefault();
		this.props.controls.setManualEnd(
			moment.duration(this.endTime.value).asSeconds()
		);
		return false;
	}

	setStart() {
		this.props.controls.setStart();
	}

	setEnd() {
		this.props.controls.setEnd();
	}

	playStart() {
		this.props.controls.playStart();
	}

	playEnd() {
		this.props.controls.playEnd();
	}

	render() {
		let title = 'new';
		let setStartBtn = null;
		let playStartBtn = null;
		let setEndBtn = null;
		let playEndBtn = null;
		if(this.props.controls.setStart) {
			setStartBtn = (
				<button className="btn btn-default" type="button" onClick={this.setStart.bind(this)}
					title="When you press this, the start time will be same as the current player time (press i)">
					[
				</button>
			)
		}
		if(this.props.controls.setEnd) {
			setEndBtn = (
				<button className="btn btn-default" type="button" onClick={this.setEnd.bind(this)}
					title="When you press this, the end time will be same as the current player time (press o)">
					]
				</button>
			)
		}
		if(this.props.controls.playStart) {
			playStartBtn = (
				<button className="btn btn-default" type="button" onClick={this.playStart.bind(this)}
					title="When you press this, the player will skip to the defined start point (SHIFT+i)">
					&nbsp;<span className={IconUtil.getUserActionIcon('play')}></span>
				</button>
			)
		}
		if(this.props.controls.playEnd) {
			playEndBtn = (
				<button className="btn btn-default" type="button" onClick={this.playEnd.bind(this)}
					title="When you press this, the player will skip to the defined end point (SHIFT+o)">
					&nbsp;<span className={IconUtil.getUserActionIcon('play')}></span>
				</button>
			)
		}
		if(this.props.annotation) {
			title = '[' + TimeUtil.formatTime(this.props.start) + ' - ' + TimeUtil.formatTime(this.props.end) + ']';
		}
		return (
			<div className={IDUtil.cssClassName('segmentation-controls')}>
				<div className="row">
					<div className="col-md-12">
						<div className="row">
							<div className="col-md-12">
								<h4>Editing:&nbsp;{title}</h4>
							</div>
						</div>
						<div className="row">

							<div className="col-md-6">
								<form onSubmit={this.setManualStart.bind(this)}>
									<div className="input-group">
										<span className="input-group-addon start-group">
											Start
										</span>
										<input ref={input => (this.startTime = input)} type="text" className="form-control" defaultValue="00:00:00"/>
										<span className="input-group-btn">
											<button className="btn btn-default" type="submit"
												title="When you press this the start time will be set to the time you entered in the input field">
												Set
											</button>
											{setStartBtn}
											{playStartBtn}
										</span>
									</div>
								</form>
							</div>

							<div className="col-md-6">
								<form onSubmit={this.setManualEnd.bind(this)}>
									<div className="input-group">
										<span className="input-group-addon end-group">&nbsp;End&nbsp;</span>
										<input ref={input => (this.endTime = input)} type="text" className="form-control" defaultValue="00:00:00"/>
										<span className="input-group-btn">
											<button className="btn btn-default" type="submit"
												title="When you press this the end time will be set to the time you entered in the input field">
												Set
											</button>
											{setEndBtn}
											{playEndBtn}
										</span>
									</div>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}
};

export default SegmentationControls;
