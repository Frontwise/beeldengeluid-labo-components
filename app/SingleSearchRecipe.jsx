import QueryModel from './model/QueryModel';

import SearchAPI from './api/SearchAPI';
import PlayoutAPI from './api/PlayoutAPI';
import ProjectAPI from './api/ProjectAPI';
import AnnotationAPI from './api/AnnotationAPI';

import IDUtil from './util/IDUtil';
import CollectionUtil from './util/CollectionUtil';
import ComponentUtil from './util/ComponentUtil';
import AnnotationUtil from './util/AnnotationUtil';

import FlexModal from './components/FlexModal';

import FlexRouter from './util/FlexRouter';

import CollectionSelector from './components/collection/CollectionSelector';
import ProjectSelector from './components/workspace/projects/ProjectSelector';
import BookmarkSelector from './components/bookmark/BookmarkSelector';

import QueryBuilder from './components/search/QueryBuilder';
import QueryEditor from './components/search/QueryEditor';
import SearchHit from './components/search/SearchHit';
import QuickViewer from './components/search/QuickViewer';
import Paging from './components/search/Paging';
import Sorting from './components/search/Sorting';

import { initHelp } from './components/workspace/helpers/helpDoc';

import MessageHelper from './components/helpers/MessageHelper';
import LoadingSpinner from './components/helpers/LoadingSpinner';

import PropTypes from 'prop-types';

