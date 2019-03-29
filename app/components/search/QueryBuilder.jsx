//data model for the query
import QueryModel from '../../model/QueryModel';

//search api
import SearchAPI from '../../api/SearchAPI';

//data utilities
import CollectionUtil from '../../util/CollectionUtil';
import ComponentUtil from '../../util/ComponentUtil';
import IDUtil from '../../util/IDUtil';
import TimeUtil from '../../util/TimeUtil';

//ui controls for assembling queries
import FieldCategorySelector from './FieldCategorySelector';
import DateFieldSelector from './DateFieldSelector';
import DateRangeSelector from './DateRangeSelector';
import AggregationList from './AggregationList';

//visualisations
import Histogram from '../stats/Histogram';
import QuerySingleLineChart from '../stats/QuerySingleLineChart';

//simple visual component
import ReadMoreLink from '../helpers/ReadMoreLink';
import MessageHelper from '../helpers/MessageHelper';

//third party
import ReactTooltip from 'react-tooltip';
import moment from 'moment';
import PropTypes from 'prop-types';
import classNames from 'classnames';

class QueryBuilder extends React.Component {

	//should have an initial query in the props, then only updates it in the state
	constructor(props) {
		super(props);



		this.state = {
			//UI option/toggles
			displayFacets : this.props.collectionConfig.facets ? true : false,
			showTimeLine: localStorage.getItem("qb-show-timeline") !== undefined ? (localStorage.getItem("qb-show-timeline") === "true" ? true : false) : this.props.showTimeLine,
			graphType : null,
			isSearching : false,
			query : this.props.query, //this is only set by the owner after choosing a collection or loading the page
			//query OUTPUT
            aggregations : {}

        };
        this.CLASS_PREFIX = 'qb';
		this.searchTermRef = React.createRef();
	}

	/*---------------------------------- COMPONENT INIT --------------------------------------*/

	//TODO also provide an option to directly pass a config, this is pretty annoying with respect to reusability
	componentDidMount() {
		//do an initial search in case there are search params in the URL
        if(this.props.query) {
            this.searchTermRef.current.value = this.props.query.term || null;
			//never search with an empty search term on init (FIXME not always desirable)
			if(this.props.query.term && this.props.query.term.trim() !== '') {
				this.doSearch(this.props.query);
			}
		}
	}

    switchGraphType(typeOfGraph) {
        this.setState({
                graphType : typeOfGraph
            }
        )
    }

	/*---------------------------------- SEARCH --------------------------------------*/

	blockSearch(e) {
		e.preventDefault();
	}

	doSearch(query, updateUrl = false) {
		if(this.props.onStartSearch && typeof(this.props.onStartSearch) === 'function') {
     	   this.props.onStartSearch();
    	}
		this.setState(
			{isSearching : true},
			() => {
				SearchAPI.search(
					query,
					this.props.collectionConfig,
					this.onOutput.bind(this),
					updateUrl
				)
			}
		)
	}

	searchFormKeyPressed(target) {
		if(target.charCode===13) {
			this.newSearch();
		}
	}

	newSearch() {
		const q = this.state.query;

		//reset certain query properties
		if(this.state.totalHits <= 0) {
			q.dateRange = null; // only reset when there are no results
		}
		q.selectedFacets = {}; //always reset the facets
		q.offset = 0;
		q.term = this.getCurrentSearchTerm(); // make sure the term is always a string, otherwise 0 results by default

        this.doSearch(q, true);
	}

	clearSearch = () => {
		this.onOutput(null);
	}

	//this resets the paging
	toggleSearchLayer(e) {
		const q = this.state.query;
		const searchLayers = this.state.query.searchLayers;
		searchLayers[e.target.id] = !searchLayers[e.target.id];

		//reset certain query properties
		q.searchLayers = searchLayers;
		q.offset = 0;
		q.term = this.getCurrentSearchTerm();

		this.doSearch(q, true);
	}

	/*---------------------------------- FUNCTION THAT RECEIVES DATA FROM CHILD COMPONENTS --------------------------------------*/

