import AggregationCreator from './AggregationCreator';
import FlexModal from '../FlexModal';
import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
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
        const btnText = document.querySelectorAll("#index__" + index + " .switchViewText")[0].textContent
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

    toggleDesiredFacet(key, index) {
        this.currentFacet = key;
        document.querySelector("#facets__"+ index).addEventListener("click", function(event) {
            event.preventDefault();
        }, {once:true});
        ComponentUtil.showModal(this, 'showModalWarning', 'field_select_facet__modal', true);
    }

    sorting(arr, order="asc", type="alpha", index){
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
        this.setState(
            {
                facetItems: {
                    ...this.state.facetItems,
                    index: currentFacets
                }
            });
    }
    hideFacet(){
        const desiredFacets = this.props.desiredFacets;
        for (let i = desiredFacets.length - 1; i >= 0; i--) {
            if (desiredFacets[i].field === this.currentFacet) {
                desiredFacets.splice(i, 1);
                break;
            }
        }
        this.onOutput(desiredFacets, this.props.selectedFacets);
        ComponentUtil.hideModal(this, 'showModalWarning' , 'field_select_facet__modal', true);
    }
    render() {
        const facets = [],
            nonDateAggregations = this.props.desiredFacets.filter(aggr => aggr.type !== 'date_histogram');
        let aggregationCreatorModal = null,
            aggregationModalWarning = null,
            selectedOpts = {},

            nrCheckedOpts = 0,
            opts = [],
            emptyAggregations = [],
            emptyAggrBlock = [];

        //collection modal
        if (this.state.showModal) {
            aggregationCreatorModal = (
                <FlexModal
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
        //Hide facet modal
        if (this.state.showModalWarning) {
            aggregationModalWarning = (
                <FlexModal
                    elementId="field_select_facet__modal"
                    stateVariable="showModalWarning"
                    owner={this}
                    title="Hide current facet">
                 <div><h5>You are closing (hiding) the current facet for "<u>{this.currentFacet}</u>".</h5>
                     <h5>You can bring it back by using the “New” facet option and searching for the same field name again”</h5>
                     <br/>
                     <button type="button" onClick={this.hideFacet.bind(this)} className="btn btn-default">Hide</button>

                 </div>
                </FlexModal>
            )
        }
        nonDateAggregations.forEach((key, index) => {
            let sortedOpts = [],
                options = null;
            if (this.props.aggregations[key['field']] && this.props.aggregations[key['field']].length > 0) {
                options = this.props.aggregations[key['field']].map((facet, fIndex) => {
                    const value = facet.date_millis ? facet.date_millis : facet.key,
                        facetId = key['field'] + '|' + value;
                    let checkedOpt = false;

                    if (this.props.selectedFacets[key['field']]) {
                        if (checkedOpt = this.props.selectedFacets[key['field']].indexOf(value) > -1) {
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
                                       onClick={this.toggleSelectedFacet.bind(this, key['field'], facet.key)}/>
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
            } else if (this.props.aggregations[key['field']] && this.props.aggregations[key['field']].length === 0) {
                emptyAggregations.push(
                    {
                        "aggregationField": key['field'],
                        "formattedAggregationName": ElasticsearchDataUtil.getAggregationTitle(key['field'], this.props.facets)
                    }
                )
            }

            if(emptyAggregations.length > 0) {
                let tip = null;
                emptyAggregations.map((key, value) => {
                    tip = 'tooltip__' + value;
                    emptyAggrBlock.push((
                        <div className="checkboxGroup aggregation-no-results" key={'facet__' + index} id={'index__' + index}>
                            <h4>{key.formattedAggregationName} (0)
                                <span data-for={tip} data-tip={key.aggregationField} data-html={true}>
							    <i className="fa fa-info-circle"/>
						    </span>
                                <span className="fa fa-remove" onClick={this.toggleDesiredFacet.bind(this, key.aggregationField, tip)}/>
                            </h4>
                            <ReactTooltip id={'tooltip__' + value}/>
                        </div>
                    ))
                })
            }
            const totalOptsPerFacet = sortedOpts.length;
            if (totalOptsPerFacet > 0) {
                let changeViewItems = null,
                    hiddenCheckboxes = 0;

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
                    facetName = ElasticsearchDataUtil.getAggregationTitle(key['field'], this.props.facets),
                    headers = [
                        {label: 'Value', key: 'key'},
                        {label: 'Count', key: 'doc_count'}
                    ];

                facets.push((
                    <div className="checkboxGroup" key={'facet__' + index} id={'index__' + index}>
                        <div className="bg__hamburger-facets-container">
                            <input type="checkbox" id={facetId}/>
                            <label htmlFor={facetId}>
                                <span className="bg__facet-title" data-for={'tooltip__' + index} data-tip={key['field']}
                                      data-html={true}>
                                   <i className="fa fa-info-circle"/> {facetName}

						    </span>
                                <span className="fa fa-remove" onClick={this.toggleDesiredFacet.bind(this, key['field'], index)}/>
                                <div className="hb">
                                    <div className="hb-line hb-line-top"></div>
                                    <div className="hb-line hb-line-center"></div>
                                </div>
                            </label>
                            <ul className={facetId}>
                                <li title="Alphanumeric descending" onClick={this.sorting.bind(this, this.props.aggregations[key['field']], 'desc', "alpha", key['field'])}>
                                    <i className="fa fa-sort-alpha-desc fa-lg" aria-hidden="true"/>
                                </li>
                                <li title="Alphanumeric ascending" onClick={this.sorting.bind(this, this.props.aggregations[key['field']], 'asc', "alpha", key['field'])}>
                                    <i className="fa fa-sort-alpha-asc fa-lg" aria-hidden="true"/> </li>
                                <li title="Numeric Asceding" onClick={this.sorting.bind(this, this.props.aggregations[key['field']], 'asc', "non-alpha", key['field'])}>
                                    <i className="fa fa-sort-numeric-asc fa-lg" aria-hidden="true"></i> </li>
                                <li title="Numeric descending" onClick={this.sorting.bind(this, this.props.aggregations[key['field']], 'desc', "non-alpha", key['field'])}>
                                    <i className="fa fa-sort-numeric-desc fa-lg" aria-hidden="true"></i> </li>
                                <li title="Download as CSV" onClick={this.sorting.bind(this, this.props.aggregations[key['field']], 'desc', "non-alpha", key['field'])}>
                                    <CSVLink filename={facetName} headers={headers} data={this.props.aggregations[key['field']]} >
                                        <i className="fa fa-download" aria-hidden="true"></i>
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
                ))

                //List of selected facets on top
                if (this.props.selectedFacets.hasOwnProperty(key['field'])) {
                    for (var entry in this.props.selectedFacets[key['field']]) {
                        var facetName = this.props.selectedFacets[key['field']][entry];
                        var hits = 0
                        if (selectedOpts.hasOwnProperty(facetName)) {
                            var hits = selectedOpts[facetName];
                        }
                        opts.push(
                        <div className={IDUtil.cssClassName('selected-item', this.CLASS_PREFIX)}>
                            {facetName.toUpperCase()} ({hits})
                            <span className="fa fa-remove" onClick={this.toggleSelectedFacet.bind(this, key['field'], facetName)}/>
                        </div>
                        )
                    }
                }
            }
            nrCheckedOpts = 0;
            selectedOpts = [];
            emptyAggregations = [];
        });

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