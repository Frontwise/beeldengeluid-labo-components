import PropTypes from 'prop-types';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';
import IDUtil from '../../../util/IDUtil';

//example in pure JS: https://blog.teamtreehouse.com/building-custom-controls-for-html5-videos
//use refs for constant time updates (state triggered rerenders are too slow): https://reactjs.org/docs/refs-and-the-dom.html

//FIXME currently the controls are tied directly to the HTML5VideoPlayer, since off-air content only exists for B&G material,
//which is played using that player. Ideally though these controls could/should be tied to the FlexPlayer and should override all existing player's controls
class FlexPlayerControls extends React.Component {

	constructor(props) {
		super(props);
		console.debug(this.props.api.isPaused())
		this.state = {
			playBtnText : 'Pause'
		}
		this.seekBarRef = React.createRef();//not using state for this, since media playback updates every second!
	}

	componentDidMount() {
		//FIXME this part is not player agnostic yet. For now this is fine (see comment at the top)
		this.props.api.getApi().addEventListener('timeupdate', () => {
	  		this.onPlayProgress();
		});
	}

	onPlayProgress() {
		//update the seekbar
		const value = (100 / this.props.duration) * FlexPlayerUtil.timeRelativeToOnAir(
  			this.props.api.getPosition(),
  			this.props.mediaObject
  		);
  		this.seekBarRef.current.value = value;

  		//check if the end of the on-air content has been reached
  		if(FlexPlayerUtil.isTimeAfterOnAir(this.props.api.getPosition(), this.props.mediaObject)) {
  			this.props.api.pause();
  		}
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

	//FIXME this function is not yet player agnostic and only works for the HTML5player API
	//FIXME actually force the DIV encapsulating the video tag into full screen mode to avoid hacking the native controls
	//https://stackoverflow.com/questions/7130397/how-do-i-make-a-div-full-screen
	//https://www.w3schools.com/howto/howto_js_fullscreen_overlay.asp
	onToggleFullScreen() {
		const api = this.props.api.getApi();
		if (api.requestFullscreen) {
			api.requestFullscreen();
		} else if (api.mozRequestFullScreen) {
			api.mozRequestFullScreen(); // Firefox
		} else if (api.webkitRequestFullscreen) {
			api.webkitRequestFullscreen(); // Chrome and Safari
		}
	}

	render() {
		return (
			<div className={IDUtil.cssClassName('flex-controls')}>
				<div className="toggle-play-overlay">
					<button type="button" onClick={this.onTogglePlay.bind(this)}>{this.state.playBtnText}</button>
				</div>


				<input className="seekbar" type="range" ref={this.seekBarRef} defaultValue="0" onChange={this.onSeek.bind(this)}/>

				<input className="volume" type="range" ref={this.volumeRef} min="0" max="1" step="0.1" defaultValue="1" onChange={this.onVolumeChange.bind(this)}/>

				<div className="buttons">
					<button type="button" onClick={this.onToggleMute.bind(this)}>
						<span className={'glyphicon' + (this.props.api.isMuted() ? ' glyphicon-volume-off' : ' glyphicon-volume-up')}></span>
					</button>
					<button type="button" onClick={this.onToggleFullScreen.bind(this)}>
						<span className="glyphicon glyphicon-fullscreen"/>
					</button>
				</div>

			</div>
		)
	}

}

export default FlexPlayerControls;