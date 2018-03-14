import IDUtil from '../../../util/IDUtil';
import TimeUtil from "../../../util/TimeUtil";

class Transcriber extends React.PureComponent {

    constructor(props) {
        super(props);
        //when we implement editing it's useful to have the transcript in the state
        this.state = {
            transcript : this.props.transcript
        };
        this.userHasScrolled = false;
        this.alertTimerId = null;
        this.GUID = IDUtil.guid();
        this.prevSearchLength = 0;
    }

    componentDidMount() {
        //make sure the user can still scroll through the transcript
        const transcriptWindow = document.getElementById(this.GUID),
            searchHitscontainer = document.querySelector('.numberOfMatches');

        if (transcriptWindow) {
            transcriptWindow.onscroll = (e) => {
                if (this.alertTimerId === null) {
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
    }

    gotoLine(index) {
        //find object based on sequenceNr
        this.state.transcript.find(function(element, i) {
            if(element.sequenceNr === index) {
                this.userHasScrolled = false;
                this.props.playerAPI.seek(element.start / 1000);
                return;
            }
        },this);
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
        const segment = this.getSegmentByStartTime(this.state.transcript[index].start || 0);
        if(segment) {
            return segment.sequenceNr || 0;
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
        this.setState({transcript: this.props.transcript},
            () => {
                document.querySelector('.numberOfMatches').style.display = 'none',
                    document.querySelector('input[name="search-transcriptLine"]').value = ''
            }
        );
    }

    filterList(event) {
        const searchedTerm = event.target.value;
        if (searchedTerm.length > 3 || (this.prevSearchLength > searchedTerm.length)) {
            let replacementText = '',
                word = '',
                copiedItem = {},
                regex = new RegExp(searchedTerm, 'gi');
            const updatedList = this.props.transcript.filter(function (item) {
                return item.words.toLowerCase().search(
                    searchedTerm.toLowerCase()) !== -1;
            }).map((item) => {
                replacementText = "<span class='highLightText'>" + searchedTerm + "</span>";
                word = item.words.replace(regex, replacementText);
                copiedItem = Object.assign({}, item);
                copiedItem.words = word;
                return copiedItem;
            });

            if (updatedList.length === 0) {
                this.setState({transcript: this.props.transcript},
                    console.log('update to full list and display message for no matches!'));
                document.querySelector('.numberOfMatches').style.display = 'none';
            } else {
                this.setState({transcript: updatedList},
                    () => {
                        // console.log('running slow...?')
                        this.prevSearchLength = searchedTerm.length;
                        // console.log('running slow...2 ?')

                        if ((updatedList.length === 0) || (updatedList.length === this.props.transcript.length)) {
                            document.querySelector('.numberOfMatches').style.display = 'none';
                        } else {
                            document.querySelector('.numberOfMatches').style.display = 'inline';
                            document.querySelector('.numberOfHits').innerHTML = updatedList.length;
                        }
                    });
            }
        }
        // console.log('not enough characters typed ...')
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
            <div id={this.GUID} className={IDUtil.cssClassName('transcriber')}>
                <div className="transcript_search_box">
                    <span className="glyphicon glyphicon-search"></span>
                    <input data-transcriberSearch="search-transcriptLine" type="text"
                           onChange={this.filterList.bind(this)} name="search-transcriptLine"
                           placeholder="Zoek.."/>
                    <span className="numberOfMatches">
                        <span className="numberOfHits"></span> HITS
                        <button type="button" onClick={this.resetTranscriber.bind(this)}
                                className="glyphicon glyphicon-remove removeTranscriptFilter"
                                aria-label="Close"></button>
                    </span>
                </div>
                <div className="transcriptsList">{transcriptContainer}</div>
            </div>
        )
    }
}

export default Transcriber;