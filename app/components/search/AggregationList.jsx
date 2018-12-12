import AggregationCreator from './AggregationCreator';
import FlexModal from '../FlexModal';
import IDUtil from '../../util/IDUtil';
import ComponentUtil from "../../util/ComponentUtil";
import ReactTooltip from 'react-tooltip';
import {CSVLink, CSVDownload} from 'react-csv';

//this component draws the aggregations (a.k.a. facets) and merely outputs the user selections to the parent component
class AggregationList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            showModal: false,
            showModalWarning: false,
            facetItems: this.props.aggregations || null
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

    __changeBtnContext(t) {
        document.querySelector("#index__" + t.index + " .switchIcon").classList.remove(t.classToRemove);
        document.querySelector("#index__" + t.index + " .switchIcon").classList.add(t.classToAdd);
        document.querySelector("#index__" + t.index + " .switchViewText").textContent = t.text;
    }

    __setViewItems(index, option) {
        const currentStatus = option === 'more' ?
            {
                'text': 'Show More',
                'symbol': 'switchIcon glyphicon glyphicon-plus'
            } :
            {
                'text': 'Show Less',
                'symbol': 'switchIcon glyphicon glyphicon-minus'
            };

        return (
            <a className="switchView" onClick={this.switchListView.bind(this, index)}>
                <span className="switchViewText">{currentStatus.text}</span>
                <span className={currentStatus.symbol} aria-hidden="true"/>
            </a>
        )
    }

    switchListView(index) {
        const btnText = document.querySelectorAll("#index__" + index + " .switchViewText")[0].textContent;
        const jCurrentList = Array.from(document.querySelectorAll("#index__" + index + " ul > li[class='bg__agl__facet-item']"));
        let currentlyChecked = 0;

        if (btnText === "Show More") {
            this.__changeBtnContext({
                index: index,
                text: "Show Less",
                classToRemove: "glyphicon-plus",
                classToAdd: "glyphicon-minus"
            });
            jCurrentList.map((item) => {
                item.hidden = false;
            });
        } else {
            // hide elements after clicking Show Less based on min already set or the current number of selected opts.
            currentlyChecked = document.querySelectorAll("#index__" + index + ' input[type="checkbox"]:checked').length;
            currentlyChecked = currentlyChecked > this.minToShow ? currentlyChecked : this.minToShow;
            jCurrentList.map((item, index) => {
                if (index >= currentlyChecked) {
                    item.hidden = true;
                }
            });
            this.__changeBtnContext({
                index: index,
                text: "Show More",
                classToRemove: "glyphicon-minus",
                classToAdd: "glyphicon-plus"
            });
        }
    }

    //FIXME this does not work yet for removing empty aggregations!
    showRemoveDialog(key, index) {
        this.currentFacet = key;
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

    toggleExcludeFacets(index) {
        this.props.desiredFacets[index]['exclude'] = !this.props.desiredFacets[index]['exclude'];
        this.onOutput(this.props.desiredFacets, this.props.selectedFacets);
    }

    sorting(arr, order="asc", type="alpha", index) {
        const currentFacets = arr;
        let facetA, facetB;
        arr.sort(function (a, b) {
            //define order
            if(type === "alpha") {
                if (order === 'desc') {
                    facetA = b.key.toLowerCase(), facetB = a.key.toLowerCase();
                } else {
                    facetA = a.key.toLowerCase(), facetB = b.key.toLowerCase();
                }
            } else {
                if (order === 'desc') {
                    facetA = b.doc_count, facetB = a.doc_count;
                } else {
                    facetA = a.doc_count, facetB = b.doc_count;
                }
            }
            return (facetA < facetB ? -1 : 1);
        });

        //FIXME this is not a nice way to update the properties!
        const aggregationsFromProps = {
            ...this.state.facetItems,
            index: currentFacets
        };

        this.setState({facetItems: aggregationsFromProps});
    }

    render() {
        let emptyAggrBlock = null; //contains aggregations without any results
        const facets = [];
        const opts = [];
        const nonDateAggregations = !this.props.desiredFacets ? [] : this.props.desiredFacets.filter(
            aggr => aggr.type !== 'date_histogram'
        );

        let aggregationCreatorModal = null;
        let aggregationModalWarning = null;
        let selectedOpts = [];
        let nrCheckedOpts = 0;
        let emptyAggregations = [];

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

        //only display aggregation blocks for non histogram facets
        nonDateAggregations.forEach((aggr, index) => {
            if (this.props.desiredFacets[index].exclude === undefined) {
                this.props.desiredFacets[index]['exclude'] = false;
            }
            const sortedOpts = [];
            let options = null;

            if (this.props.aggregations[aggr['field']] && this.props.aggregations[aggr['field']].length > 0) {

                if (this.props.selectedFacets[aggr['field']]) {
                    //Check if all selected facets are in the aggregations-list, if not, add doc_count 0
                    this.props.selectedFacets[aggr['field']].forEach((selectedKey, sIndex) => {
                        let found = false;
                        this.props.aggregations[aggr['field']].forEach((searchKey, oIndex) => {
                            if(searchKey['key'] === selectedKey){
                                found = true;
                            }
                        });
                        if(!found){
                            this.props.aggregations[aggr['field']].push({'key':selectedKey, 'doc_count': 0});
                        }
                    });
                }

                //determine the selected options per aggregation (if not empty)
                options = this.props.aggregations[aggr['field']].map((facet, fIndex) => {
                    const value = facet.date_millis ? facet.date_millis : facet.key;
                    const facetId = aggr['field'] + '|' + value;
                    let checkedOpt = false;

                    if (this.props.selectedFacets[aggr['field']]) {
                        if (checkedOpt = this.props.selectedFacets[aggr['field']].indexOf(value) > -1) {
                            selectedOpts[facet.key] = facet.doc_count;
                            nrCheckedOpts++;
                        }
                    }

                    return (
                        <li key={'facet__' + index + '__' + fIndex} hidden={!checkedOpt}
                            className={IDUtil.cssClassName('facet-item', this.CLASS_PREFIX)}>
                            <div className="checkbox">
                                <input id={facetId}
                                       type="checkbox"
                                       checked={checkedOpt}
                                       onChange={this.toggleSelectedFacet.bind(this, aggr['field'], facet.key)}/>
                                <label>
                                    <span> </span>
                                    {facet.key}&nbsp;({facet.doc_count})
                                </label>
                            </div>
                        </li>
                    )

                });

                // placing checked options on top of list.
                let nrCheckedOpt = 0;
                options.forEach(function (item) {
                    if (item.props.children.props.children[0].props.checked) {
                        nrCheckedOpt++;
                        sortedOpts.unshift(item);
                    } else {
                        sortedOpts.push(item);
                    }
                });

            } else if (this.props.aggregations[aggr['field']] && this.props.aggregations[aggr['field']].length === 0) {
                //if the desired aggregation is empty, add it to the list of empty aggregations
                console.debug('FOUND AN EMPTY AGGREGATION', aggr['field'])
                emptyAggregations.push({
                    field: aggr['field'],
                    formattedTitle: aggr['title'],
                    index: index
                })
            }

            if (sortedOpts.length > 0) {
                let changeViewItems = null;
                let hiddenCheckboxes = 0;

                sortedOpts.map((item, index) => {
                    if (nrCheckedOpts < this.minToShow && index < this.minToShow) {
                        item.props.hidden = false;
                    } else {
                        hiddenCheckboxes++;
                    }
                });

                if (hiddenCheckboxes) {
                    changeViewItems = this.__setViewItems(index, 'more');
                }
                const facetId = "facets__" + index,
                    headers = [
                        {label: 'Value', key: 'key'},
                        {label: 'Count', key: 'doc_count'}
                    ];
                facets.push((
                    <div className={IDUtil.cssClassName('hamburger-header', this.CLASS_PREFIX)}
                        key={'facet__' + index} id={'index__' + index}>
                        <div className={IDUtil.cssClassName('hamburger-menu', this.CLASS_PREFIX)}>
                            <input className="hamburger-toggle" type="checkbox" id={facetId}/>
                            <label htmlFor={facetId}>
                                <span className="bg__facet-title" data-for={'tooltip__' + index} data-tip={aggr['field']}
                                      data-html={true}>
                                   <i className="fa fa-info-circle"/> {aggr['title']}
						                    </span>

                                <span className="fa fa-remove" onClick={
                                    this.showRemoveDialog.bind(this, aggr['field'], index)
                                }/>
                                <div className="hb">
                                    <div className="hb-line hb-line-top"/>
                                    <div className="hb-line hb-line-center"/>
                                </div>
                            </label>
                            <ul className={facetId}>
                                <li className={IDUtil.cssClassName('aggregationSwitchBtn', this.CLASS_PREFIX)}>
                                    <span className="ms_toggle_btn">
                                        <input
                                            type="checkbox"
                                            id={aggr['field']}
                                            className="checkbox-toggle checkbox-toggle-round"
                                            checked={this.props.desiredFacets[index]['exclude']}
                                            onChange={this.toggleExcludeFacets.bind(this, index)}
                                        />
                                    <label htmlFor={aggr['field']} data-on="Excl" data-off="Incl"/></span>
                                </li>
                                <li title="Alphanumeric descending" onClick={
                                    this.sorting.bind(this, this.props.aggregations[aggr['field']], 'desc', "alpha", aggr['field'])
                                }>
                                    <i className="fa fa-sort-alpha-desc fa-lg" aria-hidden="true"/>
                                </li>
                                <li title="Alphanumeric ascending" onClick={
                                    this.sorting.bind(this, this.props.aggregations[aggr['field']], 'asc', "alpha", aggr['field'])
                                }>
                                    <i className="fa fa-sort-alpha-asc fa-lg" aria-hidden="true"/> </li>
                                <li title="Numeric Asceding" onClick={
                                    this.sorting.bind(this, this.props.aggregations[aggr['field']], 'asc', "non-alpha", aggr['field'])
                                }>
                                    <i className="fa fa-sort-numeric-asc fa-lg" aria-hidden="true"/> </li>
                                <li title="Numeric descending" onClick={
                                    this.sorting.bind(this, this.props.aggregations[aggr['field']], 'desc', "non-alpha", aggr['field'])
                                }>
                                    <i className="fa fa-sort-numeric-desc fa-lg" aria-hidden="true"/> </li>

                                <li title="Download as CSV" onClick={
                                    this.sorting.bind(this, this.props.aggregations[aggr['field']], 'desc', "non-alpha", aggr['field'])
                                }>
                                    <CSVLink filename={aggr['title']} headers={headers} data={this.props.aggregations[aggr['field']]}>
                                        <i className="fa fa-download" aria-hidden="true"/>
                                    </CSVLink>
                                </li>
                            </ul>
                        </div>
                        <ul className={IDUtil.cssClassName('facet-group', this.CLASS_PREFIX)}>
                            {sortedOpts}
                        </ul>
                        {changeViewItems}
                        <ReactTooltip id={'tooltip__' + index}/>
                    </div>
                ));

                //List of selected facets on top
                if (this.props.selectedFacets.hasOwnProperty(aggr['field'])) {
                    for (var entry in this.props.selectedFacets[aggr['field']]) {
                        var facetName = this.props.selectedFacets[aggr['field']][entry];
                        var label = facetName;

                        var hits = 0
                        if (selectedOpts.hasOwnProperty(facetName)) {
                            var hits = selectedOpts[facetName];
                        }

                        if (this.props.desiredFacets[index]['exclude'] === true){
                            label = "NOT - "+label;
                            hits = 0;
                        }

                        opts.push(
                        <div className={IDUtil.cssClassName('selected-item', this.CLASS_PREFIX)}>
                            {label.toUpperCase()} ({hits})
                            <span className="fa fa-remove" onClick={this.toggleSelectedFacet.bind(this, aggr['field'], facetName)}/>
                        </div>
                        )
                    }
                }
            }
            nrCheckedOpts = 0;
            selectedOpts = [];
        }); // end foreach nonDateAggregations


        //render empty aggregations a separate block
        if(emptyAggregations.length > 0) {
            emptyAggrBlock = emptyAggregations.map((aggr, index) => {
                return (
                    <div className={IDUtil.cssClassName('hamburger-header aggregation-no-results', this.CLASS_PREFIX)}
                        key={'facet__' + aggr.index}
                        id={'index__' + aggr.index}>
                        <span data-for={'tooltip__' + aggr.index} data-tip={aggr.field} data-html={true}>
                            <i className="fa fa-info-circle"/>
                        </span>
                        <h4 className="bg__empty-facet">
                            (0) {aggr.formattedTitle}
                        </h4>
                        <span className="fa fa-remove" onClick={
                            this.showRemoveDialog.bind(this, aggr.field, aggr.index - 1)
                        }/>
                        <ReactTooltip id={'tooltip__' + aggr.index}/>
                    </div>
                )
            });
        }

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
                    {opts}
                    {emptyAggrBlock}
                </div>
                {facets}
            </div>
        )
    }
}

export default AggregationList;
