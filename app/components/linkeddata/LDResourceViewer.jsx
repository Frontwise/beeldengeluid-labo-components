import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import FlexRouter from '../../util/FlexRouter';

import LinkedDataAPI from '../../api/LinkedDataAPI';

import QueryModel from '../../model/QueryModel';

import PropTypes from 'prop-types';

class LDResourceViewer extends React.PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			data : null
		}
		this.CLASS_PREFIX = 'ldrv';
	}

	componentDidMount() {
		LinkedDataAPI.describe(
			this.props.resourceId,
			this.props.collectionConfig.getCollectionId(),
			this.onLoadData.bind(this)
		)
	}

	onLoadData(data) {
		console.debug(data)
		this.setState({
			data : data
		})
	}

	queryEntity(property) {
		console.debug(property);
		const query = QueryModel.ensureQuery({
			id : this.props.collectionConfig.getCollectionId(),
			term : this.props.searchTerm,
			desiredFacets : [{
				field: "@graph.dcterms:contributor.keyword",
				id: "contributor",
				title: "Contributor",
				type: "string"
			}],
			selectedFacets : {
				"@graph.dcterms:contributor.keyword": [
					property.o
				]
			}
		}, this.props.collectionConfig)

		console.debug(query)
		ComponentUtil.storeJSONInLocalStorage(
			'user-last-query',
			query
		);

		FlexRouter.gotoSingleSearch('cache')
	}

	render() {
		let contents = null;
		if(this.state.data) {
			if(this.state.data.length > 0) {
				contents = (
					<ul className={IDUtil.cssClassName('property-list', this.CLASS_PREFIX)}>
						{this.state.data.map(prop => {
							return (
								<li className="property" onClick={this.queryEntity.bind(this, prop)}>
									<div className="predicate">{prop.p}</div>
									<div className="value">{prop.o}</div>
								</li>
							)
						})}
					</ul>
				);
			} else {
				contents = (
					<div className={IDUtil.cssClassName('info', this.CLASS_PREFIX)}>
						No links found, find out more about our linked data cloud <a href="#" target="_ld-info">here</a>
					</div>
				)
			}
		} else {
			contents = (
				<div className={IDUtil.cssClassName('info', this.CLASS_PREFIX)}>
					Querying the linked data cloud
				</div>
			);
		}
		return (
			<div className={IDUtil.cssClassName('ld-resource-viewer')}>
				{contents}
			</div>
		)
	}
}

LDResourceViewer.PropTypes = {

	resourceId: PropTypes.string.isRequired,

	searchTerm: PropTypes.string,

	collectionConfig: PropTypes.object.isRequired
}

export default LDResourceViewer;