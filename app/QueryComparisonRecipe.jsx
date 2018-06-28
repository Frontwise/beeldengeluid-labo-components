import QueryModel from './model/QueryModel';

import QueryFactory from './components/search/QueryFactory';

import SearchAPI from './api/SearchAPI';

import FlexBox from './components/FlexBox';
import FlexModal from './components/FlexModal';

import SearchHit from './components/search/SearchHit';
import Paging from './components/search/Paging';
import Sorting from './components/search/Sorting';

import IDUtil from './util/IDUtil';
import ElasticsearchDataUtil from './util/ElasticsearchDataUtil';
import QueryComparisonLineChart from './components/stats/QueryComparisonLineChart';
import ProjectSelector from './components/workspace/projects/ProjectSelector';
import ProjectQueriesTable from './components/workspace/projects/query/ProjectQueriesTable';
import CollectionUtil from './util/CollectionUtil';

import PropTypes from 'prop-types';
import ComponentUtil from "./util/ComponentUtil";
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
            collections : collections,
            data : null,
            pageSize : 10,
            selectedQueries : [],
            activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),
            showModal : false, //for the collection selector
            awaitingProcess : null, //which process is awaiting the output of the project selector
        };
        this.layout = document.querySelector("body");
    }

    componentDidMount(){
        initHelp("Compare", "/feature-doc/tools/query-comparison");
    }

    //this function receives all output of components that generate output and orchestrates where
    //to pass it to based on the ingredients of the recipe
    //TODO change this, so it knows what to do based on the recipe
    onComponentOutput(componentClass, data) {
        if(componentClass == 'QueryFactory') {
            this.onSearched(data);
        } else if(componentClass == 'ProjectSelector') {
            this.setState(
                {
                    activeProject: data,
                    lineChartData: null
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

    async getData(key) {
        const that = this,
              collectionId = that.state.selectedQueries[key].query.collectionId,
              clientId = that.props.clientId,
              user = that.props.user;

        return new Promise(function(resolve, reject) {
            CollectionUtil.generateCollectionConfig(clientId, user, collectionId, (collectionConfig) => {
                const desiredFacets = that.state.selectedQueries[key].query.desiredFacets,
                    field = collectionConfig.getPreferredDateField() || null;
                if(field !== null) {
                    desiredFacets.push({
                        "field": field,
                        "id": field,
                        "title": collectionConfig.toPrettyFieldName(field),
                        "type": "date_histogram"
                    });
                }

                const currentTime = new Date().getTime(),
                    query = {
                        ...that.state.selectedQueries[key].query,
                        dateRange: {
                            field: that.state.selectedQueries[key].query.dateRange ?
                                that.state.selectedQueries[key].query.dateRange.field :
                                collectionConfig.getPreferredDateField(),
                            end: that.state.selectedQueries[key].query.dateRange ?
                                that.state.selectedQueries[key].query.dateRange.end : currentTime,
                            start: that.state.selectedQueries[key].query.dateRange ?
                                that.state.selectedQueries[key].query.dateRange.start : collectionConfig.getMinimunYear()
                        },
                        fragmentFields: null,
                        fragmentPath: null,
                        desiredFacets: desiredFacets,
                        collectionConfig: collectionConfig
                    };

                // TODO : remove call to CKANAPI since the title for the collection is in the collectionConfig
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
        }).catch(err => console.log('No data returned from query'));
    }

    async processData(queries) {
        const promises = Object.keys(queries).map(this.getData.bind(this));
        let queriesData = {};
        await Promise.all(promises).then(
            (dataPerQuery) => {
                dataPerQuery.map(data => {
                    if(data) {
                        let queryObj = {};
                        const objData = ElasticsearchDataUtil.searchResultsToTimeLineData(
                            data.query,
                            data.aggregations,
                        );
                        queryObj.data = objData;
                        queryObj.comparisonId = data.query.id;
                        queryObj.query = data.query;
                        queryObj.collectionConfig = data.collectionConfig;
                        queriesData[data.query.id] = queryObj;
                    }
                });
                this.setState({
                    lineChartData: queriesData
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
            } else { //the data is the same stuff returned by a QueryBuilder

            }
        }

        if (this.state.viewMode !== 'relative') {
            let relativeData = data.map(
                dataSet => {
                    if(dataSet.length > 0) {
                        dataSet
                    }
                }
            );
            this.setState({
                isSearching: false,
                data: relativeData
            });
        }
    }

    compareQueries() {
        const checkedBoxes = Array.from(document.querySelectorAll(".bg__sort-table > table > tbody input"));
        this.layout.classList.add("spinner");
        let queries = [];
        Object.keys(checkedBoxes).forEach((item, index) => {
            if (checkedBoxes[item].checked && this.state.activeProject) {
                queries.push(this.state.activeProject.queries[index])
            }
        });
        this.setState({
            selectedQueries : queries
        }, () => this.processData(this.state.selectedQueries))
    }

    __getBaseUrl() {
        const temp = window.location.href;
        const arr = temp.split("/");
        return arr[0] + "//" + arr[2];
    }

    goToSingleSearch() {
        let url = this.__getBaseUrl() + '/tool/single-search';
        console.log(url)
        document.location.href = url;
    }

    render() {
        const compareLink = {"label": "Combine queries ..."}

        const chooseProjectBtn = (
            <button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showProjectModal')}>
                Set project ({this.state.activeProject ? this.state.activeProject.name : 'none selected'})
            </button>
        )

                //generates a tabbed pane with a search component for each collection + a collection browser
        const searchComponent = (
            <button className="btn btn-primary" onClick={this.goToSingleSearch.bind(this)}>Add query&nbsp;<i
                className="fa fa-plus"></i></button>
        )

        let lineChart = null;
        let aggregatedHits = null;
        let projectModal = null;
        let projectQueriesTable = null;

        if(this.state.activeProject) {
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
                const ramdom = Math.floor(Math.random() * 1000000);
                lineChart = (
                    <QueryComparisonLineChart
                        data={this.state.lineChartData}
                        comparisonId={ramdom}
                    />
                );
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

        //TODO only render when there is linechart data
        if(this.props.recipe.ingredients.output === 'lineChart') {
            if(this.state.lineChartData && Object.keys(this.state.lineChartData).length > 0) {
                lineChart = (
                    <QueryComparisonLineChart
                        data={this.state.lineChartData}
                        comparisonId={this.state.comparisonId}
                        selectedQueries={this.state.selectedQueries}
                    />
                );
            }
        }

        return (
            <div className={IDUtil.cssClassName('comparative-search-recipe')}>
                <div className="overlay"></div>
                <div className="row">
                    <div className="bg__queryComparisonRecipe-header-btns">
                        {searchComponent}&nbsp;{chooseProjectBtn}
                    </div>
                    {projectModal}
                    {projectQueriesTable}
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

QueryComparisonRecipe.propTypes = {
    clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    })

};

export default QueryComparisonRecipe;