
/* ---------------------------- CALCULATIONS RELATIVE TO ON-AIR DURATION --------------------------------- */

const FlexPlayerUtil = {

	onAirDuration(realPlayerDuration, mediaObject) {
		if(FlexPlayerUtil.containsOffAirContent(mediaObject)) {
			let duration = realPlayerDuration;
			if(FlexPlayerUtil.containsOffAirStartOffset(mediaObject)) {
				duration -= mediaObject.resourceStart;
			}
			if(FlexPlayerUtil.containsOffAirEndOffset(mediaObject)) {
				duration -= (realPlayerDuration - mediaObject.resourceEnd)
			}
			return duration
		}
		return realPlayerDuration
	},

	timeRelativeToOnAir(realPlayerTime, mediaObject) {
		//console.debug('time relative to on air', realPlayerTime);
		if(FlexPlayerUtil.containsOffAirContent(mediaObject)) {
			if(FlexPlayerUtil.containsOffAirStartOffset(mediaObject) && realPlayerTime >= mediaObject.resourceStart) {

				if(FlexPlayerUtil.containsOffAirEndOffset(mediaObject) && realPlayerTime >= mediaObject.resourceEnd) {
					return mediaObject.resourceEnd
				} else {
					return realPlayerTime - mediaObject.resourceStart
				}
			} else if(FlexPlayerUtil.containsOffAirEndOffset(mediaObject) && realPlayerTime >= mediaObject.resourceEnd) {
				return mediaObject.resourceEnd
			}
			return 0
		}
		return realPlayerTime
	},

	seekRelativeToOnAir(playerAPI, relativeDurationPos, mediaObject) {
		let time = relativeDurationPos;
		if(FlexPlayerUtil.containsOffAirContent(mediaObject)) {
			console.debug(mediaObject)
			time = relativeDurationPos + mediaObject.resourceStart
		}
		playerAPI.seek(time);
	},

	isTimeAfterOnAir(realPlayerTime, mediaObject) {
		return FlexPlayerUtil.containsOffAirEndOffset(mediaObject) && realPlayerTime >= mediaObject.resourceEnd
	},

	containsOffAirContent(mediaObject) {
		return FlexPlayerUtil.containsOffAirStartOffset(mediaObject) || FlexPlayerUtil.containsOffAirEndOffset(mediaObject)
	},

	containsOffAirStartOffset(mediaObject) {
		return typeof(mediaObject.resourceStart) === 'number' && mediaObject.resourceStart > 0
	},

	containsOffAirEndOffset(mediaObject) {
		return typeof(mediaObject.resourceEnd) === 'number' && mediaObject.resourceEnd > 0
	}

}

export default FlexPlayerUtil;