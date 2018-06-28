import QueryModel from './model/QueryModel';

import QueryFactory from './components/search/QueryFactory';

import SearchAPI from './api/SearchAPI';

import FlexBox from './components/FlexBox';
import SearchHit from './components/search/SearchHit';
import Paging from './components/search/Paging';
import Sorting from './components/search/Sorting';

import IDUtil from './util/IDUtil';
import ElasticsearchDataUtil from './util/ElasticsearchDataUtil';
import QueryComparisonLineChart from './components/stats/QueryComparisonLineChart';

import PropTypes from 'prop-types';

import { initHelp } from './components/workspace/helpers/helpDoc';

/*
Notes about this component:

- Top component receiving the URL parameters
- Generates search components based on the configured search recipe
- Passes the URL parameters to search components, who already have implemented the search history
	- Each search component (e.g. facet search, fragment search) implements its own way of persisting search history
- FIXME temporarily draws an 'Export' button that hooks up to the annotation export functionality of the recipe
	- This should be in the user space
- Holds the annotation box that can be triggered from underlying (search) components
- Holds the line chart that can be triggered from underlying components
*/

class ComparativeSearchRecipe extends React.Component {
	constructor(props) {
		super(props);
		let collections = null;
		if(this.props.params.cids) {
			collections = this.props.params.cids.split(',');
		} else if(this.props.recipe.ingredients.collections) {
			collections = this.props.recipe.ingredients.collections;
		}
		this.state = {
			lineChartData: {},
			collections : collections,
			pageSize : 10,
			combinedSearchResults : {}
		};
	}

	componentDidMount(){
		initHelp("Compare", "/feature-doc/tools/compartive-search");
	}

	//this function receives all output of components that generate output and orchestrates where
	//to pass it to based on the ingredients of the recipe
	//TODO change this, so it knows what to do based on the recipe
	onComponentOutput(componentClass, data) {
		if(componentClass == 'QueryFactory') {
			this.onSearched(data);
		}
	}

	onSearched(data) {
		if(!data) { //if there are no results
			alert('Your query did not yield any results');
		} else if(data.pagingOutOfBounds) { //due to ES limitations
			alert('The last page cannot be retrieved, please refine your search');
		} else {
			const csr = this.state.combinedSearchResults;
			const lineChartData = this.state.lineChartData;

			if(data.deleted === true && data.queryId) { //the query factory deleted a query
				delete csr[data.queryId];
				delete lineChartData[data.queryId];
			} else { //the data is the same stuff returned by a QueryBuilder
				const newData = ElasticsearchDataUtil.searchResultsToTimeLineData(
					data.query,
					data.aggregations
				);
				if(newData) {
					//TODO add more information about the query
					lineChartData[data.query.id] = {
						label : 'Query #',
					 	dateField : data.dateRange ? data.dateRange.field : null,
					 	prettyQuery : QueryModel.toHumanReadableString(data.query),
					 	data : newData,
					 	queryId : data.query.id,
						query : this.state.combinedSearchResults[data.query.id]
                            ? this.state.combinedSearchResults[data.query.id].query
                            : null,
						collectionConfig: this.state.combinedSearchResults[data.query.id] ? this.state.combinedSearchResults[data.query.id].collectionConfig : null
					}
				}
				csr[data.query.id] = data;
			}

			//finally set the state with the queries & line chart data
			this.setState({
				combinedSearchResults : csr,
				lineChartData : lineChartData,
				comparisonId : IDUtil.guid() //for updating the line chart
			});
		}
	}

	//TODO move this stuff to some utility that can transform query data in other formats suitable for other components
	//The timeline is drawn based on the configured date field facet
	prepareTimeline(queryId, queryOutput, dateField) {
		const timelineData = [];
		for (const key in queryOutput.aggregations) {
			if (key.indexOf(dateField) != -1) {
				const buckets = queryOutput.aggregations[key][dateField].buckets;
				buckets.forEach((bucket) => {
					const year = parseInt(bucket.key);
					if (!(isNaN(year))) {
						timelineData.push({"year": year, "count": bucket.doc_count, "query": queryId});
					}
				});
			}
		}
		return timelineData;
	}

	/* ------------------------------------------------------------------------------
	------------------------------- SEARCH RELATED FUNCTIONS --------------------
	------------------------------------------------------------------------------- */

