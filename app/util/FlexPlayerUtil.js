
/* ---------------------------- CALCULATIONS RELATIVE TO ON-AIR DURATION --------------------------------- */

const FlexPlayerUtil = {

	onAirDuration(realPlayerDuration, mediaObject) {
		if(FlexPlayerUtil.containsOffAirContent(mediaObject)) {
			let duration = realPlayerDuration;
			if(FlexPlayerUtil.__containsOffAirStartOffset) {
				duration -= mediaObject.resourceStart;
			}
			if(FlexPlayerUtil.__containsOffAirEndOffset) {
				duration -= (realPlayerDuration - mediaObject.resourceEnd)
			}
			return duration
		}
		return realPlayerDuration
	},

	timeRelativeToOnAir(realPlayerTime, mediaObject) {
		if(FlexPlayerUtil.containsOffAirContent(mediaObject)) {
			if(FlexPlayerUtil.__containsOffAirStartOffset && realPlayerTime >= mediaObject.resourceStart) {

				if(FlexPlayerUtil.__containsOffAirEndOffset && realPlayerTime >= mediaObject.resourceEnd) {
					return mediaObject.resourceEnd
				} else {
					return realPlayerTime - mediaObject.resourceStart
				}
			} else if(FlexPlayerUtil.__containsOffAirEndOffset && realPlayerTime >= mediaObject.resourceEnd) {
				return mediaObject.resourceEnd
			}
			return 0
		}
		return realPlayerTime
	},

	seekRelativeToOnAir(playerAPI, relativeDurationPos, mediaObject) {
		let time = relativeDurationPos;
		if(FlexPlayerUtil.containsOffAirContent(mediaObject)) {
			time = relativeDurationPos + mediaObject.resourceStart
		}
		playerAPI.seek(time);
	},

	isTimeAfterOnAir(realPlayerTime, mediaObject) {
		return FlexPlayerUtil.__containsOffAirEndOffset && realPlayerTime >= mediaObject.resourceEnd
	},

	containsOffAirContent(mediaObject) {
		return FlexPlayerUtil.__containsOffAirStartOffset || FlexPlayerUtil.__containsOffAirEndOffset
	},

	__containsOffAirStartOffset(mediaObject) {
		return typeof(mediaObject.resourceStart) === 'number' && mediaObject.resourceStart > 0
	},

	__containsOffAirEndOffset(mediaObject) {
		return typeof(mediaObject.resourceEnd) === 'number' && mediaObject.resourceEnd > 0
	}

}

export default FlexPlayerUtil;