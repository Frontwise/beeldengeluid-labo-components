/*
Currently uses:
	- https://openseadragon.github.io
	- https://github.com/picturae/openseadragonselection

	TODO
		- check out the flexplayer to see how to update annotations here
		- check out ViewDir!: https://viewdir.github.io/
		- make sure to draw overlays only on the appropriate page!!!
*/

import AnnotationAPI from '../../../api/AnnotationAPI';
import AnnotationUtil from '../../../util/AnnotationUtil';
import IDUtil from '../../../util/IDUtil';
import IconUtil from '../../../util/IconUtil';

import AnnotationActions from '../../../flux/AnnotationActions';
import AppAnnotationStore from '../../../flux/AnnotationStore';

class FlexImageViewer extends React.Component {

	constructor(props) {
		super(props);

		this.viewer = null;
		this.annotationIdCount = 0;//TODO do this differently later on
		this.state = {
			annotations : [],
			viewerLoaded : false,
			currentPage : this.getInitialPage()
		}
		this.CLASS_PREFIX = 'fiv';
	}

	/* --------------------------------------------------------------
	-------------------------- OBSERVING THE API --------------------
	---------------------------------------------------------------*/

	componentDidMount() {
		if(this.props.annotationSupport) {
			//listen to any changes made on the media objects
			this.props.mediaObjects.forEach((mo) => {
				AppAnnotationStore.bind(
					AnnotationUtil.removeSourceUrlParams(mo.url),
					this.onMediaObjectChange.bind(this)
				);
			})
		}
		this.initViewer(this.onViewerInitialized.bind(this));
	}

	//TODO make sure everything is updated properly
	onMediaObjectChange(eventType, data, annotation) {
		if(eventType) {
			if(eventType == 'update') {
				this.loadAnnotations();
			} else if (eventType == 'delete' && annotation && annotation.id) {
				this.viewer.removeOverlay(annotation.id);
				const temp = [];
				this.state.annotations.forEach((a) => {
					if(a.id != annotation.id) {
						temp.push(a);
					}
				});
				this.setState({annotations : temp});
			}
		}
	}

	/* --------------------------------------------------------------
	-------------------------- VIEWER INITIALIZATION ----------------
	---------------------------------------------------------------*/

