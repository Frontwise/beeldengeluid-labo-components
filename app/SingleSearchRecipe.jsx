import QueryModel from './model/QueryModel';

import SearchAPI from './api/SearchAPI';
import AnnotationAPI from './api/AnnotationAPI';

import IDUtil from './util/IDUtil';
import ElasticsearchDataUtil from './util/ElasticsearchDataUtil';
import CollectionUtil from './util/CollectionUtil';
import ComponentUtil from './util/ComponentUtil';
import AnnotationUtil from './util/AnnotationUtil';

import FlexBox from './components/FlexBox';
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


class SingleSearchRecipe extends React.Component {
	constructor(props) {
		super(props);
		let collectionId = null;
		if(this.props.params.cids) {
			collectionId = this.props.params.cids.split(',')[0];
		} else {
			collectionId = this.props.recipe.ingredients.collection;
		}
		this.state = {
			showModal : false, //for the collection selector
			showProjectModal : false, //for the project selector
			showBookmarkModal : false, //for the bookmark group selector
			activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),
			awaitingProcess : null, //which process is awaiting the output of the project selector

			collectionId : collectionId,

			//influences the query
			pageSize : 20,

			//use for a lot TODO write proper reasons
			collectionConfig : null, //loaded after mounting, without it nothing works
			query : null,

			//for doing actions on the search results
			selectedRows : {},
			allRowsSelected : false
		};
		this.CLASS_PREFIX = 'rcp__ss'
	}

	componentDidMount() {
		if(this.state.collectionId) {
			CollectionUtil.generateCollectionConfig(
				this.props.user,
				this.state.collectionId,
				this.onLoadCollectionConfig.bind(this),
				true
			);
		}
		//make sure the search is done again when flipping back through the history
		//TODO fix this with nice routing/history stuff!
		window.onpopstate = function(event) {
  			document.location.href=document.location;
		};
	}

	//whenever the collectionConfig is changed (via URL or collection selector)
	onLoadCollectionConfig(config, fromUrl = true) {
		let query = null;
		if(fromUrl) {
			query = QueryModel.urlParamsToQuery(this.props.params, config)
		} else {
			query = QueryModel.ensureQuery({size : this.state.pageSize}, config);
		}
		this.setState(
			{
				collectionId : config.collectionId,
				collectionConfig : config,
				query : query,
				currentOutput : null,
			},
			fromUrl ? null : this.hideModalAndChangeHistory(config)
		);
	}

	hideModalAndChangeHistory(collectionConfig) {
		ComponentUtil.hideModal(this, 'showModal', 'collection__modal', true)
		const params = QueryModel.toUrlParams(
			QueryModel.ensureQuery({size : this.state.pageSize}, collectionConfig)
		)
		FlexRouter.setBrowserHistory(
			params, //will also be stored in the browser state (cannot exceed 640k chars)
			this.constructor.name //used as the title for the state
		)
	}

	//this function receives all output of components that generate output and orchestrates where
	//to pass it to based on the ingredients of the recipe
	//TODO change this, so it knows what to do based on the recipe
	onComponentOutput(componentClass, data) {
		if(componentClass == 'QueryBuilder') {
			this.onSearched(data);
		} else if(componentClass == 'CollectionSelector') {
			this.onLoadCollectionConfig(data, false);
		} else if(componentClass == 'SearchHit') {
			if(data) {
				const selectedRows = this.state.selectedRows;
				if(data.selected) {
					selectedRows[data.resourceId] = true;
				} else {
					delete selectedRows[data.resourceId]
				}
				this.setState({
					selectedRows : selectedRows,
					allRowsSelected : data.selected ? this.state.allRowsSelected : false
				})
			}
		} else if(componentClass == 'ProjectSelector') {
			this.setState(
				{activeProject : data},
				() => {
					this.onProjectChanged.call(this, data)
				}
			);
		} else if(componentClass == 'BookmarkSelector') {
			this.bookmarkToGroupInProject(data);
		} else if(componentClass == 'QueryEditor') {
			this.onQuerySaved(data)
		}
	}

	//this is updated via the query builder, but it does not update the state.query...
	//TODO figure out if it's bad to update the state
	onSearched(data) {
		this.setState({
			currentOutput: data,
			allRowsSelected : false,
			selectedRows : {}
		});
		if(data && data.query && data.updateUrl) {
			const params = QueryModel.toUrlParams(data.query);
			FlexRouter.setBrowserHistory(
				params, //will also be stored in the browser state (cannot exceed 640k chars)
				this.constructor.name //used as the title for the state
			)
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
			SearchAPI.search(sr.query, sr.collectionConfig, this.onSearched.bind(this), true)
		}
	}

	//the sortMode is translated to sort params inside the QueryBuilder component
	//sortMode = {type : date/rel, order : desc/asc}
	sortResults(queryId, sortParams) {
		if(this.state.currentOutput) {
			const sr = this.state.currentOutput;
			sr.query.sort = sortParams;
			sr.query.offset = 0;
			SearchAPI.search(sr.query, sr.collectionConfig, this.onSearched.bind(this), true)
		}
	}

	/* ------------------------------------------------------------------------------
	------------------------------- TABLE ACTION FUNCTIONS --------------------
	------------------------------------------------------------------------------- */

	toggleRows() {
		let rows = this.state.selectedRows;
		if(this.state.allRowsSelected) {
			rows = {};
		} else {
			this.state.currentOutput.results.forEach((result) => {
				rows[result._id] = !this.state.allRowsSelected;
			});
		}
		this.setState({
			allRowsSelected : !this.state.allRowsSelected,
			selectedRows : rows
		});
	}

	onProjectChanged(project) {
		ComponentUtil.storeJSONInLocalStorage('activeProject', project)
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
			//concatenate the
			let targets = annotation.target.concat(this.state.currentOutput.results
				.filter((result) => this.state.selectedRows[result._id]) //only include selected resources
				.map((result) => AnnotationUtil.generateSimpleResourceTarget(
					result._id, this.state.collectionConfig.collectionId
				), this))

			let temp = {};
			let dedupedTargets = [];
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
			alert('Bookmarks were saved successfully')
		})
	}

	saveQuery() {
		if(this.state.activeProject == null) {
			this.setState({
				showProjectModal : true,
				awaitingProcess : 'saveQuery'
			});
		} else {
			this.showQueryModal();
		}
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
		let chooseProjectBtn = null; // for changing the active project
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
			)

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
								onOutput={this.onComponentOutput.bind(this)}
								showSelect={true}
								showBrowser={true}/>
					</FlexModal>
				)
			}
		}

		chooseProjectBtn = (
			<button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showProjectModal')}>
				Set project ({this.state.activeProject ? this.state.activeProject.name : 'none selected'})
			</button>
		)

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
		if(this.state.collectionId && this.state.collectionConfig && this.state.query) {

			//this components outputs: search results, aggregations & sorting & paging functions!
			searchComponent = (
				<QueryBuilder
					key={this.state.collectionId} //for resetting all the states held within after selecting a new collection

					//UI options not relevant for querying
					header={true}
					aggregationView={this.props.recipe.ingredients.aggregationView}
					dateRangeSelector={this.props.recipe.ingredients.dateRangeSelector}
					showTimeLine={true}

					query={this.state.query}
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
						<label for={'cb__select-all'}><span></span></label>
					</div>
				)

				//draw the action buttons
				const actions = [];

				//always add the save query button
				actions.push(
					<button
						type="button"
						className="btn btn-primary"
						onClick={this.saveQuery.bind(this)}
						title="Save current query to project">
						&nbsp;
						<i className="fa fa-save" style={{color: 'white'}}></i>
						&nbsp;
					</button>
				);
				if(Object.keys(this.state.selectedRows).length > 0) {
					actions.push(
						<button
							type="button"
							className="btn btn-primary"
							onClick={this.bookmark.bind(this)}
							title="Bookmark selection to project">
							&nbsp;
							<i className="fa fa-star" style={{color: 'white'}}></i>
							&nbsp;
						</button>
					);
				}
				actionButtons = (
					<div className={IDUtil.cssClassName('table-actions', this.CLASS_PREFIX)}>
						{actions}
					</div>
				)

				//populate the list of search results
				const items = this.state.currentOutput.results.map((result, index) => {
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
							isSelected={this.state.selectedRows[result._id]} //is the result selected
							onOutput={this.onComponentOutput.bind(this)}/>
					)
				}, this);
				resultList = (
					<div className="row">
						<div className="col-md-12">
							<div className={IDUtil.cssClassName('table-actions-header', this.CLASS_PREFIX)}>
								{tableActionControls}
								{actionButtons}
								<div style={{textAlign : 'center'}}>
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
					</div>
				</div>
				{resultList}
			</div>
		);
	}
}

export default SingleSearchRecipe;