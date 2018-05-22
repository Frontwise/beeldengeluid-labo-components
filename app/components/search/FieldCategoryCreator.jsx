import IDUtil from '../../util/IDUtil';

import PropTypes from 'prop-types';

//TODO the multi select component could be made more fancy
class FieldCategoryCreator extends React.PureComponent {

	constructor(props) {
		super(props);
	}

	onOutput() {
		if(this.props.onOutput) {
			const s = document.getElementById('field_selector');
			let fields = []
			let fieldCategory = null;
			for(let i=0;i<s.selectedOptions.length;i++) {
				fields.push(s.selectedOptions[i].value);
			}
			if(fields.length > 0) {
				fieldCategory = {
					id : this.refs.clusterName.value,
					label : this.refs.clusterName.value,
					fields : fields
				}
			}
			this.props.onOutput(this.constructor.name, fieldCategory);
		}
	}

	render() {
		const stats = this.props.collectionConfig.getCollectionStats();
		const options = stats.collection_statistics.document_types[0].fields.text.sort().map((field, index) => {
			return (
				<option id={index} value={field}>{this.props.collectionConfig.toPrettyFieldName(field)}</option>
			)
		});
		return (
			<div className={IDUtil.cssClassName('field-category-creator')}>
				<form onSubmit={this.onOutput.bind(this)}>
					<label for="field_selector">Select one or more fields to include</label>
					<select className="form-control" multiple id="field_selector">
						{options}
					</select>
					<label for="cluster_name">Cluster name</label>
					<input
						className="form-control"
						id="cluster_name"
						ref="clusterName"
						type="text"
						placeholder="Cluster name"/>
					<button className="btn btn-primary" type="submit">Choose</button>
				</form>
			</div>
		)
	}

}

FieldCategoryCreator.propTypes = {
	collectionConfig: PropTypes.object.isRequired,
	onOutput : PropTypes.func.isRequired
}

export default FieldCategoryCreator;