import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';

//key: cp1KvUB8slrOvOjg+U8melMoNwxOm/honmDwGg==
//https://developer.jwplayer.com/jw-player/docs/developer-guide/api/javascript_api_reference

class JWPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playerAPI : null
		}
	}

	componentDidMount() {
		let type = 'mp4';
		if (this.props.mediaObject.mimeType && this.props.mediaObject.mimeType.indexOf('audio') != -1) {
			type = 'mp3';
		}
		const playList = [{
			file : this.props.mediaObject.url,
			withCredentials : true,
			type : type,
			image: null
		}]
		const playerAPI = jwplayer('video_player__' + this.props.mediaObject.id).setup({
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
		this.setState({playerAPI : playerAPI}, function() {
			if(this.props.onPlayerReady) {
				this.props.onPlayerReady(new JWPlayerAPI(this.state.playerAPI));
			}
			const start = this.props.mediaObject.start ? this.props.mediaObject.start : 0;
			if(start > 0) {
				this.state.playerAPI.seek(start / 1000);
			}
		}.bind(this));
	}

	componentWillUnmount() {
		if(this.state.playerAPI) {
			this.state.playerAPI.remove();
		}
	}

	render() {
		return (
			<div id={'video_player__' + this.props.mediaObject.id} className={IDUtil.cssClassName('jw-player')}/>
		);
	}

}

class JWPlayerAPI extends PlayerAPI {

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
		this.playerAPI.seek(secs);
	}

	getPosition(callback) {
		callback(this.playerAPI.getPosition());
	}

	getDuration(callback) {
		callback(this.playerAPI.getDuration());
	}

	isPaused(callback) {
		callback(this.playerAPI.getState() == 'paused');
	}

	/* ----------------------- non-essential player specific calls ----------------------- */

	//TODO
}

export default JWPlayer;