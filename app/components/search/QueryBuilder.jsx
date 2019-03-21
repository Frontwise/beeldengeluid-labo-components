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
			graphType : null,
			isSearching : false,
			query : this.props.query, //this is only set by the owner after choosing a collection or loading the page
			//query OUTPUT
            aggregations : {}

        };
        this.CLASS_PREFIX = 'qb';
		this.setSearchTerm = this.props.query.term || null;
	}

	/*---------------------------------- COMPONENT INIT --------------------------------------*/

	//TODO also provide an option to directly pass a config, this is pretty annoying with respect to reusability
	componentDidMount() {
		//do an initial search in case there are search params in the URL
        if(this.props.query) {
            this.setSearchTerm = this.props.query.term;
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
		q.term = this.setSearchTerm.value || ''; // make sure the term is always a string, otherwise 0 results by default

        this.doSearch(q, true);
	}

	clearSearch() {
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
		q.term = this.setSearchTerm.value || '';

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
			q.term = this.setSearchTerm.value || '';
			this.doSearch(q, true);
		} else if(componentClass === 'DateRangeSelector') {
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
			q.term = this.setSearchTerm.value || '';

			this.doSearch(q, true)
		} else if(componentClass === 'FieldCategorySelector') {
			const q = this.state.query;
			q.fieldCategory = data;
			q.offset = 0;
			q.term = this.setSearchTerm.value || '';

			this.doSearch(q, true)
		}
	}

	/*---------------------------------- FUNCTIONS THAT COMMUNICATE TO THE PARENT --------------------------------------*/

	//this function is piped back to the owner via onOutput()
	gotoPage(pageNumber) {
		const q = this.state.query;
		q.offset = (pageNumber-1) * this.props.pageSize;
		q.term = this.setSearchTerm.value || '';

		this.doSearch(q, true);
	}

	//this function is piped back to the owner via onOutput()
	sortResults(sortParams) {
		const q = this.state.query;
		q.sort = sortParams;
		q.offset = 0;
		q.term = this.setSearchTerm.value || '';

		this.doSearch(q, true);
	}

	resetDateRange() {
		const q = this.state.query;
		q.dateRange = null;
		q.offset = 0;
		q.term = this.setSearchTerm.value || '';

		this.doSearch(q, true);
	}

    totalDatesOutsideOfRange() {
    	if(this.state.aggregations && this.state.query.dateRange &&
    		this.state.aggregations[this.state.query.dateRange.field]) {
    		const startMillis = this.state.query.dateRange.start;
    		const endMillis = this.state.query.dateRange.end;
    		return this.state.aggregations[this.state.query.dateRange.field].filter(x => {
    			if(startMillis != null && x.date_millis < startMillis) {
    				return true;
    			}
    			return endMillis !== null && x.date_millis > endMillis;

    		});
    	}
    	return null;
    }

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

    filterWeirdDates(aggregations, dateRange) {
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
	    return aggregations
    }

    showHelp = () => {
    	var event = new Event('BG__SHOW_HELP');
    	window.dispatchEvent(event);
    }

    render() {
        if (this.props.collectionConfig && this.state.query) {
            let searchIcon = null;
            let layerOptions = null;
            let resultBlock = null;
            let ckanLink = null;

			//draw the field category selector
			const fieldCategorySelector = (
				<FieldCategorySelector
					queryId={this.state.query.id}
					fieldCategory={this.state.query.fieldCategory}
					collectionConfig={this.props.collectionConfig}
					onOutput={this.onComponentOutput.bind(this)}
				/>
			);

			//draw the checkboxes for selecting layers
			if(this.state.query.searchLayers && 1===2) {
				const layers = Object.keys(this.state.query.searchLayers).map((layer, index) => {
					return (
						<label key={'layer__' + index} className="checkbox-inline">
							<input id={layer} type="checkbox" checked={this.state.query.searchLayers[layer] === true}
								onChange={this.toggleSearchLayer.bind(this)}/>
								{CollectionUtil.getSearchLayerName(this.props.collectionConfig.getSearchIndex(), layer)}
						</label>
					)
				});
				// Hide collection metadata tickbox from current search interface.
				//https://github.com/CLARIAH/wp5_mediasuite/issues/130
				// it could be enabled once we have more options to provide.
				if(layers) {
					layerOptions = (
				 		<div className={IDUtil.cssClassName('search-layers', this.CLASS_PREFIX)}>
				 			{layers}
				 		</div>
				 	)
				}
			}

		    //let countsBasedOnDateRange = null;
            const currentSearchTerm = (this.setSearchTerm && this.setSearchTerm.value !== '') ? this.setSearchTerm.value : this.props.query.term;

			//only draw this when there are search results
			if(this.state.totalHits > 0) {
				let dateStats = null;
				let graph = null;
				let aggrView = null; //either a box or list (TODO the list might not work properly anymore!)
				let aggregationBox = null;
				let dateRangeSelector = null;
				let dateRangeCrumb = null;

				let dateCounts = null;
				let outOfRangeCount = 0;

				//populate the aggregation/facet selection area/box
				if(this.state.aggregations) {
					aggrView = (
						<AggregationList
							searchId={this.state.searchId} //for determining when the component should rerender
							queryId={this.state.query.id} //TODO implement in the list component
							aggregations={this.state.aggregations} //part of the search results
                            desiredFacets={this.state.query.desiredFacets}
							selectedFacets={this.state.query.selectedFacets}
                            collectionConfig={this.props.collectionConfig} //for the aggregation creator only
							onOutput={this.onComponentOutput.bind(this)} //for communicating output to the  parent component
						/>
					)

					aggregationBox = (
						<div className="col-md-3 aggregation-list">
                            {aggrView}
                        </div>
                    )

					// Display the graph only if an option other than the default is selected
					// and the length of the data is greater than 0.
					//TODO fix the ugly if/else statements!!
					if(this.state.query.dateRange && this.state.aggregations[this.state.query.dateRange.field] !== undefined) {

						//draw the time line
						if(this.props.showTimeLine) {
							if (this.state.aggregations[this.state.query.dateRange.field].length !== 0) {

	                            // Display graph based on its type. Defaults to bar chart.
	                            if (this.state.graphType === 'lineChart') {
	                                graph = (
	                                    <div className={IDUtil.cssClassName('graph', this.CLASS_PREFIX)}>
	                                        <button
	                                        	onClick={this.switchGraphType.bind(this, 'histogram')}
	                                        	type="button"
	                                        	className="btn btn-primary btn-xs">
	                                        	Histogram
	                                        </button>
	                                        <QuerySingleLineChart
	                                            data={this.state.aggregations[this.state.query.dateRange.field]}
	                                            comparisonId={this.state.searchId}
												query={this.state.query}
												collectionConfig={this.props.collectionConfig}
											/>
	                                    </div>
	                                );
	                            } else {
	                                graph = (
	                                    <div className={IDUtil.cssClassName('graph', this.CLASS_PREFIX)}>
	                                        <button
	                                        	onClick={this.switchGraphType.bind(this, 'lineChart')}
	                                        	type="button"
	                                        	className="btn btn-primary btn-xs">
	                                        	Line chart
	                                        </button>
	                                        <Histogram
	                                            queryId={this.state.query.id}
                                                query={this.state.query}
                                                comparisonId={this.state.searchId}
	                                            dateRange={this.state.query.dateRange}
	                                            data={this.state.aggregations[this.state.query.dateRange.field]}
	                                            title={this.props.collectionConfig.toPrettyFieldName(this.state.query.dateRange.field)}
	                                            searchId={this.state.searchId}
                                                collectionConfig={this.props.collectionConfig}
                                            />
	                                    </div>
	                                );
	                            }
							} else if (this.state.aggregations[this.state.query.dateRange.field].length === 0) {
							    graph = MessageHelper.renderNoDocumentsWithDateFieldMessage();
							}
						} //END OF drawing the time line

						//draw the summary stuff
						if(this.state.aggregations && this.state.query.dateRange.field !== 'null_option') {
                        	if(this.state.aggregations[this.state.query.dateRange.field].length > 0) {
		            			dateCounts = this.state.aggregations[this.state.query.dateRange.field].map(
		            				(x => x.doc_count)).reduce(function(accumulator, currentValue) {
		                				return accumulator + currentValue;
		            				}
		            			);
		            		}

	            			if(this.state.query.dateRange.start || this.state.query.dateRange.end) {
								//count the dates that are out of range
		                    	const outOfRange = this.totalDatesOutsideOfRange();
		                    	if(outOfRange.length > 0) {
			                        outOfRangeCount = outOfRange.map((x => x.doc_count)).reduce(function(accumulator, currentValue) {
			                			return accumulator + currentValue;
			            			});
			                    }

		                    	let info = '';
		                    	const tmp = [];
		                        if(this.state.query.dateRange.start) {
		                        	tmp.push(TimeUtil.UNIXTimeToPrettyDate(this.state.query.dateRange.start));
		                        } else {
		                        	tmp.push('everything before');
		                        }
		                        if(this.state.query.dateRange.end) {
		                        	tmp.push(TimeUtil.UNIXTimeToPrettyDate(this.state.query.dateRange.end));
		                        } else {
		                        	tmp.push('up until now');
		                        }
		                        if(tmp.length > 0) {
		                        	info = tmp.join(tmp.length === 2 ? ' till ' : '');
		                        	info += ' (using: '+this.state.query.dateRange.field+')';
		                        }
		                    	dateRangeCrumb = (
		                    		<div className={IDUtil.cssClassName('breadcrumbs', this.CLASS_PREFIX)}>
										<div key="date_crumb" className={IDUtil.cssClassName('crumb', this.CLASS_PREFIX)}
											title="current date range">
											<em>Selected date range:&nbsp;</em>
											{info}
											&nbsp;
											<i className="fa fa-close" onClick={this.resetDateRange.bind(this)}/>
										</div>
									</div>
		                    	)
		                    }
	            		} //END OF drawing the date range summery

					} //END OF THE date range aggregation

                    if (this.props.dateRangeSelector && this.props.collectionConfig.getDateFields() != null) {
                    	//draw the date range selector
                    	dateRangeSelector = (
                            <DateRangeSelector
                            	queryId={this.state.query.id} //used for the guid (is it still needed?)
                                searchId={this.state.searchId} //for determining when the component should rerender
                                collectionConfig={this.props.collectionConfig} //for determining available date fields & aggregations
                                dateRange={this.state.query.dateRange} //for activating the selected date field
                                aggregations={this.state.aggregations} //to fetch the date aggregations
                                onOutput={this.onComponentOutput.bind(this)} //for communicating output to the  parent component
                            />
                        );

	                    //populate the date related stats
			            if(dateCounts != null) {
			            	let info = 'Please note that each record possibly can have multiple occurrences of the selected date field,';
			            	info += '<br/>making it possible that there are more dates found than the number of search results';
			            	dateStats = (
			            		<div>
			            			<br/>
			            			Total number of dates found based on the selected date field: {ComponentUtil.formatNumber(dateCounts)}&nbsp;
			            			<span data-for={'__qb__tt' + this.state.query.id}
			            				data-tip={info}
			            				data-html={true}>
										<i className="fa fa-info-circle"/>
									</span>
			            			<ul>
				            			<li>Dates within the selected date range: {ComponentUtil.formatNumber(dateCounts - outOfRangeCount)}</li>
				            			<li>Dates outside of the selected date range: {ComponentUtil.formatNumber(outOfRangeCount)}</li>
			            			</ul>
			            			<ReactTooltip id={'__qb__tt' + this.state.query.id}/>
			            		</div>
			            	)
			            }
                    } //END OF date range selector rendering

                } //END OF the big code block of rendering aggregations

                //draw the date result statistics
                const resultStats = (
                    <div>
                        {dateStats}
                    </div>
                );

                //draw the result block
                resultBlock = (
                    <div>
                    	<div className={IDUtil.cssClassName('result-dates', this.CLASS_PREFIX)}>
	                        {dateRangeSelector}
	                        <div className="row">
	                            <div className="col-md-12">
	                                {dateRangeCrumb}
	                        		{resultStats}
	                                {graph}
	                            </div>
	                        </div>
                        </div>
                        <div className="separator"/>
                        {aggregationBox}
                    </div>
                )

            //if hits is not greater than 0
			} else if(this.state.searchId != null && this.state.isSearching === false) {
                resultBlock = (
                    <div className="alert alert-danger">
                    	{MessageHelper.renderNoSearchResultsMessage(this.state.query, this.clearSearch.bind(this))}
                    </div>
                );
			}

			// number of query results if available
            const queryResultCount = this.state.totalHits === 0 || this.state.totalHits ? (
                <span className={IDUtil.cssClassName('count', this.CLASS_PREFIX)} title="Total number of results based on keyword and selected filters">
                    {ComponentUtil.formatNumber(this.state.totalHits)}
                </span>
            ) : null;


			//determine which icon to show after the search input
			if(this.state.isSearching === true) {
				searchIcon = (<span className="glyphicon glyphicon-refresh glyphicon-refresh-animate"/>)
			} else {
				searchIcon = (<i className="fa fa-search"/>)
			}

			const tutorial = currentSearchTerm ? null : (
				<div className={IDUtil.cssClassName('tutorial',this.CLASS_PREFIX)}>
					 A detailed explanation and how tos for this tool, can be found in the help menu <span onClick={this.showHelp}>?</span>
				</div>
			);


			//render the stuff on screen
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
									onKeyPress={
										this.searchFormKeyPressed.bind(this)
									}
									defaultValue={
										typeof this.setSearchTerm !== 'object' ? this.setSearchTerm : ''
									}
									ref={
										input => (this.setSearchTerm = input)
									}
								/>
								<span onClick={this.newSearch.bind(this)}>
									{searchIcon}
								</span>
							</div>


							{/* Metadata field selector */}
							<div className={IDUtil.cssClassName('selector-holder', this.CLASS_PREFIX)}>
								<div className={IDUtil.cssClassName('in-label', this.CLASS_PREFIX)}>in</div>
								{fieldCategorySelector}
								<div className={IDUtil.cssClassName('arrow-label', this.CLASS_PREFIX)}>{queryResultCount && "►"}</div>
							</div>

							{/* Result count */}
							<div >
								{queryResultCount}
								{/* WTODO: Add back: 
								<a onClick={this.clearSearch.bind(this)}>
									Clear&nbsp;<span data-for={'__clear-search-tt'}
	                                  data-tip="Clear all query parameters, but keeps the collection selected"
	                                  data-html={false}>
	                                  	<i className="fa fa-info-circle"/>
									</span>
								</a>
								<ReactTooltip id={'__clear-search-tt'}/> */}
							</div>
						</div>
					</form>

					{tutorial}

					{layerOptions}
					{resultBlock}
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
