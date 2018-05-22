import QueryModel from '../../model/QueryModel';

import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import CollectionUtil from '../../util/CollectionUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';

import CollectionSelector from '../collection/CollectionSelector';
import QueryBuilder from './QueryBuilder';

import FlexModal from '../FlexModal';
import FlexBox from '../FlexBox';

import PropTypes from 'prop-types';

/*

OUTPUT:
	which queries have been selected

*/

class QueryFactory extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			openQueries : [], //TODO this should listen to something like: loadedQueries
			openQueryData : {}
		}
		this.CLASS_PREFIX = 'qf';
	}

	//this loads default queries for the this.props.initialCollections
	//TODO probably move this to the comparative search recipe, components should not load data. Recipes should
	componentDidMount() {
		if(this.props.initialCollections) {
			CollectionUtil.generateCollectionConfigs(
				this.props.clientId,
				this.props.user,
				this.props.initialCollections,
				this.onConfigsLoaded.bind(this)
			);
		}
	}

	onConfigsLoaded(configs) {
		const openQueries = []
		const openQueryData = {}
		configs.forEach((conf) => {
			const queryId = IDUtil.guid();
			openQueries.push(queryId);
			openQueryData[queryId] = {
				query : QueryModel.ensureQuery({id : queryId, size: this.props.pageSize}, conf),
				collectionConfig : conf
			};
		});
		this.setState({
			openQueries : openQueries,
			openQueryData : openQueryData
		});
	}

	/* ------------------------------------------------------------------------------
	------------------------------- COMMUNICATION WITH OWNER/RECIPE -----------------
	------------------------------------------------------------------------------- */

	//the output of this component is whatever comes back from a QueryBuilder component
	onOutput(data) {
		//passes along the output to the owner (if specified in the props)
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, data);
		}
	}

	//connected to the onOutput of the CollectionSelector & each QueryBuilder component
	onComponentOutput(componentClass, data) {
		if(componentClass == 'CollectionSelector') {
			const oq = this.state.openQueries;
			const queryId = IDUtil.guid().replace(/-/g, '');
			oq.push(queryId)

			const oqd = this.state.openQueryData;
			oqd[queryId] = {
				query : QueryModel.ensureQuery({id : queryId, size : this.props.pageSize}, data),
				collectionConfig : data
			}

			this.setState(
				{
					openQueries : oq,
					openQueryData : oqd
				},
				ComponentUtil.hideModal(this, 'showModal', 'collection__modal', true)
			);
		} else if(componentClass == 'QueryBuilder') {
			//output the data to the parent component
			this.onOutput(data);

			//store the just executed query, so the user can save it later
			const oqd = this.state.openQueryData;
			if(data.query.id && oqd[data.query.id]) {
				oqd[data.query.id]['queryParams'] = data.query;
				this.setState({
					openQueryData : oqd
				});
			}

		}
	}

	closeQuery(queryId) {
		const oq = this.state.openQueries;
		const index = oq.indexOf(queryId);

		const oqd = this.state.openQueryData;
		delete oqd[queryId]
		if(index != -1) {
			oq.splice(index, 1);
			this.setState(
				{
					openQueries : oq,
					openQueryData : oqd
				},
				this.onOutput({queryId : queryId, deleted : true})
			);
		}
	}

	/* ---------------------- RENDER ------------------- */

	render() {
		let collectionModal = null;

		//collection modal
		if(this.state.showModal) {
			collectionModal = (
				<FlexModal
					elementId="collection__modal"
					stateVariable="showModal"
					owner={this}
					size="large"
					title="Select a collection">
						<CollectionSelector
							onOutput={this.onComponentOutput.bind(this)}
							showSelect={true}
							showBrowser={true}/>
				</FlexModal>
			)
		}

		//for drawing the tabs
		const cells = this.state.openQueries.map(function(queryId, index) {

			const queryData = this.state.openQueryData[queryId];
			let title = queryData.query.collectionId;
			if(queryData.collectionConfig.collectionInfo) {
				title = queryData.collectionConfig.collectionInfo.title;
			}

			//console.debug(queryData.query)
			return (
				<div key={queryId + '__qbw'} className={IDUtil.cssClassName('cell', this.CLASS_PREFIX)}>
					<h5>
						{'Search through: '+ queryData.collectionConfig.collectionInfo.title}
						&nbsp;
						<i className="fa fa-close" style={{float : 'right'}}
							onClick={this.closeQuery.bind(this, queryId)}>
						</i>
					</h5>
					<QueryBuilder
						key={queryId + '__qb'} //for resetting all the states held within after selecting a new collection

						//UI options not relevant for querying
						header={false}
						aggregationView={this.props.aggregationView}
						dateRangeSelector={this.props.dateRangeSelector}
						showTimeLine={false}

						query={queryData.query}
						collectionConfig={queryData.collectionConfig}

						onOutput={this.onComponentOutput.bind(this)}/>
				</div>
			)
		}, this);

		return (
			<div className={IDUtil.cssClassName('query-factory')}>
				<button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
					Add query&nbsp;<i className="fa fa-plus"></i>
				</button>
				<div className={IDUtil.cssClassName('scrollwindow', this.CLASS_PREFIX)}>
					<div className={IDUtil.cssClassName('grid', this.CLASS_PREFIX)}>
						{cells}
					</div>
				</div>
				{collectionModal}
			</div>
		)
	}
}

QueryFactory.propTypes = {
	clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    })

};

export default QueryFactory;