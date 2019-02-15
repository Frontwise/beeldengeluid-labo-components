import IDUtil from '../../util/IDUtil';

//See: https://github.com/mohsen1/json-formatter-js

class MetadataTablePreview extends React.Component {
	constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'mdt';
	}

	render() {
		let poster = null;
		let specialProperties = null;
		//get the special properties that are important to show for this collection
		if(this.props.data.specialProperties) {
			specialProperties = Object.keys(this.props.data.specialProperties).map((key, index)=> {
				return (
					<tr className={IDUtil.cssClassName('special-props', this.CLASS_PREFIX)} key={'props__' + index}>
						<td><label>{key}:</label></td>
						<td dangerouslySetInnerHTML={{__html : this.props.data.specialProperties[key]}}></td>
					</tr>
				);
			});
		}

		//get the poster if any
		if(this.props.data.posterURL) {
			poster = (<tr className={IDUtil.cssClassName('poster', this.CLASS_PREFIX)}>
				<td><label>Poster</label></td>
				<td>
					<div style={{width: '200px'}}>
						<img src={this.props.data.posterURL} alt="poster" style={{width:'100%'}}/>
					</div>
				</td>
			</tr>);
		}

		//determine the component's main css classes
		const classNames = ['table', IDUtil.cssClassName('metadata-table')];

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
						<td>{this.props.data.title ? this.props.data.title : 'No title available'}</td>
					</tr>
					<tr className={IDUtil.cssClassName('date', this.CLASS_PREFIX)}>
						<td><label>Date</label></td>
						<td>{this.props.data.date}</td>
					</tr>
					<tr className={IDUtil.cssClassName('description', this.CLASS_PREFIX)}>
						<td><label>Description</label></td>
						<td>{this.props.data.description ? this.props.data.description : 'No description available'}</td>
					</tr>
					{specialProperties}
				</tbody>
			</table>
		);
	}

}

export default MetadataTablePreview;