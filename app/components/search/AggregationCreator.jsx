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
			selectedField : fieldList && fieldList.length > 0 ? fieldList[0].value : null
		}
	}

	onOutput(selectedField, label) {
		const aggregation = {
			field: selectedField,
			title : label,
			id : selectedField,
			type : 'string'
		}

		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, aggregation);
		}
	}

	save(e) {
		e.preventDefault();
		if(this.state.selectedField) {
			this.onOutput(this.state.selectedField, this.refs.label.value);
		}
	}

	getFieldList() {
		let fields = this.props.collectionConfig.getKeywordFields();
		if(!fields) {
			fields = this.props.collectionConfig.getNonAnalyzedFields();
		}
		if(fields) {
			return fields.map((f) => {
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
		let option = document.getElementsByClassName('PowerSelect__TriggerLabel');
		option[0].innerHTML = e.option.value;
		this.setState({selectedField : e.option.value});
	}

	//TODO do something in case no fields could be retrieved in the config
	render() {
		let stringSelect = null;
		const fieldList = this.getFieldList();

		if(fieldList) {
            stringSelect = (
                    <div className="col-md-12">
                        <form className="form-horizontal">
                            <label className="col-sm-3 modal-aggregation-label">Fields to create facets</label>
                            <div className="col-sm-9">
                                <PowerSelect
                                    key="project_powerselect"
                                    options={fieldList}
                                    selected={null}
                                    searchIndices={['label']}
                                    onChange={this.selectField.bind(this)}
                                    optionLabelPath="label"
                                    placeholder="-- Select a field -- "/>
                            </div>
                        </form>
                    </div>
            );
		}

		return (
			<div className={IDUtil.cssClassName('aggregation-creator')}>
				<form className="form-horizontal" onSubmit={this.save.bind(this)}>
					{stringSelect}
					<div className="form-group">
    					<label className="col-sm-3" htmlFor="label">Label</label>
    					<div className="col-sm-9">
    						<input ref="label" type="text" className="form-control" id="label"/>
    					</div>
  					</div>
  					<button type="submit" className="btn btn-default">Add</button>
				</form>
			</div>
		)
	}
}


export default AggregationCreator;