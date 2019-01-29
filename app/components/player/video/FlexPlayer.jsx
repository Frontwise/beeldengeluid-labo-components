import PropTypes from 'prop-types';
import MouseTrap from 'mousetrap';

import HTML5AudioPlayer from '../audio/HTML5AudioPlayer';

import HTML5VideoPlayer from './HTML5VideoPlayer';
import VimeoPlayer from './VimeoPlayer';
import YouTubePlayer from './YouTubePlayer';

import SegmentationTimeline from '../segmentation/SegmentationTimeline';
import SegmentationControls from '../segmentation/SegmentationControls';

import Transcriber from '../transcription/Transcriber';

import AnnotationTimeline from '../annotation/AnnotationTimeline';
import AnnotationSummary from '../../annotation/AnnotationSummary';

import IDUtil from '../../../util/IDUtil';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';
import AnnotationUtil from '../../../util/AnnotationUtil';
import IconUtil from '../../../util/IconUtil';

import FlexBox from '../../FlexBox';

import AppAnnotationStore from '../../../flux/AnnotationStore';
import AnnotationActions from '../../../flux/AnnotationActions';

//TODO test out media fragments to shield off "off-air content"

/*
This class receives a (generic) playerAPI from the implementing player component.
Currently VimeoPlayer, JWPlayer, HTML5VideoPlayer, HTML5AudioPlayer and YouTubePlayer have implemented this API.

It is able to pass the playerAPI to its owner. This is useful e.g. for the current AnnotationRecipe,
who needs to pass on this API to the AnnotationBox (so it's possible to seek the video when clicking on an annotation)

TODO:
	- the annotation buttons must be made logical (just a single button, instead of two. Detect when a segment is active etc)
	- somewhere the annotations made on the media object level must be displayed

Some (older?) B&G videos don't work well: http://lbas2.beeldengeluid.nl:8093/viz/KRO_KINDERTIJ-KN_000093U2

http://localhost:5302/recipe/default-item-details?id=4232174@program&cid=nisv-catalogue-aggr

Raar geskipt naar het einde:

http://localhost:5302/recipe/default-item-details?id=4238372@program&cid=nisv&fq=aanleg
http://localhost:5302/recipe/default-item-details?id=4238372@program&cid=nisv-catalogue-aggr

TODO: check out this new React player: https://github.com/CookPete/react-player


TODO: rebuild this class to assume a single media type + playlist!!
*/

class FlexPlayer extends React.Component {

	constructor(props) {
		super(props);
		const mediaObjects = this.props.mediaObject ? [this.props.mediaObject] : this.props.mediaObjects

		this.state = {
			playList : mediaObjects,
			currentMediaObject : mediaObjects[0],//this one can be set per player

			playerAPI : null,

			curPosition : 0,
			duration : 0,

			segmentStart : -1, //start point of the active ANNOTATION
			segmentEnd : -1, //end point of the active ANNOTATION

			paused : true,//FIXME call the player API instead (isPaused)?

			annotations : [], //populated in onLoadAnnotations()
			activeAnnotation : null,
			activeAnnotationIndex : -1,
			mediaObjectAnnotation : null //populated in onLoadAnnotations(), there should only be one per user!
		}
		this.CLASS_PREFIX = 'fxp'
	}

	//TODO make sure to offer support for rendering different players, now it's just Vimeo (ArtTube needs this)
	componentDidMount() {
		if(this.props.active) {
			this.initKeyBindings();
		}
		this.loadAnnotations();

		//then listen to any changes that happen in the API
		const mediaObjects = this.props.mediaObject ? [this.props.mediaObject] : this.props.mediaObjects;
		mediaObjects.forEach(mo => {
			AppAnnotationStore.bind(
				mo.assetId,
				this.onChange.bind(this)
			);
		});

		AppAnnotationStore.bind('change-project', this.loadAnnotations.bind(this, null));
	}

	onChange(eventType, data, annotation, index) {
		if(eventType == 'change-target') {
			this.initKeyBindings(); //whenever this media object becomes the target, make sure these key bindings take over
			this.loadAnnotations(null);
		} else if(eventType == 'update') {
			this.loadAnnotations(annotation);//after adding or saving an annotation
		} else if(eventType == 'delete') {
			this.loadAnnotations(null);//after deleting an annotation
		} else if(eventType == 'play') {//whenever an annotation within this media object needs to be played
			this.setActiveAnnotation(annotation, true);
		} else if(eventType == 'set') {//whenever an annotation within this media object needs to be set
			this.setActiveAnnotation(annotation, true);//false
		}
	}