	//first load the viewer using the provided this.props.mediaObjects
	initViewer(callback) {
		//const i = this.props.mediaObject.url.indexOf('.tif');
        //const infoUrl = this.props.mediaObject.url.substring(0, i + 4) + '/info.json'
		//setup the basic viewer

		//map the media objects to sources OpenSeaDragon likes
		const sources = this.props.mediaObjects.map(mo => {
			return this.toOSDUrl(mo);
		});
		this.viewer = OpenSeadragon({
			id: 'img_viewer' ,
			prefixUrl: '/static/node_modules/openseadragon/build/openseadragon/images/',
			showSelectionControl: true,
			sequenceMode : true,
			preserveViewport: true,
			height: '100px',
			ajaxWithCredentials : this.props.useCredentials,
			tileSources: sources.map(s => s.infoUrl),
			initialPage : this.state.currentPage
		});

		//make sure the selection button tooltips have translations (otherwise annoying debug messages)
		OpenSeadragon.setString('Tooltips.SelectionToggle', 'Toggle selection');
		OpenSeadragon.setString('Tooltips.SelectionConfirm', 'Confirm selection');

		//for debugging only
		this.viewer.addHandler('canvas-click', function(target, info) {
	        // The canvas-click event gives us a position in web coordinates.
	        const webPoint = target.position;
	        // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
	        const viewportPoint = this.viewer.viewport.pointFromPixel(webPoint);
	        // Convert from viewport coordinates to image coordinates.
	        const imagePoint = this.viewer.viewport.viewportToImageCoordinates(viewportPoint);
	        // Show the results.
	        console.log(webPoint.toString(), viewportPoint.toString(), imagePoint.toString());
	    }.bind(this));

		//create an overlay of the selected region on the selected page (using this.props.selectedMediaObject)
		//TEST THIS CHANGE LATER
		if(this.props.selectedMediaObject) {
		    this.viewer.addHandler('open', function(target, info) {
		        const r = this.viewer.viewport.imageToViewportRectangle(
		            parseInt(this.props.selectedMediaObject.x),
		            parseInt(this.props.selectedMediaObject.y),
		            parseInt(this.props.selectedMediaObject.w),
		            parseInt(this.props.selectedMediaObject.h)
		        );
		        const elt = document.createElement("div");
		        elt.className = IDUtil.cssClassName('highlight', this.CLASS_PREFIX);
		        this.viewer.addOverlay(elt, r);
		    }.bind(this));
		}

		//add the selection (rectangle) support (Picturae plugin)
		if(this.props.annotationSupport) {
			this.viewer.selection({
				showConfirmDenyButtons: true,
				styleConfirmDenyButtons: true,
				returnPixelCoordinates: true,
				//crossOriginPolicy: 'Anonymous',
				keyboardShortcut: 'c', // key to toggle selection mode
				rect: null, // initial selection as an OpenSeadragon.SelectionRect object
				startRotated: false, // alternative method for drawing the selection; useful for rotated crops
				startRotatedHeight: 0.1, // only used if startRotated=true; value is relative to image height
				restrictToImage: false, // true = do not allow any part of the selection to be outside the image
				onSelection: function(rect) {
					//user, project, collectionId, resourceId, mediaObject = null, segmentParams = null
					this.addEmptyAnnotation.call(
						this,
						AnnotationUtil.generateW3CEmptyAnnotation(
							this.props.user,
							this.props.project,
							this.props.collectionId,
							this.props.resourceId,
							this.props.mediaObjects[this.state.currentPage],
							{
								rect : {
									x : rect.x,
									y : rect.y,
									w : rect.width,
									h : rect.height
								},
								rotation : rect.rotation
							}

						)
					);
				}.bind(this), // callback
				prefixUrl: '/static/vendor/openseadragonselection-master/images/',
				navImages: { // overwrites OpenSeadragon's options
					selection: {
						REST:   'selection_rest.png',
						GROUP:  'selection_grouphover.png',
						HOVER:  'selection_hover.png',
						DOWN:   'selection_pressed.png'
					},
					selectionConfirm: {
						REST:   'selection_confirm_rest.png',
						GROUP:  'selection_confirm_grouphover.png',
						HOVER:  'selection_confirm_hover.png',
						DOWN:   'selection_confirm_pressed.png'
					},
					selectionCancel: {
						REST:   'selection_cancel_rest.png',
						GROUP:  'selection_cancel_grouphover.png',
						HOVER:  'selection_cancel_hover.png',
						DOWN:   'selection_cancel_pressed.png'
					},
				}
			});

			this.viewer.addHandler('open', function(target, info) {
				callback();
			}.bind(this));

			//make sure the annotations are updated per page/image
			this.viewer.addHandler('page', function(e) {
				this.setState(
					{currentPage : e.page},
					() => {
						this.onOutput();
					}
				)
			}.bind(this));
		}

	}

	//when initialized, load the annotations
	onViewerInitialized() {
		this.loadAnnotations();
	}

	loadAnnotations() {
		AppAnnotationStore.getMediaObjectAnnotations(
			this.props.mediaObjects[this.state.currentPage].url,
			this.props.user,
			this.props.project,
			this.onLoadAnnotations.bind(this)
		);
	}

	//FIXME make sure this works again for the new annotations
	onLoadAnnotations(annotationData) {
		this.setState(
			(previousState, currentProps) => {
				return { //before setting the new annotations, delete the old overlays
					annotations : this.deleteOldOverlays.call(
						this, previousState.annotations, annotationData.annotations
					)
				};
			},
			() => { //then render the new overlays
				this.renderOverlays();
			}
		);
	}


	//the mediaObject with a width & height is the one selected via the URL and should be highlighted
	//FIXME this is a quite ugly way to check this
	getInitialPage() {
		let index = 0;
		for(let i=0;i<this.props.mediaObjects.length;i++) {
			if(this.props.mediaObjects[i].w && this.props.mediaObjects[i].h) {
				index = i;
				break;
			}
		}
		return index;
	}

	toOSDUrl(mediaObject) {
		const index = mediaObject.url.indexOf('.tif'); //FIXME very weak way to check if it's IIIF!
		let moClone = JSON.parse(JSON.stringify(mediaObject));
		if(index == -1) {
			moClone.infoUrl = mediaObject.url;
		} else {
			moClone.infoUrl = mediaObject.url.substring(0, index + 4) + '/info.json';
    	}
    	return moClone;
	}