class SingleSearchRecipe extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showModal : false, //for the collection selector
            showBookmarkedItems : false,
			showProjectModal : false, //for the project selector
			showBookmarkModal : false, //for the bookmark group selector
			showQuickViewModal : false, //for the quickview result preview

			activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),
			awaitingProcess : null, //which process is awaiting the output of the project selector
            currentOutput: null,
			collectionId : null,
            isSearching : false,
			pageSize : 20, //amount of search results on page

			//use for a lot TODO write proper reasons
			collectionConfig : null, //loaded after mounting, without it nothing works
			initialQuery : null, //yikes this is only used for storing the initial query

			//for doing actions on the search results
			selectedOnPage : {}, // key = resourceId, value = true/false
			allRowsSelected : false, // are all search results selected
			highlightData: {}
		};
	}

	componentWillUnmount() {
		window.onscroll = null;
	}

	componentDidMount() {
		//init user docs (FIXME shouldn't this be part of the media suite code base?)
		initHelp("Search", "/feature-doc/tools/single-search");

		window.onscroll = () => {SingleSearchRecipe.afterRenderingHits()};

		//either loads the collectionID + initial query from
		//1) localStorage
		//2) workspace API
		//3) the recipe config
		let collectionId = null;
		let initialQuery = null;
		let loadingFromWorkSpace = false;
		if (this.props.params && this.props.params.queryId) {
			if(this.props.params.queryId === 'cache') {
				//if the query should be taken from cache, load from there
				initialQuery = ComponentUtil.getJSONFromLocalStorage('user-last-query');
				collectionId = initialQuery ? initialQuery.collectionId : null;
			} else if (this.props.params.queryId.indexOf('__') !== -1) {
				loadingFromWorkSpace = true;
				const tmp = this.props.params.queryId.split('__');
				if(tmp.length === 2) {
					const projectId = tmp[0];
					const queryId = tmp[1];
					//if the user supplied a query ID, look for it in the workspace API
					ProjectAPI.get(this.props.user.id, projectId, project => {
						if(project.queries) {
							const tmp = project.queries.find(q => q.query.id === queryId);
							if(tmp && tmp.query) {
								this.onReloadQueryData(tmp.query.collectionId, tmp.query);
							}
						}
					});
				}
			} else {
				//look if there is a default collection id configured
				collectionId = this.props.recipe.ingredients.collection;
			}
		}

		//always refresh the saved bookmarks on load, since they could have been updated in
		//either the workspace or the resource viewer
		this.saveBookmarksToLocalStorage();

		if(!loadingFromWorkSpace) {
			this.onReloadQueryData(collectionId, initialQuery);
		}
	}

	onReloadQueryData(collectionId, initialQuery) {
		//load the collection config and finally
		if(collectionId) {
			CollectionUtil.generateCollectionConfig(
				this.props.clientId,
				this.props.user,
				collectionId,
				config => {
					if(!initialQuery) {
						initialQuery = QueryModel.ensureQuery({size : this.state.pageSize}, config);
					}
					this.setState({
						collectionId : config.collectionId,
						collectionConfig : config,
						initialQuery : initialQuery,
						currentOutput : null,
                        showBookmarkedItems : false
					});
				},
				true
			);
		}
	}

	hideModalAndChangeHistory(collectionConfig) {
		ComponentUtil.hideModal(this, 'showModal', 'collection__modal', true);

		//TODO maybe this is not necessary, since it is already set
		ComponentUtil.storeJSONInLocalStorage(
			'user-last-query',
			QueryModel.ensureQuery({size : this.state.pageSize}, collectionConfig)
		)
	}

	//this function receives all output of components that generate output and orchestrates where
	//to pass it to based on the ingredients of the recipe
	//TODO change this, so it knows what to do based on the recipe
	onComponentOutput = (componentClass, data) => {
		if(componentClass === 'QueryBuilder') {
			this.onSearched(data);
        } else if (componentClass === 'CollectionSelector') {
            //set the default query for the selected collection; creates a new query builder
            this.setState({
                    collectionId: data.collectionId,
                    collectionConfig: data,
                    initialQuery: QueryModel.ensureQuery({size: this.state.pageSize}, data),
                    currentOutput: null,
                    showBookmarkedItems: false
                },
                this.hideModalAndChangeHistory(data)
            );
        } else if(componentClass === 'SearchHit') {
			if(data) {
				//get the selected rows on the current page
                const selectedOnPage = this.state.selectedOnPage;
				//check if the search hit was selected and update the selected rows accordingly
                if(data.selected) {
                    selectedOnPage[data.resourceId] = true;
                } else {
                    delete selectedOnPage[data.resourceId]
                }

				// make sure to update the list of stored bookmarks with the changed selection
				this.updateStoredBookmarkList(data.resource, data.selected);

				//now fetch which rows are still selected (in the local storage)
                const selRowsInLocalStorage = ComponentUtil.getJSONFromLocalStorage('selectedRows') || [];

				this.setState({
                    selectedOnPage : selectedOnPage,
					allRowsSelected : data.selected ? this.areAllRowsSelected() : false,
                    showBookmarkedItems : selRowsInLocalStorage.length > 0 ? this.state.showBookmarkedItems : false,
				});
			}
		} else if(componentClass === 'ProjectSelector') {
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
		} else if(componentClass === 'QueryEditor') {
			this.onQuerySaved(data)
		}
	}

	onLoadPlayoutAccess(accessApproved, desiredState) {
		this.setState(
			desiredState, () => {
				if(desiredState.currentOutput && desiredState.currentOutput.query && desiredState.currentOutput.updateUrl) {
					//if there was a valid query, set it in the cache for happy browsing
                    ComponentUtil.storeJSONInLocalStorage('currentQueryOutput', desiredState.currentOutput);
					ComponentUtil.storeJSONInLocalStorage('user-last-query', desiredState.currentOutput.query);

					//just add the formatted search result in the local storage (it is still needed, but should be removed later)
        			ComponentUtil.storeJSONInLocalStorage('resultsDetailsData', desiredState.currentResults.map(er => er.formattedData));

					FlexRouter.setBrowserHistory({queryId : 'cache'}, 'single-search-history');
				} else if(desiredState.currentOutput == null) {
					//the search was cleared in the query builder, so cache the default query for this collection
					//and refresh the page so it all loads smoothly
                    // What about removing the saved data when clearing the cache ?
					ComponentUtil.storeJSONInLocalStorage(
						'user-last-query',
						QueryModel.ensureQuery({size : this.state.pageSize}, this.state.collectionConfig)
					);
					FlexRouter.gotoSingleSearch('cache')
				}
			}
		);
	}

	static elementInViewport(el) {
    	const rect = el.getBoundingClientRect();
    	return (
			rect.top >= 0 && rect.left >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight)
		)
	}

	static afterRenderingHits() {
		const imgDefer = document.getElementsByTagName('img');
		for (let i=0; i<imgDefer.length; i++) {
			if(imgDefer[i].getAttribute('data-src') && SingleSearchRecipe.elementInViewport(imgDefer[i])) {
				imgDefer[i].setAttribute('src',imgDefer[i].getAttribute('data-src'));
			}
		}
	}

	/* ------------------------------- PROJECT RELATED FUNCTION ----------------------- */


	onProjectChanged(project) {
		ComponentUtil.storeJSONInLocalStorage('activeProject', project);
        this.saveBookmarksToLocalStorage();
		ComponentUtil.hideModal(this, 'showProjectModal', 'project__modal', true, () => {
			if(this.state.awaitingProcess) {
				switch(this.state.awaitingProcess) {
					case 'bookmark' : this.selectBookmarkGroup(); break;
					case 'saveQuery' : this.showQueryModal(); break;
				}
			}
		});
	}

	/* ------------------------------- SEARCH RELATED FUNCTIONS ----------------------- */

	onStartSearch = () => {
        this.setState({
            isSearching : true
        })
    }

    //this is updated via the query builder, but it does not update the state.query...
	//TODO figure out if it's bad to update the state
	//TODO add the highlight data in the state here, so it does not have to be fetched from the render function
	onSearched(data, paging) {
        const enrichedSearchResults = data.results.map( (result, index) => {
        	return ComponentUtil.convertRawSearchResult(result, this.state.collectionConfig, data.query);
        })

		const desiredState = {
			currentOutput: data,
			currentResults : enrichedSearchResults, //TODO currently testing this new state variable
            showBookmarkedItems : false
		};
		// if search is not the result of paging then clear selectedOnPage.
        !paging ? desiredState.selectedOnPage = {} : desiredState;

		//reset the poster images to the placeholder
		const imgDefer = document.getElementsByTagName('img');
		for (let i=0; i<imgDefer.length; i++) {
			if(imgDefer[i].getAttribute('data-src')) {
				imgDefer[i].setAttribute('src', '/static/images/placeholder.2b77091b.svg');
			}
		}

		//request access for the thumbnails if needed
		if (this.state.collectionConfig.requiresPlayoutAccess() && this.state.collectionConfig.getThumbnailContentServerId()) {
			PlayoutAPI.requestAccess(
				this.state.collectionConfig.getThumbnailContentServerId(),
				'thumbnails',
				desiredState,
				this.onLoadPlayoutAccess.bind(this)
			)
		} else {
			this.onLoadPlayoutAccess(true, desiredState);
		}
        this.setState({
            selectedOnPage : this.getAlreadySelectedRows(data),
            allRowsSelected: this.areAllRowsSelected(),
            isSearching: false,
            isPagingOutOfBounds : data.pagingOutOfBounds === true
        })
	}

	//FIXME this function is tied to the function returned by the search component (which is kind of weird, but works)
	//FIXME queryId wordt niet meer gebruikt
	gotoPage = (queryId, pageNumber) => {
        this.setState({
            isSearching : true
        }, () => {
            if(this.state.currentOutput && this.state.currentOutput.query) {
                const sr = this.state.currentOutput;

                sr.query.offset = (pageNumber-1) * this.state.pageSize;
                SearchAPI.search(sr.query, sr.collectionConfig, data => this.onSearched(data, true), true)
            }
        })
	}

	//the sortMode is translated to sort params inside the QueryBuilder component
	//sortMode = {type : date/rel, order : desc/asc}
    sortResults = (queryId, sortParams) => {
	    this.setState({
            isSearching : true
        }, () => {
            if (this.state.currentOutput) {
                const sr = this.state.currentOutput;
                sr.query.sort = sortParams;
                sr.query.offset = 0;
                SearchAPI.search(sr.query, sr.collectionConfig, data => this.onSearched(data, false), true)
            }
        })
    }


	/* ------------------------------- TABLE ACTION FUNCTIONS ----------------------- */

	//checks if the search results contain resources that were already selected in another query
	getAlreadySelectedRows(searchData) {
		if(!searchData || !searchData.results) {
			return {};
		}
		const rowsInStorage = ComponentUtil.getJSONFromLocalStorage('selectedRows') || [];
		const selRows = {};
		searchData.results.forEach(item => rowsInStorage.filter(obj => {
			if(obj._id === item._id) {
				selRows[item._id] = true;
			}}
		));
		return selRows;
	}

	//TODO check this function, it is a bit duplicate, similar code is also in ...
	areAllRowsSelected() {
		const storeSelectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows')
		if(!storeSelectedRows || !(this.state.currentOutput && this.state.currentOutput.results)) {
			return false;
		}
		return this.state.currentOutput.results.every(
			itemOnPage => storeSelectedRows.find(j => j._id === itemOnPage._id)
		);
	}

	clearSelectedResources = () => {
		ComponentUtil.removeJSONByKeyInLocalStorage('selectedRows')
        this.setState({
        	selectedOnPage : {},
        	allRowsSelected : false,
        	showBookmarkedItems : false,
    	});
    }

	toggleRows = (e) => {
		e.preventDefault();
		let rows = this.state.selectedOnPage;
    	const rowsOnLocalStorage = ComponentUtil.getJSONFromLocalStorage('selectedRows') || null;

        if(this.state.allRowsSelected) {
            this.state.currentOutput.results.forEach(result => {
                const isChecked = Object.keys(rows).findIndex(i => i === result._id);
                if(isChecked !== -1) {
                    ComponentUtil.removeItemInLocalStorage('selectedRows', result, '_id');
                }
            });
            rows = {};
		} else {
			this.state.currentOutput.results.forEach(result => {
                rows[result._id] = !this.state.allRowsSelected;
                const isChecked = rowsOnLocalStorage ? rowsOnLocalStorage.findIndex(i => i._id === result._id) : -1;
                if(isChecked === -1) {
                    this.updateStoredBookmarkList(result, true);
                }
			});
		}
		this.setState({
			allRowsSelected : !this.state.allRowsSelected,
			selectedOnPage : rows
		});
	}

	/* ------------------------------- BOOKMARK RELATED FUNCTIONS ----------------------- */

	showBookmarkedItems = () => {
        this.setState({
            showBookmarkedItems : !this.state.showBookmarkedItems
        });
    }

	updateStoredBookmarkList(resource, select) {
		if(select) {
			resource.query = this.state.currentOutput.query;
		}
		if(select) {
			ComponentUtil.pushItemToLocalStorage('selectedRows', resource, '_id');
		} else {
			ComponentUtil.removeItemInLocalStorage('selectedRows', resource, '_id');
		}
	}

	// current bookmarks per project
	saveBookmarksToLocalStorage() {
        this.state.activeProject && this.state.activeProject.id ?
            AnnotationAPI.getBookmarks(
                this.props.user.id,
                this.state.activeProject.id,
                (data) => {
                	ComponentUtil.storeJSONInLocalStorage('activeBookmarks', data)
                }
            ) :
            false;
    }

	//this will first check if a project was selected. Then either bookmarks or opens the project selector first
	bookmark = () => {
		if(this.state.activeProject === null) {
			this.setState({
				showProjectModal : true,
				awaitingProcess : 'bookmark',
			});
		} else {
			this.selectBookmarkGroup();
		}
	}

	selectBookmarkGroup() {
		this.setState({
			showBookmarkModal : true,
			awaitingProcess : null,
            showBookmarkItems : false,
            showBookmarkedItems : false
		});
	}

    // makes sure that all selected resources are ADDED to the selected groups
	bookmarkToGroupInProject(allGroups, selectedGroups) {
        const selectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
        ComponentUtil.hideModal(this, 'showBookmarkModal', 'bookmark__modal', true, () => {
        	let saveCount = 0;
        	//run through all the selected groups
        	allGroups.filter(group => selectedGroups[group.id] === true).forEach(group => {
        		//then add all the selected resources to the group's list of targets
        		const targets = group.target.concat(
        			selectedRows.map(result => AnnotationUtil.generateResourceLevelTarget(result._index, result._id))
        		);

        		//make sure to remove duplicate targets (could happen in case a target was already in a group)
				const temp = {};
				const dedupedTargets = [];
				targets.forEach((t) => {
					if(!temp[t.source]) {
						temp[t.source] = true;
						dedupedTargets.push(t);
					}
				});
				group.target = dedupedTargets;

				//FIXME this code is not entirely safe: what if somehow the saveAnnotation does not return?
				AnnotationAPI.saveAnnotation(group, () => {
					if(++saveCount === Object.keys(selectedGroups).length) {
						this.onSaveBookmarks();
					}
				});
        	});

		});
	}

	onSaveBookmarks() {
	    this.saveBookmarksToLocalStorage();
		this.setState({
			selectedOnPage : {},
			allRowsSelected : false,
            showBookmarkedItems : false
		}, () => {
			alert('Bookmarks were saved successfully');
            ComponentUtil.removeJSONByKeyInLocalStorage('selectedRows');
		})
	}

	/* ------------------------------- QUERY SAVING RELATED FUNCTIONS ----------------------- */

	saveQuery = () => {
		if(this.state.activeProject == null) {
			this.setState({
				showProjectModal : true,
				awaitingProcess : 'saveQuery',
                showBookmarkedItems : false
			});
		} else {
			this.showQueryModal();
		}
	}

	//called after onComponentOutput of QueryEditor
	onQuerySaved(project) {
		ComponentUtil.hideModal(this, 'showQueryModal', 'query__modal', true, () => {
			ComponentUtil.storeJSONInLocalStorage('activeProject', project)
		});
	}

	showQueryModal() {
		this.setState({
			showQueryModal : true,
			awaitingProcess : null
		});
	}

	/* ------------------------------- QUICKVIEW FUNCTIONS -------------------------- */

	openQuickViewModal = (quickViewData, isFirstResource, isLastResource) => {
	    this.setState({
	        quickViewData: quickViewData, //this is the object returned by ComponentUtil.convertRawSearchResult (or convertRawSelectedData)
	        isFirstResource : isFirstResource,
	        isLastResource : isLastResource,
	        showQuickViewModal : true
	    });
	}

	showResourceInQuickView(rawResult, isFirstResource, isLastResource) {
	    let quickViewData = null;
	    if(this.state.showBookmarkedItems) {
	    	quickViewData = ComponentUtil.convertRawSelectedData(rawResult, this.props.clientId, this.props.user)
	    } else {
	    	quickViewData = ComponentUtil.convertRawSearchResult(rawResult, this.state.collectionConfig, this.state.currentOutput.query);
	    }
	    this.openQuickViewModal(quickViewData, isFirstResource, isLastResource);
	}

	//when a user selects a result for the quick view pop-up
	//TODO also check that this can be simplified
	onSelectQuickViewResult = (resourceId, selected) => {
        const currentSelection = ComponentUtil.getJSONFromLocalStorage('selectedRows') || [];
        let foundIndex = -1; // Lookup the index of the current newly selected/deselected resource
        for(let i = 0; i < currentSelection.length; i++) {
            if(currentSelection[i]._id === resourceId) {
                foundIndex = i;
            }
        }

        if(this.state.quickViewData && selected && foundIndex === -1) { //Case selected (add)
            const selectionObj = this.state.quickViewData.rawData;
            selectionObj["query"] = ComponentUtil.getJSONFromLocalStorage('user-last-query'); //FIXME why is the query added?????
            currentSelection.push(selectionObj);
        } else { //Case unselected (remove)
            if(foundIndex !== -1){
                currentSelection.splice(foundIndex,1); //Remove the item if it exists
            }
        }

        ComponentUtil.storeJSONInLocalStorage('selectedRows', currentSelection);
        if(currentSelection.length === 0) {
            this.clearSelectedResources();
        } else {
            this.setState({selectedOnPage: currentSelection, lastUnselectedIndex: foundIndex});
        }
	}

	//TODO this should also be simplified!! (reading from two different lists)
	moveQuickViewResource = moveNext => {
		let resourceList = [];
	    let currentIndex = -1;
	    let nextResource = null;
	    let isLastResource = false;
	    if(this.state.showBookmarkedItems) {
            resourceList = ComponentUtil.getJSONFromLocalStorage('selectedRows'); //contains RAW results
            currentIndex = resourceList.findIndex(elem => elem._id === this.state.quickViewData.formattedData.resourceId);
            if(currentIndex === -1) {
                currentIndex = this.state.lastUnselectedIndex;
                nextResource = resourceList.length > currentIndex ? resourceList[currentIndex] : null;
        	    isLastResource = currentIndex === resourceList.length;
            } else {
                isLastResource = currentIndex === resourceList.length - 1;
            }
	    } else {
	        resourceList = this.state.currentOutput.results; //contains RAW results
	        currentIndex = resourceList.findIndex(searchResult => searchResult._id === this.state.quickViewData.formattedData.resourceId);
	        nextResource = resourceList.length - 1 > currentIndex ? resourceList[currentIndex + 1] : null;
        	isLastResource = currentIndex === resourceList.length - 1
	    }

	    const prevResource = currentIndex > 0 ? resourceList[currentIndex-1] : null;
	    if(!nextResource) {
	        nextResource = resourceList.length - 1 > currentIndex ? resourceList[currentIndex + 1] : null;
	    }

	    if(moveNext && !isLastResource) {
			this.showResourceInQuickView(nextResource, resourceList.length === 1, currentIndex === resourceList.length - 2);
	    }
	    if(!moveNext && currentIndex !== 0) {
			this.showResourceInQuickView(prevResource, currentIndex === 1, resourceList.length === 1);
	    }
	}

	onKeyPressedInQuickView = keyCode => {
	    if(keyCode === 39) { //Next
	        this.moveQuickViewResource(true);
	    }
	    if(keyCode === 37) { //Previous
            this.moveQuickViewResource(false);
	    }
	    if(keyCode === 83) { //Selected
	        this.onSelectQuickViewResult(
	        	this.state.quickViewData.formattedData.resourceId,
	        	!this.state.quickViewData.formattedData.resourceId in this.state.selectedOnPage
	        );
	    }
	}

	/* -------------------------------- RENDER THE MODALS --------------------------*/

	renderCollectionModal = () => {
		return (
			<FlexModal
				elementId="collection__modal"
				stateVariable="showModal"
				owner={this}
				size="large"
				title="Choose a collection">
					<CollectionSelector
						clientId={this.props.clientId}
						user={this.props.user}
						onOutput={this.onComponentOutput}
						showSelect={true}
						showBrowser={true}/>
			</FlexModal>
		)
	}

	renderQuickViewModal = (storedSelectedRows, selectedOnPage, quickViewData) => {
		const selected = storedSelectedRows.findIndex(elem => elem._id === quickViewData.formattedData.resourceId) >= 0;
	    return (
	        <FlexModal
				elementId="quickview__modal"
				stateVariable="showQuickViewModal"
				owner={this}
				size="large"
				title={quickViewData.formattedData.title}
				onKeyPressed={this.onKeyPressedInQuickView}>
				<QuickViewer
				    data={quickViewData}// this is a FORMATTED result, so no RAW data
				    selected={selected} // if the current quick view result is in the stored rows
				    onSelected={this.onSelectQuickViewResult}
				    moveQuickViewResource={this.moveQuickViewResource}
				    isFirstResource={this.state.isFirstResource}
				    isLastResource={this.state.isLastResource}
				/>
			</FlexModal>
		)
	}

	renderProjectModal = () => {
		return (
			<FlexModal
				elementId="project__modal"
				stateVariable="showProjectModal"
				owner={this}
				size="large"
				title="Set the active project">
					<ProjectSelector onOutput={this.onComponentOutput} user={this.props.user}/>
			</FlexModal>
		)
	}

	renderQueryModal = (currentOutput, activeProject) => {
		return (
			<FlexModal
				elementId="query__modal"
				stateVariable="showQueryModal"
				owner={this}
				size="large"
				title="Enter a name for your query">
					<QueryEditor
						query={currentOutput.query}
						user={this.props.user}
						project={activeProject}
						onOutput={this.onComponentOutput}/>
			</FlexModal>
		)
	}

	renderBookmarkModal = (collectionConfig, activeProject) => {
		return (
			<FlexModal
				elementId="bookmark__modal"
				stateVariable="showBookmarkModal"
				owner={this}
				size="large"
				title="Select one or more bookmark groups for your selection of resources">
					<BookmarkSelector
						onOutput={this.onComponentOutput}
						user={this.props.user}
						project={activeProject}
						collectionId={collectionConfig.collectionId}
						/>
			</FlexModal>
		)
	}

	/* --------------------------- RENDER SELECTION BUTTONS --------------------- */


	renderSelectionButtons = (activeProject, collectionConfig, showCollectionSelector = true) => {
		let collectionBtn = null;
		const projectBtn = (
			<button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showProjectModal')}>
				Set project ({activeProject ? activeProject.name : 'none selected'})
			</button>
		);

		if(showCollectionSelector) {
			//show the button to open the modal
			collectionBtn = (
				<button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
					Set collection ({collectionConfig ? collectionConfig.getCollectionTitle() : 'none selected'})
				</button>
			);
		}

		return (
			<div>{collectionBtn}&nbsp;{projectBtn}</div>
		)
	}


	/* --------------------------- RENDER RESULT LIST ----------------------------*/

	renderResultTable = (state, storedSelectedRows, activeBookmarks) => {
		//only render when there is a collectionConfig and searchAPI output
		if(!(
			state.collectionId &&
			state.collectionConfig &&
			state.currentOutput &&
			state.currentOutput.results &&
			state.currentOutput.results.length > 0
		)) {
			return null
		}

		//if the search API returned a paging out of bounds error, return a helpful message for the user
		if(state.isPagingOutOfBounds) {
			return (
				<div className="col-md-9">
					<div className="alert alert-danger">
	            		{MessageHelper.renderPagingOutOfBoundsMessage(this.gotoPage.bind(this, undefined, 1))}
	            	</div>
	            </div>
            )
		}

		let listComponent = null;

		if (state.showBookmarkedItems) {//storedSelectedRows && storedSelectedRows.length > 0
			listComponent = this.renderSelectionOverview(storedSelectedRows)
		} else {
			//populate the list of search results
			listComponent = state.currentResults.map(
				(result, index) => this.renderSearchResults(result, index, storedSelectedRows, activeBookmarks)
			);
		}

		const tableHeader = this.renderTableHeader(
			state.currentOutput,
			state.collectionConfig,
			storedSelectedRows,
			state.showBookmarkedItems,
			state.selectedOnPage,
			state.pageSize
		);

		const tableFooter = this.renderTableFooter(
			state.currentOutput,
			state.pageSize
		);

        return (
            <div className="col-md-9 result-list">
                {tableHeader}
                {listComponent}
                {tableFooter}
            </div>
        )
	}

	/* --------------------------- RENDERING LISTS -------------------------------*/

	renderSelectionOverview = (storedSelectedRows) => {
		return (
            <div className="table-actions-header bookmarked-results">
                <h4 className="header-selected-items">
                    Selected items
                    <i className="fa fa-remove" onClick={this.showBookmarkedItems}/>
                </h4>
                <div className="selected-items">
                    {storedSelectedRows.map(this.renderSelectedItems)}
                </div>
            </div>
        );
	}

	renderSelectedItems = (result, index) => {
        const searchHitData = ComponentUtil.convertRawSelectedData(result, this.props.clientId, this.props.user);
        return (
            <SearchHit
                key={'saved__' + index}
                data={searchHitData}
                itemDetailsPath={this.props.recipe.ingredients.itemDetailsPath}
                bookmarked={null}
                isSelected={true}
                onQuickView={this.openQuickViewModal}
                onOutput={this.onComponentOutput}
			/>
        )
    }

	renderSearchResults = (result, index, storedSelectedRows, activeBookmarks) => {
		const bookmark = activeBookmarks ? activeBookmarks.find(item => item.resourceId === result.formattedData.resourceId) : null;
        const isSelectedItem = storedSelectedRows.find(item => item._id === result.formattedData.resourceId) !== undefined;
		return (
			<SearchHit
				key={'__' + index}
				data={result}
				itemDetailsPath={this.props.recipe.ingredients.itemDetailsPath}
				bookmark={bookmark}
				isSelected={isSelectedItem}
				onQuickView={this.openQuickViewModal}
				onOutput={this.onComponentOutput}
			/>
		)
	}

	/* ---------------------------- RENDER THE TABLE ------------------------- */

	renderPagingButtons = (currentPage, totalHits, pageSize) => {
		if(currentPage <= 0) {
			return null;
		}
		return (
			<Paging
				currentPage={currentPage}
				numPages={Math.ceil(totalHits / pageSize)}
				gotoPage={this.gotoPage}
			/>
		)
	}

	renderSortButtons = (collectionConfig, query) => {
		if(!query.sort) {
			return null;
		}
		return (
			<Sorting
				sortResults={this.sortResults}
				sortParams={query.sort}
				collectionConfig={collectionConfig}
				dateField={query.dateRange ? query.dateRange.field : null}
			/>
		)
	}

	//FIXME the ugly HTML & lack of proper class names
	renderTableHeader = (currentOutput, collectionConfig, storedSelectedRows, showBookmarkedItems, selectedOnPage, pageSize) => {
		return (
			<div className="table-actions-header">
                {this.renderTableSelectAll(currentOutput, selectedOnPage)}
                {this.renderActionButtons(storedSelectedRows, showBookmarkedItems)}
                <div style={{textAlign: 'center'}}>
                    {this.renderPagingButtons(currentOutput.currentPage, currentOutput.totalHits, pageSize)}
                    <div style={{float: 'right'}}>
                        {this.renderSortButtons(collectionConfig, currentOutput.query)}
                    </div>
                </div>
            </div>
		)
	}

	renderTableFooter = (currentOutput, pageSize) => {
		return (
			<div className="table-actions-footer">
				{this.renderPagingButtons(currentOutput.currentPage, currentOutput.totalHits, pageSize)}
			</div>
		)
	}

	renderTableSelectAll = (currentOutput, selectedOnPage) => {
		const currentSelectedIds = this.state.selectedOnPage ? Object.keys(this.state.selectedOnPage) : []
		const allChecked = currentOutput.results.map(item => currentSelectedIds.findIndex(it => it === item._id));
		const isChecked = allChecked.findIndex(item => item === -1) === -1;
		return (
            <div onClick={this.toggleRows} className="select-all">
                <input type="checkbox" defaultChecked={isChecked ? 'checked' : ''} id={'cb__select-all'}/>
                <label htmlFor={'cb__select-all'}><span/></label>
            </div>
        );
	}

	renderActionButtons = (storedSelectedRows, showBookmarkedItems) => {
		const actions = [];
		if(storedSelectedRows && storedSelectedRows.length > 0) {
            actions.push(
                <div className="dropdown bookmark-dropdown-menu">
                    <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownBookmarking"
                            data-toggle="dropdown"
                            aria-haspopup="true" aria-expanded="false">
                        <i className="fa fa-bookmark" style={{color: 'white'}} />{storedSelectedRows.length}
                    </button>
                    <div className="dropdown-menu" aria-labelledby="dropdownBookmarking">
                        <button className="dropdown-item" type="button" onClick={this.showBookmarkedItems}>
							{showBookmarkedItems ? 'Hide' : 'Show'} selected item(s)
						</button>
                        <button className="dropdown-item" type="button" onClick={this.bookmark}>
                        	Bookmark selection
                        </button>
                        <button
							className="dropdown-item"
							type="button"
							onClick={this.clearSelectedResources}>
							Clear selection
						</button>
                    </div>
                </div>
            );
		}
		//always add the save query button
		actions.push(
            <button
                type="button"
                className="btn btn-primary"
                onClick={this.saveQuery}
                title="Save current query to the active project">
                &nbsp;
                <i className="fa fa-save" style={{color: 'white'}}/>
                &nbsp;
            </button>
        );

		return (
			<div className="table-actions">
				{actions}
			</div>
		);
	}

	/* ---------------------------- RENDER QUERY BUILDER -------------------------- */

	renderSearchComponent = (collectionId, collectionConfig, initialQuery, isSearching) => {
		let loadingMessage = null;
		let queryBuilder = null;

		if(collectionId && collectionConfig) {
			queryBuilder = (
				<QueryBuilder
					key={collectionId} //for resetting all the states held within after selecting a new collection
					header={true}
					aggregationView={this.props.recipe.ingredients.aggregationView}
					dateRangeSelector={this.props.recipe.ingredients.dateRangeSelector}
					showTimeLine={true}
					query={initialQuery || QueryModel.ensureQuery(null, collectionConfig) }
					collectionConfig={collectionConfig}
					onStartSearch={this.onStartSearch}
					onOutput={this.onComponentOutput}
				/>
			);
		}

		if(isSearching) {
		    loadingMessage = <LoadingSpinner message="Loading results..."/>;
        }

		return (
			<div className="search-component">
            	{loadingMessage}
            	{queryBuilder}
        	</div>
        )
	}

	/* ---------------------------- MAIN RENDER FUNCTION -------------------------- */

	render() {
		const storedSelectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows') || [];
        const activeBookmarks =  ComponentUtil.getJSONFromLocalStorage('activeBookmarks');

        // all the different modals
        const collectionModal = this.state.showModal ? this.renderCollectionModal() : null;

        const quickViewModal = this.state.showQuickViewModal ? this.renderQuickViewModal(
        	storedSelectedRows,
        	this.state.selectedOnPage,
        	this.state.quickViewData
        ) : null;

        const projectModal = this.state.showProjectModal ? this.renderProjectModal() : null;

        const queryModal = this.state.showQueryModal ? this.renderQueryModal(
        	this.state.currentOutput,
        	this.state.activeProject
        ) : null;

        const bookmarkModal = this.state.showBookmarkModal ? this.renderBookmarkModal(
        	this.state.collectionConfig,
        	this.state.activeProject
        ) : null;

        const selectionButtons = this.renderSelectionButtons(
        	this.state.activeProject,
        	this.state.collectionConfig,
        	this.props.recipe.ingredients.collectionSelector
        )

        //the query builder & loading message
		const searchComponent = this.renderSearchComponent(
			this.state.collectionId,
			this.state.collectionConfig,
			this.state.initialQuery,
			this.state.isSearching
		);

		//search result table with paging, sorting and ability to toggle a list of selected items
		const resultList = this.renderResultTable(this.state, storedSelectedRows, activeBookmarks);

		return (
			<div className={IDUtil.cssClassName('single-search-recipe')}>
				<div className="row">
					<div className="col-md-12">
						{selectionButtons}
						{searchComponent}
                        {resultList}
					</div>
				</div>
				{collectionModal}
				{projectModal}
				{queryModal}
				{bookmarkModal}
				{quickViewModal}
			</div>
		);
	}
}

SingleSearchRecipe.propTypes = {
	clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    })

};

export default SingleSearchRecipe;
