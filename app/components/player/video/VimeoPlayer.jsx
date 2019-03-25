import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';
/*
	Did this (had the old API before):
		https://github.com/vimeo/player.js/blob/master/docs/migrate-from-froogaloop.md

	The API specs:
		https://github.com/vimeo/player.js

*/
class VimeoPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			player : null
		}
	}

	componentDidMount() {
		const iframes = document.querySelectorAll('iframe');
		let iframe = null;
		for (let i = 0, length = iframes.length; i < length; i++) {
			iframe = iframes[i];
			this.playerReady(new Vimeo.Player(iframe));
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		if(nextProps.mediaObject.assetId == this.props.mediaObject.assetId) {
			return false
		}
		return true
	}

	componentWillUnmount() {
		if(this.state.player) {
			this.state.player.api('unload');
		}
	}

	//TODO add support for playing a certain fragment on start
	playerReady(player) {
		player.on('progress', this.props.eventCallbacks.loadProgress.bind(this));
		player.on('timeupdate', this.props.eventCallbacks.playProgress.bind(this));
		player.on('play', this.props.eventCallbacks.onPlay.bind(this));
		player.on('pause', this.props.eventCallbacks.onPause.bind(this));
		player.on('ended', this.props.eventCallbacks.onFinish.bind(this));
		player.on('seeked', this.props.eventCallbacks.onSeek.bind(this));

		if(this.props.onPlayerReady) {
			//send back the api to the owning component
			this.props.onPlayerReady(new VimeoAPI(player));
		}
	}

	render() {
		//iframe ID was altijd player_1 (wat in te vullen voor width / height?)
		return (
			<div id={'video_player__' + this.props.mediaObject.id} className={IDUtil.cssClassName('vimeo-player')}>
				<iframe
					id={'player_' + this.props.mediaObject.id}
					src={this.props.mediaObject.url}
					width="540"
					height="304"
					frameBorder="0">
				</iframe>
			</div>
		)
	}

}

class VimeoAPI extends PlayerAPI {

	constructor(playerAPI) {
		super(playerAPI);
		this.lastVolume = -1;
		this.isMuted = false; //there is no way to read the initial muted setting, so false by default...
	}

	/* ------------ Implemented API calls ------------- */

	play() {
		this.playerAPI.play();
	}

	pause() {
		this.playerAPI.pause();
	}

	seek(secs) {
		this.playerAPI.setCurrentTime(secs).then(function(seconds) {

		}).catch(function(error) {
    		switch (error.name) {
        		case 'RangeError':
            	break;
        	default:
            	break;
    		}
		});
	}

	getPosition(callback=null) {
		if(!callback) {
			console.error('you should provide a callback for this player')
			return -1;
		}
		this.playerAPI.getCurrentTime().then(function(seconds) {
			callback(seconds);
		}).catch(function(error) {
			console.error(error);
			callback(-1);
		});
	}

	getDuration(callback=null) {
		if(!callback) {
			console.error('you should provide a callback for this player')
			return -1;
		}
		this.playerAPI.getDuration().then(function(duration) {
    		callback(duration);
		}).catch(function(error) {
			console.error(error);
			callback(-1);
		});
	}

	isPaused(callback=null) {
		if(!callback) {
			console.error('you should provide a callback for this player')
			return false;
		}
		this.playerAPI.getPaused().then(function(paused) {
			callback(paused);
		}).catch(function(error) {
			console.error(error);
			callback(false);
		});
	}

	//TODO this function has never been tested!
	setVolume(volume, callback=null) {
		if(!callback) {
			console.error('you should provide a callback for this player')
			return false
		}
		if(volume !== 0) {
			this.lastVolume = volume;
		}
		this.playerAPI.setVolume(volume).then(function(v) {
		   callback(true)
		}).catch(function(error) {
		    switch (error.name) {
		        case 'RangeError':
		            callback(false);// the volume was less than 0 or greater than 1
		            break;
		        default:
		        	callback(false);// some other error occurred
		            break;
		    }
		});
	}

	getVolume(callback=null) {
		if(!callback) {
			console.error('you should provide a callback for this player')
			return -1
		}
		this.playerAPI.getVolume().then(function(volume) {
			callback(volume)
		}).catch(function(error) {
		    callback(-1)
		});
	}

	getLastVolume() {
		return this.lastVolume
	}

	//TODO this function has never been tested!
	toggleMute(callback=null) { //this player has no function for mute, so set volume to 0
		if(!callback) {
			console.error('you should provide a callback for this player')
			return false
		}
		this.isMuted = !this.isMuted;
		this.playerAPI.getVolume().then(function(volume) {
			if(this.isMuted) {
				this.lastVolume = volume;
			}
			this.setVolume(isMuted ? 0 : this.lastVolume, callback)
		}).catch(function(error) {
		    callback(false)
		});
	}

	isMuted() {
		return this.isMuted
	}

	/* ----------------------- non-essential player specific calls ----------------------- */

	//TODO fill in the other calls (https://github.com/vimeo/player.js)
}

export default VimeoPlayer;