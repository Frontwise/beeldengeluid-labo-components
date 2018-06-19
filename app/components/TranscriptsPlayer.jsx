import IDUtil from '../util/IDUtil';
import FlexPlayer from './player/video/FlexPlayer';
import IconUtil from "../util/IconUtil";
import TimeUtil from "../util/TimeUtil";
import HTML5AudioPlayer from './player/audio/HTML5AudioPlayer'; // split player into a separated class
import HTML5VideoPlayer from './player/video/HTML5VideoPlayer';
import SegmentationControls from './player/segmentation/SegmentationControls';
import VideoTimeBar from './player/segmentation/SegmentationTimeline';
import AnnotationTimeline from './player/annotation/AnnotationTimeline';
import AnnotationSummary from './annotation/AnnotationSummary';
import TranscriptExample from './transcript.json';
function TranscriptsPlayer(WrappedComponent) {
    return class extends WrappedComponent {

        constructor(props) {
            super(props);
            this.state = {
                _clickedLine: null
            }
        console.log(props);
            console.log(this.state);

        }

        // TODO: remove before commit
        componentDidMount() {
            if (super.componentDidMount) super.componentDidMount();
            // console.log(this);
            const node = ReactDOM.findDOMNode(this);
            // console.log(node);
            node.classList.add('colorBla');
        }

        onPlayerReady(playerAPI) {
            return super.onPlayerReady(playerAPI);
        }
        // Helper Fc to get url params.
        getQueryParams(qs) {
            qs = qs.split('+').join(' ');
            let params = {},
                tokens,
                re = /[?&]?([^=]+)=([^&]*)/g;

            while (tokens = re.exec(qs)) {
                params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
            }

            return params;
        }

        selectPlayer(mediaObject) {
            const playerEventCallbacks = {
                playProgress: this.playProgress.bind(this),
                onPlay: this.onPlay.bind(this),
                onPause: this.onPause.bind(this),
                onFinish: this.onFinish.bind(this),
                loadProgress: this.loadProgress.bind(this),
                onSeek: super.onSeek.bind(this)
            };

            if (mediaObject.mimeType.indexOf('video') != -1) {
                let query = this.getQueryParams(document.location.search);

                // If no fragmentUrl is provided but start/end points are,
                // set those params.
                if (!query['fragmentUrl'] && query['s']) {
                    //TODO: validate number
                    mediaObject.start = query['s'] || null;
                    mediaObject.end = query['e'] || null;
                }

                if (mediaObject.url.indexOf('player.vimeo.com') != -1) {
                    return (
                        <VimeoPlayer mediaObject={mediaObject}
                                     eventCallbacks={playerEventCallbacks}
                                     onPlayerReady={this.onPlayerReady.bind(this)}/>
                    );
                } else if (mediaObject.url.indexOf('.mp4') != -1) {
                    return (
                        <JWPlayer mediaObject={mediaObject}
                                  eventCallbacks={playerEventCallbacks}
                                  onPlayerReady={this.onPlayerReady.bind(this)}/>
                    );
                } else if (mediaObject.url.indexOf('youtube.com') != -1 ||
                    mediaObject.url.indexOf('youtu.be') != -1) {
                    return (
                        <YouTubePlayer mediaObject={mediaObject}
                                       eventCallbacks={playerEventCallbacks}
                                       onPlayerReady={this.onPlayerReady.bind(this)}/>
                    );
                } else if (mediaObject.mimeType.indexOf('audio') != -1) { //later possibly change the audio player
                    return player = (
                        <JWPlayer mediaObject={mediaObject}
                                  eventCallbacks={playerEventCallbacks}
                                  onPlayerReady={this.onPlayerReady.bind(this)}/>
                    );
                } else {
                    return (
                        <HTML5VideoPlayer mediaObject={mediaObject}
                                          eventCallbacks={playerEventCallbacks}
                                          start={2300}
                                          onPlayerReady={this.onPlayerReady.bind(this)}/>
                    );
                }
            } else if (mediaObject.mimeType.indexOf('audio') != -1) {
                return (<HTML5AudioPlayer mediaObject={mediaObject}
                                          eventCallbacks={playerEventCallbacks}
                                          onPlayerReady={this.onPlayerReady.bind(this)}/>
                );
            }
        }

        /* ---------------------------- TRANSCRIPT METHODS ------------------------- */
        getCurrentAnnotation(sec) {
             // console.log('getCurrentAnnotation');
            // let test = Fs.readAsDataURL('./Yoshua_Bengio.srt');
            // console.log(test);
            sec = 2;
            // if (_interview.transcript) {
            //     let pos = parseInt(sec) * 1000
            //     let currentAnnotation = _interview.transcript.filter((a, index) => {
            //         if (a.start <= pos && a.end >= pos) {
            //             return true;
            //         } else if (pos < a.start && pos >= a.start - 500) {//first try to fetch the closest one AHEAD
            //             return true;
            //         } else if (pos > a.end && pos <= a.end + 500) {//then try to fetch the closest one BEFORE
            //             return true;
            //         }
            //         return false;
            //     });
            //     if (currentAnnotation.length > 0) {
            //         return currentAnnotation[0];
            //     }
            // }
            return null;
        }

        getCurrentSegment(sec) {
            if (_interview.annotations.segments) {
                let pos = parseInt(sec) * 1000
                let currentSegment = _interview.annotations.segments.filter((a, index) => {
                    if (a.start <= pos && a.end >= pos) {
                        return true;
                    } else if (pos < a.start && pos >= a.start - 500) {//first try to fetch the closest one AHEAD
                        return true;
                    } else if (pos > a.end && pos <= a.end + 500) {//then try to fetch the closest one BEFORE
                        return true;
                    }
                    return false;
                });
                if (currentSegment.length > 0) {
                    return currentSegment[0];
                }
            }
            return null;
        }

        highlight(line, type) {
            if (line) {
                let lines = document.getElementsByClassName(type);
                for (let i = 0; i < lines.length; i++) {
                    let elm = lines[i];
                    if (elm.id == line.number) {
                        elm.className = type + ' active';
                    } else if (elm.className.indexOf('active') != -1) {
                        elm.className = type;
                    }
                }
            } else { //reset all highlighting of this type
                let lines = document.getElementsByClassName(type);
                for (let i = 0; i < lines.length; i++) {
                    lines[i].className = type;
                }
            }
        }

        gotoLine(index) {
             console.log('clicking line: ',this.props, index);

             if(this.props.transcript[index]) {
                 this.setState({
                     _clickedLine : this.props.transcript[index]
                 });
             }


            // if (this.state._clickedLine) {
            //     console.log("the line exists, let's change history !");
            //     // jw.seek(_clickedLine.start / 1000);
            // }
            // change history to resemble navigating the transcripts
            // this.updateHistory(_clickedLine.start, _clickedLine.end);
            // return false;

        }

        gotoSegment(index) {
            _clickedSegment = _interview.annotations.segments[index];
            if (_clickedSegment) {
                jw.seek(_clickedSegment.start / 1000);
            }
            // change history to resemble navigating the segments
            this.updateHistory(_clickedSegment.start, _clickedSegment.end);
        }

        updateHistory(start, end) {
            let url = '/play?id=' + _interview.id + '&s=' + start + '&e=' + end;
            // console.log('updating history ', start, end);
            // change history to resemble navigating the transcripts/segments/seeked position
            window.history.pushState('play', 'Play', url);
        }

        onSeeked(e) {
            // console.log('seeking!', e);
            if (!_clickedLine && !_clickedSegment) {
                //update the history to match the seeked position (only when no segment or line was clicked)
                let pos = jw.getPosition() * 1000;
                this.updateHistory(pos, pos + 5000);
            }
            let sub = _clickedLine || this.getCurrentAnnotation(jw.getPosition());
            let segment = _clickedSegment || this.getCurrentSegment(jw.getPosition());
            if (sub) {
                this.highlight(sub, 'sub');
                document.getElementById(sub.number).scrollIntoView();
                _clickedLine = null;
            }
            if (segment) {
                this.highlight(segment, 'segment');
                document.getElementById(segment.number).scrollIntoView();
                _clickedSegment = null;
            }
            // console.log('segment ', segment);
        }

        playProgress() {
            // this.highlight(this.getCurrentAnnotation(jw.getPosition()), 'sub');
            // this.highlight(this.getCurrentSegment(jw.getPosition()), 'segment');
        }

        loadTranscripts(transcripts){
            // console.log(JSON.stringify(transcripts));
            return transcripts.map((obj) =>{
                return (
                    <div
                        id={obj.sequenceNr} className="sub "
                        onClick={this.gotoLine.bind(this, obj.sequenceNr)}>
                    <span class="data line-start-time">{TimeUtil.formatMillisToTime(obj.start)}</span>&nbsp; {obj.words}
                    </div>
                );
            })
        }
        /* ----------------- Rendering --------------------- */
        render() {
            console.log('rendering ... ', this.state);
            // transcript vars
            let transcript = this.props.transcript || null;
            // let _clickedLine = this.getCurrentAnnotation(1234);
            // let _clickedSegment = null;
            let transcriptContainer = null;

            // check if there is a transcript for the current media and if so display it.
            // otherwise return the parent render.
            if (transcript) {
                console.log('there is a transcript to display !');
                transcriptContainer = this.loadTranscripts(transcript);
                console.log(typeof transcript);
            } else {
                console.log('no transcript to show, render the parent ...');
                //For testing purposes dummy data is being used. TODO : remove it!
                transcriptContainer = this.loadTranscripts(TranscriptExample);

                // return super.render();
            }

            // There are transcript so let's render them.
            // console.log(this);
            //update the activeSegment in the playerAPI
            if (this.state.start != -1 && this.state.end != -1 && this.state.playerAPI) {
                this.state.playerAPI.setActiveSegment({
                    start: this.state.start,
                    end: this.state.end
                });
            }

            let segmentationControls = null;
            let segmentationBar = null;
            let annotationBar = null;
            // let annotationControls = null;
            let annotationSummary = null;

            //only draw segmentation controls if configured
            if (this.state.playerAPI) {
                if (this.props.annotationSupport.mediaSegment) {
                    const controls = {
                        setManualStart: this.setManualStart.bind(this),
                        setManualEnd: this.setManualEnd.bind(this)
                    }
                    segmentationControls = (
                        <SegmentationControls
                            controls={controls}
                            annotation={this.state.activeAnnotation}
                            start={this.state.start}
                            end={this.state.end}/>
                    );
                    segmentationBar = (
                        <VideoTimeBar
                            mediaObject={this.props.mediaObject}
                            duration={this.state.duration}
                            curPosition={this.state.curPosition}
                            start={this.state.start}
                            end={this.state.end}
                            playerAPI={this.state.playerAPI}
                            fragmentMode={this.state.fragmentMode}/>
                    );
                    annotationBar = (
                        <AnnotationTimeline
                            mediaObject={this.props.mediaObject}
                            annotations={this.state.annotations}
                            annotation={this.state.activeAnnotation}
                            annotationLayers={this.props.annotationLayers}
                            duration={this.state.duration}
                            curPosition={this.state.curPosition}
                            start={this.state.start}
                            end={this.state.end}
                            playerAPI={this.state.playerAPI}
                            fragmentMode={this.state.fragmentMode}/>
                    )
                    // annotationControls = (<div className="row">
                    //     <div className="col-md-12">
                    //         <div>
                    //             {segmentationBar}
                    //             {annotationBar}
                    //         </div>
                    //     </div>
                    // </div>);
                }
            }

            if (this.state.activeAnnotation) {
                annotationSummary = (
                    <AnnotationSummary
                        annotation={this.state.activeAnnotation}
                        annotationLayers={this.props.annotationLayers}
                        showTitle={false}/>
                );
            }

            let player = this.selectPlayer(this.props.mediaObject) || null;
            return (
                <div className={IDUtil.cssClassName('flex-player')}>
                    <div className="row">
                        <div className="col-md-7" style={{overflowX: 'auto'}}>
                            <div>
                                {player}
                            </div>
                            <div className="btn-toolbar" role="toolbar">
                                <div className="btn-group" role="group">
                                    <button className="btn btn-default" type="button"
                                            title="Add annotation to the whole video (SHIFT+A)"
                                            onClick={this.editMediaObjectAnnotation.bind(this)}>
                                        <span className={IconUtil.getUserActionIcon('annotate')}></span>
                                    </button>
                                </div>
                                &nbsp;
                                <div className="btn-group" role="group">
                                    <button className="btn btn-default" type="button"
                                            title="Delete current annotation (SHIFT+D)"
                                            onClick={this.deleteAnnotation.bind(this)}>
                                        <span className={IconUtil.getUserActionIcon('remove')}></span>
                                    </button>
                                </div>
                                &nbsp;
                                <div className="btn-group" role="group">
                                    <button className="btn btn-default" type="button"
                                            title="Save segment (SHIFT+S)"
                                            onClick={this.saveSegment.bind(this)}>
                                        <span className={IconUtil.getUserActionIcon('save')}></span>
                                    </button>
                                    <button className="btn btn-default" type="button"
                                            title="New segment (SHIFT+N)"
                                            onClick={this.newSegment.bind(this)}>
                                        <span className={IconUtil.getUserActionIcon('add')}></span>
                                    </button>
                                    <button className="btn btn-default" type="button"
                                            title="New segment from currently active segment (CTRL+N)"
                                            onClick={this.newSegmentFromLast.bind(this)}>
                                        <span className={IconUtil.getUserActionIcon('next')}></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-5">
                            {segmentationControls}
                            {annotationSummary}
                        </div>
                    </div>
                    <div class="row" id="trascripts">
                        <div class="col-md-12 top-buffer">
                            <div class="data transcript-heading">automatically generated captions</div>
                            <div id="transcript-controls">
                                {transcriptContainer}
                            </div>
                        </div>
                    </div>

                    {/*{annotationControls}*/}
                </div>
            )
        }
    };
}

const Transc = TranscriptsPlayer(FlexPlayer);
export default Transc;