	loadAnnotations(annotation) {
		this.setState(
			{activeAnnotation : annotation},
			() => {
				AppAnnotationStore.getMediaObjectAnnotations(
					this.state.currentMediaObject.assetId,
					this.props.user,
					this.props.project,
					this.onLoadAnnotations.bind(this)
				)
			}
		)
	}

	onLoadAnnotations(annotationList) {
		let annotations = null;
		let mediaObjectAnnotation = null;
		if(annotationList) {
			//get the annotation on the media object level (there should be only one per user!)
			mediaObjectAnnotation = annotationList.filter((a) => {
			    if (a.target){
			        return a.target.source === this.state.currentMediaObject.assetId && a.target.selector === null;
			    } else {
			        return false;
			    }
			});
			mediaObjectAnnotation = mediaObjectAnnotation.length > 0 ? mediaObjectAnnotation[0] : null;
		}
		this.setState({
			annotations : annotationList,
			mediaObjectAnnotation : mediaObjectAnnotation
		});
	}

	checkFocus(f, args) {
		const inputs = document.getElementsByTagName('input');
		for(const i of inputs) {
			if(i == document.activeElement) {
				return true;
			}
		}
	    if(f) {
	        f.call(this, args);
	    }
	}

	//called by the playerAPI (this component is an observer of that. I know it's ugly, will make it pretty later)
	//TODO is this still necessary?
	update() {
		const activeSegment = this.state.playerAPI.getActiveSegment();
		this.setState({
			segmentStart : activeSegment.start,
			segmentEnd : activeSegment.end
		})
	}

	/*************************************** Player event callbacks ***************************************/

	//called after the underlying player implemtation has loaded a video
	onPlayerReady(playerAPI) {
		//remove this instance as an observer from the old playerAPI
		if(this.state.playerAPI) {
			this.state.playerAPI.removeObserver(this)
		}

		//add this instance as an observer of the new playerAPI
		playerAPI.addObserver(this);

		this.setState(
			{playerAPI : playerAPI},
			() => {
				//get the new duration
				this.state.playerAPI.getDuration(this.onGetDuration.bind(this));
				this.state.playerAPI.isPaused((paused) => {
					this.state.playerAPI.play();
				})

				//propagate to the owner (if any)
				if(this.props.onPlayerReady) {
					this.props.onPlayerReady(playerAPI);
				}
			}
		);
	}

	playProgress(event) {
		if(this.state.playerAPI) {
			this.state.playerAPI.getPosition(this.onGetPosition.bind(this));
			if(this.props.onPlayProgress) {
				this.props.onPlayProgress(event);
			}
		}
	}

	onPlay(data) {
        this.setState({paused : false});
        if(this.props.onPlay) {
			this.props.onPlay(data);
		}
	}

	onPause(paused) {
        this.setState({paused : true});
        if(this.props.onPause) {
			this.props.onPause(data);
		}
	}

	//TODO test this well! (relative duration)
	onGetDuration(value) {
		//this.setState({duration : value});
		this.setState({
			duration : FlexPlayerUtil.onAirDuration(value, this.state.currentMediaObject)
		})
	}

	//TODO test this well! (relative player pos)
	onGetPosition(value) {
	    //this.setState({curPosition : value});
	    this.setState({
	    	curPosition : FlexPlayerUtil.timeRelativeToOnAir(value, this.state.currentMediaObject)
	    })
	}

	loadProgress(data) {
		if(this.props.onLoadProgress) {
			this.props.onLoadProgress(data);
		}
	}

	onFinish(data) {
		if(this.props.onFinish) {
			this.props.onFinish(data);
		}
	}

	onSeek(data) {
		if(this.props.onSeek) {
			this.props.onSeek(data);
		}
	}

	/************************************** Segmentation controls ***************************************/

	setManualStart(start) {
		if(start > 0 && start <= this.state.duration) {
		    this.setState(
		    	{segmentStart : start},
		    	() => {
		    		this.__doOnAirSeek(start)
		    	}
		    );
		}
	}

	setManualEnd(end) {
		if(end > 0 && end <= this.state.duration) {
		    this.setState(
		    	{segmentEnd : end},
		    	() => {
		    		this.__doOnAirSeek(end)
		    	}
		    );
		}
	}

	playStart() {
		this.__doOnAirSeek(this.state.segmentStart)
	}

	playEnd() {
    	this.__doOnAirSeek(this.state.segmentEnd)
	}

