import TimeUtil from './util/TimeUtil';
import IDUtil from './util/IDUtil';
import IconUtil from './util/IconUtil';
import ComponentUtil from './util/ComponentUtil';

import FlexBox from './components/FlexBox';
import FlexModal from './components/FlexModal';
import FlexPlayer from './components/player/video/FlexPlayer';
import FlexImageViewer from './components/player/image/FlexImageViewer';

import MetadataTable from './components/search/MetadataTable';

import LDResourceViewer from './components/linkeddata/LDResourceViewer';

import DocumentAPI from './api/DocumentAPI';
import PlayoutAPI from './api/PlayoutAPI';

import AnnotationAPI from './api/AnnotationAPI';
import AnnotationUtil from './util/AnnotationUtil'
import AnnotationBox from './components/annotation/AnnotationBox';
import AnnotationList from './components/annotation/AnnotationList';

import AnnotationActions from './flux/AnnotationActions';
import AnnotationStore from './flux/AnnotationStore';

import CollectionUtil from './util/CollectionUtil';

import ProjectSelector from './components/workspace/projects/ProjectSelector';
import BookmarkSelector from './components/bookmark/BookmarkSelector';

import PropTypes from 'prop-types';

import { initHelp } from './components/workspace/helpers/helpDoc';

//import TranscriptExample from './components/transcript.json';

/*
	1. The ItemDetailsRecipe takes care of tying the components together according to the recipe
	2. Each media player (and any other annotation target) in the recipe takes care of loading its own annotations
	3. Ideally the whole query that led to this page should be reflected in the GET parameters (for sharing)
	4. There can only be one active annotation; this recipe must know which component has the active annotation?
	5.

	leesvoer: http://blog.andrewray.me/flux-for-stupid-people/

	TODO:
	- make sure this old crap is replaced with something new:
		- the fq annotations were found on this record/program
			- however the annotations are related to media fragments (also)
			- distinguish loading of media fragment annotations & record/program annotations

*/

