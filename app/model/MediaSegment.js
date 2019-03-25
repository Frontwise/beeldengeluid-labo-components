import PropTypes from 'prop-types';

export default class MediaSegment {

	constructor(start, end, title, programSegment) {
		this.start = start;
		this.end = end;
		this.title = title;
		this.programSegment = programSegment;
	}

	static getPropTypes() {
		return PropTypes.shape({
			start: PropTypes.number.isRequired,
			end: PropTypes.number.isRequired,
			title: PropTypes.string,
			programSegment: PropTypes.bool
		}).isRequired
	}
}