	setStart(start) {
	    let temp = -1;
	    if(start == undefined) {
	        temp = this.state.curPosition;
	    } else {
	        temp = start;
	    }
	    let ac = this.state.activeAnnotation;
	    if(ac && !ac.target.selector) {
	    	ac = null;
	    }
		this.setState({
			segmentStart : temp,
			activeAnnotation : ac
		});
	}

	setEnd(end, skipPause) {
	    let temp = -1;
	    if(end == undefined) {
	        temp = this.state.curPosition;
	    } else {
	        temp = end;
	    }
	    let ac = this.state.activeAnnotation;
	    if(ac && !ac.target.selector) {
	    	ac = null;
	    }
        this.setState({
        	segmentEnd : temp,
        	activeAnnotation : ac
        });
        if(skipPause == undefined) {
            this.state.playerAPI.pause();
        }
	}

	rw(t) {
		this.__doOnAirSeek(this.state.curPosition - t)
	}

	ff(t) {
		this.__doOnAirSeek(this.state.curPosition + t)
	}

	//this is the central seek function of the FlexPlayer and makes sure all seeks take on air content into account
	__doOnAirSeek(time) {
		FlexPlayerUtil.seekRelativeToOnAir(this.state.playerAPI, time, this.state.currentMediaObject)
	}

	/************************************** Keyboard controls ***************************************/

	initKeyBindings() {
		//Mousetrap.bind(['* k', 'ctrl+r', `up up down down left right left right b a enter`], this.testKey.bind(this));

		Mousetrap.bind('left', function() {
			this.checkFocus.call(this, this.rw, 60);
	    }.bind(this));
	    Mousetrap.bind('right', function() {
	        this.checkFocus.call(this, this.ff, 60);
	    }.bind(this));

	    //pause & play shortcut
	    Mousetrap.bind('p', function() {
	        if(!this.checkFocus.call(this)) {
	            if(this.state.paused === false) {//FIXME, this does not work yet!
	                this.state.playerAPI.pause();
	            } else {
	                this.state.playerAPI.play();
	            }
	        }
	    }.bind(this));

	    //start & end shortcuts
	    Mousetrap.bind('i', function() {
	        this.checkFocus.call(this, this.setStart);
	    }.bind(this));
	    Mousetrap.bind('o', function() {
	        this.checkFocus.call(this, this.setEnd);
	    }.bind(this));
	    Mousetrap.bind('shift+i', function() {
	        this.checkFocus.call(this, this.playStart);
	    }.bind(this));
	    Mousetrap.bind('shift+o', function() {
	        this.checkFocus.call(this, this.playEnd);
	    }.bind(this));

	    //annotation controls for segments
	    if(this.props.annotationSupport.mediaSegment) {
	    	Mousetrap.bind('shift+s', function() {
		    	this.checkFocus.call(this, this.saveSegment);
		    }.bind(this));
		    Mousetrap.bind('shift+n', function() {
		    	this.checkFocus.call(this, this.newSegment);
		    }.bind(this));
		    Mousetrap.bind('ctrl+n', function() {
		    	this.checkFocus.call(this, this.newSegmentFromLast);
		    }.bind(this));
		    Mousetrap.bind('shift+right', function() {
		    	this.checkFocus.call(this, this.nextSegment);
		    }.bind(this));
		    Mousetrap.bind('shift+left', function() {
		    	this.checkFocus.call(this, this.previousSegment);
		    }.bind(this));
		    Mousetrap.bind('shift+e', function() {
		    	this.checkFocus.call(this, this.editAnnotation);
		    }.bind(this));
	    }
	    //annotation controls for the media object
	    if(this.props.annotationSupport.mediaObject) {
	    	Mousetrap.bind('shift+a', function() {
		    	this.checkFocus.call(this, this.editMediaObjectAnnotation);
		    }.bind(this));
	    }

	    //fast forward shortcuts (somehow cannot create these in a loop...)
	    Mousetrap.bind('1', function() {
	        this.checkFocus.call(this, this.ff, 1);
	    }.bind(this));
	    Mousetrap.bind('2', function() {
	        this.checkFocus.call(this, this.ff, 2);
	    }.bind(this));
	    Mousetrap.bind('3', function() {
	        this.checkFocus.call(this, this.ff, 3);
	    }.bind(this));
	    Mousetrap.bind('4', function() {
	        this.checkFocus.call(this, this.ff, 4);
	    }.bind(this));
	    Mousetrap.bind('5', function() {
	        this.checkFocus.call(this, this.ff, 5);
	    }.bind(this));
	    Mousetrap.bind('6', function() {
	        this.checkFocus.call(this, this.ff, 6);
	    }.bind(this));
	    Mousetrap.bind('7', function() {
	        this.checkFocus.call(this, this.ff, 7);
	    }.bind(this));
	    Mousetrap.bind('8', function() {
	        this.checkFocus.call(this, this.ff, 8);
	    }.bind(this));
	    Mousetrap.bind('9', function() {
	        this.checkFocus.call(this, this.ff, 9);
	    }.bind(this));

	    //rewind shortcuts
	    Mousetrap.bind('shift+1', function() {
	        this.checkFocus.call(this, this.rw, 1);
	    }.bind(this));
	    Mousetrap.bind('shift+2', function() {
	        this.checkFocus.call(this, this.rw, 2);
	    }.bind(this));
	    Mousetrap.bind('shift+3', function() {
	        this.checkFocus.call(this, this.rw, 3);
	    }.bind(this));
	    Mousetrap.bind('shift+4', function() {
	        this.checkFocus.call(this, this.rw, 4);
	    }.bind(this));
	    Mousetrap.bind('shift+5', function() {
	        this.checkFocus.call(this, this.rw, 5);
	    }.bind(this));
	    Mousetrap.bind('shift+6', function() {
	        this.checkFocus.call(this, this.rw, 6);
	    }.bind(this));
	    Mousetrap.bind('shift+7', function() {
	        this.checkFocus.call(this, this.rw, 7);
	    }.bind(this));
	    Mousetrap.bind('shift+8', function() {
	        this.checkFocus.call(this, this.rw, 8);
	    }.bind(this));
	    Mousetrap.bind('shift+9', function() {
	        this.checkFocus.call(this, this.rw, 9);
	    }.bind(this));
	}