	onComponentOutput(componentClass, data) {
		if(componentClass === 'AggregationList') {
			const q = this.state.query;

			//reset the following query params
			q.desiredFacets = data.desiredFacets;
			q.selectedFacets = data.selectedFacets;
			q.offset = 0;
			q.term = this.getCurrentSearchTerm();
			this.doSearch(q, true);
		} else if(componentClass === 'DateRangeSelector') {

			const q = this.state.query;

			//reset the following params
			q.dateRange = Object.assign(data, {field: q.dateRange ? q.dateRange.field : null });
			q.offset = 0;
			q.term = this.getCurrentSearchTerm();

			this.doSearch(q, true)
		} else if(componentClass === 'DateFieldSelector') {
			//first delete the old selection from the desired facets
			const df = this.state.query.desiredFacets;
			let index = -1;
			for(let i=0;i<df.length;i++) {
				if(df[i].type === 'date_histogram') {
					index = i;
					break;
				}
			}
			if(index !== -1) {
				df.splice(index,1);
			}

			//add the new selection
			if(data !== null) {
				//add the desired date aggregation (of the type date_histogram)
				df.push({
					field: data.field,
					title : this.props.collectionConfig.toPrettyFieldName(data.field),
					id : data.field,
					type : 'date_histogram'
				});
			}

			const q = this.state.query;

			//reset the following params

			q.dateRange = data;
			q.desiredFacets = df;
			q.offset = 0;
			q.term = this.getCurrentSearchTerm();

			this.doSearch(q, true);
		} else if(componentClass === 'FieldCategorySelector') {
			const q = this.state.query;
			q.fieldCategory = data;
			q.offset = 0;
			q.term = this.getCurrentSearchTerm();

			this.doSearch(q, true)
		}
	}

	/*---------------------------------- FUNCTIONS THAT COMMUNICATE TO THE PARENT --------------------------------------*/

	//this function is piped back to the owner via onOutput()
	gotoPage(pageNumber) {
		const q = this.state.query;
		q.offset = (pageNumber-1) * this.props.pageSize;
		q.term = this.getCurrentSearchTerm();

		this.doSearch(q, true);
	}

	//this function is piped back to the owner via onOutput()
	sortResults(sortParams) {
		const q = this.state.query;
		q.sort = sortParams;
		q.offset = 0;
		q.term = this.getCurrentSearchTerm();

		this.doSearch(q, true);
	}

	resetDateRange() {
		const q = this.state.query;
		q.dateRange = null;
		q.offset = 0;
		q.term = this.getCurrentSearchTerm();

		this.doSearch(q, true);
	}

	toggleTimeLine = () => {
		localStorage.setItem("qb-show-timeline",!this.state.showTimeLine ? "true" : "false");
    	this.setState({showTimeLine:!this.state.showTimeLine});
    }

	/* ----------------------------------------- DATA FUNCTIONS FOR THE RENDER ------------------------------ */

	//FIXME not a pure function
    calcTotalDatesOutsideOfRange = (currentDateAggregation, dateRange) => {
    	if(!currentDateAggregation || dateRange) return 0;

		const startMillis = dateRange.start;
		const endMillis = dateRange.end;
		const datesOutsideOfRange = currentDateAggregation.filter(x => {
			if(startMillis != null && x.date_millis < startMillis) {
				return true;
			}
			return endMillis !== null && x.date_millis > endMillis;

		});

		if(datesOutsideOfRange.length > 0) {
            return datesOutsideOfRange.map((x => x.doc_count)).reduce(function(accumulator, currentValue) {
    			return accumulator + currentValue;
			});
        }

        return 0;
    }

    calcDateCounts = dateAggregation => {
    	if(!dateAggregation || dateAggregation.length === 0) {
			return -1;
		}
		return dateAggregation.map(
			(x => x.doc_count)).reduce(function(accumulator, currentValue) {
				return accumulator + currentValue;
			}
		);
    };

    getCurrentDateAggregation = (aggregations, dateRange) => {
    	if(dateRange && dateRange.field !== 'null_option' && aggregations[dateRange.field] !== undefined) {
    		return aggregations[dateRange.field];
    	}
    	return null;
    };

	getCurrentSearchTerm = () => {
    	return this.searchTermRef && this.searchTermRef.current ? this.searchTermRef.current.value : '';
    };

     /* ----------------------------------------- COMPONENT OUTPUT FUNCTION ------------------------------ */

