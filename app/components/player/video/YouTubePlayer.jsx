import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';

//See https://developers.google.com/youtube/iframe_api_reference

class YouTubePlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			player : null
		}
	}

	componentDidMount() {
		if(!document.getElementById('youtubeiframeapi')) {
			const tag = document.createElement('script');
			tag.id = 'youtubeiframeapi';
			tag.src = "https://www.youtube.com/iframe_api";
			const firstScriptTag = document.getElementsByTagName('script')[0];
			firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
			window.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady.bind(this);
		} else {
			this.onYouTubeIframeAPIReady();
		}
	}

	componentDidUpdate() {
		if(!this.state.player) {
			this.onYouTubeIframeAPIReady();
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
		if(this.state.player) {
			this.state.player.destroy();
			clearInterval(this.updateInterval);
		}
	}

	//TODO add support for playing a certain fragment on start
	onYouTubeIframeAPIReady() {
		console.debug('called')
		let loaded = false;
		try {
    		if (YT && YT.loaded == 1) {
    			loaded = true;
    		}
		} catch(e) {
			loaded = false;
		}
		if(loaded) {
			const player = new YT.Player('video_player__' + this.props.mediaObject.id, {
				height: '320',
				width: '480',
				videoId: this.getVideoId(),//M7lc1UVf-VE
				events: {
					'onReady': this.onPlayerReady.bind(this),
					'onStateChange': this.onPlayerStateChange.bind(this)
				}
			});
			this.setState({player: player});
		} else {
			console.debug('got here too soon');
		}
	}

	getVideoId() {
		if(this.props.mediaObject) {
			if(this.props.mediaObject.url.indexOf('youtu.be') != -1) {
				let tmp = this.props.mediaObject.url.split('/');
				return tmp[tmp.length -1];
			} else if(this.props.mediaObject.url.indexOf('v=') != -1){
				return this.props.mediaObject.url.substring(
					this.props.mediaObject.url.indexOf('v=') + 2
				);
			}
		}
		return null;

	}

	onPlayerReady(event) {
		if(this.props.onPlayerReady) {
			//send back the api to the owning component
			this.props.onPlayerReady(new YouTubeAPI(this.state.player));
		}

		//the youtube iframe API does not have an equivalent of onTime or onProgress.
		this.videotime = 0;
  		this.updateInterval = setInterval(this.updateTime.bind(this), 100);
	}

	updateTime() {
		const oldTime = this.videotime;
		if(this.state.player && this.state.player.getCurrentTime) {
			this.videotime = this.state.player.getCurrentTime();
		}
		if(this.videotime !== oldTime) {
			this.onProgress(this.videotime);
		}
	}

	onProgress(currentTime) {
		if(this.props.eventCallbacks) {
			this.props.eventCallbacks.playProgress(currentTime);
		}
	}

	onPlayerStateChange(event) {
		if(this.props.eventCallbacks) {
			switch (event.data) {
				case YT.PlayerState.BUFFERING : this.props.eventCallbacks.loadProgress(event);break;
				case YT.PlayerState.PLAYING : this.props.eventCallbacks.onPlay(event);break;
				case YT.PlayerState.PAUSED : this.props.eventCallbacks.onPause(event);break;
				case YT.PlayerState.ENDED : this.props.eventCallbacks.onFinish(event);break;
			}
		}
	}

	render() {
		return (
			<div id={'video_player__' + this.props.mediaObject.id} className={IDUtil.cssClassName('youtube-player')}/>
		)
	}
}

class YouTubeAPI extends PlayerAPI {

	constructor(playerAPI) {
		super(playerAPI);
	}

	/* ------------ Implemented API calls ------------- */

	play() {
		this.playerAPI.playVideo();
	}

	pause() {
		this.playerAPI.pauseVideo();
	}

	seek(secs) {
		this.playerAPI.seekTo(secs);
	}

	getPosition(callback=null) {
		if(!callback) {
			return this.playerAPI.getCurrentTime()
		}
		callback(this.playerAPI.getCurrentTime());
	}

	getDuration(callback=null) {
		if(!callback) {
			return this.playerAPI.getDuration()
		}
		callback(this.playerAPI.getDuration());
	}

	isPaused(callback=null) {
		if(!callback) {
			return this.playerAPI.getPlayerState() == 2
		}
		callback(this.playerAPI.getPlayerState() == 2);
	}

	setVolume(volume) { //range between 0-1
		this.playerAPI.setVolume(volume * 100); //range between 0-100
	}

	setMute(isMuted) {
		if(this.playerAPI.isMuted()) {
			this.playerAPI.mute();
		} else {
			this.playerAPI.unMute()
		}
	}

	isMuted() {
		return this.playerAPI.isMuted()
	}

}

export default YouTubePlayer;