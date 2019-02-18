import IDUtil from './util/IDUtil';
import IconUtil from './util/IconUtil';
import ComponentUtil from './util/ComponentUtil';

import QueryModel from './model/QueryModel';

import FlexBox from './components/FlexBox';
import FlexModal from './components/FlexModal';
import FlexPlayer from './components/player/video/FlexPlayer';
import FlexImageViewer from './components/player/image/FlexImageViewer';
import FlexRouter from './util/FlexRouter';
import ReactTooltip from 'react-tooltip';

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
import LoadingSpinner from "./components/helpers/LoadingSpinner";

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

	OFF AIR CONTENT
		http://localhost:5304/tool/default-item-details?id=4272263@program&cid=nisv-catalogue-aggr-full-18-158&st=%224272263@program%22

*/

//TODO move most of the stuff to a new component called ResourceViewer
class ItemDetailsRecipe extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			showAnnotationModal : false, //triggered by the media players whenever an annotation needs to be edited
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
			if(data && data.allGroups && data.selectedGroups) {
				this.bookmarkToGroupInProject(data.allGroups, data.selectedGroups);
			}
		} else if(componentClass === 'FlexImageViewer') {
			this.setActiveAnnotationTarget({
				source : data.assetId //data => mediaObject
			})
		} else if(componentClass === 'FlexPlayer') {
			this.setActiveAnnotationTarget({
				source : data.assetId //data => mediaObject
			})
		} else if(componentClass === 'LDResourceViewer') {
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
						    if (itemDetailData.playableContent.length > 0){
						        PlayoutAPI.requestAccess(
								itemDetailData.playableContent[0].contentServerId,
								itemDetailData.playableContent[0].contentId,
								desiredState,
								this.onLoadPlayoutAccess.bind(this)
							    )
						    } else {
						        this.setState(desiredState);
						    }
						} else {
							this.setState(desiredState);
						}

						//finally load the resource annotation with motivation bookmarking
						this.refreshResourceAnnotations(itemDetailData.resourceId);
					}
				}.bind(this));
		}
		if(found === false) {
			this.setState({
				itemData : data,
				annotationTarget : null,
				found : false
			});
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
		ComponentUtil.hideModal(this, 'showAnnotationModal' , 'annotation__modal', true);
		//finally update the resource annotations (the "bookmark")
		this.refreshResourceAnnotations();
	}

	onDeleteAnnotation(annotation) {
		ComponentUtil.hideModal(this, 'showAnnotationModal', 'annotation__modal', true);
		//finally update the resource annotations (the "bookmark")
		this.refreshResourceAnnotations();
	}

	//TODO currently this is only called via the ugly componentDidUpdate() function
	//FIXME this only properly supports whenever the target is a media object (see FlexPlayer)
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
			annotationTarget: annotation.target,
			activeAnnotation: annotation,
			activeSubAnnotation : null
		});
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

	//returns the annotation that is directly added to the resource via the "Annotate resource" button
	getResourceAnnotation() {
		let annotation = null;
		if(this.state.resourceAnnotations) {
			const temp = this.state.resourceAnnotations.filter(
				a => a.motivation !== 'bookmarking' && a.target.source === this.state.itemData.resourceId
			)
			annotation = temp.length > 0 ? temp[0] : null;
		}
		return annotation
	}

	//show the annnotation form with the correct annotation target
	//TODO extend this so the target can also be a piece of text or whatever
	editAnnotation(annotation, subAnnotation) {
		if(annotation.target) {
			this.setState({
				showAnnotationModal: true,
				annotationTarget: annotation.target,
				activeAnnotation: annotation,
				activeSubAnnotation : subAnnotation
			});
		}
	}

	//returns all annotations that are tied to the given resourceId
	refreshResourceAnnotations(resourceId = null) {
		if(resourceId == null) {
			resourceId = this.state.itemData.resourceId;
		}
		const filter = {
			'target.selector.value.id' : resourceId,
			'user.keyword' : this.props.user.id,
		};
		if(this.state.activeProject && this.state.activeProject.id) {
			filter['project'] = this.state.activeProject.id
		}
		AnnotationAPI.getFilteredAnnotations(
			this.props.user.id,
			filter,
			null,
			this.onLoadResourceAnnotations.bind(this),
			0, //offset
			250, //size
			null, //sort direction
			null //dateRange
		);
	}

	onLoadResourceAnnotations(annotationList) {
		this.setState({
			resourceAnnotations : annotationList || []
		})
	}

	renderResourceAnnotationsTooltip() {
    	if(!this.state.resourceAnnotations) {
    		return null;
    	}
    	let html = '';
    	const bookmarkGroups = this.state.resourceAnnotations.filter(a => a.motivation === 'bookmarking');
    	const annotations = this.state.resourceAnnotations.filter(a => a.motivation !== 'bookmarking');

    	if (bookmarkGroups.length > 0) {
    		html += '<h5><u>Bookmark group(s)</u>:</h5><ul>';
    		html += bookmarkGroups.map(
         	   group => group.body && group.body.length > 0 && group.body[0].label ? "<li>" + group.body[0].label + "</li>" : ''
        	).join('');
        	html += '</ul>';
    	}
    	//count the number of annotation bodies
    	if(annotations) {
    		//html += '<h5><u>Number of annotated parts of this resource</u>: '+annotations.length+'</h5>';
    		//count the number of annotation bodies
    		let bodyCount = 0;
    		annotations.forEach(a => bodyCount += a.body ? a.body.length : 0);
    		html += '<h5><u>Number of annotations</u>: '+bodyCount+'</h5>';
    	}


        return html;
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
	bookmarkToGroupInProject(allGroups, selectedGroups) {
		ComponentUtil.hideModal(this, 'showBookmarkModal', 'bookmark__modal', true, () => {
			//run through all the bookmark groups to check if this resource is a member. Then check if it should be a member or not (anymore)
			allGroups.forEach(group => {
				const targets = group.target;
				const shouldBeMember = selectedGroups[group.id] === true; //should the resource be a member or not

				//first see if the resource is a member of the current group
				const index = targets.findIndex(t => t.source === this.state.itemData.resourceId)

				//this check only updates the bookmark group (and calls the annotation API) if membership changed
				if(index != -1) { // if already a member
					if(!shouldBeMember) { // ...and it shouldn't: remove it
						targets.splice(index, 1);
						group.target = targets;
						AnnotationAPI.saveAnnotation(group, this.onSaveBookmarks.bind(this));
					}
				} else { //if not a member
					if(shouldBeMember) { // ...and it should be: add it
						targets.push(
							AnnotationUtil.generateResourceLevelTarget(
								this.state.itemData.index, //collectionId
								this.state.itemData.resourceId
							)
						);

						//FIXME remove: this deduplocation check should not be necessary?
						const temp = {};
						const dedupedTargets = [];
						targets.forEach((t) => {
							if(!temp[t.source]) {
								temp[t.source] = true;
								dedupedTargets.push(t);
							}
						});
						//set the deduped targets as the annotation target
						group.target = dedupedTargets;
						AnnotationAPI.saveAnnotation(group, this.onSaveBookmarks.bind(this));
					}
				}
			})
		});
	}

	onSaveBookmarks(data) {
		this.setState({
			selectedRows : {},
			allRowsSelected : false
		}, () => {
			this.refreshResourceAnnotations();
		})
	}

	/************************************************************************
	************************ BROWSING FUNCTIONS *******************************
	*************************************************************************/

	browseEntity(entity) {
		const selectedFacets = {};
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
		}, this.state.collectionConfig);

		ComponentUtil.storeJSONInLocalStorage(
			'user-last-query',
			query
		);

		FlexRouter.gotoSingleSearch('cache')
	}

	getFieldValues(fieldName) {
		//filter out the uninteresting fields
		if(fieldName.indexOf('@context') !== -1 ||
			fieldName.indexOf('hasFormat') !== -1 ||
			fieldName.indexOf('@language') !== -1) {
			return null
		}
		//make sure to remove the ES .keyword suffix, since the rawdata fieldnames don't have them
		fieldName = fieldName.indexOf('.keyword') === -1 ?
			fieldName :
			fieldName.substring(0, fieldName.length - 8)

		//this is the data to search for the values of the selected keyword field
		let curObj = this.state.itemData.rawData;

		//split the field name in path elements for lookup
		const path = fieldName.split('.');
		let i = 0;

		//now look for the values of the selected field
		while(i < path.length) {
			if(curObj) {
				//check if the current object is a list and the current path selects @value attributes from it
				if(typeof(curObj) === "object" && curObj['@value'] === undefined && path[i] === '@value') {
					curObj = curObj.map(obj => obj[path[i]]);
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
		if(typeof(curObj) === 'string') {
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

                    hideOffAirContent={this.state.collectionConfig.hideOffAirContent()}

					user={this.props.user} //current user
					project={this.state.activeProject} //selected via the ProjectSelector
					resourceId={this.state.itemData.resourceId}
					collectionId={this.state.itemData.index}

					active={true}

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
            this.setState({showAnnotationModal: true})
        }
    }

    gotToSearchResults(userLastQuery){
        if(userLastQuery && userLastQuery.id) {
            FlexRouter.gotoSingleSearch('cache');
        }
        console.debug('There is no cached query');
        return false;
    }

    /* ------------------------------------ TOP BUTTON BAR ----------------------------- */

    //only render when coming from the single search recipe (checking this.props.param.bodyClass == noHeader)
    renderResultListPagingButtons = () => {
    	const userLastQuery = ComponentUtil.getJSONFromLocalStorage('user-last-query');
    	const searchResults = ComponentUtil.getJSONFromLocalStorage('resultsDetailsData');
    	const selectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
    	const queryOutput = ComponentUtil.getJSONFromLocalStorage('currentQueryOutput');

    	if(!userLastQuery || !searchResults || !queryOutput) {
    		return null;
    	}
        const currentIndex = searchResults.findIndex(elem => elem.resourceId === this.props.params.id);

    	// Search for resourceId in current page (resultSet), if not available it continues in bookmarked items.
    	const prevResource = currentIndex > 0 ? searchResults[currentIndex-1].resourceId : false;
        const nextResource = (searchResults.length - 1) > currentIndex ?
        	searchResults[currentIndex+1].resourceId : false;

		const isFirstResource = (userLastQuery.offset === 0 && currentIndex === 0);

        let isLastHit = false;
        if((queryOutput.currentPage * queryOutput.query.size) >= queryOutput.totalHits) {
            isLastHit = searchResults[searchResults.length - 1].resourceId === this.state.itemData.resourceId;
        }

        const previousResourceBtn = (
            <button className="btn btn-primary" disabled={isFirstResource}
                    onClick={this.gotoItemDetails.bind(this, prevResource)}>
                <i className="glyphicon glyphicon-step-backward" aria-hidden="true"/> Previous resource
            </button>
        );
        const nextResourceBtn = (
            <button className="btn btn-primary" disabled={isLastHit}
                    onClick={this.gotoItemDetails.bind(this, nextResource)}>
                Next resource <i className="glyphicon glyphicon-step-forward" aria-hidden="true"/>
            </button>
        );
        const backToSearchBtn = (
            <button className="btn btn-primary"
                    onClick={this.gotToSearchResults.bind(this, userLastQuery)}>
                Back to results
            </button>
        );


        return (
        	<span>{previousResourceBtn}&nbsp;{nextResourceBtn}&nbsp;{backToSearchBtn}</span>
        )
    }


    /* ------------------------------------ ALL THE MODALS ----------------------------- */

    renderProjectModal = (showProjectModal) => {
    	if(showProjectModal) {
			return (
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
		return null
    }

    renderAnnotationModal = (showModal, activeProject, activeAnnotation, activeSubAnnotation) => {
    	if(showModal && activeAnnotation && activeAnnotation.target) {
			return (
				<FlexModal elementId="annotation__modal"
					stateVariable="showAnnotationModal"
					float="right"
					owner={this}
					title={'Annotate: ' + activeAnnotation.target.source}>
					<AnnotationBox
						user={this.props.user} //current user
						project={activeProject} //selected via ProjectSelector
						annotation={activeAnnotation}
						activeSubAnnotation={activeSubAnnotation}
						annotationModes={this.props.recipe.ingredients.annotationModes}/>
				</FlexModal>
			);
		}
		return null
    }

    renderBookmarkModal = (showBookmarkModal, activeProject, itemData) => {
    	if(showBookmarkModal) {
			return (
				<FlexModal
					elementId="bookmark__modal"
					stateVariable="showBookmarkModal"
					owner={this}
					size="large"
					title="Select one or more bookmark groups to associate the current resource with">
						<BookmarkSelector
							onOutput={this.onComponentOutput.bind(this)}
							user={this.props.user}
							project={activeProject}
							collectionId={itemData.index}
							resourceId={itemData.resourceId}
							/>
				</FlexModal>
			)
		}
		return null
    }

    /* ----------------------------- EXPLORATION & RECOMMENDATION -------------------- */

    renderExploreBlock = () => {
    	const exploreFields = {};
    	const orgNames = {};
		this.state.collectionConfig.getKeywordFields().forEach((kw) => {
			const values = this.getFieldValues(kw);
			if(values) {
                exploreFields[this.state.collectionConfig.toPrettyFieldName(kw)] = values;
                orgNames[this.state.collectionConfig.toPrettyFieldName(kw)] = kw;
			}
		});
		if(Object.keys(exploreFields).length === 0) {
			return null;
		}
        return (
            <FlexBox isVisible={false} title="Related content (experimental)">
                <div className={IDUtil.cssClassName('keyword-browser', this.CLASS_PREFIX)}>
                    <h4>Search for related content</h4>
                    <div className="property-list">
                        {
                            Object.keys(exploreFields).sort().map((kw, index) => {

                                //make nice buttons for each available value for the current keyword
                                const fieldValues = exploreFields[kw].map(value => {
                                    const entity = {field: orgNames[kw], value: value};
                                    return (
                                        <div className="keyword" onClick={this.browseEntity.bind(this, entity)}>
                                            {entity.value}
                                        </div>
                                    )
                                });
                                //then return a block with a pretty field title + a column of buttons for each value
                                return (
                                    <div className="cl_table cl_table--2cols">
                                        <div className="cl_table-cell left-cell">
                                            <span data-for={'tooltip__' + index} data-tip={orgNames[kw]} data-html={true}>
                                                <i className="fa fa-info-circle"/>
                                            </span> {kw}
                                            <ReactTooltip id={'tooltip__' + index}/>
                                        </div>
                                        <div className="cl_table-cell right-cell">
                                            {fieldValues}
                                        </div>
                                    </div>
                                )

                            })
                        }
                    </div>
                </div>
            </FlexBox>
        )
    }

	render() {
		if(!this.state.itemData) {
           return <LoadingSpinner message="Loading resource..."/>;
		} else if(this.state.found === false) {
			return (<h4>Either you are not allowed access or this item does not exist</h4>);
		} else {
			let annotationList = null;
			let mediaPanel = null;

			//FIXME there is something wrong with the arrow functions, bind() is still required!
			const annotationModal = this.renderAnnotationModal(
				this.state.showAnnotationModal,
				this.state.activeProject,
				this.state.activeAnnotation,
				this.state.activeSubAnnotation
			);

			const projectModal = this.renderProjectModal(this.state.showProjectModal); //disabled when there is ingredients.disableProject = true
			const bookmarkModal = this.renderBookmarkModal(this.state.showBookmarkModal, this.state.activeProject, this.state.itemData);

			let projectSelectorBtn = null;
			let bookmarkIcon = null;
			let bookmarkBtn = null;
			let resourceAnnotationBtn = null;
            let resourceListPagingButtons = null;

			//on the top level we only check if there is any form of annotationSupport
			if(this.props.recipe.ingredients.annotationSupport) {


				//draw the annotation list, which only shows annotations related to the active annotationTarget
				if(this.state.annotationTarget) {
					annotationList = (
						<AnnotationList
							key={'__anno-list__' + this.state.annotationTarget.source}
							user={this.props.user} //current user
							project={this.state.activeProject} //selected via ProjectSelector
							activeAnnotation={this.state.activeAnnotation} //the active annotation
							annotationTarget={this.state.annotationTarget} //the current annotation target (later this can be also an annotation)
						/>
					);
				}

				//draw the button for annotating the resource as a whole
				const hasResourceAnnotation = this.getResourceAnnotation() ? true : false;
				resourceAnnotationBtn = (
					<button className="btn btn-primary" onClick={this.annotateResource.bind(this)}>
						Annotate resource
						&nbsp;
						<i className="fa fa-star" style={ hasResourceAnnotation ? {color: 'red'} : {color: 'white'} }/>
					</button>
				);
			}
			if(this.props.params.bodyClass !== 'noHeader') {
				resourceListPagingButtons = this.renderResultListPagingButtons();
			}

			if(!this.props.recipe.ingredients.disableProjects) {

				//project selector button
				projectSelectorBtn = (
					<button className="btn btn-primary" onClick={this.triggerProjectSelector.bind(this)}>
						Projects ({this.state.activeProject ? this.state.activeProject.name : 'none selected'})
					</button>
				);


				if(this.state.resourceAnnotations) {
					//draw the bookmark group button
					bookmarkBtn = (
						<button
							className="btn btn-primary"
							onClick={this.bookmark.bind(this)}
							title="Control the bookmark groups this resource is associated with">
							Groups
							({this.state.resourceAnnotations.filter(a => a.motivation === 'bookmarking').length})
						</button>
					)

					//draw the bookmark icon
		            bookmarkIcon = (
		            	 <div data-for="__res_anno" data-tip={this.renderResourceAnnotationsTooltip()} data-html={true} className="bookmarked">
							<i className="fa fa-bookmark" style={
								this.state.resourceAnnotations.length > 0 ? {color: '#468dcb'} : {color: 'white'}
							}/>
							<ReactTooltip id={'__res_anno'}/>
						</div>
		            )
		        }
			}

			//render the complete metadata block, which includes unique and basic metadata
			const metadataPanel = (
				<FlexBox title="Metadata">
					<MetadataTable data={this.state.itemData}/>
				</FlexBox>
			);

			//media objects
			if(this.state.itemData.playableContent) {
				mediaPanel = this.getRenderedMediaContent();
			}

			//render the exploration block
            const exploreBlock = this.renderExploreBlock();



			return (
				<div className={IDUtil.cssClassName('item-details-recipe')}>
					{annotationModal}
					{projectModal}
					{bookmarkModal}
					<div className="row">
						<div className="col-md-12">
							{bookmarkIcon}
							{projectSelectorBtn}
							&nbsp;
							{bookmarkBtn}
							&nbsp;
							{resourceAnnotationBtn}
                            &nbsp;
                            {resourceListPagingButtons}
							<br/>
							{mediaPanel}
							<br/>
							<div className="row">
								<div className="col-md-7">
									<div className="row">
										{metadataPanel}
									</div>
                                    <div className="row">
                                        {exploreBlock}
                                    </div>
								</div>
								<div className="col-md-5">
									{annotationList}
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
