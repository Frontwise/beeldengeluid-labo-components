import IDUtil from '../../util/IDUtil';
import TimeUtil from '../../util/TimeUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import DatePickerSelector from './DatePickerSelector';
import moment from 'moment';
//https://facebook.github.io/react/blog/2013/07/11/react-v0-4-prop-validation-and-default-values.html
/*
	Currently based on noUIslider.js

	TODO:
		- create another component based on either:
			https://www.npmjs.com/package/react-bootstrap-date-picker
			https://bootstrap-datepicker.readthedocs.io/en/latest/

	PLAN (9 mrt 2017):
		- first implement it without a date selector
		- then implement a string field selector for the regular search
		- then implement the date field selector here

	component output:
		- a certain date field
		- a certain date range based on years
*/
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
                start: null,
                end: null
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
            options.splice(0,0, <option key={'df__default_value' } value="null_option">Select date field for analysis</option>);

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
