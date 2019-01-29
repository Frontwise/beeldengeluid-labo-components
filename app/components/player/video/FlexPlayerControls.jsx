import PropTypes from 'prop-types';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';

class FlexPlayerControls extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playBtnText : 'Play',
			muteBtnText : 'Mute'
		}
		this.seekBarRef = React.createRef();//not using state for this, since media playback updates every second!
	}

	componentDidMount() {
		//TODO think about removing the event listener later on
		this.props.api.getApi().addEventListener('timeupdate', () => {
	  		const value = (100 / this.props.duration) * FlexPlayerUtil.timeRelativeToOnAir(
	  			this.props.api.getApi().currentTime,
	  			this.props.mediaObject
	  		);
	  		this.seekBarRef.current.value = value;
		});
	}

	onTogglePlay() {
		let buttonText = "Pause";
		if (this.props.api.getApi().paused === true) {
			this.props.api.play();
		} else {
			this.props.api.pause();
			buttonText = "Play"
		}
		this.setState({
			playBtnText : buttonText
		})
	}

	onToggleMute() {
		this.props.api.getApi().muted = !this.props.api.getApi().muted;
		this.setState({
			muteBtnText : this.props.api.getApi().muted ? "Unmute" : "Mute"
		})
	}

	onSeek(e) {
		// Calculate the new time
  		var time = this.props.duration * (e.target.value / 100);
  		// Update the video time
  		FlexPlayerUtil.seekRelativeToOnAir(this.props.api, time, this.props.mediaObject)
	}

	onVolumeChange(e) {
		this.props.api.volume = e.target.value;
	}

	render() {
		return (
			<div>
				<button type="button" onClick={this.onTogglePlay.bind(this)}>{this.state.playBtnText}</button>
				<input type="range" ref={this.seekBarRef} defaultValue="0" onChange={this.onSeek.bind(this)}/>
				<button type="button" onClick={this.onToggleMute.bind(this)}>{this.state.muteBtnText}</button>
				<input type="range" min="0" max="1" step="0.1" value="1" onChange={this.onVolumeChange.bind(this)}/>
				<button type="button" id="full-screen">Full-Screen</button>
			</div>
		)
	}

}

export default FlexPlayerControls;