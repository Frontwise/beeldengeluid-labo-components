import IDUtil from '../../util/IDUtil';
import TimeUtil from '../../util/TimeUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import DatePickerSelector from './DatePickerSelector';
import moment from 'moment';

class DateFieldSelector extends React.Component {

    constructor(props) {
        super(props);

        let dateFields = null;
        if (this.props.collectionConfig) {
            dateFields = this.props.collectionConfig.getDateFields();
        }

        this.state = {
            currentDateField: dateFields && dateFields.length > 0 ? dateFields[0] : null,
        };
        this.CLASS_PREFIX = 'dfs';
    }

    //only update on a new search
    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.searchId != this.props.searchId;
    }

    changeDateField(e) {
        let data = null;
        if(e.target.value != 'null_option') {
            data = {
                field: e.target.value,
                start: null, // reset start/end dates
                end: null,
            }
        }
        this.onOutput(data);
    }

    //the data looks like this => {start : '' : end : '', dateField : ''}
    onOutput(data) {
        if (this.props.onOutput) {
            this.props.onOutput(this.constructor.name, data);
        }
    }

    // Helper function to sort selection list options based on an array of objects with
    // sorting based on props.children values.
    sortDateFieldOptions(a,b) {
        if(a.props.children < b.props.children) {
          return -1;
        }
        if(a.props.children > b.props.children) {
          return 1;
        }
        return 0;
    }

  render() {
        let dateFieldSelect = null;

        if (this.props.collectionConfig.getDateFields()) {
            const selectedOption = this.props.dateRange ? this.props.dateRange.field : 'null_option';
            let options = this.props.collectionConfig.getDateFields().map((df, index) => {
                return (<option key={'df__' + index} value={df}>{this.props.collectionConfig.toPrettyFieldName(df)}</option>);
            });

            options = options.sort(this.sortDateFieldOptions);
            options.splice(0,0, <option key={'df__default_value' } value="null_option">Select date field</option>);

            dateFieldSelect = (
                <select className="form-control" value={selectedOption}
                        onChange={this.changeDateField.bind(this)}
                        title={selectedOption == "null_option" ? '' : selectedOption}
                        >
                    {options}
                </select>
            )
        }

        return (
            <div className={IDUtil.cssClassName('date-field-selector', this.CLASS_PREFIX)}>
               {dateFieldSelect}
            </div>
        )
    }
}

export default DateFieldSelector;
