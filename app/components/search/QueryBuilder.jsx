import SearchAPI from '../../api/SearchAPI';

//data utilities
import CollectionUtil from '../../util/CollectionUtil';
import IDUtil from '../../util/IDUtil';
import TimeUtil from '../../util/TimeUtil';

//ui controls for assembling queries
import FieldCategorySelector from './FieldCategorySelector';
import DateRangeSelector from './DateRangeSelector';
import AggregationBox from './AggregationBox';
import AggregationList from './AggregationList';
import Histogram from '../stats/Histogram';
import QuerySingleLineChart from '../stats/QuerySingleLineChart';
import ReactTooltip from 'react-tooltip';
import ReadMoreCollection from '../../util/readMoreCollection/ReadMoreCollection';
import moment from 'moment';
/*
Notes about this component TODO rewrite:

*/

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
            currentCollectionHits: this.getCollectionHits(this.props.collectionConfig),
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

	//called by the constructor once to get the amount of documents in the entire collection
	getCollectionHits(config) {
		let collectionHits = -1;
		if(config && config.collectionStats) {
			let stats = config.collectionStats;
			let docType = config.getDocumentType();
			if(stats && stats.collection_statistics && stats.collection_statistics.document_types) {
				let docTypes = stats.collection_statistics.document_types;
				if(docTypes.length > 0) {
				    for(let i=0;i<docTypes.length;i++) {
                        if(docTypes[i].doc_type === docType) {
                            collectionHits = docTypes[i].doc_count
                        }
                    }
				}
			}
		}
		return collectionHits;
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
		let q = this.state.query;

		//reset certain query properties
		q.selectedFacets = {};
		//q.dateRange = null;
		q.offset = 0;
		q.term = this.setSearchTerm.value;

        this.doSearch(q, true);
	}

	clearSearch() {
		this.onOutput(null);
	}

	//this resets the paging
	toggleSearchLayer(e) {
		let q = this.state.query;
		const searchLayers = this.state.query.searchLayers;
		searchLayers[e.target.id] = !searchLayers[e.target.id];

		//reset certain query properties
		q.searchLayers = searchLayers;
		q.offset = 0;
		q.term = this.setSearchTerm.value;

		this.doSearch(q, true);
	}

	/*---------------------------------- FUNCTION THAT RECEIVES DATA FROM CHILD COMPONENTS --------------------------------------*/

	onComponentOutput(componentClass, data) {
		if(componentClass === 'AggregationList' || componentClass === 'AggregationBox') {
			let q = this.state.query;

			//reset the following query params
			q.desiredFacets = data.desiredFacets;
			q.selectedFacets = data.selectedFacets;
			q.offset = 0;
			q.term = this.setSearchTerm.value;
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

			let q = this.state.query;

			//reset the following params
			q.dateRange = data;
			q.desiredFacets = df;
			q.offset = 0;
			q.term = this.setSearchTerm.value;

			this.doSearch(q, true)
		} else if(componentClass === 'FieldCategorySelector') {
			let q = this.state.query;
			q.fieldCategory = data;
			q.offset = 0;
			q.term = this.setSearchTerm.value;

			this.doSearch(q, true)
		}
	}

	/*---------------------------------- FUNCTIONS THAT COMMINICATE TO THE PARENT --------------------------------------*/

	//this function is piped back to the owner via onOutput()
	gotoPage(pageNumber) {
		let q = this.state.query;
		q.offset = (pageNumber-1) * this.props.pageSize;
		q.term = this.setSearchTerm.value;

		this.doSearch(q, true);
	}

	//this function is piped back to the owner via onOutput()
	sortResults(sortParams) {
		let q = this.state.query;
		q.sort = sortParams;
		q.offset = 0;
		q.term = this.setSearchTerm.value;

		this.doSearch(q, true);
	}

	resetDateRange() {
		let q = this.state.query;
		q.dateRange = null;
		q.offset = 0;
		q.term = this.setSearchTerm.value;

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
        	let q = this.state.query;
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
                	return desiredMinYear == moment(d.date_millis, 'x').year()
                })
                i = i === -1 ? 0 : i;

                let j = buckets.findIndex(d => {
                	return maxDate.isBefore(moment(d.date_millis, 'x'))
                })
				j = j === -1 ? buckets.length -1 : j;

                if(!(i === 0 && j === (buckets.length -1))) {
                	aggregations[dateRange.field] = aggregations[dateRange.field].splice(i, j - i);
                }
	        }
	    }
	    return aggregations
    }

    render() {
        if (this.props.collectionConfig && this.state.query) {
            let heading = null;
            let searchIcon = null;
            let layerOptions = null;
            let resultBlock = null;
            let fieldCategorySelector;
            let currentCollectionTitle = this.props.collectionConfig.collectionId;
            let ckanLink = null;

            //collectionInfo comes from CKAN, which can be empty
            if(this.props.collectionConfig.collectionInfo) {
            	currentCollectionTitle = this.props.collectionConfig.collectionInfo.title || null;

                if (this.props.collectionConfig.collectionInfo.ckanUrl) {
                    ckanLink = <ReadMoreCollection linkUrl={this.props.collectionConfig.collectionInfo.ckanUrl}/>
                }
            }

            if (this.props.header) {
                heading = (<div>
                        <h3>Searching in :&nbsp;{currentCollectionTitle} {ckanLink}</h3>
                        <h4>Total number of records in this collection: {this.state.currentCollectionHits}</h4>
                    </div>
                )
            }

			//draw the field category selector
			fieldCategorySelector = (
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
				// Hide collection metada tickbox from current search interface.
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

			//only draw this when there are search results
			if(this.state.totalHits > 0) {
				let resultStats = null;
				let dateStats = null;
				let graph = null;
				let aggrView = null; //either a box or list (TODO the list might not work properly anymore!)
				let aggregationBox = null;
				let dateRangeSelector = null;
				let dateRangeCrumb = null;

				let dateCounts = null;
				let outOfRangeCount = 0;

                //let countsBasedOnDateRange = null;
                let currentSearchTerm = (this.setSearchTerm.value !== '') ? this.setSearchTerm.value : this.props.query.term;

				//populate the aggregation/facet selection area/box
				if(this.state.aggregations) {
					if(this.props.aggregationView === 'box') {
						aggrView = (
							<AggregationBox
								searchId={this.state.searchId} //for determining when the component should rerender
								queryId={this.state.query.id}
								aggregations={this.state.aggregations} //part of the search results
								desiredFacets={this.state.query.desiredFacets} //as obtained from the collection config
								selectedFacets={this.state.query.selectedFacets} //via AggregationBox or AggregationList
								collectionConfig={this.props.collectionConfig} //for the aggregation creator only
								onOutput={this.onComponentOutput.bind(this)} //for communicating output to the  parent component
							/>
						)
					} else { //just show them as a conservative list
						aggrView = (
							<AggregationList
								searchId={this.state.searchId} //for determining when the component should rerender
								queryId={this.state.query.id} //TODO implement in the list component
								aggregations={this.state.aggregations} //part of the search results

                desiredFacets={this.state.query.desiredFacets}
								selectedFacets={this.state.query.selectedFacets} //via AggregationBox or AggregationList

                collectionConfig={this.props.collectionConfig} //for the aggregation creator only
								onOutput={this.onComponentOutput.bind(this)} //for communicating output to the  parent component
							/>
						)
					}

                    if (aggrView && this.props.aggregationView === 'box') {
                        if(aggrView) {
                            aggregationBox = (
                                <div className="row">
                                    <div className="col-md-12">
                                        {aggrView}
                                    </div>
                                </div>
                            )
                        }
                    } else {
                        aggregationBox = (
                            <div className="col-md-3 aggregation-list">
                                {aggrView}
                            </div>
                        )
                    }

					// Display the graph only if an option other than the default is selected
					// and the length of the data is greater than 0.
					//TODO fix the ugly if/else statements!!
					if(this.state.query.dateRange && this.state.aggregations[this.state.query.dateRange.field] !== undefined) {

						//draw a graph
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
							    graph = (
									 <div>
										 <br/>
										 <div className="alert alert-danger">No data found for this Date Type Field</div>
									 </div>
							    )
							}
						}

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
		                    	let tmp = [];
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
	            		}
					}

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
			            			Total number of dates found based on the selected date field: {dateCounts}&nbsp;
			            			<span data-for={'__qb__tt' + this.state.query.id}
			            				data-tip={info}
			            				data-html={true}>
										<i className="fa fa-info-circle"/>
									</span>
			            			<ul>
				            			<li>Dates within the selected date range: {dateCounts - outOfRangeCount}</li>
				            			<li>Dates outside of the selected date range: {outOfRangeCount}</li>
			            			</ul>
			            			<ReactTooltip id={'__qb__tt' + this.state.query.id}/>
			            		</div>
			            	)
			            }

                    }
                }

                //draw the overall result statistics
                resultStats = (
                    <div>
                        <div>
                            Total number of results based on <em>&quot;{currentSearchTerm}&quot; </em>
                            and selected filters: <b>{this.state.totalHits}</b>
                            {dateStats}
                        </div>
                    </div>
                );

                if (this.props.aggregationView === 'box') {
                    resultBlock = (
                        <div>
                            {resultStats}
                            <div className="separator"/>
                            {dateRangeCrumb}
                            <div className="row">
                                <div className="col-md-12">
                                    {dateRangeSelector}
                                    {graph}
                                </div>
                            </div>
                            <div className="separator"/>
                            <div>
                                <div className="col-md-12">
                                    {aggregationBox}
                                    <br/>
                                </div>
                            </div>
                        </div>
                    )
                } else {
                    resultBlock = (
                        <div>
                            {resultStats}
                            <div className="separator"/>
                            {dateRangeCrumb}
                            <div className="row">
                                <div className="col-md-12">
                                    {dateRangeSelector}
                                    {graph}
                                </div>
                            </div>
                            <div className="separator"/>
                            {aggregationBox}
                        </div>
                    )
                }
            //if hits is not greater than 0
			} else if(this.state.searchId != null && this.state.isSearching === false) {
				let dateRangeMessage = null;
				if(this.state.query.dateRange) {
					dateRangeMessage = (
						<span>
							Between <strong>{TimeUtil.UNIXTimeToPrettyDate(this.state.query.dateRange.start)}</strong>
								and <strong>{TimeUtil.UNIXTimeToPrettyDate(this.state.query.dateRange.end)}</strong>
						</span>
					)
				}
				resultBlock = (
					<div className="alert alert-danger">
						No results found for search term <b>{this.setSearchTerm.value.toUpperCase()}</b>
						<br />
						{dateRangeMessage}
					</div>
				)
			}

			//determine which icon to show after the search input
			if(this.state.isSearching === true) {
				searchIcon = (<span className="glyphicon glyphicon-refresh glyphicon-refresh-animate"/>)
			} else {
				searchIcon = (<i className="fa fa-search"/>)
			}
			//render the stuff on screen
			return (
				<div className={IDUtil.cssClassName('query-builder')}>
					{heading}
					<div className="separator"/>
					<div className="row">
						<div className="col-md-12">
							<form className="form-horizontal" onSubmit={this.blockSearch.bind(this)}>
								<div className="form-group">
									<div className="col-sm-6">
										<div className="input-group">
											<input type="text" className="form-control" onKeyPress={this.searchFormKeyPressed.bind(this)}
                                                   id="search_term" defaultValue={typeof this.setSearchTerm !== 'object' ? this.setSearchTerm : ''} ref={input => (this.setSearchTerm = input)} placeholder="Search"/>
											<span className="input-group-addon btn-effect" onClick={this.newSearch.bind(this)}>
												{searchIcon}
											</span>
										</div>
									</div>
									<div className="col-sm-6">
										{fieldCategorySelector}
									</div>
								</div>
							</form>
							<a onClick={this.clearSearch.bind(this)}>
								Clear search&nbsp;<span data-for={'__clear-search-tt'}
                                  data-tip="Clear all query parameters, but keeps the collection selected"
                                  data-html={false}>
                                  	<i className="fa fa-info-circle"/>
								</span>
							</a>
							<ReactTooltip id={'__clear-search-tt'}/>
						</div>
					</div>
					{layerOptions}
					<div className="separator"/>
					{resultBlock}
				</div>
			)
		} else {
			return (<div>Loading collection configuration...</div>);
		}

	}

}

export default QueryBuilder;