	deleteAnnotation(annotation, event) {
		if(event) {
			event.preventDefault();
			event.stopPropagation();
		}
		if(annotation && annotation.id) {
			AnnotationActions.delete(annotation);
		}
	}

	/* --------------------------------------------------------------
	-------------------------- ANNOTATION CRUD ----------------------
	---------------------------------------------------------------*/

	renderOverlays() {
		this.state.annotations.forEach((annotation) => {
			if(!this.viewer.getOverlayById(annotation.id)) {
				this.renderAnnotation(annotation);
			}
		});
	}

	deleteOldOverlays(oldAnnotations, newAnnotations) {
		oldAnnotations.forEach((annotation) => {
			this.viewer.removeOverlay(annotation.id);
		});
		return newAnnotations;
	}

	addEmptyAnnotation(annotation) {
		const annotations = this.state.annotations;
		annotation.id = IDUtil.guid();
		annotations.push(annotation);
		this.setState({
			annotations : annotations
		}, this.openAnnotationForm.bind(this, annotation));
	}

	setActiveAnnotation(annotationId, event) {
		const d = document.getElementById(annotationId);
		const overlays = document.getElementsByClassName(IDUtil.cssClassName('overlay', this.CLASS_PREFIX));
		if(overlays) {
			[].forEach.call(overlays, (elm) => {
				elm.className = IDUtil.cssClassName('overlay', this.CLASS_PREFIX);
			});
			if(
				d &&
				d.className.indexOf(IDUtil.cssClassName('overlay', this.CLASS_PREFIX)) != -1 &&
				d.className.indexOf('active') == -1) {
					d.className += " active";
			}
		}
	}

	renderAnnotation(annotation) {
		const selectedArea = annotation.target.selector.refinedBy.rect;
		const translatedArea = this.viewer.viewport.imageToViewportRectangle(
			parseInt(selectedArea.x),
			parseInt(selectedArea.y),
			parseInt(selectedArea.w),
			parseInt(selectedArea.h)
		);
		const elt = document.createElement('div');
		elt.className = IDUtil.cssClassName('overlay', this.CLASS_PREFIX);
		elt.onclick= this.setActiveAnnotation.bind(this, annotation.id);
		elt.id = annotation.id;

		const buttonDiv = document.createElement('div');
		buttonDiv.className = 'text-center';

		//add the remove button
		const addBtn = document.createElement('button');
		addBtn.className = 'btn btn-default';
		addBtn.onclick = this.openAnnotationForm.bind(this, annotation);
		const addGlyph = document.createElement('span');
		addGlyph.className = IconUtil.getUserActionIcon('annotate');
		addBtn.appendChild(addGlyph);

		//add the remove button
		const removeBtn = document.createElement('button');
		removeBtn.className = 'btn btn-default';
		removeBtn.onclick = this.deleteAnnotation.bind(this, annotation);
		const removeGlyph = document.createElement('span');
		removeGlyph.className = IconUtil.getUserActionIcon('remove');
		removeBtn.appendChild(removeGlyph);

		buttonDiv.appendChild(addBtn);
		buttonDiv.appendChild(removeBtn);

		elt.appendChild(buttonDiv);

		this.viewer.addOverlay({
			element: elt,
			location: translatedArea
		});
	}

	openAnnotationForm(annotation, event) {
		if(event) {
			event.preventDefault();
			event.stopPropagation();
		}
		if(this.props.editAnnotation) {
			this.props.editAnnotation(annotation);
		}
	}

	/* ------------------------------------------------------------------------------
	------------------------------- COMMUNICATION WITH OWNER/RECIPE -----------------
	------------------------------------------------------------------------------- */

	//send back the active mediaObject to the owner, so it can update related components (such as the annotation list)
	onOutput() {
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, this.props.mediaObjects[this.state.currentPage])
		}
		this.loadAnnotations();
	}

	render() {
		return (
			<div id="img_viewer" className={IDUtil.cssClassName('flex-image-viewer')}></div>
		)
	}

}

export default FlexImageViewer;