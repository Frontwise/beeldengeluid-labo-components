import PropTypes from 'prop-types';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';

//example in pure JS: https://blog.teamtreehouse.com/building-custom-controls-for-html5-videos
//use refs for constant time updates (state triggered rerenders are too slow): https://reactjs.org/docs/refs-and-the-dom.html

//FIXME currently the controls are tied directly to the HTML5VideoPlayer, since off-air content only exists for B&G material,
//which is played using that player. Ideally though these controls could/should be tied to the FlexPlayer and should override all existing player's controls
class FlexPlayerControls extends React.Component {

	constructor(props) {
		super(props);
		console.debug(this.props.api.isPaused())
		this.state = {
			playBtnText : 'Pause',
			muteBtnText : this.props.api.isMuted() ? 'Unmute' : 'Mute'
		}
		this.seekBarRef = React.createRef();//not using state for this, since media playback updates every second!
	}

	componentDidMount() {
		//FIXME this is the only part of this component that is not player-generic. For now this is fine (see comment at the top)
		this.props.api.getApi().addEventListener('timeupdate', () => {
	  		const value = (100 / this.props.duration) * FlexPlayerUtil.timeRelativeToOnAir(
	  			this.props.api.getPosition(),
	  			this.props.mediaObject
	  		);
	  		this.seekBarRef.current.value = value;
		});
	}

	onTogglePlay() {
		let buttonText = "Pause";
		if (this.props.api.isPaused()) {
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
		this.props.api.toggleMute();
		this.setState({
			muteBtnText : this.props.api.isMuted() ? "Unmute" : "Mute"
		})
	}

	onSeek(e) {
  		const time = this.props.duration * (e.target.value / 100);
  		FlexPlayerUtil.seekRelativeToOnAir(this.props.api, time, this.props.mediaObject)
	}

	onVolumeChange(e) {
		this.props.api.setVolume(e.target.value);
	}

	render() {
		return (
			<div>
				<button type="button" onClick={this.onTogglePlay.bind(this)}>{this.state.playBtnText}</button>
				<input type="range" ref={this.seekBarRef} defaultValue="0" onChange={this.onSeek.bind(this)}/>
				<button type="button" onClick={this.onToggleMute.bind(this)}>{this.state.muteBtnText}</button>
				<input type="range" ref={this.volumeRef} min="0" max="1" step="0.1" defaultValue="1" onChange={this.onVolumeChange.bind(this)}/>
				<button type="button" id="full-screen">Full-Screen</button>
			</div>
		)
	}

}

export default FlexPlayerControls;