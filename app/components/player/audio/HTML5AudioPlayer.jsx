//http://www.europeana.eu/portal/en/radio.html
//https://github.com/europeana/radio-player
//https://github.com/521dimensions/amplitudejs
import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';

class HTML5AudioPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playerAPI : null,
			initialSeekDone : false
		}
	}

	componentDidMount() {
		const vid = document.getElementById('audio_player__' + this.props.mediaObject.assetId);
		if(this.props.eventCallbacks) {
			vid.onprogress = this.props.eventCallbacks.loadProgress.bind(this);
			vid.ontimeupdate = this.props.eventCallbacks.playProgress.bind(this);
			vid.onplay = this.props.eventCallbacks.onPlay.bind(this);
			vid.onpause = this.props.eventCallbacks.onPause.bind(this);
			vid.onended = this.props.eventCallbacks.onFinish.bind(this);
			vid.onseeked = this.props.eventCallbacks.onSeek.bind(this);
			vid.onloadedmetadata = this.onReady.bind(this, vid);
		}
		//needed until React will support the controlsList attribute of the video tag
		vid.setAttribute("controlsList","nodownload");
	}

	shouldComponentUpdate(nextProps, nextState) {
		if(nextState.playerAPI != null && this.state.playerAPI == null) { //rerender when the player is ready
			return true
		}
		if(nextProps.mediaObject.assetId == this.props.mediaObject.assetId) {
			if(this.props.mediaObject.segments && nextProps.segment.start != this.props.segment.start) {
				this.state.playerAPI.seek(nextProps.segment.start);
			}
			return false
		}
		return true
	}

	componentDidUpdate() {
		this.state.playerAPI.getApi().load()
	}

	onReady(playerAPI) {
		if(this.state.playerAPI == null) {
			this.setState(
				{playerAPI : new HTML5AudioPlayerAPI(playerAPI)},
				() => {
					this.onSourceLoaded();
				}
			);
		} else {
			this.onSourceLoaded();
		}
	}

	onSourceLoaded() {
		if(this.state.playerAPI) {
			//then seek to the starting point
			const start = this.props.mediaObject.start ? this.props.mediaObject.start : 0;
			if(start > 0) {
				this.state.playerAPI.seek(start / 1000);
			}

			//skip to the on-air content
			if(this.props.segment) {
				this.state.playerAPI.seek(this.props.segment.start);
			} else if(FlexPlayerUtil.containsOffAirStartOffset(this.props.mediaObject)) {
				this.state.playerAPI.seek(this.props.mediaObject.resourceStart);
			}

			//notify the owner
			if(this.props.onPlayerReady) {
				this.props.onPlayerReady(this.state.playerAPI);
			}
		} else {
			console.error('No player API? (too many renders?)');
		}
	}

	render() {
		return (
			<audio
				className={IDUtil.cssClassName('html5-audio-player')}
				id={'audio_player__' + this.props.mediaObject.assetId}
				controls controlsList="nodownload" crossOrigin={
					this.props.useCredentials ? "use-credentials" : null
				}>
				<source src={this.props.mediaObject.url}></source>
			</audio>
		)
	}

}

class HTML5AudioPlayerAPI extends PlayerAPI {

	constructor(playerAPI) {
		super(playerAPI);
	}

	/* ------------ Implemented API calls ------------- */

	play() {
		this.playerAPI.play();
	}

	pause() {
		this.playerAPI.pause();
	}

	seek(secs) {
		this.playerAPI.currentTime = secs;
	}

	getPosition(callback=null) {
		if(!callback) {
			return this.playerAPI.currentTime;
		}
		callback(this.playerAPI.currentTime);
	}

	getDuration(callback=null) {
		if(!callback) {
			return this.playerAPI.duration;
		}
		callback(this.playerAPI.duration);
	}

	isPaused(callback=null) {
		if(!callback) {
			return this.playerAPI.paused;
		}
		callback(this.playerAPI.paused);
	}

	setVolume(volume) { //value between 0-1
		if(volume !== 0) {
			this.lastVolume = volume;
		}
		this.playerAPI.volume = volume;
	}

	getVolume() {
		return this.playerAPI.volume;
	}

	getLastVolume() {
		return this.lastVolume
	}

	toggleMute() {
		this.playerAPI.muted = !this.playerAPI.muted
		if(this.isMuted()) {
			this.lastVolume = this.playerAPI.volume;
		}
	}

	isMuted() {
		return this.playerAPI.muted
	}

}

export default HTML5AudioPlayer;