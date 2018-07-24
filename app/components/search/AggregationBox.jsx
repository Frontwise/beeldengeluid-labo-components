import AggregationCreator from './AggregationCreator';
import FlexModal from '../FlexModal';

import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import ReactTooltip from 'react-tooltip';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import Histogram from '../stats/Histogram';

/*

OUTPUT:
	- selected facets
	- desired facets

*/

//TODO this component is a couple of features behind the AggregationList

//this component draws the aggregations (a.k.a. facets) and merely outputs the user selections to the parent component
class AggregationBox extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showModal : false
		}
		this.CLASS_PREFIX = 'agb'
	}

    componentDidUpdate(prevProps, prevState){
		// Rebuild tooltip bindings only when they change (to avoid rebuilding for every non-related update).
		if(prevProps.aggregations !== this.props.aggregations) {
            ReactTooltip.rebuild()
        }
    }

	onComponentOutput(componentClass, data) {
		if(componentClass == 'AggregationCreator' && data) {
			const desiredFacets = this.props.desiredFacets;
			desiredFacets.push(data);
			this.onOutput(desiredFacets, this.props.selectedFacets);
			ComponentUtil.hideModal(this, 'showModal', 'field_select__modal', true);
		}
	}

	//communicates the desired & selected facets to the parent component
	onOutput(desiredFacets, selectedFacets) {
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, {
				desiredFacets : desiredFacets,
				selectedFacets : selectedFacets
			})
		}
	}

	toggleSelectedFacet(key, value, e) {
		const facets = this.props.selectedFacets;
		if(facets) {
			if(facets[key]) {
				const index = facets[key].indexOf(value);
				if(index == -1) {
					facets[key].push(value); //add the value
				} else {
					facets[key].splice(index, 1); // remove the value
					if(facets[key].length == 0) {
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

	toggleDesiredFacet(key) {
		const desiredFacets = this.props.desiredFacets;
		for(let i=desiredFacets.length-1;i>=0;i--) {
			if(desiredFacets[i].field == key) {
				desiredFacets.splice(i, 1);
				break;
			}
		}
		this.onOutput(desiredFacets, this.props.selectedFacets);
	}

	isSelected(key, value) {
		if(this.props.selectedFacets && this.props.selectedFacets[key]) {
			return this.props.selectedFacets[key].indexOf(value) != -1;
		}
		return false;
	}

	//now all types of aggregations are drawn as simple lists of checkboxes. This should be updated
	render() {
		let boxContents = null;
		let aggregationCreatorModal = null;
		const nonDateAggregations = this.props.desiredFacets.filter(aggr => aggr.type !== 'date_histogram');

		//collection modal
		if(this.state.showModal) {
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

		//draw a tab for each found aggregation (TODO make this actually the desired facets, so it's possible to show empty results)
		const tabs = nonDateAggregations.map((aggr, index) => {
            return (
                <li key={index + '__tab'} className={index == 0 ? 'active' : ''}>
                    <a data-toggle="tab" href={'#__aggr_' + IDUtil.hashCode(this.props.queryId + '-' + index)}>
						<span data-for={'__ci_tooltip'} data-tip={aggr.field} data-html={true}>
							<i className="fa fa-info-circle"></i>
						</span>
                        &nbsp;
                        {aggr.title}
                        &nbsp;
                        <span className="fa fa-remove" onClick={this.toggleDesiredFacet.bind(this, aggr.field)}></span>
                    </a>
                </li>
            )
		});

		//add a button for opening the collection selector last
		tabs.push(
			<li key={'new__tab'} className={IDUtil.cssClassName('tab-new', this.CLASS_PREFIX)}>
				<a href="javascript:void(0);" onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
					NEW&nbsp;<i className="fa fa-plus"></i>
				</a>
			</li>
		);

		//first draw the breadcrumb trail
		let breadcrumbs = null;
		if(this.props.selectedFacets) {
			const crumbs = Object.keys(this.props.selectedFacets).map((key, ki) => {
				return this.props.selectedFacets[key].map((value, vi) => {
					return (
						<div key={ki + '_' + vi} className={IDUtil.cssClassName('crumb', this.CLASS_PREFIX)} title={key}>
							{value}
							&nbsp;
							<i className="fa fa-close" onClick={this.toggleSelectedFacet.bind(this, key, value)}></i>
						</div>
					)
				});

			});
			breadcrumbs = (
				<div className={IDUtil.cssClassName('breadcrumbs', this.CLASS_PREFIX)}>
					{crumbs}
				</div>
			)
		}

		//the contents contain the actual facets
		const tabContents = nonDateAggregations.map((aggr, index) => {
			let visualisation = null;
            if (this.props.aggregations[aggr.field] && this.props.aggregations[aggr.field].length > 0) {
                //generate a word cloud for regular aggregations
                //TODO create a component for this!

                const terms = this.props.aggregations[aggr.field].map((aggrData) => {
                    const classNames = [IDUtil.cssClassName('tag-cloud-item', this.CLASS_PREFIX)]
                    if (this.isSelected(aggr.field, aggrData.key)) {
                        classNames.push('active');
                    }
                    return (
						<span
							key={aggr.field + '|' + aggrData.key} className={classNames.join(' ')}
							onClick={this.toggleSelectedFacet.bind(this, aggr.field, aggrData.key)}>
									{aggrData.key}&nbsp;({aggrData.doc_count})
							</span>
                    )
                }, this);
                visualisation = (
					<div className={IDUtil.cssClassName('tag-cloud', this.CLASS_PREFIX)}>
                        {terms}
					</div>
                )

            } else {
                //if there is no data found within the desired aggregation/facet
                visualisation = (
					<div>
						<br/>
						<div className="alert alert-danger">No data found for this aggregation</div>
					</div>
                )
            }

			return (
				<div key={index + '__tab_c'} id={'__aggr_' + IDUtil.hashCode(this.props.queryId + '-' + index)}
					className={index == 0 ? 'tab-pane active' : 'tab-pane'} style={{overflow: 'auto'}}>
					{visualisation}
				</div>
			);
		}, this);

		if(tabs.length > 0) {
			boxContents = (
				<div>
					{aggregationCreatorModal}
					{breadcrumbs}
					<ul className="nav nav-tabs">
						{tabs}
					</ul>
					<div className="tab-content">
						{tabContents}
                        <ReactTooltip id={'__ci_tooltip'}/>
					</div>
				</div>
			)
		}

		return (
			<div className={IDUtil.cssClassName('aggregation-box')}>
				{boxContents}
			</div>
		)
	}
}

export default AggregationBox;