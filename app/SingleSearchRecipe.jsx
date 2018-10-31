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
import Paging from './components/search/Paging';
import Sorting from './components/search/Sorting';

import PropTypes from 'prop-types';
import { initHelp } from './components/workspace/helpers/helpDoc';

class SingleSearchRecipe extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showModal : false, //for the collection selector
            showBookmarkedItems : false,
			showProjectModal : false, //for the project selector
			showBookmarkModal : false, //for the bookmark group selector
			activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),
			awaitingProcess : null, //which process is awaiting the output of the project selector

			collectionId : null,

			//influences the query
			pageSize : 20,

			//use for a lot TODO write proper reasons
			collectionConfig : null, //loaded after mounting, without it nothing works
			initialQuery : null, //yikes this is only used for storing the initial query

			//for doing actions on the search results
			selectedRows : {},
			allRowsSelected : false,
            allRowsSelectedPerPage : {}
		};
		this.CLASS_PREFIX = 'rcp__ss'
	}

	componentWillUnmount() {
		window.onscroll = null;
	}

	componentDidMount() {
		//init user docs (FIXME shouldn't this be part of the media suite code base?)
		initHelp("Search", "/feature-doc/tools/single-search");
        // Remove localstorage bookmarks when the page is reloaded.
		ComponentUtil.removeJSONByKeyInLocalStorage('selectedRows');

		window.onscroll = () => {this.afterRenderingHits()};

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
				console.debug(initialQuery)
				collectionId = initialQuery ? initialQuery.collectionId : null;
			} else if (this.props.params.queryId.indexOf('__') !== -1 && this.state.activeProject) {
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
	onComponentOutput(componentClass, data) {
		if(componentClass === 'QueryBuilder') {
			this.onSearched(data);
		} else if(componentClass === 'CollectionSelector') {
			//set the default query for the selected collection; creates a new query builder
			this.setState({
				collectionId : data.collectionId,
				collectionConfig : data,
				initialQuery : QueryModel.ensureQuery({size : this.state.pageSize}, data),
				currentOutput : null,
                showBookmarkedItems : false
			},
			this.hideModalAndChangeHistory(data),
		    ComponentUtil.removeJSONByKeyInLocalStorage('visitedHits')
		);
		} else if(componentClass === 'SearchHit') {
			if(data) {
				const selectedRows = this.state.selectedRows;
				if(data.selected) {
					selectedRows[data.resourceId] = true;
				} else {
					delete selectedRows[data.resourceId]
				}
                const indexOf = this.state.currentOutput.results.findIndex(item => item._id === data.resourceId);
                ComponentUtil.updateLocalStorage('selectedRows', this.state.currentOutput.results[indexOf], data);
				this.setState({
					selectedRows : selectedRows,
					allRowsSelected : data.selected ? this.state.allRowsSelected : false,
                    showBookmarkedItems : Object.keys(this.state.selectedRows).length === 0 ? false : this.state.showBookmarkedItems,
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
			this.bookmarkToGroupInProject(data);
		} else if(componentClass === 'QueryEditor') {
			this.onQuerySaved(data)
		}
	}

	//this is updated via the query builder, but it does not update the state.query...
	//TODO figure out if it's bad to update the state
	onSearched(data, paging) {
		const desiredState = {
			currentOutput: data,
			allRowsSelected : false,
            showBookmarkedItems : false
		};
		// if search is not the result of paging then clear selectedRows.
        !paging ? desiredState.selectedRows = {} : desiredState;

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
	}

	onLoadPlayoutAccess(accessApproved, desiredState) {
		this.setState(
			desiredState, () => {
				if(desiredState.currentOutput && desiredState.currentOutput.query && desiredState.currentOutput.updateUrl) {
					//if there was a valid query, set it in the cache for happy browsing
                    ComponentUtil.storeJSONInLocalStorage('currentQueryOutput', desiredState.currentOutput);
					ComponentUtil.storeJSONInLocalStorage('user-last-query', desiredState.currentOutput.query);
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
				//this.afterRenderingHits();
			}
		);
	}

	elementInViewport(el) {
    	const rect = el.getBoundingClientRect();
    	return (
			rect.top >= 0 && rect.left >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight)
		)
	}

	afterRenderingHits() {
		const imgDefer = document.getElementsByTagName('img');
		for (let i=0; i<imgDefer.length; i++) {
			if(imgDefer[i].getAttribute('data-src') && this.elementInViewport(imgDefer[i])) {
				imgDefer[i].setAttribute('src',imgDefer[i].getAttribute('data-src'));
			}
		}
	}

	/* ------------------------------------------------------------------------------
	------------------------------- SEARCH RELATED FUNCTIONS --------------------
	------------------------------------------------------------------------------- */

	//FIXME this function is tied to the function returned by the search component (which is kind of weird, but works)
	//TODO hiermee verder gaan morgen
	gotoPage(queryId, pageNumber) {
		if(this.state.currentOutput) {
			const sr = this.state.currentOutput;

			sr.query.offset = (pageNumber-1) * this.state.pageSize;
			SearchAPI.search(sr.query, sr.collectionConfig, data => this.onSearched(data, true), true)
		}
	}

	//the sortMode is translated to sort params inside the QueryBuilder component
	//sortMode = {type : date/rel, order : desc/asc}
	sortResults(queryId, sortParams) {
		if(this.state.currentOutput) {
			const sr = this.state.currentOutput;
			sr.query.sort = sortParams;
			sr.query.offset = 0;
			SearchAPI.search(sr.query, sr.collectionConfig, data => this.onSearched(data, false), true)
		}
	}

	/* ------------------------------------------------------------------------------
	------------------------------- TABLE ACTION FUNCTIONS --------------------
	------------------------------------------------------------------------------- */

	toggleRows(e) {
		e.preventDefault();
		const rows = this.state.selectedRows,
              rowsOnLocalStorage = ComponentUtil.getJSONFromLocalStorage('selectedRows') || null;

        if(this.state.allRowsSelected) {
            this.state.currentOutput.results.forEach(result => {
                const isChecked = rowsOnLocalStorage.findIndex(i => i._id === result._id);
                if(isChecked !== -1) {
                    ComponentUtil.removeItemInLocalStorage('selectedRows', result);
                    delete rows[result._id];
                }
            });
		} else {
			this.state.currentOutput.results.forEach(result => {
                rows[result._id] = !this.state.allRowsSelected;
                const isChecked = rowsOnLocalStorage ? rowsOnLocalStorage.findIndex(i => i._id === result._id) : -1;

                if(isChecked === -1) {
                    ComponentUtil.pushItemToLocalStorage('selectedRows', result);
                }
			});
		}
		this.setState({
			allRowsSelected : !this.state.allRowsSelected,
			selectedRows : rows
		});
	}

	onProjectChanged(project) {
		ComponentUtil.storeJSONInLocalStorage('activeProject', project);
		ComponentUtil.hideModal(this, 'showProjectModal', 'project__modal', true, () => {
			if(this.state.awaitingProcess) {
				switch(this.state.awaitingProcess) {
					case 'bookmark' : this.selectBookmarkGroup(); break;
					case 'saveQuery' : this.showQueryModal(); break;
				}
			}
		});
	}

	//this will first check if a project was selected. Then either bookmarks or opens the project selector first
	bookmark() {
		if(this.state.activeProject == null) {
			this.setState({
				showProjectModal : true,
				awaitingProcess : 'bookmark',
			});
		} else {
			this.selectBookmarkGroup();
		}
	}

	//this will actually save the selection to the workspace API
	selectBookmarkGroup() {
		this.setState({
			showBookmarkModal : true,
			awaitingProcess : null,
            showBookmarkItems : false,
            showBookmarkedItems : false
		});
	}

	//finally after a bookmark group is selected, save the bookmark
	bookmarkToGroupInProject(annotation) {
        const selectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
		ComponentUtil.hideModal(this, 'showBookmarkModal', 'bookmark__modal', true, () => {
			//concatenate the
			//const targets = annotation.target.concat(this.state.currentOutput.results
            const targets = annotation.target.concat(selectedRows

				.filter((result) => this.state.selectedRows[result._id]) //only include selected resources
				.map((result) => AnnotationUtil.generateResourceLevelTarget(
					this.state.collectionConfig.collectionId,
					result._id
				), this));

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
			allRowsSelected : false,
            showBookmarkedItems : false
		}, () => {
			alert('Bookmarks were saved successfully');
            ComponentUtil.removeJSONByKeyInLocalStorage('selectedRows');
		})
	}

	saveQuery() {
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

	showBookmarkedItems(){
        this.setState({
            showBookmarkedItems : !this.state.showBookmarkedItems
        });
    }

    clearSelectedItems(){
        this.setState({
            selectedRows : {},
            allRowsSelected : false,
            showBookmarkedItems : false,
        }, () => ComponentUtil.removeJSONByKeyInLocalStorage('selectedRows'));
    }

	showQueryModal() {
		this.setState({
			showQueryModal : true,
			awaitingProcess : null
		});
	}

	//called after onComponentOutput of QueryEditor
	onQuerySaved(project) {
		ComponentUtil.hideModal(this, 'showQueryModal', 'query__modal', true, () => {
			ComponentUtil.storeJSONInLocalStorage('activeProject', project)
		});
	}

	render() {
		let chooseCollectionBtn = null; // for changing the collection
		let collectionModal = null; //modal that holds the collection selector
		let projectModal = null;
		let bookmarkModal = null;
		let queryModal = null;
		let searchComponent = null; //single search, comparative search or combined search

		//search results, paging and sorting
		let resultList = null;
		let tableActionControls = null;
		let paging = null;
		let sortButtons = null;
		let actionButtons = null;
        const storedSelectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
        const selectedSearchHitsInStorage = null;
        let bookmarkingContainer = null;

        if(this.props.recipe.ingredients.collectionSelector) {
			//show the button to open the modal
			chooseCollectionBtn = (
				<button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
					Set collection ({
						this.state.collectionConfig ?
							this.state.collectionConfig.getCollectionTitle() :
							'none selected'
					})
				</button>
			);

			//collection modal
			if(this.state.showModal) {
				collectionModal = (
					<FlexModal
						elementId="collection__modal"
						stateVariable="showModal"
						owner={this}
						size="large"
						title="Choose a collection">
							<CollectionSelector
								clientId={this.props.clientId}
								user={this.props.user}
								onOutput={this.onComponentOutput.bind(this)}
								showSelect={true}
								showBrowser={true}/>
					</FlexModal>
				)
			}
		}

		// for changing the active project
		const chooseProjectBtn = (
			<button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showProjectModal')}>
				Set project ({this.state.activeProject ? this.state.activeProject.name : 'none selected'})
			</button>
		);

		//project modal
		if(this.state.showProjectModal) {
			projectModal = (
				<FlexModal
					elementId="project__modal"
					stateVariable="showProjectModal"
					owner={this}
					size="large"
					title="Set the active project">
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
							collectionId={this.state.collectionConfig.collectionId}
							/>
				</FlexModal>
			)
		}

		//query name modal where the user should enter the name of the query to be saved
		if(this.state.showQueryModal) {
			queryModal = (
				<FlexModal
					elementId="query__modal"
					stateVariable="showQueryModal"
					owner={this}
					size="large"
					title="Enter a name for your query">
						<QueryEditor
							query={this.state.currentOutput.query}
							user={this.props.user}
							project={this.state.activeProject}
							onOutput={this.onComponentOutput.bind(this)}/>
				</FlexModal>
			)
		}

		//only draw when a collection config is properly loaded
		if(this.state.collectionId && this.state.collectionConfig) { // && this.state.initialQuery

			//this components outputs: search results, aggregations & sorting & paging functions!
			searchComponent = (
				<QueryBuilder
					key={this.state.collectionId} //for resetting all the states held within after selecting a new collection

					//UI options not relevant for querying
					header={true}
					aggregationView={this.props.recipe.ingredients.aggregationView}
					dateRangeSelector={this.props.recipe.ingredients.dateRangeSelector}
					showTimeLine={true}

					query={this.state.initialQuery || QueryModel.ensureQuery(null, this.state.collectionConfig) }
					collectionConfig={this.state.collectionConfig}

					onOutput={this.onComponentOutput.bind(this)}/>
			);


			//draw the search hits in here, so it's possible to put the linechart in between the search box and the results
			if(this.state.currentOutput && this.state.currentOutput.results && this.state.currentOutput.results.length > 0) {
				//populate the paging buttons
				if(this.state.currentOutput.currentPage > 0) {
					paging = <Paging
						currentPage={this.state.currentOutput.currentPage}
						numPages={Math.ceil(this.state.currentOutput.totalHits / this.state.pageSize)}
						gotoPage={this.gotoPage.bind(this)}/>
				}

				if(this.state.currentOutput.query.sort) {
					//draw the sorting buttons
					sortButtons = <Sorting
						sortResults={this.sortResults.bind(this)}
						sortParams={this.state.currentOutput.query.sort}
						collectionConfig={this.state.collectionConfig}
						dateField={
							this.state.currentOutput.query.dateRange ?
								this.state.currentOutput.query.dateRange.field : null
						}/>
				}

				tableActionControls = (
					<div className={IDUtil.cssClassName('select', this.CLASS_PREFIX)}
						onClick={this.toggleRows.bind(this)}>
						<input type="checkbox" checked={
							this.state.allRowsSelected ? 'checked' : ''
						} id={'cb__select-all'}/>
						<label htmlFor={'cb__select-all'}><span/></label>
					</div>
				);

                /*if (this.state.currentOutput.query.sort) {
                    //draw the sorting buttons
                    sortButtons = <Sorting
                        sortResults={this.sortResults.bind(this)}
                        sortParams={this.state.currentOutput.query.sort}
                        collectionConfig={this.state.collectionConfig}
                        dateField={
                            this.state.currentOutput.query.dateRange ?
                                this.state.currentOutput.query.dateRange.field : null
                        }/>
                }*/


				//draw the action buttons
				const actions = [],
                      currentSelectedRows = Object.keys(this.state.selectedRows),
                      currentPage = this.state.currentOutput.results,
                      allChecked = currentPage.map(item => currentSelectedRows.findIndex(it => it === item._id)),
                      isChecked = allChecked.findIndex(item => item === -1) === -1 ? true : false;

                tableActionControls = (
                    <div className={IDUtil.cssClassName('select', this.CLASS_PREFIX)}
                         onClick={this.toggleRows.bind(this)}>
                        <input type="checkbox" checked={
                            isChecked ? 'checked' : ''
                        } id={'cb__select-all'}/>
                        <label htmlFor={'cb__select-all'}><span/></label>
                    </div>
                );
                let selectedItems = null;
                let selectedSearchHits = null;
				if(Object.keys(this.state.selectedRows).length > 0) {
				    const nrOfSelectedItems = Object.keys(this.state.selectedRows).length;

                    selectedItems = (
                            <div className="dropdown bookmark-dropdown-menu">
                                <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenu2"
                                        data-toggle="dropdown"
                                        aria-haspopup="true" aria-expanded="false">
                                    <i className="fa fa-bookmark" style={{color: 'white'}} />{nrOfSelectedItems}
                                </button>
                                <div className="dropdown-menu" aria-labelledby="dropdownMenu2">
                                    <button className="dropdown-item" type="button"
                                            onClick={this.showBookmarkedItems.bind(this)}>{this.state.showBookmarkedItems ? 'Hide' : 'Show'} selected item(s)</button>
                                    <button className="dropdown-item" type="button" onClick={this.bookmark.bind(this)}>Bookmark selection</button>
                                    <button className="dropdown-item" type="button" onClick={this.clearSelectedItems.bind(this)}>Clear selection</button>
                                </div>
                            </div>

                    );
                    actions.push(selectedItems);
                    // using the localstorage items
                    selectedSearchHits = storedSelectedRows ? storedSelectedRows.map((result, index) => {
                        return (
                            <SearchHit
                                key={'saved__' + index}
                                result={result}
                                searchTerm={this.state.currentOutput.query.term} //for highlighting the search term
                                dateField={
                                    this.state.currentOutput.query.dateRange ?
                                        this.state.currentOutput.query.dateRange.field : null
                                } //for displaying the right date field in the hits
                                collectionConfig={this.state.collectionConfig}
                                itemDetailsPath={this.props.recipe.ingredients.itemDetailsPath}
                                isSelected={this.state.selectedRows[result._id] === true || false} //is the result selected
                                onOutput={this.onComponentOutput.bind(this)}/>
                        )
                    }, this) : null;
                    bookmarkingContainer = this.state.showBookmarkedItems ? (
                        <div className={IDUtil.cssClassName('table-actions-header bookmarked-results', this.CLASS_PREFIX)}>
                            <h4 className={IDUtil.cssClassName('header-selected-items', this.CLASS_PREFIX)}>Selected items
                                <i className="fa fa-remove" onClick={this.showBookmarkedItems.bind(this)}/>
                            </h4>
                            <div className={IDUtil.cssClassName('selected-items', this.CLASS_PREFIX)}>
                                {selectedSearchHits}
                            </div>
                        </div>
                    ) : false;
				}
                //always add the save query button
                actions.push(
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={this.saveQuery.bind(this)}
                        title="Save current query to project">
                        &nbsp;
                        <i className="fa fa-save" style={{color: 'white'}}/>
                        &nbsp;
                    </button>
                );

				actionButtons = (
					<div className={IDUtil.cssClassName('table-actions', this.CLASS_PREFIX)}>
						{actions}
					</div>
				);

                const detailResults = this.state.currentOutput.results.map( (result, index) => {
                    return this.state.collectionConfig.getItemDetailData(this.state.currentOutput.results[index],
                        this.state.initialQuery.dateRange && this.state.initialQuery.dateRange.dateField
                            ? this.state.initialQuery.dateRange.dateField : null);
                });

                ComponentUtil.storeJSONInLocalStorage('resultsDetailsData', detailResults);


				//populate the list of search results
				const items = !this.state.showBookmarkedItems ? this.state.currentOutput.results.map((result, index) => {
					return (

						<SearchHit
							key={'__' + index}
							result={result}
							searchTerm={this.state.currentOutput.query.term} //for highlighting the search term
							dateField={
								this.state.currentOutput.query.dateRange ?
									this.state.currentOutput.query.dateRange.field : null
							} //for displaying the right date field in the hits
							collectionConfig={this.state.collectionConfig}
							itemDetailsPath={this.props.recipe.ingredients.itemDetailsPath}
							isSelected={this.state.selectedRows[result._id] === true || false} //is the result selected
							onOutput={this.onComponentOutput.bind(this)}/>
					)
				}, this) : false;

                if (this.props.recipe.ingredients.aggregationView === 'box') {
                    resultList = (
                        <div className="row">
                            <div className="col-md-12">
                                <div className={IDUtil.cssClassName('table-actions-header', this.CLASS_PREFIX)}>
                                    {tableActionControls}
                                    {actionButtons}
                                    <div style={{textAlign: 'center'}}>
                                        {paging}
                                        <div style={{float: 'right'}}>
                                            {sortButtons}
                                        </div>
                                    </div>
                                </div>
                                {items}
                                <div className={IDUtil.cssClassName('table-actions-footer', this.CLASS_PREFIX)}>
                                    {paging}
                                </div>
                            </div>
                        </div>
                    )
                } else {
                    resultList = (
                        <div className="col-md-9 result-list">
                            <div className={IDUtil.cssClassName('table-actions-header', this.CLASS_PREFIX)}>
                                {tableActionControls}
                                {actionButtons}
                                <div style={{textAlign: 'center'}}>
                                    {paging}
                                    <div style={{float: 'right'}}>
                                        {sortButtons}
                                    </div>
                                </div>
                            </div>
                            {bookmarkingContainer}
                            {items}
                            <div className={IDUtil.cssClassName('table-actions-footer', this.CLASS_PREFIX)}>
                                {paging}
                            </div>
                        </div>
                    )
                }

			}
		}

		return (
			<div className={IDUtil.cssClassName('single-search-recipe')}>
				<div className="row">
					<div className="col-md-12">
						{chooseCollectionBtn}&nbsp;{chooseProjectBtn}
						{collectionModal}
						{projectModal}
						{queryModal}
						{bookmarkModal}
						{searchComponent}
                        {resultList}
					</div>
				</div>

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
