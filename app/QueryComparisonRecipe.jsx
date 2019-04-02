import QueryModel from './model/QueryModel';
import SearchAPI from './api/SearchAPI';
import FlexModal from './components/FlexModal';

import IDUtil from './util/IDUtil';
import ElasticsearchDataUtil from './util/ElasticsearchDataUtil';
import QueryComparisonLineChart from './components/stats/QueryComparisonLineChart';
import ComparisonHistogram from './components/stats/ComparisonHistogram';
import ProjectSelector from './components/workspace/projects/ProjectSelector';
import ProjectQueriesTable from './components/workspace/projects/query/ProjectQueriesTable';
import ToolHeader from './components/shared/ToolHeader';
import CollectionUtil from './util/CollectionUtil';

import PropTypes from 'prop-types';
import ComponentUtil from "./util/ComponentUtil";
import {initHelp} from './components/workspace/helpers/helpDoc';
import QueryInfoBlock from './components/stats/helpers/QueryInfoBlock';

/*

FIXME: the queries in this component should all be validated using the QueryModel!

*/

class QueryComparisonRecipe extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            lineChartData: {},
            barChartData: {},

            queryStats : {}, //contains all the retrieved stats per queryId (for all queries)

            chartType : this.props.recipe.ingredients.output ? this.props.recipe.ingredients.output : 'lineChart',

            selectedQueriesId: null,
            selectedQueries : [],

            activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),

            showProjectModal : false //for the project selector
        };
        this.layout = document.querySelector("body");
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue', 'blue'];
    }

    componentDidMount(){
        initHelp("Compare", "/feature-doc/howtos/query-comparison");
    }

    //this function receives all output of components that generate output and orchestrates where
    //to pass it to based on the ingredients of the recipe
    //TODO change this, so it knows what to do based on the recipe
    onComponentOutput(componentClass, data) {
        if(componentClass === 'ProjectSelector') {
            this.setState(
                {
                    activeProject: data,
                    lineChartData: null,
                    barChartData : null
                },
                () => {
                    this.onProjectChanged.call(this, data)
                }
            );
        }
    }

    /* ------------------------------------------------------------------------------
    ------------------------------- SEARCH RELATED FUNCTIONS --------------------
    ------------------------------------------------------------------------------- */
    onProjectChanged(project) {
        ComponentUtil.storeJSONInLocalStorage('activeProject', project);
        ComponentUtil.hideModal(this, 'showProjectModal', 'project__modal', true, () => {
            this.setState({selectedQueries : []});
        });
    }

    getData(singleQuery) {
        return new Promise((resolve, reject) => {
            CollectionUtil.generateCollectionConfig(this.props.clientId, this.props.user, singleQuery.query.collectionId, (collectionConfig) => {
                const dateField = collectionConfig.getPreferredDateField() || null;
                if(singleQuery.query.dateRange == null && dateField !== null) {
                    singleQuery.query.desiredFacets.push({
                        "field": dateField,
                        "id": dateField,
                        "title": collectionConfig.toPrettyFieldName(dateField),
                        "type": "date_histogram"
                    });
                }
                const query = QueryModel.ensureQuery(singleQuery.query, collectionConfig);
                SearchAPI.search(
                    query,
                    collectionConfig,
                    data => {
                        //just resolve everything, even if the data is null or has errors. Handle this later
                        //console.debug(data)
                        resolve(data);
                    },
                    false
                )
            })
        }).catch(err => console.log('No data returned from query', err));
    }

    fetchData = async (queries) => {
        return await Promise.all(
            queries.filter(q => q.query).map(q => {
                return this.getData(q);
            })
        )
    };

    hasDateInformation = item => {
        if(item.query && item.aggregations) {
            if(item.query.dateRange && item.query.dateRange.field) {
                if(item.aggregations[item.query.dateRange.field] != null && item.aggregations[item.query.dateRange.field].length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    generateChartData = (data, selectedQueries) => {
        const queryStats = {} //keep status information for the QueryInfoBlock
        data.forEach((item, index) => {
            queryStats[item.query.id] = {
                hasDateInformation : this.hasDateInformation(item),
                error : !item || item.error ? true : false,
                totalHits : item ? item.totalHits || 0 : 0,
                collectionConfig : item && item.collectionConfig ? item.collectionConfig : null,
                color : this.COLORS[index],
                queryIndex : index + 1
            }
        })

        const barChartData = data.filter(this.hasDateInformation); //barchart data is simply the returned data (with date aggregations)
        const lineChartData = {};

        //the line chart data needs to be prepared differently (TODO synchronise with bar chart data model)
        barChartData.forEach(data => {
            if(data && data.query) {
                const timelineData = ElasticsearchDataUtil.searchResultsToTimeLineData(
                    data.query,
                    data.aggregations,
                );
                if(timelineData) { //avoid feeding the graph with null data
                    lineChartData[data.query.id] = {
                        data : timelineData,
                        comparisonId : data.query.id,
                        query: data.query,
                        collectionConfig : data.collectionConfig
                    };
                }
            }
        });

        this.setState({
            queryStats: queryStats,
            lineChartData: lineChartData,
            barChartData: barChartData,
            selectedQueriesId : IDUtil.guid(),
            selectedQueries : selectedQueries
        }, () => this.layout.classList.remove("spinner"))
    };

    compareQueries = selectedQueries => {
        this.layout.classList.add("spinner")
        this.fetchData(selectedQueries).then(data => this.generateChartData(data, selectedQueries));
    };

    __getBaseUrl() {
        const temp = window.location.href;
        const arr = temp.split("/");
        return arr[0] + "//" + arr[2];
    }

    goToSingleSearch() {
        document.location.href = this.__getBaseUrl() + '/tool/single-search';
    }

    switchGraphType() {
        this.setState({chartType : this.state.chartType === 'lineChart' ? 'histogram' : 'lineChart'});
    }

    /* --------------------------- RENDER HEADER --------------------- */

    renderHeader = (name, activeProject) => (
            <ToolHeader
                name={name}
                activeProject={activeProject}
                selectProject={ComponentUtil.showModal.bind(this, this, 'showProjectModal')}
            />
    );

    render() {
        const compareLink = {"label": "Combine queries ..."};

        //generates a tabbed pane with a search component for each collection + a collection browser
        const searchComponent = (
            <button className="btn btn-primary"
                    onClick={this.goToSingleSearch.bind(this)}>Add query&nbsp;<i className="fa fa-plus"/></button>
        );

        let chart = null;
        let queryCollectionDetails = null;
        let projectModal = null;
        let projectQueriesTable = null;
        let graphTypeBtn = null;

        if(this.state.activeProject) {
            const graphTypeText = this.state.chartType === 'lineChart' ? 'Histogram' : 'Line Chart';

            projectQueriesTable = (
                <div className={IDUtil.cssClassName('project-queries-view')}>
                    <ProjectQueriesTable
                        key={this.state.activeProject.id}
                        handleCompareLink={this.compareQueries.bind(this)}
                        compareQueryLink={compareLink}
                        project={this.state.activeProject}
                        user={this.props.user}/>
                </div>
            );

            if(this.state.lineChartData && Object.keys(this.state.lineChartData).length > 0) {
                graphTypeBtn = (
                    <button
                        onClick={this.switchGraphType.bind(this)}
                        type="button"
                        className="btn btn-primary btn-xs bg__switch-type-btn">
                        {graphTypeText}
                    </button>);

                if(this.state.chartType === 'lineChart') {
                    chart = (
                        <QueryComparisonLineChart
                            data={this.state.lineChartData}
                            key={this.state.selectedQueriesId}
                            selectedQueries={this.state.selectedQueries}
                            queryStats={this.state.queryStats}
                        />
                    );
                } else {
                    chart = (
                        <ComparisonHistogram
                            data={this.state.barChartData}
                            key={this.state.selectedQueriesId}
                            selectedQueries={this.state.selectedQueries}
                            queryStats={this.state.queryStats}
                        />
                    );
                }
            }

            queryCollectionDetails = this.state.selectedQueries.length > 0 ?  (
                <QueryInfoBlock
                    queries={this.state.selectedQueries}
                    queryStats={this.state.queryStats}
                />
            ) : null;
        }

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

        const header = this.renderHeader("Compare", this.state.activeProject);
        return (
            <div className={IDUtil.cssClassName('comparative-search-recipe')}>
                <div className="overlay"/>
                <div className="row">
                    {header}
                    <div className="bg__queryComparisonRecipe-header-btns">
                        {searchComponent}
                    </div>
                    {projectModal}
                    {projectQueriesTable}
                </div>
                <div className="row">
                    <div className="col-md-12 bg__comparative-graphs">
                        {graphTypeBtn}
                        {chart}
                        {queryCollectionDetails}
                    </div>
                </div>
            </div>
        );
    }
}

QueryComparisonRecipe.propTypes = {
    clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    })

};

export default QueryComparisonRecipe;
