import CollectionAPI from '../../api/CollectionAPI';

import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';

import FieldSelector from './FieldSelector';

import PropTypes from 'prop-types';

//this component relies on the collection statistics as input
class DateFieldSelector extends React.Component {

    constructor(props) {
        super(props);

        this.prefix = 'ms__ca_';

        // default values
        const defaultDateField = window.sessionStorage.getItem(
            this.prefix + 'defaultDateField' + this.props.collectionConfig.collectionId
        ) || this.props.collectionConfig.getPreferredDateField();
        this.state = {
            dateField: defaultDateField,
            fields : [], //current list of fields
            completeness: {}, //store completeness of the fields
        }
    }

    componentDidMount() {
        // load fields
        this.setState({
            fields: this.getDateFieldsFromConfig().map(field => (
                {
                    id: field,
                    title: this.props.collectionConfig.toPrettyFieldName(field),
                    type: 'Date',
                }
            ))
        });

        if (this.state.dateField){
          this.props.onChange(this.state.dateField);
        }
    }

    getDateFieldsFromConfig() {
        return this.props.collectionConfig.getDateFields() || [];
    }

    onDateFieldChange(e) {
        window.sessionStorage.setItem(this.prefix + 'defaultDateField' + this.props.collectionConfig.collectionId, e.target.value);
        this.props.onChange(e.target.value);
    }

    render() {
        let dateFieldBlock = null;

        if(this.props.collectionConfig) {
            // create objects

            let dateFields = this.getDateFieldsFromConfig().map((field)=>({
                value: field,
                title: this.props.collectionConfig.toPrettyFieldName(field),
            }));

            // sort by title
            dateFields = dateFields.sort((a,b)=>(a.title > b.title ? 1 : -1));

            let analysisFieldSelect = null;

            if(dateFields.length > 0) { //only if there are date fields available
                const sortedDateFields=dateFields;
                let dateFieldOptions = sortedDateFields.map((dateField) => {
                    return (
                        <option key={dateField.value} value={dateField.value}>
                            {dateField.title}
                            {dateField.value in this.props.analysedFields ? ' [' + ComponentUtil.formatNumber(this.props.analysedFields[dateField.value].value) + '%]' : null}
                        </option>
                    )
                });

                dateFieldOptions.splice(0,0,<option key='null__option' value='null__option'>-- Select --</option>);

                dateFieldBlock = (
                    <div className="form-group">
                        <label htmlFor="datefield_select">Metadata field for date (X-axis)</label>
                        <select className="form-control"
                            id="datefield_select"
                            defaultValue={this.state.dateField}
                            onChange={this.onDateFieldChange.bind(this)}>
                            {dateFieldOptions}
                        </select>
                    </div>
                );
            } else {
                dateFieldBlock = (
                    <p>
                        <i className="fa fa-exclamation-triangle"/>
                        This collection doesn't contain any date fields. This means no timeline chart could be generated.
                    </p>
                )
            }
        }

        return (
            <div className={IDUtil.cssClassName('datefield-selector')}>
                {dateFieldBlock}
            </div>
        )
    }
};

DateFieldSelector.PropTypes = {

}

export default DateFieldSelector;