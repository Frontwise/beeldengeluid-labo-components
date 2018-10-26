import TimeUtil from './util/TimeUtil';
import IDUtil from './util/IDUtil';
import IconUtil from './util/IconUtil';
import ComponentUtil from './util/ComponentUtil';

import QueryModel from './model/QueryModel';

import FlexBox from './components/FlexBox';
import FlexModal from './components/FlexModal';
import FlexPlayer from './components/player/video/FlexPlayer';
import FlexImageViewer from './components/player/image/FlexImageViewer';
import FlexRouter from './util/FlexRouter';

import MetadataTable from './components/search/MetadataTable';

import LDResourceViewer from './components/linkeddata/LDResourceViewer';

import DocumentAPI from './api/DocumentAPI';
import PlayoutAPI from './api/PlayoutAPI';
import SearchAPI from './api/SearchAPI';
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
		};
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
				const target = $(e.target).attr("href"); // activated tab
				const index = target.substring('#mo__'.length);
				const annotationTarget = this.getAnnotationTarget(this.state.itemData, index);
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
		if(componentClass === 'ProjectSelector') {
			this.setState(
				{activeProject : data},
				() => {
					this.onProjectChanged.call(this, data)
				}
			);
		} else if(componentClass === 'BookmarkSelector') {
			this.bookmarkToGroupInProject(data);
		} else if(componentClass === 'FlexImageViewer') {
			this.setActiveAnnotationTarget({
				source : data.assetId //data => mediaObject
			})
		} else if(componentClass === 'FlexPlayer') {
			this.setActiveAnnotationTarget({
				source : data.assetId //data => mediaObject
			})
		} else if(componentClass == 'LDResourceViewer') {
			this.browseEntity(data);
		}
	}

	onLoadItemData(collectionId, resourceId, data) {
		let found = data ? data.found : false;
		if(data && data.error) {
			found = false; //e.g. in case of access denied
		}
		if(collectionId && found !== false) {
			CollectionUtil.generateCollectionConfig(
				this.props.clientId,
				this.props.user,
				collectionId,
				function(config) {
					const itemDetailData = config.getItemDetailData(data);
					found = itemDetailData != null;
					if(found) {
						//determine which media contant tab should be active
						let activeMediaTab = 0;
						if(itemDetailData.playableContent && this.props.params.fragmentUrl) {
							for(let i = 0;i<itemDetailData.playableContent.length;i++) {
								const mediaObject = itemDetailData.playableContent[i];
								if(mediaObject.url === this.props.params.fragmentUrl) {
									activeMediaTab = i;
									break;
								}
							}
						}
						const desiredState = {
							itemData : itemDetailData,
							annotationTarget : this.getAnnotationTarget.call(this, itemDetailData), //for the list
							found : true,
							activeMediaTab : activeMediaTab,
							collectionConfig : config
						};
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
		if(found === false) {
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
				console.debug('generating annotation target for: ', mediaObject)
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
		if(annotation && annotation.target && annotation.target.type === 'Resource') {
			this.refreshResourceAnnotations();
		}
	}

	onDeleteAnnotation(annotation) {
		ComponentUtil.hideModal(this, 'showModal', 'annotation__modal', true);
		//finally update the resource annotations (the "bookmark")
		if(annotation && annotation.target && annotation.target.type === 'Resource') {
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
			const temp = this.state.resourceAnnotations.filter(a => a.motivation !== 'bookmarking')
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
	onLoadResourceAnnotations(annotationList) {
		this.setState({
			resourceAnnotations : annotationList || []
		})
	}

	/* ------------------------------------------------------------------
	----------------------- PROJECTS ------------------------------------
	--------------------------------------------------------------------- */

	triggerProjectSelector() {
		const showProjectModal = this.state.showProjectModal;
		this.setState({
			showProjectModal : !showProjectModal
		});
	}

	//TODO test this
	onProjectChanged(project) {
		ComponentUtil.storeJSONInLocalStorage('activeProject', project);
		ComponentUtil.hideModal(this, 'showProjectModal', 'project__modal', true, () => {
			AnnotationActions.changeProject(project);
			this.refreshResourceAnnotations();
			if(this.state.awaitingProcess === 'bookmark') {
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
				AnnotationUtil.generateResourceLevelTarget(
					this.state.itemData.index, //collectionId
					this.state.itemData.resourceId
				)
			);
			const temp = {};
			const dedupedTargets = [];
			targets.forEach((t) => {
				if(!temp[t.source]) {
					temp[t.source] = true;
					dedupedTargets.push(t);
				}
			});
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
	************************ BROWSING FUNCTIONS *******************************
	*************************************************************************/

	browseEntity(entity) {
		const selectedFacets = {}
		selectedFacets[entity.field] = [entity.value];
		const query = QueryModel.ensureQuery({
			id : this.state.collectionConfig.getCollectionId(),
			term : this.props.params.st,
			desiredFacets : [{
				field: entity.field,
				type: "string",
				exclude : false
			}],
			selectedFacets : selectedFacets
		}, this.state.collectionConfig)

		ComponentUtil.storeJSONInLocalStorage(
			'user-last-query',
			query
		);

		FlexRouter.gotoSingleSearch('cache')
	}

	getFieldValues(fieldName) {
		//filter out the uninteresting fields
		if(fieldName.indexOf('@context') != -1 ||
			fieldName.indexOf('hasFormat') != -1 ||
			fieldName.indexOf('@language') != -1) {
			return null
		}
		//make sure to remove the ES .keyword suffix, since the rawdata fieldnames don't have them
		fieldName = fieldName.indexOf('.keyword') == -1 ?
			fieldName :
			fieldName.substring(0, fieldName.length - 8)

		//this is the data to search for the values of the selected keyword field
		let curObj = this.state.itemData.rawData;

		//split the field name in path elements for lookup
		let path = fieldName.split('.');
		let i = 0;

		//now look for the values of the selected field
		while(i < path.length) {
			if(curObj) {
				//check if the current object is a list and the current path selects @value attributes from it
				if(typeof(curObj) == "object" && curObj['@value'] == undefined && path[i] == '@value') {
					curObj = curObj.map(obj => obj[path[i]])
					break;
				}
				//otherwise continue down the path, until the end is reached
				curObj = curObj[path[i]];
				i++;
			} else {
				break;
			}
		}
		//always wrap the end-result in a list
		if(typeof(curObj) == 'string') {
			return [curObj]
		}
		return curObj;
	}

	/************************************************************************
	************************ CALLED BY RENDER *******************************
	*************************************************************************/


	checkMediaObjectIsSelected(mediaObject) {
		//console.debug(mediaObject, this.props.params.assetId)
		if(mediaObject.assetId === this.props.params.assetId) {
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
		if(this.props.params.assetId) {
			mediaObject = {assetId : this.props.params.assetId};
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
		const tabs = [
			this.getVideoTabContents(),
			this.getAudioTabContents(),
			this.getImageTabContents(),
			this.getApplicationTabContents()
		].filter(t => t != null);

		//generate the tabs
		const mediaTabs = tabs.map((tab, index) => {
			const iconClass = IconUtil.getMimeTypeIcon(tab.type);
			const active = this.props.params.fragmentUrl ? tab.active : index === 0;
			return (
				<li key={tab.type + '__tab'}
					className={active ? 'active' : ''}>
					<a data-toggle="tab" href={'#' + tab.type + '__content'}>
						<span className={iconClass}/>&nbsp;{tab.type}
					</a>
				</li>
			)
		}, this);

		//then the contents of the tabs
		const mediaTabContents = tabs.map((tab, index) => {
			const active = this.props.params.fragmentUrl ? tab.active : index === 0;
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
		});
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
			return content.mimeType.indexOf('audio') !== -1;
		});
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
			return content.mimeType.indexOf('image') !== -1;
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
			});
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

						mediaObjects={images}
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
			return content.mimeType.indexOf('application') !== -1;
		});
		if(applications.length > 0) {
			const content = applications.map((mediaObject, index) => {
				mediaObject.id = 'application__' + index;
				if(!isActive) {
					isActive = this.checkMediaObjectIsSelected.call(this, mediaObject);
				}
				if(mediaObject.mimeType === 'application/javascript') {
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

    saveResultsDetailsData(data, sr, nextResultSet) {
        ComponentUtil.storeJSONInLocalStorage('currentQueryOutput', data);
        ComponentUtil.storeJSONInLocalStorage('user-last-query', data.query);
        const detailResults = data.results.map((result, index) => {
            return this.state.collectionConfig.getItemDetailData(data.results[index],
                sr.dateRange && sr.dateField
                    ? sr.dateRange.dateField : null);
        });
        ComponentUtil.storeJSONInLocalStorage('resultsDetailsData', detailResults);
        const result = ComponentUtil.getJSONFromLocalStorage('resultsDetailsData');
        if(nextResultSet) {
            FlexRouter.gotoItemDetails(this.props.recipe.url.substr(1), result[0], this.props.params.st);
        } else {
            FlexRouter.gotoItemDetails(this.props.recipe.url.substr(1), result[result.length-1], this.props.params.st);
        }
    }

    getResource(lastQuery, pageNumber, currentQueryOutput, nextResourceSet = true) {
        if(currentQueryOutput) {
            const sr = lastQuery;
            sr.offset = nextResourceSet ? pageNumber * currentQueryOutput.query.size : (pageNumber - 1) * currentQueryOutput.query.size;
            SearchAPI.search(sr, this.state.collectionConfig, data => this.saveResultsDetailsData(data, sr, nextResourceSet), true)
        }
    }

    gotoItemDetails(resourceId) {
        const resultDetailsData = ComponentUtil.getJSONFromLocalStorage('resultsDetailsData'),
            userLastQuery = ComponentUtil.getJSONFromLocalStorage('user-last-query'),
            currentQueryOutput = ComponentUtil.getJSONFromLocalStorage('currentQueryOutput'),
            pageNumber = currentQueryOutput.currentPage,
            result = resultDetailsData.find(elem => elem.resourceId === resourceId);
        if (!resourceId) {
            const indexCurrentResource = resultDetailsData.findIndex(elem => elem.resourceId === this.props.params.id);
            if (indexCurrentResource === resultDetailsData.length - 1) {
                this.getResource(userLastQuery, pageNumber,currentQueryOutput, true);
                return;
            } else if (indexCurrentResource === 0) {
                this.getResource(userLastQuery, pageNumber-1,currentQueryOutput, false);
                return;
            }
        }
        if (this.props.recipe.url && resourceId) {
            FlexRouter.gotoItemDetails(this.props.recipe.url.substr(1), result, this.props.params.st);
        } else {
            this.setState({showModal: true})
        }
    }

    gotToSearchResults(userLastQuery){
        if(userLastQuery && userLastQuery.id) {
            FlexRouter.gotoSingleSearch('cache');
        }
        console.debug('There is no cached query');
        return false;
    }

	/* ------------------------------------------------------------------
	----------------------- RENDER --------------------------------------
	--------------------------------------------------------------------- */

	render() {
        const userLastQuery = ComponentUtil.getJSONFromLocalStorage('user-last-query'),
              offset = userLastQuery.offset,
              resultDetailsData = ComponentUtil.getJSONFromLocalStorage('resultsDetailsData'),
              indexCurrentResource = resultDetailsData.findIndex(elem => elem.resourceId === this.props.params.id);

		if(!this.state.itemData) {
			return (<h4>Loading item</h4>);
		} else if(this.state.found === false) {
			return (<h4>Either you are not allowed access or this item does not exist</h4>);
		} else {
			let ldResourceViewer = null;
			let exploreBlock = null;
			let annotationList = null;

			let metadataPanel = null;
			let mediaPanel = null;

			let annotationModal = null;
			let projectModal = null; //disabled when there is ingredients.disableProject = true
			let bookmarkModal = null;

			let projectSelectorBtn = null;
			let bookmarkBtn = null;
			let resourceAnnotationBtn = null;
            let previousResourceBtn = null;
            let nextResourceBtn = null;
            let backToSearchBtn = null;
			//on the top level we only check if there is any form of annotationSupport
			if(this.props.recipe.ingredients.annotationSupport) {
				if(this.state.showModal && this.state.activeAnnotation && this.state.activeAnnotation.target) {
					annotationModal = (
						<FlexModal elementId="annotation__modal"
							stateVariable="showModal"
							float="right"
							owner={this}
							title={'Annotate: ' + this.state.activeAnnotation.target.source}>
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
				);

                const currentIndexInStorage = resultDetailsData.findIndex(elem => elem.resourceId === this.props.params.id),
                      prevResource = resultDetailsData.findIndex(elem => elem.resourceId === this.props.params.id) ? resultDetailsData[currentIndexInStorage-1].resourceId : false,
                      nextResource = (resultDetailsData.length - 1) > currentIndexInStorage ? resultDetailsData[currentIndexInStorage+1].resourceId : false,
				      isFirstResource = (offset === 0 && indexCurrentResource === 0),
                      queryOutput = ComponentUtil.getJSONFromLocalStorage('currentQueryOutput');

                let isLastHit = false;
                if((queryOutput.currentPage * queryOutput.query.size) >= queryOutput.totalHits) {
                    isLastHit = resultDetailsData[resultDetailsData.length - 1].resourceId === this.state.itemData.resourceId;
                }
				previousResourceBtn = (
                    <button className="btn btn-primary" disabled={isFirstResource}
                            onClick={this.gotoItemDetails.bind(this, prevResource)}>
                        <i className="glyphicon glyphicon-step-backward" aria-hidden="true"/> Previous resource
                    </button>
                );
                nextResourceBtn = (
                    <button className="btn btn-primary" disabled={isLastHit}
                            onClick={this.gotoItemDetails.bind(this, nextResource)}>
                        Next resource <i className="glyphicon glyphicon-step-forward" aria-hidden="true"/>
                    </button>
                );
                backToSearchBtn = (
                    <button className="btn btn-primary"
                            onClick={this.gotToSearchResults.bind(this, userLastQuery)}>
                        Back to results
                    </button>
                );
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
				);

				//let's determine whether the resource was added to a bookmark group
				let partOfBookmarkGroup = false;
				if(this.state.resourceAnnotations) {
					const groups = this.state.resourceAnnotations.filter(a => a.motivation === 'bookmarking');
					partOfBookmarkGroup = groups.length > 0;
				}

				//bookmark button (TODO query for determining existing bookmark should be updated!!!)
				bookmarkBtn = (
					<button className="btn btn-primary" onClick={this.bookmark.bind(this)}>
						Bookmark
						&nbsp;
						<i className="fa fa-star" style={ partOfBookmarkGroup ? {color: 'red'} : {color: 'white'} }/>
					</button>
				)
			}

			//render the complete metadata block, which includes unique and basic metadata
			metadataPanel = (
				<FlexBox title="Metadata">
					<MetadataTable data={this.state.itemData}/>
				</FlexBox>
			);

			//media objects
			if(this.state.itemData.playableContent) {
				mediaPanel = this.getRenderedMediaContent();
			}

			//make this pretty & nice and work with awesome LD later on
			if(1 === 1) {
				ldResourceViewer = (
					<FlexBox title="Linked Data">
						<LDResourceViewer
							resourceId={this.state.itemData.resourceId}
							collectionConfig={this.state.collectionConfig}
							onOutput={this.onComponentOutput.bind(this)}
						/>
					</FlexBox>
				)

				const exploreFields = {};
				this.state.collectionConfig.getKeywordFields().forEach((kw) => {
					const values = this.getFieldValues(kw);
					if(values) {
						exploreFields[kw] = values;
					}
				})
				exploreBlock = (
					<div className={IDUtil.cssClassName('keyword-browser', this.CLASS_PREFIX)}>
						<h3>Find related content based on these properties</h3>
						<div className="property-list">
							{
								Object.keys(exploreFields).map(kw => {

									//make nice buttons for each available value for the current keyword
									const fieldValues = exploreFields[kw].map(value => {
										const entity = {field : kw, value : value}
										return (
											<div className="keyword" onClick={this.browseEntity.bind(this, entity)}>
												{entity.value}
											</div>
										)
									})

									//then return a block with a pretty field title + a column of buttons for each value
									return (
										<div>
											<h4>{this.state.collectionConfig.toPrettyFieldName(kw)}</h4>
											{fieldValues}
										</div>
									)

								})
							}
						</div>
					</div>
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
                            &nbsp;
                            <span className="br__resource-paging">
                                {previousResourceBtn}
                                &nbsp;
                                {nextResourceBtn}
                                &nbsp;
                                {backToSearchBtn}
                            </span>
							<br/>
							{mediaPanel}
							<br/>
							<div className="row">
								<div className="col-md-7">
									<div className="row">
										{metadataPanel}
									</div>
									<div className="row">
										{ldResourceViewer}
									</div>
								</div>
								<div className="col-md-5">
									{annotationList}
									<div className="row">
										{exploreBlock}
									</div>
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