    //communicates all that is required for a parent component to draw hits & statistics
    onOutput(data) {
        //this propagates the query output back to the recipe, who will delegate it further to any configured visualisation
        if (this.props.onOutput) {
            this.props.onOutput(this.constructor.name, data);
        }
        if (data && !data.error) {
            this.setState(
            	{
	            	//so involved components know that a new search was done
	            	searchId: data.searchId,
                    graphType : 'histogram',  // on new search resets graph to histogram.
	            	//refresh params of the query object
	            	query : data.query,

	                //actual OUTPUT of the query
	                aggregations: this.filterWeirdDates(data.aggregations, data.query.dateRange),
	                totalHits: data.totalHits, //shown in the stats
	                totalUniqueHits: data.totalUniqueHits //shown in the stats
            	},
            	() => {
            		this.setState({isSearching: false});
            	}
            );
        } else {
        	//Note: searchLayers & desiredFacets & selectedSortParams stay the same
        	const q = this.state.query;
        	//q.dateRange = null;
        	q.selectedFacets = {};
        	//q.fieldCategory = null;

            this.setState(
            	{
            		searchId: null,
	            	query : q,

	                //query OUTPUT is all empty
					aggregations: null,
	                totalHits: 0,
	                totalUniqueHits: 0
            	},
            	() => {
            		this.setState({isSearching: false});
            	}
            );
        }

        if(data && data.error === 'access denied') {
        	alert('The system is not allowed to search through this collection');
        }
    }

    filterWeirdDates = (aggregations, dateRange) => {
    	if(dateRange && aggregations) {
	    	const buckets = aggregations[dateRange.field];
	        if(buckets && buckets.length > 0) {
	            const desiredMinYear = this.props.collectionConfig.getMinimunYear();
	            const desiredMaxYear = this.props.collectionConfig.getMaximumYear();

                let maxDate = null;
                if(desiredMaxYear !== -1) {
                	maxDate = moment().set({'year': desiredMaxYear, 'month': 0, 'date': 1})
                } else {
                	maxDate = moment()
                }

                let i = buckets.findIndex(d => {
                	return desiredMinYear === moment(d.date_millis, 'x').year()
                });
                i = i === -1 ? 0 : i;

                let j = buckets.findIndex(d => {
                	return maxDate.isBefore(moment(d.date_millis, 'x'))
                });
				j = j === -1 ? buckets.length -1 : j;

                if(!(i === 0 && j === (buckets.length -1))) {
                	aggregations[dateRange.field] = aggregations[dateRange.field].splice(i, j - i);
                }
	        }
	    }
	    return aggregations;
    };

    /* ----------------------------------------- RENDER FUNCTIONS ------------------------------ */

    renderNoResultsMessage = (aggregations, query, onClearSearch) => {
    	if(aggregations && query) {
    // 		const currentDateAggregation = this.getCurrentDateAggregation(aggregations, query.dateRange);
    // 		if(!currentDateAggregation) {
				return (
					<div className={classNames("alert alert-danger",IDUtil.cssClassName('no-results-message', this.CLASS_PREFIX))}>
						{MessageHelper.renderNoSearchResultsMessage(query, onClearSearch)}
					</div>
				)
			// }
    	}
    	return null;
    };

    renderQueryResultHits = totalHits => {
    	return (
    		<span className={IDUtil.cssClassName('total-count', this.CLASS_PREFIX)} title="Total number of results based on keyword and selected filters">
				Results
				<span className={IDUtil.cssClassName('count', this.CLASS_PREFIX)}>
					{ComponentUtil.formatNumber(totalHits)}
				</span>
			</span>
		);
    };

    renderFieldCategorySelector = (query, collectionConfig, onOutput) => {
    	return (
			<FieldCategorySelector
				queryId={query.id}
				fieldCategory={query.fieldCategory}
				collectionConfig={collectionConfig}
				onOutput={onOutput}
			/>
		);
    };

    renderDateFieldSelector = (searchId, query, aggregations, collectionConfig, onOutput) => {
    	if(collectionConfig.getDateFields() == null) return null;

    	return (
            <DateFieldSelector
            	searchId={searchId} //for determining when the component should rerender
            	queryId={query.id} //used for the guid (is it still needed?)
                dateRange={query.dateRange} //for activating the selected date field
                aggregations={aggregations} //to fetch the date aggregations
                collectionConfig={collectionConfig} //for determining available date fields & aggregations
                onOutput={onOutput} //for communicating output to the  parent component
            />
        );
    };

