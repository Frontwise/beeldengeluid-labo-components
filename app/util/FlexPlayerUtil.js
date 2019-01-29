
/* ---------------------------- CALCULATIONS RELATIVE TO ON-AIR DURATION --------------------------------- */

const FlexPlayerUtil = {

	onAirDuration(realPlayerDuration, mediaObject) {
		if(typeof(mediaObject.resourceStart) === 'number' && mediaObject.resourceStart > 0 && typeof(mediaObject.resourceEnd) === 'number') {
			return realPlayerDuration - (realPlayerDuration - mediaObject.resourceEnd) - mediaObject.resourceStart
		}
		return realPlayerDuration
	},

	timeRelativeToOnAir(realPlayerTime, mediaObject) {
		if(typeof(mediaObject.resourceStart) === 'number' && mediaObject.resourceStart > 0 && typeof(mediaObject.resourceEnd) === 'number') {
			if(realPlayerTime >= mediaObject.resourceStart) {
				if(realPlayerTime >= mediaObject.resourceEnd) {
					return mediaObject.resourceEnd
				} else {
					return realPlayerTime - mediaObject.resourceStart
				}
			} else {
				return 0
			}
		}
		return realPlayerTime
	},

	seekRelativeToOnAir(playerAPI, relativeDurationPos, mediaObject) {
		let time = relativeDurationPos;
		if(typeof(mediaObject.resourceStart) === 'number' && mediaObject.resourceStart > 0 && typeof(mediaObject.resourceEnd) === 'number') {
			time = relativeDurationPos + mediaObject.resourceStart
		}
		playerAPI.seek(time);
	}

}

export default FlexPlayerUtil;