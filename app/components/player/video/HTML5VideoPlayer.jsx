/*
Implement the following:
	- https://www.w3.org/2010/05/video/mediaevents.html
	- http://ronallo.com/blog/html5-video-caption-cue-settings-tester/
	- http://www.w3schools.com/tags/ref_av_dom.asp

*/
import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';
import FlexPlayerControls from './FlexPlayerControls';

class HTML5VideoPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playerAPI : null,
			fullScreen : false
		}
		this.controlsRef = React.createRef();
		this.alreadyShowing = true;
		this.alertTimerId = null;
	}

	componentDidMount() {
		const vid = document.getElementById('video-player');
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
		vid.setAttribute("controlsList", "nodownload");
	}

	shouldComponentUpdate(nextProps, nextState) {
		if(nextState.playerAPI != null && this.state.playerAPI == null) { //rerender when the player is ready
			return true
		}
		if(nextState.fullScreen != this.state.fullScreen) { //rerender when full screen is toggled
			return true
		}
		if(nextProps.mediaObject.assetId == this.props.mediaObject.assetId) { //but only rerender when the media object changed
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
				{playerAPI : new HTML5VideoPlayerAPI(playerAPI)},
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

	toggleFullScreen() {
		this.setState({fullScreen : !this.state.fullScreen})
	}

	toggleControls(e) {
		if(this.controlsRef.current) {
			if(!this.alreadyShowing) {
				this.controlsRef.current.setVisible(true);
				this.alreadyShowing = true;
			}

	        if (this.alertTimerId == null) {
	            this.alertTimerId = setTimeout(() => {
	            	this.alreadyShowing = false;
					this.controlsRef.current.setVisible(false);
	            }, 2000);
	        } else {
	            clearTimeout(this.alertTimerId);
	            this.alertTimerId = setTimeout(() => {
	            	this.alreadyShowing = false;
	                this.controlsRef.current.setVisible(false);
	            }, 2000);
	        }
	    }
	}

	renderCustomControls = (playerAPI, hideOffAirContent) => {
		if(playerAPI && hideOffAirContent) {
			return (
				<FlexPlayerControls
					ref={this.controlsRef}
					api={playerAPI}
					mediaObject={this.props.mediaObject}
					duration={FlexPlayerUtil.onAirDuration(playerAPI.getDuration(), this.props.mediaObject)}
					toggleFullScreen={this.toggleFullScreen.bind(this)}
				/>
			)
		}
		return null
	}

	render() {
		//only show the custom controls when absolutely necessary. They are not yet perfect
		const customControls = this.renderCustomControls(this.state.playerAPI, this.props.hideOffAirContent);
		const nativeControls = customControls ? null : {controls : true, controlsList : 'nodownload', muted : true}
		return (
			<div className={IDUtil.cssClassName('html5-video-player')}>
				<div
					className={this.state.fullScreen ? 'full-screen' : 'default'}
					id={'__htmlvid__' + this.props.mediaObject.id}
					onMouseMove={this.toggleControls.bind(this)}
				>
					<video
						id="video-player"
						width="100%"
						className={IDUtil.cssClassName('html5-video-player')}
						crossOrigin={
							this.props.useCredentials ? "use-credentials" : null
						}
						{...nativeControls}
					>
						<source src={this.props.mediaObject.url}></source>
						Your browser does not support the video tag
					</video>
					{customControls}
				</div>
			</div>
		)
	}

}

//TODO implement volume & mute functions as well
//TODO make sure the getPosition, getDuration and isPaused also supports direct returns accross all other players (check Vimeo)
class HTML5VideoPlayerAPI extends PlayerAPI {

	constructor(playerAPI) {
		super(playerAPI);
		this.lastVolume = this.playerAPI.volume;
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

export default HTML5VideoPlayer;