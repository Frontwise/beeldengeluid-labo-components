import QueryModel from './model/QueryModel';
import QueryFactory from './components/search/QueryFactory';
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
        let collections = null;
        if(this.props.params.cids) {
            collections = this.props.params.cids.split(',');
        } else if(this.props.recipe.ingredients.collections) {
            collections = this.props.recipe.ingredients.collections;
        }

        this.state = {
            lineChartData: {},
            barChartData: {},
            collections : collections,
            chartType : this.props.recipe.ingredients.output ? this.props.recipe.ingredients.output : 'lineChart',
            data : null,
            selectedQueriesId: null,
            pageSize : 10,
            selectedQueries : [],
            activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),
            showModal : false, //for the collection selector
            awaitingProcess : null, //which process is awaiting the output of the project selector
        };
        this.layout = document.querySelector("body");
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
    }

    componentDidMount(){
        initHelp("Compare", "/feature-doc/howtos/query-comparison");
    }

    //this function receives all output of components that generate output and orchestrates where
    //to pass it to based on the ingredients of the recipe
    //TODO change this, so it knows what to do based on the recipe
    onComponentOutput(componentClass, data) {
        if(componentClass === 'QueryFactory') {
            this.onSearched(data);
        } else if(componentClass === 'ProjectSelector') {
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
            if(this.state.awaitingProcess) {
                switch(this.state.awaitingProcess) {
                    case 'bookmark' : this.selectBookmarkGroup(); break;
                    case 'saveQuery' : this.showQueryModal(); break;
                }
            }
        });
    }

    async getData(singleQuery) {
        const collectionId = singleQuery.query.collectionId,
              clientId = this.props.clientId,
              user = this.props.user;
        return new Promise(function(resolve, reject) {
            CollectionUtil.generateCollectionConfig(clientId, user, collectionId, (collectionConfig) => {
                const desiredFacets = singleQuery.query.desiredFacets,
                    field = collectionConfig.getPreferredDateField() || null;
                if(field !== null) {
                    desiredFacets.push({
                        "field": field,
                        "id": field,
                        "title": collectionConfig.toPrettyFieldName(field),
                        "type": "date_histogram"
                    });
                }

                const query = QueryModel.ensureQuery(singleQuery.query, collectionConfig);

                query.fragmentFields = null;
                query.fragmentPath = null;
                query.desiredFacets = desiredFacets;

                SearchAPI.search(
                    query,
                    collectionConfig,
                    data => {
                        if (data === null && typeof data === "object") {
                            reject(data => {
                                    if (data === null)
                                        return 'rejected'
                                }
                            )
                        } else {
                            resolve(data)
                        }
                    },
                    false
                )
            })
        }).catch(err => console.log('No data returned from query', err));
    }

    async processData(queries) {
        const random = Math.floor(Math.random() * 1000) + 1;
        const promises = queries.map(query => this.getData(query));
        let queriesData = {};
        let selectedQueriesWithConfig = [];
        await Promise.all(promises).then(
            dataPerQuery => {
                queries.forEach(singleQuery => {
                    singleQuery.collectionConfig = dataPerQuery.find(q => q.query.id === singleQuery.query.id);
                    selectedQueriesWithConfig.push(singleQuery)
                });
                dataPerQuery.map(data => {
                    if(data && data.query) {
                        let queryObj = {};
                        queryObj.data = ElasticsearchDataUtil.searchResultsToTimeLineData(
                            data.query,
                            data.aggregations,
                        );
                        queryObj.comparisonId = data.query.id;
                        queryObj.query = data.query;
                        queryObj.collectionConfig = data.collectionConfig;
                        queriesData[data.query.id] = queryObj;
                    } else {
                        console.debug('no data', data)
                    }
                });
                this.setState({
                    lineChartData: queriesData,
                    barChartData: dataPerQuery,
                    selectedQueriesId : random,
                    selectedQueries : selectedQueriesWithConfig
                }, () => this.layout.classList.remove("spinner"))
            },
        )
    }

    onOutput(data) {
         if(!data) { //if there are no results
            console.log('Your query did not yield any results');
        } else if(data.pagingOutOfBounds) { //due to ES limitations
            console.log('The last page cannot be retrieved, please refine your search');
        } else {
            if(data.deleted === true && data.queryId) { //the query factory deleted a query
                delete csr[data.queryId];
                delete lineChartData[data.queryId];
                delete barChartData[data.queryId];
            } else { //the data is the same stuff returned by a QueryBuilder

            }
        }
    }

    compareQueries(selection) {
        this.layout.classList.add("spinner")
        this.processData(selection)
    }

    __getBaseUrl() {
        const temp = window.location.href;
        const arr = temp.split("/");
        return arr[0] + "//" + arr[2];
    }

    goToSingleSearch() {
        document.location.href = this.__getBaseUrl() + '/tool/single-search';
    }

    switchGraphType() {
        this.setState({
            chartType : this.state.chartType === 'lineChart' ? 'histogram' : 'lineChart'
            }
        )
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
                        />
                    );
                } else {
                    chart = (
                        <ComparisonHistogram
                            data={this.state.barChartData}
                            key={this.state.selectedQueriesId}
                            selectedQueries={this.state.selectedQueries}
                        />
                    );
                }
                queryCollectionDetails = <QueryInfoBlock
                    selectedQueries={this.state.selectedQueries}
                    lineColour={this.COLORS}
                    external={external}
                />;
            }
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
