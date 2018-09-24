import IDUtil from '../../util/IDUtil';
import LinkedDataAPI from '../../api/LinkedDataAPI';
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
		this.setState({
			data : data
		})
	}

	queryEntity(property) {
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, {
				field : this.props.collectionConfig.predicateToIndexField(property.p),
				value : property.o
			})
		}
	}

	render() {
		let contents = null;
		if(this.state.data) {
			if(this.state.data.length > 0) {
				contents = (
					<ul className={IDUtil.cssClassName('property-list', this.CLASS_PREFIX)}>
						{this.state.data.map(prop => {
							const classNames = ['property'];
							if(this.props.collectionConfig.predicateToIndexField(prop.p)) {
								classNames.push('keyword')
							}
							return (
								<li className={classNames.join(' ')} onClick={this.queryEntity.bind(this, prop)}>
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