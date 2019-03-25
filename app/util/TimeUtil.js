import moment from 'moment';

const TimeUtil = {

	//formats seconds to a neat time string hh:mm:ss
	formatTime : function(t) {
		if(t == -1) {
			return '00:00:00'
		}
	    const pt = moment.duration(t * 1000);
	    const h = pt.hours() < 10 ? '0' + pt.hours() : pt.hours();
	    const m = pt.minutes() < 10 ? '0' + pt.minutes() : pt.minutes();
	    const s = pt.seconds() < 10 ? '0' + pt.seconds() : pt.seconds();
	    return h + ':' + m + ':' + s
	},

	//formats milliseconds to a time string hh:mm:ss
	formatMillisToTime : function(millis) {
		if(millis == -1) {
			return '00:00:00';
		}
	    const pt = moment.duration(millis);
	    const h = pt.hours() < 10 ? '0' + pt.hours() : pt.hours();
	    const m = pt.minutes() < 10 ? '0' + pt.minutes() : pt.minutes();
	    const s = pt.seconds() < 10 ? '0' + pt.seconds() : pt.seconds();
	    return h + ':' + m + ':' + s
	},

	//TODO not sure anymore why this was useful. It seems bad to round off seconds
	playerPosToMillis : function(sec) {//a double
		return parseInt(sec) * 1000
	},

	getYearFromDate : function(dateMillis) {
		return new Date(dateMillis).getFullYear()
	},

	yearToUNIXTime : function(year) {
		return new Date(year + '-01-01').valueOf()
	},

	UNIXTimeToPrettyDate(epochMillis) {
		if(epochMillis !== null) {
			return moment(epochMillis).format('DD-MM-YYYY');
		}
		return '-'
	}

}

export default TimeUtil;