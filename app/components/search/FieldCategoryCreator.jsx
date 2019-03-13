import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';

import PropTypes from 'prop-types';

//TODO the multi select component could be made more fancy
class FieldCategoryCreator extends React.PureComponent {

	constructor(props) {
		super(props);
        this.state = {
            filteredCategories :
                ComponentUtil.getSafe(
                    () => this.props.collectionConfig.getCollectionStats().collection_statistics.document_types[0].fields.text,
                    []
                )
        }
	}

	onOutput() {
		if(this.props.onOutput) {
			const s = document.getElementById('field_selector');
			const fields = [];
			let fieldCategory = null;
			for(let i=0;i<s.selectedOptions.length;i++) {
				fields.push(s.selectedOptions[i].value);
			}
			if(fields.length > 0) {
				fieldCategory = {
					id : this.clusterName.value,
					label : this.clusterName.value,
					fields : fields
				}
			}
			this.props.onOutput(this.constructor.name, fieldCategory);
		}
	}

    filterFields = (arr, str) => arr.filter(item => item.includes(str));

    onKeywordFilter = (e) => {
        const stats = this.props.collectionConfig.getCollectionStats();
        const newCategorySet = this.filterFields(stats.collection_statistics.document_types[0].fields.text, e.target.value);

        this.setState({
            filteredCategories: newCategorySet
        })
    };

	render() {
        const sortedCategories = this.state.filteredCategories.map(
            field => (
                {'value': field, 'prettyName': this.props.collectionConfig.toPrettyFieldName(field)})
        );
        sortedCategories.sort((a,b) => (a.prettyName > b.prettyName) ? 1 : -1);
        const options = sortedCategories.map((field, index) =>
				<option id={index} value={field.value}>{field.prettyName}</option>
        );

		return (
			<div className={IDUtil.cssClassName('field-category-creator')}>
					<label htmlFor="field_selector">Select one or more fields to include</label>
                    <div className="input-group">
                        <input type="text"
                               className="form-control"
                               placeholder="Search fields"
                               onChange={this.onKeywordFilter}
                        />
                        <span className="input-group-addon btn-effect"><i className="fa fa-search"/></span>
                    </div>
					<select className="form-control" multiple id="field_selector">
						{options}
					</select>
					<label htmlFor="cluster_name">Cluster name</label>
					<input
						className="form-control"
						id="cluster_name"
                        ref={input => (this.clusterName = input)}
						type="text"
						placeholder="Cluster name"/>
					<button className="btn btn-primary" onClick={this.onOutput.bind(this)} type="button">Choose</button>
			</div>
		)
	}

}

FieldCategoryCreator.propTypes = {
	collectionConfig: PropTypes.object.isRequired,
	onOutput : PropTypes.func.isRequired
};

export default FieldCategoryCreator;