    renderDateRangeSelector = (searchId, query, aggregations, collectionConfig, onOutput) => {
    	if(collectionConfig.getDateFields() == null) return null;

    	return (
            <DateRangeSelector
            	searchId={searchId} //for determining when the component should rerender
            	queryId={query.id} //used for the guid (is it still needed?)
                dateRange={query.dateRange} //for activating the selected date field
                aggregations={aggregations} //to fetch the date aggregations
                collectionConfig={collectionConfig} //for determining available date fields & aggregations
                onOutput={onOutput} //for communicating output to the  parent component
            />
        );
    };

    renderAggregationList = (searchId, query, aggregations, collectionConfig, onComponentOutput) => {
		return (
			<div className="col-md-3 aggregation-list">
                <AggregationList
					searchId={searchId} //for determining when the component should rerender
					queryId={query.id} //TODO implement in the list component
					aggregations={aggregations} //part of the search results
	                desiredFacets={query.desiredFacets}
					selectedFacets={query.selectedFacets}
	                collectionConfig={collectionConfig} //for the aggregation creator only
					onOutput={onComponentOutput} //for communicating output to the  parent component
				/>
            </div>
        )
    };

    //FIXME for motu & arttube this is needed. Now it is deactivated though!
    //renders the checkboxes for selecting layers
    renderSearchLayerOptions = () => {
		if(this.state.query.searchLayers && 1===2) { //DEACTIVATED
			const layers = Object.keys(this.state.query.searchLayers).map((layer, index) => {
				return (
					<label key={'layer__' + index} className="checkbox-inline">
						<input id={layer} type="checkbox" checked={this.state.query.searchLayers[layer] === true}
							onChange={this.toggleSearchLayer.bind(this)}/>
							{CollectionUtil.getSearchLayerName(this.props.collectionConfig.getSearchIndex(), layer)}
					</label>
				)
			});
			if(layers) {
				return (
			 		<div className={IDUtil.cssClassName('search-layers', this.CLASS_PREFIX)}>
			 			{layers}
			 		</div>
			 	)
			}
		}
		return null;
    };

    renderTimeLine = (dateAggregation, graphType, searchId, query, collectionConfig) => {
    	if(!dateAggregation) {
    		return null;
    	} else if (dateAggregation.length === 0) {
		    return MessageHelper.renderNoDocumentsWithDateFieldMessage();
    	}
        if (graphType === 'lineChart') {
            return (
                <div className={IDUtil.cssClassName('graph', this.CLASS_PREFIX)}>
                    <button
                    	onClick={this.switchGraphType.bind(this, 'histogram')}
                    	type="button"
                    	className="btn btn-primary btn-xs">
                    	Histogram
                    </button>
                    <QuerySingleLineChart
                    	query={query}
                        data={dateAggregation}
						searchId={searchId}
						collectionConfig={collectionConfig}
					/>
                </div>
            );
        } else {
            return (
                <div className={IDUtil.cssClassName('graph', this.CLASS_PREFIX)}>
                    <button
                    	onClick={this.switchGraphType.bind(this, 'lineChart')}
                    	type="button"
                    	className="btn btn-primary btn-xs">
                    	Line chart
                    </button>
                    <Histogram
                        query={query}
                        data={dateAggregation}
                        searchId={searchId}
                        collectionConfig={collectionConfig}
                        title={collectionConfig.toPrettyFieldName(query.dateRange.field)}
                    />
                </div>
            );
        }
    };

    renderDateRangeCrumb = (query, onResetDateRange) => {
    	let info = '';
    	const tmp = [];
        if(query.dateRange.start) {
        	tmp.push(TimeUtil.UNIXTimeToPrettyDate(query.dateRange.start));
        } else {
        	tmp.push('everything before');
        }
        if(query.dateRange.end) {
        	tmp.push(TimeUtil.UNIXTimeToPrettyDate(query.dateRange.end));
        } else {
        	tmp.push('up until now');
        }
        if(tmp.length > 0) {
        	info = tmp.join(tmp.length === 2 ? ' till ' : '');
        	info += ' (using: '+query.dateRange.field+')';
        }
    	return (
    		<div className={IDUtil.cssClassName('breadcrumbs', this.CLASS_PREFIX)}>
				<div key="date_crumb" className={IDUtil.cssClassName('crumb', this.CLASS_PREFIX)}
					title="Clear current date range">
					<em>Selected date range:&nbsp;</em>
					{info}
					&nbsp;
					<i className="fa fa-close" onClick={onResetDateRange}/>
				</div>
			</div>
    	);
    };