	/* ------------------------------------------------------------------------------
	------------------------------- COMMUNICATION WITH OWNER/RECIPE -----------------
	------------------------------------------------------------------------------- */

	setActiveAnnotation(annotation, play) {
		const index = AnnotationUtil.getSegmentIndex(this.state.annotations, annotation);
		this.setState(
			{
				activeAnnotation : annotation,
				activeAnnotationIndex : index
			},
			play ? this.playAnnotation.call(this, annotation) : null
		);
	}

	//TODO set the active index too
	playAnnotation(annotation) {
		if(annotation && annotation.target) {
			//TODO make sure to check the mimeType and also add support for images/spatial targets!!
			if(annotation.target.source == this.state.currentMediaObject.assetId) {
				this.setActiveAnnotation(annotation);
				const frag = AnnotationUtil.extractTemporalFragmentFromAnnotation(annotation.target);
				if(frag) {
					this.state.playerAPI.setActiveSegment(this.state.currentMediaObject, frag, true, true);
				} else {
					this.state.playerAPI.setActiveSegment(this.state.currentMediaObject, null, true, true);
				}
			}
		}
	}

	editAnnotation() {
		if(this.state.activeAnnotation) {
			AnnotationActions.edit(this.state.activeAnnotation);
		}
	}

	deleteAnnotation() {
		if(this.state.activeAnnotation) {
			AnnotationActions.delete(this.state.activeAnnotation);
		}
	}

	/* ---------------------------- MEDIA OBJECT ANNOTATION SPECIFIC ------------------------- */

	editMediaObjectAnnotation() {
		let annotation = this.state.mediaObjectAnnotation;
		if(!annotation) {
			annotation = AnnotationUtil.generateW3CEmptyAnnotation(
				this.props.user,
				this.props.project,
				this.props.collectionId,
				this.props.resourceId,
				this.state.currentMediaObject
			);
		}
		AnnotationActions.edit(annotation);
	}

	/* ---------------------------- SEGMENT ANNOTATION SPECIFIC ------------------------- */

	newSegment() {
		this.setState({
			activeAnnotation : null,
			segmentStart : -1,
			segmentEnd : -1
		})
	}

	newSegmentFromLast() {
		if(this.state.segmentEnd > 0) {
			this.setState(
				{
					activeAnnotation : null,
					segmentStart : this.state.segmentEnd,
					segmentEnd : -1
				},
				() => {
					this.__doOnAirSeek(this.state.segmentEnd)
				}
			)
		} else {
			this.newSegment();
		}
	}

