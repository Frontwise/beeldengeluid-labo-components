import IDUtil from '../../../util/IDUtil';
import TimeUtil from "../../../util/TimeUtil";
import FlexPlayerUtil from "../../../util/FlexPlayerUtil";

export default class Transcriber extends React.PureComponent {

	constructor(props) {
		super(props);
		//when we implement editing it's useful to have the transcript in the state
		this.state = {
			transcript : this.props.transcript,
			prevSearchLength :0,
			showHitCounter: false,
			numberOfHits : 0
		};
		this.userHasScrolled = false;
		this.alertTimerId = null;
		this.searchBarRef = React.createRef();
	}

	componentDidMount = () => {
		if(this.props.initialSearchTerm && this.props.initialSearchTerm.length > 0) {
			this.filterList(this.props.initialSearchTerm, this.onInitialFilter.bind(this));
		}
	}

	componentDidUpdate = () => {
		const segmentId = this.findClosestSegment(Math.trunc(this.props.curPosition * 1000));
		const line = document.getElementById(segmentId);
		if (line && !this.userHasScrolled) {
			line.parentNode.scrollTop = line.offsetTop - 26;
		}
	}

	//FIXME get rid of the timeout
	onInitialFilter = (transcript) => {
		if(transcript.length > 0) {
			setTimeout( () => {	this.gotoLine(transcript[0].sequenceNr) }, 300);
		}
	}

	//makes sure the user can still scroll through the transcript
	onScrollInTranscript = () => {
		if (this.alertTimerId == null) {
			this.alertTimerId = setTimeout(() => {
				this.userHasScrolled = false;
			}, 2400);
		} else {
			this.userHasScrolled = true;
			clearTimeout(this.alertTimerId);
			this.alertTimerId = setTimeout(() => {
				this.userHasScrolled = false;
			}, 2400);
		}
	}

	//find object based on sequenceNr
	gotoLine = sequenceNr => {
		this.state.transcript.find((element, i) => {
			if(element.sequenceNr === sequenceNr) {
				this.userHasScrolled = false;
				this.props.playerAPI.seek(element.start / 1000);
			}
		});
	}

	getSegmentByStartTime = (time) => {
		const lines = this.state.transcript.filter(obj =>  obj.start === time);
		if(lines.length > 0) {
			return lines[0];
		}
		return null;
	}

	//FIXME make this one faster
	findClosestSegment = currentTime => {
		let index = this.state.transcript.findIndex(a => a.start >= currentTime);

		//if no line was found it's either the very last line (if player time is bigger than 0) or the first line
		if(index === -1 && this.state.transcript.length > 0) {
			index = currentTime > 0 ? this.state.transcript.length -1 : 0;
		}
		//adjust the index to the previous item when the start time is larger than the current time
		if(this.state.transcript[index] && this.state.transcript[index].start > currentTime) {
			index = index <= 0 ? 0 : index -1;
		}
		if(this.state.transcript[index]) {
			const segment = this.getSegmentByStartTime(this.state.transcript[index].start || 0);
			if(segment) {
				return segment.sequenceNr || 0;
			}
		}
		return 0;
	}

	resetTranscriber = () => {
		this.setState(
			{
				transcript: this.props.transcript,
				prevSearchLength: 0,
				showHitCounter : false
			},
			() => {
				this.searchBarRef.current.value = '';
			}
		);
	}

	doFilter = event => {
		this.filterList(event.target.value, null);
	}

	filterList = (searchTerm, callback) => {
		if(searchTerm.length === 0) {
			this.resetTranscriber();
			return;
		}
		if (searchTerm.length > 2 || (this.state.prevSearchLength > searchTerm.length)) {
			let regex = null;
			let filteredTranscript = [];
			try {
				regex = new RegExp(searchTerm, 'gi');
			} catch(err) {
				//in case the user enters an illegal regular expression show 0 hits
			}

			if(regex) {
				filteredTranscript = this.props.transcript.filter(item => {
					return item.words.toLowerCase().search(searchTerm.toLowerCase()) !== -1;
				}).map(item => {
					const copiedItem = Object.assign({}, item);
					copiedItem.words = item.words.replace(
						regex, searchedTerm => "<span class='highLightText'>" + searchedTerm + "</span>"
					);
					return copiedItem;
				});
			}

			const transcript = filteredTranscript.length === 0 ? this.props.transcript : filteredTranscript;

			this.setState(
				{
					transcript: transcript, //show the whole transcript if there are no hits
					prevSearchLength: searchTerm.length, //not sure if this one is needed anymore
					showHitCounter: true,
					numberOfHits : filteredTranscript.length
				},
				() => {
					if(callback) {
						callback(transcript);
					}
				}
			);

		}
	}

	/* ---------------------------- RENDERING FUNCTIONS ---------------------------------- */

	renderTranscriptList = (transcript, curPosition) => {
		const segmentId = this.findClosestSegment(Math.trunc(curPosition * 1000));
		const lines = transcript.map(line => {
			const className = line.sequenceNr === segmentId ? 'transcript-line current-line' : 'transcript-line';
			return (
				<div
					id={line.sequenceNr} className={className}
					onClick={this.gotoLine.bind(this, line.sequenceNr)}>
					<span className="line-start-time">
						{TimeUtil.formatMillisToTime(
							FlexPlayerUtil.timeRelativeToOnAir(line.start / 1000, this.props.mediaObject) * 1000
						)}
					</span>
					<span dangerouslySetInnerHTML={{__html: line.words}}></span>
				</div>
			);
		});

		return (
			<div className="transcript-container" onScroll={this.onScrollInTranscript}>
				{lines}
			</div>
		)
	}

	renderSearchBox = (showHitCounter, numberOfHits) => {
		const hitCounter = showHitCounter ? (
			<span className="numberOfMatches">
				<span>{numberOfHits} HITS</span>
				<button
					type="button"
					onClick={this.resetTranscriber}
					className="glyphicon glyphicon-remove removeTranscriptFilter"
					aria-label="Close"
				/>
			</span>
		) : null;
		return (
			<div className="transcriber-search-bar">
				<span className="glyphicon glyphicon-search"/>
				<input
					ref={this.searchBarRef}
					className="transcriber-search-input"
					type="text"
					defaultValue={this.props.initialSearchTerm || ''}
					onChange={this.doFilter}
					placeholder="Search..."/>
				{hitCounter}
			</div>
		)
	}

	/* ----------------- Rendering --------------------- */
	render = () => {
		const transcriptList = this.renderTranscriptList(this.state.transcript, this.props.curPosition);
		const searchBox = this.renderSearchBox(this.state.showHitCounter, this.state.numberOfHits);
		return (
			<div className={IDUtil.cssClassName('transcriber')}>
				{searchBox}
				{transcriptList}
			</div>
		)
	}
}
