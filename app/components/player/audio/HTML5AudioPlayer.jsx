//http://www.europeana.eu/portal/en/radio.html
//https://github.com/europeana/radio-player
//https://github.com/521dimensions/amplitudejs
import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';

class HTML5AudioPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playerAPI : null
		}
	}

	componentDidMount() {
		const vid = document.getElementById('audio_player__' + this.props.mediaObject.id);
		if(this.props.eventCallbacks) {
			vid.onprogress = this.props.eventCallbacks.loadProgress.bind(this);
			vid.ontimeupdate = this.props.eventCallbacks.playProgress.bind(this);
			vid.onplay = this.props.eventCallbacks.onPlay.bind(this);
			vid.onpause = this.props.eventCallbacks.onPause.bind(this);
			vid.onended = this.props.eventCallbacks.onFinish.bind(this);
			vid.onseeked = this.props.eventCallbacks.onSeek.bind(this);
			vid.oncanplay = this.onReady.bind(this, vid);
		}
		//needed until React will support the controlsList attribute of the video tag
		vid.setAttribute("controlsList","nodownload");
	}

	onReady(playerAPI) {
		this.setState({playerAPI : playerAPI}, function() {
			if(this.props.onPlayerReady) {
				this.props.onPlayerReady(new HTML5AudioPlayerAPI(this.state.playerAPI));
			}
			const start = this.props.mediaObject.start ? this.props.mediaObject.start : 0;
			if(start > 0) {
				this.state.playerAPI.currentTime = start / 1000;
			}
		}.bind(this));
	}

	render() {
		return (
			<video
				className={IDUtil.cssClassName('html5-audio-player')}
				id={'audio_player__' + this.props.mediaObject.id}
				controls controlsList="nodownload" crossOrigin="use-credentials">
				<source src={this.props.mediaObject.url}></source>
			</video>
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

	getPosition(callback) {
		callback(this.playerAPI.currentTime);
	}

	getDuration(callback) {
		callback(this.playerAPI.duration);
	}

	isPaused(callback) {
		callback(this.playerAPI.paused);
	}

	/* ----------------------- non-essential player specific calls ----------------------- */

	//TODO
}

export default HTML5AudioPlayer;