    renderDateTotalStats = (dateCounts, query) => {
    	let info = 'Please note that each record possibly can have multiple occurrences of the selected date field,';
    	info += '<br/>making it possible that there are more dates found than the number of search results';

    	return (
    		<div>
        		<span title="Total number of dates found based on selected date field" className={IDUtil.cssClassName('date-count', this.CLASS_PREFIX)}>
        			{ComponentUtil.formatNumber(dateCounts)}
        		</span>
    			&nbsp;
    			<span data-for={'__qb__tt' + query.id}
    				data-tip={info}
    				data-html={true}>
					<i className="fa fa-info-circle"/>
				</span>
				<ReactTooltip id={'__qb__tt' + query.id}/>
			</div>
		);
    };

    renderDateRangeStats = (dateCounts, outOfRangeCount) => {
    	return (
    		<div className={IDUtil.cssClassName('date-range-stats', this.CLASS_PREFIX)}>
    			<span>
    				Inside range:
    				<span className={IDUtil.cssClassName('date-count', this.CLASS_PREFIX)}
    				      title="Number of dates found inside selected date range">
    					{ComponentUtil.formatNumber(dateCounts - outOfRangeCount)}
    				</span>
    			</span>
    			<span>
    				Outside range:
    				<span className={IDUtil.cssClassName('date-count', this.CLASS_PREFIX)}
    				      title="Number of dates found outside selected date range">
    					{ComponentUtil.formatNumber(outOfRangeCount)}
					</span>
				</span>
    		</div>
    	);
    };

    renderDateControls = (aggregations, query, collectionConfig, searchId, totalHits, showTimeLine, graphType, onOutput) => {
    	if(searchId == null || (!query.dateRange && totalHits === 0)) return null; //date range & results are mandatory

    	const currentDateAggregation = this.getCurrentDateAggregation(aggregations, query.dateRange);

		const dateFieldSelector = this.renderDateFieldSelector(searchId, query, aggregations, collectionConfig, onOutput);
		const dateRangeSelector = this.renderDateRangeSelector(searchId, query,	aggregations, collectionConfig,	onOutput);


		let dateRangeCrumb = null;
		let outOfRangeCount = 0;
		const dateCounts = this.calcDateCounts(currentDateAggregation);

		if(query.dateRange && (query.dateRange.start || query.dateRange.end)) {
			outOfRangeCount = this.calcTotalDatesOutsideOfRange(currentDateAggregation, query.dateRange);
        	dateRangeCrumb = this.renderDateRangeCrumb(query, this.resetDateRange.bind(this)); //TODO pass param
        }

        //render date stats
		const dateTotalStats = dateCounts !== -1 ? this.renderDateTotalStats(dateCounts, query) : null;
		const dateRangeStats = dateCounts !== -1 ? this.renderDateRangeStats(dateCounts, outOfRangeCount) : null;

		const graph = showTimeLine ? this.renderTimeLine(currentDateAggregation, graphType,	searchId, query, collectionConfig) : null;

    	return (
        	<div className={IDUtil.cssClassName('result-dates', this.CLASS_PREFIX)}>
        		<div className={IDUtil.cssClassName('result-dates-header', this.CLASS_PREFIX)}>

                	<div className={IDUtil.cssClassName('date-field', this.CLASS_PREFIX)}>
                		<i className="fa fa-calendar" aria-hidden="true" />
                		{dateFieldSelector}{dateTotalStats && " ► "}
                		{dateTotalStats}
                	</div>

                	{(query.dateRange && query.dateRange.field) &&
                    	(<div className={IDUtil.cssClassName('date-range', this.CLASS_PREFIX)}>
                			Date range
                			{dateRangeSelector}
                			{dateRangeStats && " ► "}
                			{dateRangeStats}
                		</div>)
                    }

                	{/* Show chart button */}
            		{(query.dateRange && query.dateRange.field) &&
            			<button className="btn" onClick={this.toggleTimeLine}>
            				{showTimeLine ? "Hide chart" : "Show chart"}
        				</button>
            		}
                </div>

	            {(showTimeLine && query.dateRange && query.dateRange.field) &&
	            	<div className={IDUtil.cssClassName('result-dates-content', this.CLASS_PREFIX)}>
	            		<div className={IDUtil.cssClassName('date-graph', this.CLASS_PREFIX)}>
	                		{graph}
	                	</div>
	                	{dateRangeCrumb}
	            	</div>
	        	}
			</div>
		)
    }