//TODO move most of the stuff to a new component called ResourceViewer
class ItemDetailsRecipe extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			showModal : false, //triggered by the media players whenever an annotation needs to be edited
			showProjectModal : false, //showing the project selector
			showBookmarkModal : false, //showing the bookmark selector

			activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),

			itemData : null, //populated via componentDidMount

			activeMediaTab : 0, //which tab, i.e. media player, is visible/active

			//These variables are passed on to the media players (as props) that actually show the annotations.
			//These variables are filled by listening to the AnnotationStore, which are triggered by the players...
			//TODO All this is kind of weird and should be optimised
			activeAnnotation: null,
			activeSubAnnotation: null,//TODO this will be removed whenever switching to the new graph model
			annotationTarget : null,

			found : false, //whether the item metadata could be found

			resourceAnnotations : [],

			awaitingProcess : null,

			collectionConfig : null
		}
		this.tabListeners = false;
		this.CLASS_PREFIX = 'rcp__id'
	}

	//starts listening to any annotation actions, triggered by the players, and fetches the item details
	componentDidMount() {
		//make sure to listen to the correct events (TODO determine this based on the recipe)
		AnnotationStore.bind('edit-annotation', this.editAnnotation.bind(this));
		AnnotationStore.bind('set-annotation', this.setActiveAnnotation.bind(this));
		AnnotationStore.bind('play-annotation', this.setActiveAnnotation.bind(this));
		AnnotationStore.bind('save-annotation', this.onSaveAnnotation.bind(this));
		AnnotationStore.bind('del-annotation', this.onDeleteAnnotation.bind(this));

		if(this.props.params.id && this.props.params.cid) {
			let searchLayer = this.props.params.cid;
			if(this.props.params.l) {
				searchLayer += '__' + this.props.params.l;
			}
			DocumentAPI.getItemDetails(
				searchLayer,
				this.props.params.id,
				this.onLoadItemData.bind(this)
			);
		}

		initHelp("Resource viewer", "/feature-doc/tools/resource-viewer");
	}

	//makes sure to update the annotation target whenever the user selects another media object by
	//navigating to another tab (currently each media object is put under a tab...)
	//TODO replace the stupid tabs with a select box or something
	componentDidUpdate() {
		//FIXME a horrible way to attach a tab listener here instead of in componentDidMount
		//(for now we have to wait until the jquery is available... )
		if(!this.tabListeners) {
			$('a[data-toggle="tab"]').on('show.bs.tab', function (e) {
				const target = $(e.target).attr("href") // activated tab
				const index = target.substring('#mo__'.length);
				const annotationTarget = this.getAnnotationTarget(this.state.itemData, index)
				if(annotationTarget) {
					this.setActiveAnnotationTarget.call(this, annotationTarget);
				} else {
					console.debug('There is no valid target?');
				}

			}.bind(this));
			this.tabListeners = true;
		}
	}

	onComponentOutput(componentClass, data) {
		if(componentClass == 'ProjectSelector') {
			this.setState(
				{activeProject : data},
				() => {
					this.onProjectChanged.call(this, data)
				}
			);
		} else if(componentClass == 'BookmarkSelector') {
			this.bookmarkToGroupInProject(data);
		} else if(componentClass == 'FlexImageViewer') {
			this.setActiveAnnotationTarget({
				source : data.url //data => mediaObject
			})
		} else if(componentClass == 'FlexPlayer') {
			this.setActiveAnnotationTarget({
				source : data.url //data => mediaObject
			})
		}
	}

	onLoadItemData(collectionId, resourceId, data) {
		let found = data ? data.found : false;
		if(data && data.error) {
			found = false; //e.g. in case of access denied
		}
		if(collectionId && found != false) {
			CollectionUtil.generateCollectionConfig(
				this.props.clientId,
				this.props.user,
				collectionId,
				function(config) {
					const itemDetailData = config.getItemDetailData(data);
					found = itemDetailData == null ? false : true;
					if(found) {
						//determine which media contant tab should be active
						let activeMediaTab = 0;
						if(itemDetailData.playableContent && this.props.params.fragmentUrl) {
							for(let i = 0;i<itemDetailData.playableContent.length;i++) {
								const mediaObject = itemDetailData.playableContent[i];
								if(mediaObject.url == this.props.params.fragmentUrl) {
									activeMediaTab = i;
									break;
								}
							}
						}
						let desiredState = {
							itemData : itemDetailData,
							annotationTarget : this.getAnnotationTarget.call(this, itemDetailData), //for the list
							found : true,
							activeMediaTab : activeMediaTab,
							collectionConfig : config
						}
						//TODO make sure this works for all carriers!!
						if (config.requiresPlayoutAccess() && itemDetailData.playableContent) {
							PlayoutAPI.requestAccess(
								itemDetailData.playableContent[0].contentServerId,
								itemDetailData.playableContent[0].contentId,
								desiredState,
								this.onLoadPlayoutAccess.bind(this)
							)
						} else {
							this.setState(desiredState);
						}

						//finally load the resource annotation with motivation bookmarking
						AnnotationStore.getDirectResourceAnnotations(
							itemDetailData.resourceId,
							this.props.user,
							this.state.activeProject,
							this.onLoadResourceAnnotations.bind(this)
						)
					}
				}.bind(this));
		}
		if(found == false) {
			this.setState({
				itemData : data,
				annotationTarget : null,
				found : false
			})
			console.debug('this item does not exist');
		}
	}

	//TODO call this after the details are loaded
	onLoadPlayoutAccess(accessApproved, desiredState) {
		this.setState(desiredState);
	}

	/* ------------------------------------------------------------------------------
	------------------------------- ANNOTATION RELATED FUNCTIONS --------------------
	------------------------------------------------------------------------------- */

	//determine which (media object) target on the page should be the active annotation target
	getAnnotationTarget(itemDetailData, index=0) {
		if(itemDetailData && itemDetailData.playableContent) {
			const mediaObject = itemDetailData.playableContent[index];
			if(mediaObject) {
				const annotation = AnnotationUtil.generateW3CEmptyAnnotation(
					this.props.user,
					this.state.activeProject,
					itemDetailData.index,
					itemDetailData.resourceId,
					mediaObject
				);
				return annotation.target;
			}
		}
		return null;
	}

	onSaveAnnotation(annotation) {
		ComponentUtil.hideModal(this, 'showModal' , 'annotation__modal', true);
		//finally update the resource annotations (the "bookmark")
		if(annotation && annotation.target && annotation.target.type == 'Resource') {
			this.refreshResourceAnnotations();
		}
	}

	onDeleteAnnotation(annotation) {
		ComponentUtil.hideModal(this, 'showModal', 'annotation__modal', true);
		//finally update the resource annotations (the "bookmark")
		if(annotation && annotation.target && annotation.target.type == 'Resource') {
			this.refreshResourceAnnotations();
		}
	}

	//TODO currently this is only called via the ugly componentDidUpdate() function
	setActiveAnnotationTarget(annotationTarget) {
		this.setState(
			{annotationTarget : annotationTarget},
			() => {
				AnnotationActions.changeTarget(annotationTarget)
			}
		);
	}

	//overall there can be only one active annotation
	//TODO extend with activeSubAnnotation?
	setActiveAnnotation(annotation) {
		this.setState({
			activeAnnotation : annotation
		})
	}

	//tied to the annotateResourceBtn; used to annotate a resource as a whole
	annotateResource() {
		if(this.state.collectionConfig && this.state.itemData) {
			let annotation = this.getResourceAnnotation();
			if(!annotation) {
				annotation = AnnotationUtil.generateW3CEmptyAnnotation(
					this.props.user,
					this.state.activeProject,
					this.state.collectionConfig.getCollectionId(),
					this.state.itemData.resourceId
				);
			}
			this.editAnnotation(annotation, null);
		}
	}

	getResourceAnnotation() {
		let annotation = null;
		if(this.state.resourceAnnotations) {
			let temp = this.state.resourceAnnotations.filter(a => a.motivation != 'bookmarking')
			annotation = temp.length > 0 ? temp[0] : null;
		}
		return annotation
	}

	//show the annnotation form with the correct annotation target
	//TODO extend this so the target can also be a piece of text or whatever
	editAnnotation(annotation, subAnnotation) {
		//TODO this should simply always just set the active annotation
		//an annotation ALWAYS has a target, but not always a body or ID (in case of a new annotation)
		if(annotation.target) {
			this.setState({
				showModal: true,
				annotationTarget: annotation.target,
				activeAnnotation: annotation,
				activeSubAnnotation : subAnnotation
			});
		}
	}

	refreshResourceAnnotations() {
		AnnotationStore.getDirectResourceAnnotations(
			this.state.itemData.resourceId,
			this.props.user,
			this.state.activeProject,
			this.onLoadResourceAnnotations.bind(this)
		)
	}

	//TODO loaded all bookmarks associated with this resource (e.g. program, newspaper)
	onLoadResourceAnnotations(data) {
		this.setState({
			resourceAnnotations : data.annotations || []
		})
	}

	/* ------------------------------------------------------------------
	----------------------- PROJECTS ------------------------------------
	--------------------------------------------------------------------- */

	triggerProjectSelector() {
		let showProjectModal = this.state.showProjectModal;
		this.setState({
			showProjectModal : !showProjectModal
		});
	}

	//TODO test this
	onProjectChanged(project) {
		ComponentUtil.storeJSONInLocalStorage('activeProject', project)
		ComponentUtil.hideModal(this, 'showProjectModal', 'project__modal', true, () => {
			AnnotationActions.changeProject(project);
			this.refreshResourceAnnotations()
			if(this.state.awaitingProcess == 'bookmark') {
				this.selectBookmarkGroup();
			}
		});
	}

	/* ------------------------------------------------------------------
	----------------------- BOOKMARK ------------------------------------
	--------------------------------------------------------------------- */

	//this will first check if a project was selected. Then either bookmarks or opens the project selector first
	bookmark() {
		if(this.state.activeProject == null) {
			this.setState({
				showProjectModal : true,
				awaitingProcess : 'bookmark'
			});
		} else {
			this.selectBookmarkGroup();
		}
	}

	//this will actually save the selection to the workspace API
	selectBookmarkGroup() {
		this.setState({
			showBookmarkModal : true,
			awaitingProcess : null
		});
	}

	//finally after a bookmark group is selected, save the bookmark
	bookmarkToGroupInProject(annotation) {
		ComponentUtil.hideModal(this, 'showBookmarkModal', 'bookmark__modal', true, () => {
			//concatenate this resource to the existing "bookmark annotation"
			const targets = annotation.target;
			targets.push(
				AnnotationUtil.generateSimpleResourceTarget(
					this.state.itemData.resourceId,
					this.state.itemData.index //collectionId
				)
			);
			const temp = {};
			const dedupedTargets = [];
			targets.forEach((t) => {
				if(!temp[t.source]) {
					temp[t.source] = true;
					dedupedTargets.push(t);
				}
			})
			//set the deduped targets as the annotation target
			annotation.target = dedupedTargets;
			//TODO implement saving the bookmarks in the workspace API
			AnnotationAPI.saveAnnotation(annotation, this.onSaveBookmarks.bind(this));
		});
	}

	onSaveBookmarks(data) {
		this.setState({
			selectedRows : {},
			allRowsSelected : false
		}, () => {
			console.debug('saved bookmark, refreshing the annotations', data);
			this.refreshResourceAnnotations();
		})
	}



	/************************************************************************
	************************ CALLED BY RENDER *******************************
	*************************************************************************/

	checkMediaObjectIsSelected(mediaObject) {
		if(mediaObject.url == this.props.params.fragmentUrl) {
			mediaObject.start = this.props.params.s;
			mediaObject.end = this.props.params.e;
			mediaObject.x = this.props.params.x;
			mediaObject.y = this.props.params.y;
			mediaObject.w = this.props.params.w;
			mediaObject.h = this.props.params.h;
			return true;
		}
		return false;
	}


	//TODO this function is almost the same as checkMediaObjectIsSelected, remove the latter
	getSelectedMediaObject() {
		let mediaObject = null;
		if(this.props.params.fragmentUrl) {
			mediaObject = {url : this.props.params.fragmentUrl};
			if(this.props.params.s) {
				mediaObject.start = this.props.params.s;
			}
			if(this.props.params.e) {
				mediaObject.end = this.props.params.e;
			}
			if(this.props.params.x) {
				mediaObject.x = this.props.params.x;
			}
			if(this.props.params.y) {
				mediaObject.y = this.props.params.y;
			}
			if(this.props.params.w) {
				mediaObject.w = this.props.params.w;
			}
			if(this.props.params.h) {
				mediaObject.h = this.props.params.h;
			}
		}
		return mediaObject;
	}

	getRenderedMediaContent() {
		//first get all of the media contents per media type
		let tabs = [
			this.getVideoTabContents(),
			this.getAudioTabContents(),
			this.getImageTabContents(),
			this.getApplicationTabContents()
		].filter(t => t != null);

		//generate the tabs
		const mediaTabs = tabs.map((tab, index) => {
			const iconClass = IconUtil.getMimeTypeIcon(tab.type);
			const active = this.props.params.fragmentUrl ? tab.active : index == 0;
			return (
				<li key={tab.type + '__tab'}
					className={active ? 'active' : ''}>
					<a data-toggle="tab" href={'#' + tab.type + '__content'}>
						<span className={iconClass}></span>&nbsp;{tab.type}
					</a>
				</li>
			)
		}, this)

		//then the contents of the tabs
		const mediaTabContents = tabs.map((tab, index) => {
			const active = this.props.params.fragmentUrl ? tab.active : index == 0;
			return (
				<div key={tab.type + '__content'}
					id={tab.type + '__content'}
					className={active ? 'tab-pane active' : 'tab-pane'}>
					<div className={IDUtil.cssClassName('media-player', this.CLASS_PREFIX)}>
						{tab.content}
					</div>
				</div>
			);
		}, this);

		//finally generate the mediaPanel
		return (
			<FlexBox title="Related media objects">
				<ul className="nav nav-tabs">
					{mediaTabs}
				</ul>
				<div className="tab-content">
					{mediaTabContents}
				</div>
			</FlexBox>
		);
	}

	//each video will get a separate player (for now)
	getVideoTabContents() {
		const mediaObjects = this.state.itemData.playableContent.filter(content => {
			return content.mimeType.indexOf('video') !== -1;
		})
		if(mediaObjects.length > 0) {
			const content = (
				<FlexPlayer
					mediaObjects={mediaObjects}
					mediaType='video'

					transcript={this.state.itemData.rawData.layer__asr || null}

					initialSearchTerm={this.props.params.st} //every player could interpret highlighting a search term

                    useCredentials={this.state.collectionConfig.requiresPlayoutAccess()}

					user={this.props.user} //current user
					project={this.state.activeProject} //selected via the ProjectSelector
					resourceId={this.state.itemData.resourceId}
					collectionId={this.state.itemData.index}

					active={true}

					enableFragmentMode={false} //get rid of this stupid property

					annotationSupport={this.props.recipe.ingredients.annotationSupport} //annotation support the component should provide
					annotationLayers={this.props.recipe.ingredients.annotationLayers} //so the player can distribute annotations in layers

					onOutput={this.onComponentOutput.bind(this)}
				/>
			);
			return {type : 'video', content : content, active : true}
		}
		return null;
	}

	getAudioTabContents() {
		const mediaObjects = this.state.itemData.playableContent.filter(content => {
			return content.mimeType.indexOf('audio') != -1;
		})
		if(mediaObjects.length > 0) {
			const content = (
				<FlexPlayer
					mediaObjects={mediaObjects}
					mediaType='audio'

					transcript={this.state.itemData.rawData.layer__asr || null}

					initialSearchTerm={this.props.params.st} //every player could interpret highlighting a search term

					useCredentials={this.state.collectionConfig.requiresPlayoutAccess()}

					user={this.props.user} //current user
					project={this.state.activeProject} //selected via the ProjectSelector
					resourceId={this.state.itemData.resourceId}
					collectionId={this.state.itemData.index}

					active={true}

					enableFragmentMode={false} //TODO get rid of this stupid property

					annotationSupport={this.props.recipe.ingredients.annotationSupport} //annotation support the component should provide
					annotationLayers={this.props.recipe.ingredients.annotationLayers} //so the player can distribute annotations in layers

					onOutput={this.onComponentOutput.bind(this)}
				/>
			);
			return {type : 'audio', content : content, active : true}
		}
		return null;
	}

	//images all go into one image viewer (as a playlist)
	getImageTabContents() {
		let isActive = false;
		let cors = true;
		let content = null;
		const images = this.state.itemData.playableContent.filter(content => {
			return content.mimeType.indexOf('image') != -1;
		});
		if(images.length > 0) {
			images.forEach((mediaObject, index) => {
				mediaObject.id = 'application__' + index;
				if(!isActive) {
					isActive = this.checkMediaObjectIsSelected.call(this, mediaObject);
				}
				if(mediaObject.hasOwnProperty('cors') && mediaObject.cors === false) {
					cors = false;
				}
			})
			//CORS is required for OpenSeaDragon support!
			if(cors === false) {
				//for now simply draw a bunch of images on the screen (which means: no annotation support!)
				content = images.map((i) => {
					return (<img src={i.url}/>);
				})
			} else {
				//use openseadragon with annotation support
				content = (
					<FlexImageViewer
						user={this.props.user} //current user
						project={this.state.activeProject} //selected via the ProjectSelector

						resourceId={this.state.itemData.resourceId}
						collectionId={this.state.itemData.index}

						useCredentials={this.state.collectionConfig.requiresPlayoutAccess()}

						mediaObjects={images}//TODO make this plural for playlist support
						selectedMediaObject={this.getSelectedMediaObject()}

						annotationSupport={this.props.recipe.ingredients.annotationSupport} //annotation support the component should provide
						annotationLayers={this.props.recipe.ingredients.annotationLayers} //so the player can distribute annotations in layers

						editAnnotation={this.editAnnotation.bind(this)} //each annotation support should call this function

						onOutput={this.onComponentOutput.bind(this)}
					/>
				)
			}
			return {type : 'image', content : content, active : isActive}
		}
	}

	//application mimetypes will be loaded into iFrames
	getApplicationTabContents() {
		let isActive = false;
		const applications = this.state.itemData.playableContent.filter(content => {
			return content.mimeType.indexOf('application') != -1;
		})
		if(applications.length > 0) {
			const content = applications.map((mediaObject, index) => {
				mediaObject.id = 'application__' + index;
				if(!isActive) {
					isActive = this.checkMediaObjectIsSelected.call(this, mediaObject);
				}
				if(mediaObject.mimeType == 'application/javascript') {
					return (
						<div style={{margin : '10px'}}>
							Deze media kan i.v.m. beperkingen m.b.t. auteursrecht of het type content niet binnen de media suite worden afgespeeld
							<br/>
							<a href={mediaObject.url} target="_external_js">Bekijk de media extern</a>
						</div>
					)
				} else {
					return (
						<iframe src={mediaObject.url} width="650" height="550"/>
					);
				}
			});
			return {type : 'application', content : content, active : isActive}
		}
		return null;
	}

	/* ------------------------------------------------------------------
	----------------------- RENDER --------------------------------------
	--------------------------------------------------------------------- */

	render() {
		if(!this.state.itemData) {
			return (<h4>Loading item</h4>);
		} else if(this.state.found === false) {
			return (<h4>Either you are not allowed access or this item does not exist</h4>);
		} else {
			let ldResourceViewer = null;
			let annotationList = null;

			let metadataPanel = null;
			let mediaPanel = null;

			let annotationModal = null;
			let projectModal = null; //disabled when there is ingredients.disableProject = true
			let bookmarkModal = null;

			let projectSelectorBtn = null;
			let bookmarkBtn = null;
			let resourceAnnotationBtn = null;


			//on the top level we only check if there is any form of annotationSupport
			if(this.props.recipe.ingredients.annotationSupport) {
				if(this.state.showModal) {
					annotationModal = (
						<FlexModal
							elementId="annotation__modal"
							stateVariable="showModal"
							float="right"
							owner={this}
							title={'Annotate: ' + AnnotationUtil.extractAssetIdFromTargetSource(
								this.state.activeAnnotation)
							}>
							<AnnotationBox
								user={this.props.user} //current user
								project={this.state.activeProject} //selected via ProjectSelector
								annotation={this.state.activeAnnotation}
								activeSubAnnotation={this.state.activeSubAnnotation}
								annotationModes={this.props.recipe.ingredients.annotationModes}/>
						</FlexModal>
					);
				}
				annotationList = (
					<AnnotationList
						user={this.props.user} //current user
						project={this.state.activeProject} //selected via ProjectSelector
						activeAnnotation={this.state.activeAnnotation} //the active annotation
						annotationTarget={this.state.annotationTarget} //the current annotation target (later this can be also an annotation)
					/>
				);


				resourceAnnotationBtn = (
					<button className="btn btn-primary" onClick={this.annotateResource.bind(this)}>
						Annotate resource
					</button>
				)
			}

			if(!this.props.recipe.ingredients.disableProjects) {

				//project modal
				if(this.state.showProjectModal) {
					projectModal = (
						<FlexModal
							elementId="project__modal"
							stateVariable="showProjectModal"
							owner={this}
							size="large"
							title="Select a project">
								<ProjectSelector onOutput={this.onComponentOutput.bind(this)} user={this.props.user}/>
						</FlexModal>
					)
				}

				//bookmark modal
				if(this.state.showBookmarkModal) {
					bookmarkModal = (
						<FlexModal
							elementId="bookmark__modal"
							stateVariable="showBookmarkModal"
							owner={this}
							size="large"
							title="Select or enter a bookmark group">
								<BookmarkSelector
									onOutput={this.onComponentOutput.bind(this)}
									user={this.props.user}
									project={this.state.activeProject}
									collectionId={this.state.itemData.index}
									/>
						</FlexModal>
					)
				}

				//project selector button
				projectSelectorBtn = (
					<button className="btn btn-primary" onClick={this.triggerProjectSelector.bind(this)}>
						Projects ({this.state.activeProject ? this.state.activeProject.name : 'none selected'})
					</button>
				)

				//let's determine whether the resource was added to a bookmark group
				let partOfBookmarkGroup = false;
				if(this.state.resourceAnnotations) {
					let groups = this.state.resourceAnnotations.filter(a => a.motivation == 'bookmarking');
					partOfBookmarkGroup = groups.length > 0;
				}

				//bookmark button (TODO query for determining existing bookmark should be updated!!!)
				bookmarkBtn = (
					<button className="btn btn-primary" onClick={this.bookmark.bind(this)}>
						Bookmark
						&nbsp;
						<i className="fa fa-star" style={
							partOfBookmarkGroup ? {color: 'red'} : {color: 'white'}
						}></i>
					</button>
				)
			}

			//render the complete metadata block, which includes unique and basic metadata
			metadataPanel = (
				<FlexBox title="Metadata">
					<MetadataTable data={this.state.itemData}/>
				</FlexBox>
			)

			//media objects
			if(this.state.itemData.playableContent) {
				mediaPanel = this.getRenderedMediaContent();
			}

			//make this pretty & nice and work with awesome LD later on
			if(1 == 2) {
				ldResourceViewer = (
					<LDResourceViewer resourceId={this.state.itemData.resourceId}
						graphId={this.state.itemData.collectionId}/>
				)
			}

			return (
				<div className={IDUtil.cssClassName('item-details-recipe')}>
					{annotationModal}
					{projectModal}
					{bookmarkModal}
					<div className="row">
						<div className="col-md-12">
							{projectSelectorBtn}
							&nbsp;
							{bookmarkBtn}
							&nbsp;
							{resourceAnnotationBtn}
							<br/>
							{mediaPanel}
							<div className="row">
								<div className="col-md-7">
									{metadataPanel}
								</div>
								<div className="col-md-5">
									{annotationList}
									{ldResourceViewer}
								</div>
								<br/>
							</div>
						</div>
					</div>
				</div>
			)
		}
	}
}

ItemDetailsRecipe.propTypes = {
	clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    })

};

export default ItemDetailsRecipe;