	saveSegment() {
		AnnotationActions.save(
			AnnotationUtil.toUpdatedAnnotation(
				this.props.user,
				this.props.project,
				this.props.collectionId,
				this.props.resourceId,
				this.state.currentMediaObject,
				{
					start : this.state.segmentStart,
					end : this.state.segmentEnd
				},
				this.state.activeAnnotation
			)
		);
	}

	nextSegment() {
		const segment = AnnotationUtil.getSegment(this.state.annotations, this.state.activeAnnotationIndex + 1);
		if(segment) {
			AnnotationActions.set(segment);
		}
	}

	previousSegment() {
		const segment = AnnotationUtil.getSegment(this.state.annotations, this.state.activeAnnotationIndex - 1);
		if(segment) {
			AnnotationActions.set(segment);
		}
	}

	playTrack(index) {
		this.setState(
			{
				currentMediaObject : this.state.playList[index],
				playerAPI : null,
				activeAnnotation : null,
				segmentStart : -1,
				segmentEnd : -1
			},
			() => {
				//make sure to load the annotations of the selected track
				this.loadAnnotations(null);

				//communicate the selected track back to the details page
				this.onOutput(this.state.playList[index])
			}
		)
	}

	/* ----------------- inter component communication --------------------- */

	onOutput(mediaObject) {
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, mediaObject)
		}
	}

	/* ----------------- just rendering --------------------- */

	render() {
		//update the activeSegment in the playerAPI
		if(this.state.segmentStart != -1 && this.state.segmentEnd != -1 && this.state.playerAPI) {
			this.state.playerAPI.setActiveSegment({
				segmentStart : this.state.segmentStart,
				segmentEnd : this.state.segmentEnd
			});
		}

		let segmentationControls = null;
		let segmentationBar = null;
		let annotationBar = null;
		let annotationControls = null;
		let annotationSummary = null;
		let transcriber = null;
		let trackList = null;

		//only draw segmentation controls if configured


		if(this.state.playerAPI) {
			if(this.props.annotationSupport.mediaSegment) {
				const controls = {
					setManualStart : this.setManualStart.bind(this),
					setManualEnd : this.setManualEnd.bind(this)
				}
				segmentationControls = (
					<SegmentationControls
						controls={controls}
						annotation={this.state.activeAnnotation}
						start={this.state.segmentStart}
						end={this.state.segmentEnd}/>
				);
				segmentationBar = (
					<SegmentationTimeline
						mediaObject={this.state.currentMediaObject}
						duration={this.state.duration}
						curPosition={this.state.curPosition}
						start={this.state.segmentStart}
						end={this.state.segmentEnd}
						playerAPI={this.state.playerAPI}
					/>
				);
				annotationBar = (
					<AnnotationTimeline
						mediaObject={this.state.currentMediaObject}
						annotations={this.state.annotations}
						annotation={this.state.activeAnnotation}
						annotationLayers={this.props.annotationLayers}
						duration={this.state.duration}
						curPosition={this.state.curPosition}
						start={this.state.segmentStart}
						end={this.state.segmentEnd}
						playerAPI={this.state.playerAPI}
					/>
				)
				annotationControls = (<div className="row">
					<div className="col-md-12">
						<div>
							{segmentationBar}
							{annotationBar}
						</div>
					</div>
				</div>);
			}
		}

		if(this.state.activeAnnotation) {
			annotationSummary = (
				<AnnotationSummary
					annotation={this.state.activeAnnotation}
					annotationLayers={this.props.annotationLayers}
					showTitle={false}/>
			);
		}

		const playerEventCallbacks = {
		    playProgress : this.playProgress.bind(this),
		    onPlay : this.onPlay.bind(this),
		    onPause : this.onPause.bind(this),
		    onFinish : this.onFinish.bind(this),
		    loadProgress : this.loadProgress.bind(this),
		    onSeek : this.onSeek.bind(this)
		}

		let player = null;

		if(this.state.currentMediaObject) {
			if(this.state.currentMediaObject.mimeType.indexOf('video') != -1) {
				if(this.state.currentMediaObject.url.indexOf('player.vimeo.com') != -1)  {
					player = ( //TODO adapt for playlist and test!
						<VimeoPlayer
						key={'vimeo_player__' + this.state.currentMediaObject.assetId}
						mediaObject={this.state.currentMediaObject}
						eventCallbacks={playerEventCallbacks}
						onPlayerReady={this.onPlayerReady.bind(this)}/>
					);
				} else if (this.state.currentMediaObject.url.indexOf('youtube.com') != -1 ||
					this.state.currentMediaObject.url.indexOf('youtu.be') != -1) {
					player = ( //TODO adapt for playlists and test!
						<YouTubePlayer
						key={'yt_player__' + this.state.currentMediaObject.assetId}
						mediaObject={this.state.currentMediaObject}
						eventCallbacks={playerEventCallbacks}
						onPlayerReady={this.onPlayerReady.bind(this)}/>
					);
				} else {
					player = (
						<HTML5VideoPlayer
						mediaObject={this.state.currentMediaObject}
						useCredentials={this.props.useCredentials}
						eventCallbacks={playerEventCallbacks}
						onPlayerReady={this.onPlayerReady.bind(this)}/>
					);
				}
			} else if(this.state.currentMediaObject.mimeType.indexOf('audio') != -1) {
				player = (<HTML5AudioPlayer
					mediaObject={this.state.currentMediaObject}
					useCredentials={this.props.useCredentials}
					eventCallbacks={playerEventCallbacks}
					onPlayerReady={this.onPlayerReady.bind(this)}/>
				);
			}
		}

		//if there is a transcript and a ready player API, draw the transcriber
		if(this.props.transcript && this.state.playerAPI) { //player API must be ready!
			//only pass the part belonging to the current media object!
			const transcript = this.props.transcript.filter(
				t => t.carrierId == this.state.currentMediaObject.assetId
			)
			if(transcript.length > 0) {
				//completely redraw whenever the media object changes (FIXME change the transcriber)
				transcriber = (
					<Transcriber
						key={'transcriber__' + this.state.currentMediaObject.assetId}
						initialSearchTerm={this.props.initialSearchTerm}
						transcript={transcript}
						curPosition={this.state.curPosition}
						playerAPI={this.state.playerAPI}
					/>
				)
			}
		}

		//show the track list
		if(this.state.playList && this.state.playList.length > 1) {
			const trackOptions = this.state.playList.map(((t, index) => {
				return (
					<div className={IDUtil.cssClassName('track-item', this.CLASS_PREFIX)}
						onClick={this.playTrack.bind(this, index)}
						title={'Carrier ID: ' + t.assetId}
						>
						{'Track ' + (index+1)}
					</div>
				)
			}))

			trackList = (
				<div className={IDUtil.cssClassName('track-list', this.CLASS_PREFIX)}>
					{trackOptions}
				</div>
			)
		}

		return (
			<div className={IDUtil.cssClassName('flex-player')}>
				<div className="row">
					<div className="col-md-7" style={{overflowX : 'auto'}}>
						<div className={IDUtil.cssClassName('track-title', this.CLASS_PREFIX)}>
							Playing: {this.state.currentMediaObject.assetId}
						</div>
						{player}
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
						{trackList}
					</div>
					<div className="col-md-5">
						{segmentationControls}
						{annotationSummary}
					</div>
				</div>
				{annotationControls}
				{transcriber}
			</div>
		)
	}

}

