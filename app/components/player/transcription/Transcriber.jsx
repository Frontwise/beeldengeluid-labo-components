import IDUtil from '../../../util/IDUtil';
import TimeUtil from "../../../util/TimeUtil";

//TODO replace all the css javascript selection and replace with pure React
class Transcriber extends React.PureComponent {

    constructor(props) {
        super(props);
        //when we implement editing it's useful to have the transcript in the state
        this.state = {
            transcript : this.props.transcript,
            prevSearchLength :0
        };
        this.userHasScrolled = false;
        this.alertTimerId = null;
        this.GUID = IDUtil.guid();
    }

    componentDidMount() {
        //make sure the user can still scroll through the transcript
        const transcriptWindow = document.getElementById(this.GUID);
        const searchHitscontainer = document.querySelector('.numberOfMatches');

        if (transcriptWindow) {
            transcriptWindow.onscroll = (e) => {
                if (this.alertTimerId == null) {
                    this.alertTimerId = setTimeout(() => {
                        this.userHasScrolled = false;
                    }, 2000);
                } else {
                    this.userHasScrolled = true;
                    clearTimeout(this.alertTimerId);
                    this.alertTimerId = setTimeout(() => {
                        this.userHasScrolled = false;
                    }, 2000);
                }
            };
        }
        if (searchHitscontainer) {
            searchHitscontainer.style.display = 'none';
        }

        if(this.props.initialSearchTerm && this.props.initialSearchTerm.length > 0) {
            this.filterList(this.props.initialSearchTerm, this.onInitialFilter.bind(this));
        }
    }

    onInitialFilter() {
        if(this.state.transcript.length > 0) {
            this.gotoLine(this.state.transcript[0].sequenceNr);
        }
    }

    gotoLine(sequenceNr) {
        //find object based on sequenceNr
        this.state.transcript.find(function(element, i) {
            if(element.sequenceNr === sequenceNr) {
                this.userHasScrolled = false;
                this.props.playerAPI.seek(element.start / 1000);
                return;
            }
        }, this);
    }

    getSegmentByStartTime(time) {
        const lines = this.state.transcript.filter(function (obj) {
            return obj.start === time;
        });
        if(lines.length > 0) {
            return lines[0];
        }
        return null;
    }

    //FIXME make this one faster
    findClosestSegment(currentTime) {
        let index = this.state.transcript.findIndex(function (a) {
            return a.start >= currentTime;
        });

        if((index === -1) && this.state.transcript.length > 0) {
            index = 0;
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

    componentDidUpdate() {
        const segmentId = this.findClosestSegment(Math.trunc(this.props.curPosition * 1000)),
            line = document.getElementById(segmentId);
        if (line && !this.userHasScrolled) {
            line.parentNode.scrollTop = line.offsetTop - 26;
        }
    }

    resetTranscriber() {
        this.setState({transcript: this.props.transcript, prevSearchLength: 0},
            () => {
                document.querySelector('.numberOfMatches').style.display = 'none',
                    document.querySelector('input[name="search-transcriptLine"]').value = ''
            }
        );
    }

    //called when typing into the search box
    doFilter(event) {
        this.filterList(event.target.value, null);
    }

    //TODO put this in a search function, then call that function when mounted with the initial search term
    filterList(searchTerm, callback) {
        if(searchTerm.length === 0) {
            this.resetTranscriber();
            return;
        }
        if (searchTerm.length > 2 || (this.state.prevSearchLength > searchTerm.length)) {
            let replacementText = '',
                word = '',
                copiedItem = {},
                regex = new RegExp(searchTerm, 'gi');
            const updatedList = this.props.transcript.filter(function (item) {
                return item.words.toLowerCase().search(
                    searchTerm.toLowerCase()) !== -1;
            }).map((item) => {
                replacementText = "<span class='highLightText'>" + searchTerm + "</span>";
                word = item.words.replace(regex, replacementText);
                copiedItem = Object.assign({}, item);
                copiedItem.words = word;
                return copiedItem;
            });

            if (updatedList.length !== 0) {
                this.setState({
                        transcript: updatedList,
                        prevSearchLength: searchTerm.length
                    },
                    () => {
                        if ((updatedList.length === 0) || (updatedList.length === this.props.transcript.length)) {
                            document.querySelector('.numberOfMatches').style.display = 'none';
                        } else {
                            document.querySelector('.numberOfMatches').style.display = 'inline';
                            document.querySelector('.numberOfHits').innerHTML = updatedList.length;
                        }
                        if(callback) {
                            callback();
                        }
                    });
            } else {
                this.setState(
                    {transcript: this.props.transcript},
                    () => {
                        document.querySelector('.numberOfMatches').style.display = 'none';
                        if(callback) {
                            callback();
                        }
                    }
                );

            }
        }
    }

    /* ----------------- Rendering --------------------- */
    render() {
        const segmentId = this.findClosestSegment(Math.trunc(this.props.curPosition * 1000)),
            transcriptContainer = this.state.transcript.map((obj) => {
            const className = obj.sequenceNr == segmentId ? 'sub currentLine' : 'sub';
            return (
                <div
                    id={obj.sequenceNr} className={className}
                    onClick={this.gotoLine.bind(this, obj.sequenceNr)}>
                    <span className="data line-start-time">
                        {TimeUtil.formatMillisToTime(obj.start)}
                        </span>
                    <span dangerouslySetInnerHTML={{__html: obj.words}}></span>
                </div>
            );
        });

        //FIXME currently there can only be one transcriber on the screen...
        return (
            <div className={IDUtil.cssClassName('transcriber')}>
                <div className="transcript_search_box">
                    <span className="glyphicon glyphicon-search"></span>
                    <input data-transcribersearch="search-transcriptLine" type="text"
                           onChange={this.doFilter.bind(this)} name="search-transcriptLine"
                           placeholder="Zoek.."/>
                    <span className="numberOfMatches">
                        <span className="numberOfHits"></span> HITS
                        <button type="button" onClick={this.resetTranscriber.bind(this)}
                                className="glyphicon glyphicon-remove removeTranscriptFilter"
                                aria-label="Close"></button>
                    </span>
                </div>
                <div id={this.GUID} className="transcriptsList">{transcriptContainer}</div>
            </div>
        )
    }
}

export default Transcriber;