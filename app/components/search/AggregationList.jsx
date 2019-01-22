import AggregationCreator from './AggregationCreator';
import FlexModal from '../FlexModal';
import IDUtil from '../../util/IDUtil';
import ComponentUtil from "../../util/ComponentUtil";
import ReactTooltip from 'react-tooltip';

//this component draws the aggregations (a.k.a. facets) and merely outputs the user selections to the parent component
class AggregationList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            showModal: false,
            showModalWarning: false,
            sortModes: {},
            showAllModes: {}
        };
        this.CLASS_PREFIX = 'agl';
        this.minToShow = 5;
        this.currentFacet = null;
    }

    //communicates the selected facets back to the parent component
    onOutput(desiredFacets, selectedFacets) {
        if (this.props.onOutput) {
            this.props.onOutput(this.constructor.name, {
                desiredFacets: desiredFacets,
                selectedFacets: selectedFacets
            })
        }
    }

    onComponentOutput(componentClass, data) {
        if (componentClass === 'AggregationCreator' && data) {
            const desiredFacets = this.props.desiredFacets;
            desiredFacets.push(data);
            this.onOutput(desiredFacets, this.props.selectedFacets);
            ComponentUtil.hideModal(this, 'showModal', 'field_select__modal', true);
        }
    }

    /* ------------------------------------- FACET SELECTION -------------------------------- */

    toggleSelectedFacet(key, value, e) {
        const facets = this.props.selectedFacets;
        if (facets) {
            if (facets[key]) {
                const index = facets[key].indexOf(value);
                if (index === -1) {
                    facets[key].push(value); //add the value
                } else {
                    facets[key].splice(index, 1); // remove the value
                    if (facets[key].length === 0) {
                        delete facets[key];
                    }
                }
            } else {
                facets[key] = [value]
            }
            //output to the parent component
            this.onOutput(this.props.desiredFacets, facets);
        }
    }

    /* ------------------------------------- SHOW MORE/LESS -------------------------------- */

    __generateViewItems(aggr) {
        const showAll = this.state.showAllModes[aggr.field] === undefined ? false : this.state.showAllModes[aggr.field];
        const currentStatus = showAll ?
            {
                'text': 'Show Less',
                'symbol': 'switchIcon glyphicon glyphicon-minus'
            } :
            {
                'text': 'Show More',
                'symbol': 'switchIcon glyphicon glyphicon-plus'
            };

        return (
            <a className="switchView" onClick={this.switchListView.bind(this, aggr)}>
                <span className="switchViewText">{currentStatus.text}</span>
                <span className={currentStatus.symbol} aria-hidden="true"/>
            </a>
        )
    }

    switchListView(aggr) {
        let states = this.state.showAllModes;
        states[aggr.field] = states[aggr.field] === undefined ? true : !states[aggr.field];
        this.setState({showAllModes : states});
    }

    /*------------------------------------- REMOVE DIALOG (TODO MAKE NICER) ----------------------------*/

    showRemoveDialog(key, index) {
        this.currentFacet = key;

        //FIXME this part is still nasty, but for now it's necessary to prevent toggling the header menu when clicking the "X"
        if(document.querySelector("#index__"+ index)) {
           document.querySelector("#index__"+ index).addEventListener("click", function(event) {
                event.preventDefault();
            }, {once:true});
            ComponentUtil.showModal(this, 'showModalWarning', 'field_select_facet__modal', true);
        }
    }

    removeAggregation() {
        //first remove the entry from the desiredFacets
        const desiredFacets = this.props.desiredFacets;
        for (let i = desiredFacets.length - 1; i >= 0; i--) {
            if (desiredFacets[i].field === this.currentFacet) {
                desiredFacets.splice(i, 1);
                break;
            }
        }
        //then throw away any selected value from the selectedFacets
        if(this.props.selectedFacets) {
            delete this.props.selectedFacets[this.currentFacet]
        }

        ComponentUtil.hideModal(this, 'showModalWarning' , 'field_select_facet__modal', true);
        this.onOutput(desiredFacets, this.props.selectedFacets);
    }

    /*------------------------------------- EXCLUDE MODE AGGREGATION ----------------------------*/

    toggleExcludeFacets(index) {
        this.props.desiredFacets[index]['exclude'] = !this.props.desiredFacets[index]['exclude'];
        this.onOutput(this.props.desiredFacets, this.props.selectedFacets);
    }

    /*------------------------------------- SORTING FACETS ----------------------------*/

    setSortingMode(aggrField, type, direction) {
        const sortModes = this.state.sortModes;
        sortModes[aggrField] = {
            type : type,
            direction, direction
        }
        this.setState({sortModes : sortModes})
    }

    sortFacetList(a, b, sortType, sortDirection) {
        if(sortType === 'alpha') {
            if (sortDirection === 'desc') {
                if(b.key.toLowerCase() < a.key.toLowerCase()) {
                    return -1;
                } else if(b.key.toLowerCase() > a.key.toLowerCase()) {
                    return 1;
                }
            } else { //asc
                if(a.key.toLowerCase() < b.key.toLowerCase()) {
                    return -1;
                } else if(a.key.toLowerCase() > b.key.toLowerCase()) {
                    return 1;
                }
            }
            return 0;
        } else { //non-alpha
            if (sortDirection === 'desc') {
                return b.count - a.count;
            } else {
                return a.count - b.count;
            }
        }
    }

    /*------------------------------------- FUNCTIONS FOR RENDERING ----------------------------*/

    //returns render friendly object based on the data supplied in the props
    generateUIData() {

        //will be ultimately returned containing a list of ui data per "desired aggregation"
        const uiData = []

        //first filter out the histogram aggregations: they are not supported in this list view
        const desiredFacets = !this.props.desiredFacets ? [] : this.props.desiredFacets.filter(
            aggr => aggr.type !== 'date_histogram'
        );

        //Check if all selected facets are in the desired aggragtion list, if not, add doc_count 0
        Object.keys(this.props.selectedFacets).forEach(field => {
            this.props.selectedFacets[field].forEach(facetValue => {
                const found = this.props.aggregations[field].find(aggr => aggr['key'] === facetValue);
                if(!found){
                    this.props.aggregations[field].push({'key':facetValue, 'doc_count': 0});
                }
            });
        });

        //loop through the desired facets, available in the state
        desiredFacets.forEach((da, index) => {
            //first check if the aggregation has anything in it
            const isEmptyAggr = this.props.aggregations[da.field] && this.props.aggregations[da.field].length > 0 ? false : true;

            //then determine the sort mode
            let sortMode = this.state.sortModes[da.field];
            if(!sortMode) {
                sortMode = {
                    type : 'alpha',
                    direction : 'asc'
                }
            }

            //then parse the retrieved facets/buckets
            let facets = [];
            if(!isEmptyAggr) {
                let visibleFacets = 0;
                facets = this.props.aggregations[da.field].map(facet => {
                    let isSelected = false; // is the facet selected

                    //if showing all facets, no items should be hidden
                    let hidden = this.state.showAllModes[da.field] === undefined ? true : !this.state.showAllModes[da.field];
                    if(hidden && visibleFacets < this.minToShow) {
                        hidden = false;
                    }

                    if (this.props.selectedFacets[da.field] && this.props.selectedFacets[da.field].indexOf(facet.key) != -1) {
                        isSelected = true;
                        hidden = false; //always show selected facets
                    }
                    if(!hidden) {
                        visibleFacets++;
                    }
                    return {
                        key : facet.key,
                        guid : da.field + '|' + facet.key,
                        count : facet.doc_count,
                        selected : isSelected,
                        hidden : hidden
                    }
                });

                const selectedFacets = facets.filter(f => f.selected);

                //sort them properly (selected facets go on top)
                facets.sort((a, b) => { // first sort the whole list of facets
                    return this.sortFacetList(a, b, sortMode.type, sortMode.direction)
                })
                facets = facets.filter( // filter out the selected ones
                    f => !f.selected
                )
                facets.unshift( //and readd them on top
                    ...selectedFacets
                );
            }

            //then add them to the conventient UI object (together with the exclusion property)
            uiData.push({
                facets : facets,
                exclude : da.exclude === undefined ? false : da.exclude,
                field : da.field,
                title : da.title,
                empty : isEmptyAggr, //does the aggregation have anything in it
                index : index, // temprarily needed for guid
                guid : "facets__" + index
            })
        });
        return uiData;
    }

    //renders a block showing the facets for a single aggregation
    renderAggregationBlock(aggr) {

        //first generate the facet (options) to be included in the block later on
        const sortedFacets = aggr.facets.map((f, index) => {
            return (
                <li key={'facet__' + aggr.index + '__' + index} hidden={f.hidden}
                    className={IDUtil.cssClassName('facet-item', this.CLASS_PREFIX)}>
                    <div className="checkbox">
                        <input id={f.guid}
                               type="checkbox"
                               checked={f.selected}
                               onChange={this.toggleSelectedFacet.bind(this, aggr.field, f.key)}/>
                        <label>
                            <span> </span>
                            {f.key}&nbsp;({f.count})
                        </label>
                    </div>
                </li>
            )
        });

        //finally return the whole block with all of the (selected) facets and their counts etc...
        return (
            <div className={IDUtil.cssClassName('hamburger-header', this.CLASS_PREFIX)}
                key={'facet__' + aggr.index} id={'index__' + aggr.index}>
                <div className={IDUtil.cssClassName('hamburger-menu', this.CLASS_PREFIX)}>
                    <input className="hamburger-toggle" type="checkbox" id={aggr.guid}/>
                    <label htmlFor={aggr.guid}>
                        <span className="bg__facet-title" data-for={'tooltip__' + aggr.index} data-tip={aggr.field}
                              data-html={true}>
                           <i className="fa fa-info-circle"/> {aggr.title}
                                    </span>

                        <span className="fa fa-remove" onClick={
                            this.showRemoveDialog.bind(this, aggr.field, aggr.index)
                        }/>
                        <div className="hb">
                            <div className="hb-line hb-line-top"/>
                            <div className="hb-line hb-line-center"/>
                        </div>
                    </label>
                    <ul className={aggr.guid}>
                        <li className={IDUtil.cssClassName('aggregationSwitchBtn', this.CLASS_PREFIX)}>
                            <span className="ms_toggle_btn">
                                <input
                                    type="checkbox"
                                    id={aggr.field}
                                    className="checkbox-toggle checkbox-toggle-round"
                                    checked={this.props.desiredFacets[aggr.index]['exclude']}
                                    onChange={this.toggleExcludeFacets.bind(this, aggr.index)}
                                />
                            <label htmlFor={aggr.field} data-on="Excl" data-off="Incl"/></span>
                        </li>
                        <li title="Alphanumeric descending" onClick={this.setSortingMode.bind(this, aggr.field, 'alpha', 'desc')}>
                            <i className="fa fa-sort-alpha-desc fa-lg" aria-hidden="true"/>
                        </li>
                        <li title="Alphanumeric ascending" onClick={this.setSortingMode.bind(this, aggr.field, 'alpha', 'asc')}>
                            <i className="fa fa-sort-alpha-asc fa-lg" aria-hidden="true"/>
                        </li>
                        <li title="Numeric Asceding" onClick={this.setSortingMode.bind(this, aggr.field, 'non-alpha', 'asc')}>
                            <i className="fa fa-sort-numeric-asc fa-lg" aria-hidden="true"/>
                        </li>
                        <li title="Numeric descending" onClick={this.setSortingMode.bind(this, aggr.field, 'non-alpha', 'desc')}>
                            <i className="fa fa-sort-numeric-desc fa-lg" aria-hidden="true"/>
                        </li>

                    </ul>
                </div>
                <ul className={IDUtil.cssClassName('facet-group', this.CLASS_PREFIX)}>
                    {sortedFacets}
                </ul>
                {this.__generateViewItems(aggr, true)}
                <ReactTooltip id={'tooltip__' + aggr.index}/>
            </div>
        )
    }

    render() {
        const uiData = this.generateUIData(); //contains all required data for generating the (empty) aggregation blocks and selected facets

        const selectedFacets = []; //holds the list of selected facets to be displayed at the top

        let emptyAggrBlocks = null; //contains aggregations without any results

        const aggregationBlocks = []; //contains aggregations WITH results

        //modals
        let aggregationCreatorModal = null;
        let aggregationModalWarning = null;

        //loop through the non-empty "desired aggregations" (non-histogram only)
        uiData.filter(aggr => !aggr.empty).forEach(curAggr => {

            //add another (rendered) aggregation block to the list
            aggregationBlocks.push(this.renderAggregationBlock(curAggr));

            //add the (rendered) facets that are selected within the current aggregation block (to be displayed at the top)
            curAggr.facets.filter(f => f.selected).forEach((f, index) => {
                let title = f.key;
                let count = f.count;
                if(curAggr.exclude === true) {
                    title = "NOT - " + title;
                    count = 0;
                }
                selectedFacets.push(
                    <div className={IDUtil.cssClassName('selected-item', this.CLASS_PREFIX)}>
                        {title.toUpperCase()} ({count})
                        <span className="fa fa-remove" onClick={this.toggleSelectedFacet.bind(this, curAggr.field, f.key)}/>
                    </div>
                )
            });

        });

        //for each empty aggregation, add a (rendered) block to the list (of empty aggregations)
        emptyAggrBlocks = uiData.filter(aggr => aggr.empty).map((aggr, index) => {
            return (
                <div className={IDUtil.cssClassName('hamburger-header aggregation-no-results', this.CLASS_PREFIX)}
                    key={'facet__' + aggr.index}
                    id={'index__' + aggr.index}>
                    <span data-for={'tooltip__' + aggr.index} data-tip={aggr.field} data-html={true}>
                        <i className="fa fa-info-circle"/>
                    </span>
                    <h4 className="bg__empty-facet">
                        (0) {aggr.title}
                    </h4>
                    <span className="fa fa-remove" onClick={
                        this.showRemoveDialog.bind(this, aggr.field, aggr.index - 1)
                    }/>
                    <ReactTooltip id={'tooltip__' + aggr.index}/>
                </div>
            )
        });

        //show modal for adding a new aggregation
        if (this.state.showModal) {
            aggregationCreatorModal = (
                <FlexModal
                    size="large"
                    elementId="field_select__modal"
                    stateVariable="showModal"
                    owner={this}
                    title="Create a new aggregation">
                    <AggregationCreator
                        collectionConfig={this.props.collectionConfig}
                        onOutput={this.onComponentOutput.bind(this)}/>
                </FlexModal>
            )
        }

        //show modal for closing/hiding the selected aggregation
        if (this.state.showModalWarning) {
            aggregationModalWarning = (
                <FlexModal
                    elementId="field_select_facet__modal"
                    stateVariable="showModalWarning"
                    owner={this}
                    title="Hide current facet?">
                    <div>
                        <p>
                            You are closing (hiding) the current facet for "<u>{this.currentFacet}</u>".
                            You can bring it back by using the "New" facet option and searching for the same field name again
                        </p>
                        <br/>
                        <button
                            type="button"
                            onClick={
                                this.removeAggregation.bind(this)
                            }
                            className="btn btn-primary">
                            Hide
                        </button>
                    </div>
                </FlexModal>
            )
        }

        //finally render the whole thing
        return (
            <div className={IDUtil.cssClassName('aggregation-list checkboxes')}>
                {aggregationCreatorModal}
                {aggregationModalWarning}
                <li key={'new__tab'} className={IDUtil.cssClassName('tab-new', this.CLASS_PREFIX)}>
                    <a href="javascript:void(0);" onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
                        NEW&nbsp;<i className="fa fa-plus"/>
                    </a>
                </li>
                <div className={IDUtil.cssClassName('selected-facets', this.CLASS_PREFIX)}>
                    {selectedFacets}
                    {emptyAggrBlocks}
                </div>
                {aggregationBlocks}
            </div>
        )
    }
}

export default AggregationList;