FlexPlayer.PropTypes = {
	//this is the media object the player will try to load
	//the mimeType & url determine which implementation (HTML5, YouTube, JW, Vimeo) will be used
	mediaObject: PropTypes.shape({
	    url: PropTypes.string.isRequired,
	    mimeType: PropTypes.string.isRequired
	}).isRequired,

	//the resource & collection ID are required for saving annotations
	resourceId: PropTypes.string.isRequired,
	collectionId: PropTypes.string.isRequired,

	//required for loading & saving media object related annotations of the current user
	user: PropTypes.shape({
    	id: PropTypes.string.isRequired
  	}).isRequired,

	//(optional) represents the active project, used for loading & saving annotations to the right project
	project: PropTypes.shape({
	    id: PropTypes.string.isRequired,
	}),

	//(optional) player callback functions the owner can register to
	onLoadProgress: PropTypes.func,
	onPlay: PropTypes.func,
	onPlayProgress: PropTypes.func,
	onPause: PropTypes.func,
	onFinish: PropTypes.func,
	onSeek: PropTypes.func,
	onPlayerReady: PropTypes.func, //returns the PlayerAPI, so the owner can control the player

	//whether media object annotation
	annotationSupport: PropTypes.shape ({
		mediaObject: PropTypes.object, //if not null, it means: "please activate annotation support for the media object"
		mediaSegment: PropTypes.object //if not null, it means: "please activate annotation support for the media segment"
	}),

	active: PropTypes.bool, // this reflects whether this component is visible, so the keyboard controls can be activated

	transcript : PropTypes.array, //audio transcript

	annotationLayers : PropTypes.array //for future implementation

};

export default FlexPlayer;