	//TODO figure out how to call this without needing the QueryBuilder
	gotoPage(queryId, pageNumber) {
		if(this.state.combinedSearchResults[queryId]) {
			const query = this.state.combinedSearchResults[queryId].query;
			query.offset = (pageNumber-1) * this.state.pageSize;
			SearchAPI.search(
				query,
				this.state.combinedSearchResults[queryId].collectionConfig,
				this.onSearched.bind(this),
				false
			)
		}
	}

	sortResults(queryId, sortParams) {
		if(this.state.combinedSearchResults[queryId]) {
			const query = this.state.combinedSearchResults[queryId].query;
			query.offset = 0;
			query.sort = sortParams;
			SearchAPI.search(
				query,
				this.state.combinedSearchResults[queryId].collectionConfig,
				this.onSearched.bind(this),
				false
			)
		}
	}

	render() {
		let searchComponent = null;
		let lineChart = null;
		let aggregatedHits = null;

		//generates a tabbed pane with a search component for each collection + a collection browser
		searchComponent = (
			<QueryFactory
				clientId={this.props.clientId}
				user={this.props.user}
				pageSize={this.state.pageSize}
				initialCollections={this.state.collections}
				itemDetailsPath={this.props.recipe.ingredients.itemDetailsPath}
				aggregationView={this.props.recipe.ingredients.aggregationView}
				dateRangeSelector={this.props.recipe.ingredients.dateRangeSelector}
				onOutput={this.onComponentOutput.bind(this)}/>
		);

		//TODO only render when there is linechart data
		if(this.props.recipe.ingredients.output == 'lineChart') {
			if(Object.keys(this.state.lineChartData).length > 0) {
				lineChart = (
					<QueryComparisonLineChart
						data={this.state.lineChartData}
						comparisonId={this.state.comparisonId}/>
				);
			}
		}

		if(this.props.recipe.ingredients.showSearchResults) {
			//TODO put this in a Comerda Component (move the functions gotoPage and sortResults there too)
			aggregatedHits = Object.keys(this.state.combinedSearchResults).map((queryId, index) => {
				let paging = null;
				let sortButtons = null;

				const searchResults = this.state.combinedSearchResults[queryId];
				const collectionTitle = searchResults.collectionConfig.collectionInfo.title;

				//draw the search hits in here, so it's possible to put the linechart in between the search box and the results
				if(searchResults && searchResults.results && searchResults.results.length > 0) {
					//draw the paging buttons
					if(searchResults.currentPage > 0) {
						paging = <Paging
							queryId={queryId}
							currentPage={searchResults.currentPage}
							numPages={Math.ceil(searchResults.totalHits / this.state.pageSize)}
							gotoPage={this.gotoPage.bind(this)}/>
					}

					//draw the sorting buttons
					if(searchResults.query.sort) {
						sortButtons = <Sorting
							queryId={queryId}
							collectionConfig={searchResults.collectionConfig}
							sortResults={this.sortResults.bind(this)}
							sortParams={searchResults.query.sort}
							dateField={searchResults.query.dateRange ? searchResults.query.dateRange.field : null}/>
					}

					//draw the list of search results
					const items = searchResults.results.map((result, index) => {
						return (
							<SearchHit
								key={'__' + index}
								result={result}
								searchTerm={searchResults.query.term}
								collectionConfig={searchResults.collectionConfig}
								itemDetailsPath={this.props.recipe.ingredients.itemDetailsPath}/>
						)
					}, this);
					return (
						<FlexBox title={'Results for query #' + (index + 1) + ' ('+collectionTitle+')'}>
							<div className="row">
								<div className="col-md-12">
									{paging}&nbsp;{sortButtons}
									{items}
									{paging}
								</div>
							</div>
						</FlexBox>
					)
				}
			});
		}

		return (
			<div className={IDUtil.cssClassName('comparative-search-recipe')}>
				<div className="row">
					{searchComponent}
				</div>
				<div className="row">
					<div className="col-md-12">
						{lineChart}
					</div>
				</div>
				{aggregatedHits}
			</div>
		);
	}
}

ComparativeSearchRecipe.propTypes = {
	clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    })

};

export default ComparativeSearchRecipe;