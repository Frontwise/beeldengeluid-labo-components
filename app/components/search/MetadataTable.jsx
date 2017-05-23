import JSONFormatter from 'json-formatter-js'
import IDUtil from '../../util/IDUtil';

//See: https://github.com/mohsen1/json-formatter-js

class MetadataTable extends React.Component {

	constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'mdt';
	}

	componentDidMount() {
		let formatter = new JSONFormatter(this.props.data.rawData);
		formatter.openAtDepth(Infinity);
		document.getElementById('__rawdata_' + IDUtil.hashCode(this.props.data.resourceId)).appendChild(formatter.render());
	}

	render() {
		let poster = null;
		let source = null;
		let specialProperties = null;
		//get the special properties that are important to show for this collection
		if(this.props.data.specialProperties) {
			specialProperties = Object.keys(this.props.data.specialProperties).map((key, index)=> {
				return (
					<tr className={IDUtil.cssClassName('special-props', this.CLASS_PREFIX)} key={'props__' + index}>
						<td><label>{key}:</label></td>
						<td>{this.props.data.specialProperties[key]}</td>
					</tr>
				);
			});
		}

		//get the poster if any
		if(this.props.data.posterURL) {
			poster = (<tr className={IDUtil.cssClassName('poster', this.CLASS_PREFIX)}>
				<td><label>Poster</label></td>
				<td><img src={this.props.data.posterURL} alt="poster" style={{height:'100px'}}/></td>
			</tr>);
		}

		//get the source URL if any
		if(this.props.data.sourceURL) {
			source = (<tr className={IDUtil.cssClassName('source', this.CLASS_PREFIX)}>
				<td><label>Source</label></td>
				<td><a href={this.props.data.sourceURL} target="_source">View in catalogue</a></td>
			</tr>)
		}

		//determine the component's main css classes
		let classNames = ['table', IDUtil.cssClassName('metadata-table')];

		return (
			<table className={classNames.join(' ')}>
				<tbody>
					{poster}
					<tr className={IDUtil.cssClassName('id', this.CLASS_PREFIX)}>
						<td><label>ID</label></td>
						<td>{this.props.data.resourceId}</td>
					</tr>
					<tr className={IDUtil.cssClassName('index', this.CLASS_PREFIX)}>
						<td><label>Index</label></td>
						<td>{this.props.data.index}&nbsp;(type: {this.props.data.docType})</td>
					</tr>
					<tr className={IDUtil.cssClassName('title', this.CLASS_PREFIX)}>
						<td><label>Title</label></td>
						<td>{this.props.data.title ? this.props.title : 'No title available'}</td>
					</tr>
					<tr className={IDUtil.cssClassName('date', this.CLASS_PREFIX)}>
						<td><label>Date</label></td>
						<td>{this.props.data.date}</td>
					</tr>
					<tr className={IDUtil.cssClassName('description', this.CLASS_PREFIX)}>
						<td><label>Description</label></td>
						<td>{this.props.data.description ? this.props.data.description : 'No description available'}</td>
					</tr>
					{source}
					{specialProperties}
					<tr>
						<td><label>All data</label></td>
						<td>
							<div className={IDUtil.cssClassName('raw-data', this.CLASS_PREFIX)} id={'__rawdata_' + IDUtil.hashCode(this.props.data.resourceId)}></div>
						</td>
					</tr>
				</tbody>
			</table>
		);
	}

}

export default MetadataTable;