/*
Implement the following:
	- https://www.w3.org/2010/05/video/mediaevents.html
	- http://ronallo.com/blog/html5-video-caption-cue-settings-tester/
	- http://www.w3schools.com/tags/ref_av_dom.asp

*/
import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';

class HTML5VideoPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playerAPI : null
		}
	}

	componentDidMount() {
		const vid = document.getElementById('video_player__' + this.props.mediaObject.id);
		if(this.props.eventCallbacks) {
			vid.onprogress = this.props.eventCallbacks.loadProgress.bind(this);
			vid.ontimeupdate = this.props.eventCallbacks.playProgress.bind(this);
			vid.onplay = this.props.eventCallbacks.onPlay.bind(this);
			vid.onpause = this.props.eventCallbacks.onPause.bind(this);
			vid.onended = this.props.eventCallbacks.onFinish.bind(this);
			vid.onseeked = this.props.eventCallbacks.onSeek.bind(this);
			vid.onloadedmetadata = this.onReady.bind(this, vid);
		}
	}

	onReady(playerAPI) {
		if(this.state.playerAPI == null) {
			this.setState({playerAPI : playerAPI}, function() {
				if(this.props.onPlayerReady) {
					this.props.onPlayerReady(new HTML5VideoPlayerAPI(this.state.playerAPI));
				}
				let start = this.props.mediaObject.start ? this.props.mediaObject.start : 0;
				if(start > 0) {
					this.state.playerAPI.currentTime = start / 1000;
				}
			}.bind(this));
		} else {
			console.debug('There is something wrong, onReady is being triggered too often');
		}
	}

	render() {
		return (
			<video className={IDUtil.cssClassName('html5-video-player')}
				id={'video_player__' + this.props.mediaObject.id} controls>
				<source src={this.props.mediaObject.url}></source>
			</video>
		)
	}

}

class HTML5VideoPlayerAPI extends PlayerAPI {

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
		if(secs != isNaN) {
			this.playerAPI.currentTime = secs;
		}
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

export default HTML5VideoPlayer;