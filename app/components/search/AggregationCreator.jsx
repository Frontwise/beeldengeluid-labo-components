import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import IDUtil from '../../util/IDUtil';
import { PowerSelect } from 'react-power-select';
/*
	INPUT:
		- an instance of CollectionConfig.jsx (for determining the available fields)
		- an onOutput function (for emitting the created aggregation)

	OUTPUT:
		- a new aggregation

	HTML markup & CSS attributes:
		- regular div ==> .bg__aggregation-creator
*/
class AggregationCreator extends React.Component {

	constructor(props) {
		super(props);
		const fieldList = this.getFieldList();
		this.state = {
			selectedField : fieldList && fieldList.length > 0 ? fieldList[0] : null
		}
	}

	componentDidMount() {
		if(this.state.selectedField) {
            this.labelRef.value = this.state.selectedField.label;
		}
	}

	onOutput(e) {
		e.preventDefault();
		if(this.state.selectedField && this.props.onOutput) {
			this.props.onOutput(this.constructor.name, {
				field: this.state.selectedField.value,
				title : this.labelRef.value, //FIXME this custom title is only stored in the query, but not remembered when creating a new query with the same aggregation...
				id : this.state.selectedField.value,
				type : 'string'
			});
		}
	}

	getFieldList() {
		let fields = this.props.collectionConfig.getKeywordFields();
		if(!fields) {
			fields = this.props.collectionConfig.getNonAnalyzedFields();
		}
		if(fields) {
			return fields.map(f => {
				return {
					value : f,
					label : this.props.collectionConfig.toPrettyFieldName(f)
				}
			}).sort((a,b) => {
				return a.label > b.label ? 1 : a.label < b.label ? -1 : 0;
			})
		}
		return null;
	}

	selectField(e) {
        this.labelRef.value =  e.option.label;
		this.setState({selectedField : e.option});
	}

	//TODO do something in case no fields could be retrieved in the config
	render() {
		let stringSelect = null;
		const fieldList = this.getFieldList();

		if(fieldList) {
            stringSelect = (
                <div className="form-group">
                    <div className="form-horizontal">
                        <label className="col-sm-3 modal-aggregation-label">Fields to create facets</label>
                        <div className="col-sm-9">
                            <PowerSelect
                                key="project_powerselect"
                                options={fieldList}
                                optionLabelPath="label"
                                selected={this.state.selectedField ? this.state.selectedField.label : null}
                                searchIndices={['label']}
                                onChange={this.selectField.bind(this)}
                                placeholder="-- Select a field -- "
							/>
                        </div>
                    </div>
                </div>
            );
		}

		return (
			<div className={IDUtil.cssClassName('aggregation-creator')}>
				<form className="form-horizontal" onSubmit={this.onOutput.bind(this)}>
					{stringSelect}
					<div className="form-group">
    					<label className="col-sm-3" htmlFor="label">Label</label>
    					<div className="col-sm-9">
    						<input ref={input => (this.labelRef = input)} type="text" className="form-control" id="label"/>
    					</div>
  					</div>
  					<button type="submit" className="btn btn-default">Add</button>
				</form>
			</div>
		)
	}
}


export default AggregationCreator;