    render() {
        if (this.props.collectionConfig && this.state.query) {
        	const layerOptions = this.renderSearchLayerOptions(); //FIXME always returns null (keeping it for other clients to fix later on)

            const searchIcon = this.state.isSearching ? (<span className="glyphicon glyphicon-refresh glyphicon-refresh-animate"/>) : (<i className="fa fa-search"/>);

			//draw the field category selector
			const fieldCategorySelector = this.renderFieldCategorySelector(
				this.state.query,
				this.props.collectionConfig,
				this.onComponentOutput.bind(this)
			);

			const dateControls = this.props.dateRangeSelector ? this.renderDateControls(
				this.state.aggregations,
				this.state.query,
				this.props.collectionConfig,
				this.state.searchId,
				this.state.totalHits,
				this.state.showTimeLine,
				this.state.graphType,
				this.onComponentOutput.bind(this)
			) : null;

            const queryResultCount = this.state.totalHits === 0 || this.state.totalHits ? this.renderQueryResultHits(this.state.totalHits) : null;

			const aggregationBox = this.state.aggregations && this.state.searchId ? this.renderAggregationList(
				this.state.searchId,
				this.state.query,
				this.state.aggregations,
				this.props.collectionConfig,
				this.onComponentOutput.bind(this)
			) : null;

            const noResultsMessage = this.state.isSearching === false && this.state.searchId != null && this.state.totalHits === 0 ? this.renderNoResultsMessage(
        		this.state.aggregations,
        		this.state.query,
        		this.clearSearch
        	) : null;

			return (
				<div className={IDUtil.cssClassName('query-builder')}>
					<form onSubmit={this.blockSearch.bind(this)}>
						<div className={IDUtil.cssClassName('query-row', this.CLASS_PREFIX)}>

							{/* Search keywords input */}
							<div className={IDUtil.cssClassName('search-holder', this.CLASS_PREFIX)}>
								<input
									type="text"
									id="search_term"
									className={classNames("form-control input-search", IDUtil.cssClassName('input-search', this.CLASS_PREFIX))}
									placeholder='Search'
									onKeyPress={this.searchFormKeyPressed.bind(this)}
									ref={this.searchTermRef}
								/>
								<span onClick={this.newSearch.bind(this)}>
									{searchIcon}
								</span>
							</div>

							{/* Metadata field selector */}
							<div className={IDUtil.cssClassName('selector-holder', this.CLASS_PREFIX)}>
								<div className={IDUtil.cssClassName('in-label', this.CLASS_PREFIX)}>in</div>
								{fieldCategorySelector}
							</div>
						</div>
					</form>
					{layerOptions}
					<div>
	                	{dateControls}
	                    <div className="separator"/>
	                    {queryResultCount}
	                    {aggregationBox}
	                    {noResultsMessage}
	                </div>
				</div>
			)
		} else {
			return (<div>Loading collection configuration...</div>);
		}
	}
}

QueryBuilder.propTypes = {
	header: PropTypes.bool, //whether to show a header with a title
	aggregationView: PropTypes.string, //always set to 'list' (used to support 'box' as well)
	dateRangeSelector: PropTypes.bool, //wheter or not to show a date range selector
	showTimeLine: PropTypes.bool, //whether or not to show the timeline component
    query: PropTypes.object.isRequired, //the initual query that is run when this component has mounted
    collectionConfig: PropTypes.object.isRequired, //needed for each search query
    onOutput: PropTypes.func, //calls this function after the search results are received, so the owner can process/visualise them
    onStartSearch : PropTypes.func //calls this function whenever a search call starts, so the owner can draw a loading graphic
};

export default QueryBuilder;
