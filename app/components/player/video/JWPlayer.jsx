import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';

//key: cp1KvUB8slrOvOjg+U8melMoNwxOm/honmDwGg==
//https://developer.jwplayer.com/jw-player/docs/developer-guide/api/javascript_api_reference

//@deprecated, don't use this player anymore. Just use the HTML5VideoPlayer
class JWPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playerAPI : null
		}
	}

	componentDidMount() {
		console.debug('MOUNTING JW PLAYER')
		let type = 'mp4';
		if (this.props.mediaObject.mimeType && this.props.mediaObject.mimeType.indexOf('audio') != -1) {
			type = 'mp3';
		}
		const playList = [{
			file : this.props.mediaObject.url,
			withCredentials : this.props.useCredentials,
			type : type,
			image: null
		}]
		const playerAPI = jwplayer('jw_player').setup({
			playlist: playList,
			// height:'100%',
			// width: 'auto',
			controls : true,
			mute : true,
			autostart: false,
			key: 'cp1KvUB8slrOvOjg+U8melMoNwxOm/honmDwGg=='
		})
		if(this.props.eventCallbacks) {
			playerAPI.on('bufferChange', this.props.eventCallbacks.loadProgress.bind(this))
			.on('time', this.props.eventCallbacks.playProgress.bind(this))
			.on('play', this.props.eventCallbacks.onPlay.bind(this))
			.on('pause', this.props.eventCallbacks.onPause.bind(this))
			.on('complete', this.props.eventCallbacks.onFinish.bind(this))
			.on('seek', this.props.eventCallbacks.onSeek.bind(this))
			.on('ready', this.onReady.bind(this, playerAPI));
		}
	}

	onReady(playerAPI) {
		console.debug('READY JW')
		if(this.state.playerAPI == null) {
			this.setState(
				{playerAPI : playerAPI},
				() => {
					this.onSourceLoaded();
				}
			);
		} else {
			this.onSourceLoaded();
		}
	}

	onSourceLoaded() {
		//then seek to the starting point
		const start = this.props.mediaObject.start ? this.props.mediaObject.start : 0;
		if(start > 0) {
			this.state.playerAPI.seek(start / 1000);
		}

		//notify the owner
		if(this.props.onPlayerReady) {
			this.props.onPlayerReady(new JWPlayerAPI(this.state.playerAPI));
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		if(nextProps.mediaObject.assetId == this.props.mediaObject.assetId) {
			return false
		}
		return true
	}

	componentDidUpdate() {
		console.debug('make sure the new media object ' + this.props.mediaObject.assetId + ' is loaded')
	}

	componentWillUnmount() {
		if(this.state.playerAPI) {
			console.debug('unmounting the JW player?')
			this.state.playerAPI.remove();
		}
	}

	render() {
		console.debug('rerendering???')
		return (
			<div id={'jw_player'} className={IDUtil.cssClassName('jw-player')}/>
		);
	}

}

class JWPlayerAPI extends PlayerAPI {

	constructor(playerAPI) {
		super(playerAPI);
		this.lastVolume = -1;
	}

	/* ------------ Implemented API calls ------------- */

	play() {
		this.playerAPI.play();
	}

	pause() {
		this.playerAPI.pause();
	}

	seek(secs) {
		this.playerAPI.seek(secs);
	}

	getPosition(callback=null) {
		if(!callback) {
			return this.playerAPI.getPosition();
		}
		callback(this.playerAPI.getPosition());
	}

	getDuration(callback=null) {
		if(!callback) {
			return this.playerAPI.getDuration();
		}
		callback(this.playerAPI.getDuration());
	}

	isPaused(callback=null) {
		if(!callback) {
			return this.playerAPI.getState() == 'paused';
		}
		callback(this.playerAPI.getState() == 'paused');
	}

	setVolume(volume) { //volume between 0-1, JW uses 0-100
		if(volume !== 0) {
			this.lastVolume = volume;
		}
		this.playerAPI.setVolume(volume * 100);
	}

	getVolume() {
		return this.playerAPI.getVolume();
	}

	getLastVolume() {
		return this.lastVolume;
	}

	toggleMute() {
		this.playerAPI.setMute(!this.playerAPI.getMute());
		if(this.isMuted()) {
			this.lastVolume = this.playerAPI.getVolume();
		}

	}

	isMuted() {
		return this.playerAPI.getMute()
	}

	/* ----------------------- non-essential player specific calls ----------------------- */

	//TODO
}

export default JWPlayer;