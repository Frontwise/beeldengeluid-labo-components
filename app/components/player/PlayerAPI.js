import FlexPlayerUtil from '../../util/FlexPlayerUtil';

class PlayerAPI {

	constructor(playerAPI) {
		this.playerAPI = playerAPI;
		this.activeSegment = null;
		this.observers = [];
	}

	getApi() {
		return this.playerAPI; //return the original API
	}

	addObserver(obj) {
		this.observers.push(obj);
	}

	removeObserver(obj) {
		this.observers.splice(this.observers.indexOf(obj), 1);
	}

	notifyObservers() {
		for(let i=0;i<this.observers.length;i++) {
			this.observers[i].update();
		}
	}

	getActiveSegment() {
		return this.activeSegment;
	}

	//TODO this should also include the video url, so it can switch video!!!
	setActiveSegment(mediaObject, activeSegment, play, notify) {
		if(activeSegment) {
			this.activeSegment = activeSegment;
		} else {
			this.activeSegment = {start : 0, end : 0};
		}
		if(play) {
			FlexPlayerUtil.seekRelativeToOnAir(this, this.activeSegment.start, mediaObject)
		}
		if(notify) {
			this.notifyObservers();
		}
	}

}

export default PlayerAPI;