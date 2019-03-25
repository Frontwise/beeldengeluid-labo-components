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
class DateRangeSelector extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            slider: null
        };
        this.CLASS_PREFIX = 'drs';
    }

    //only update on a new search
    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.searchId != this.props.searchId;
    }

    //the data looks like this => {start : '' : end : '', dateField : ''}
    onOutput(data) {
        if (this.props.onOutput) {
            this.props.onOutput(this.constructor.name, data);
        }
    }

    //will propagate the selected dates to the QueryBuilder
    onComponentOutput(componentClass, data) {
        if(componentClass == 'DatePickerSelector') {
            const df = this.props.dateRange.field;
            if (this.props.aggregations && data) {
                if (this.props.aggregations[df]) {
                    this.onOutput({
                        field: this.props.dateRange.field,
                        start: data.start ? data.start.valueOf() : null,
                        end: data.end ? data.end.valueOf() : null
                    });
                }
            }
        }
    }

    getMinDate() {
        if(this.props.dateRange && this.props.dateRange.field) {
            const buckets = this.props.aggregations[this.props.dateRange.field];
            if(buckets && buckets.length > 0) {
                const realMinYear = moment(buckets[0].date_millis, 'x').year()
                const minYear = this.props.collectionConfig.getMinimunYear();

                //if there is no date, set it to the minimum value to avoid weird graphs
                if(minYear > 0 && realMinYear < minYear) {
                    const minDate = moment().set({'year': minYear, 'month': 0, 'date': 1})
                    return minDate
                }
                return moment(buckets[0].date_millis, 'x')
            }
        }
        return null
    }



    getMaxDate() {
        if(this.props.dateRange && this.props.dateRange.field) {
            const buckets = this.props.aggregations[this.props.dateRange.field];

            if(buckets && buckets.length > 0) {
                const maxDate = moment(buckets[buckets.length -1].date_millis, 'x').endOf("year");
                const today = moment()
                if(maxDate.isBefore(today)) {
                    return maxDate
                } else {
                    return today
                }
            }
        }
        return null
    }

  render() {
        return (
            <div id={'__dps__' + IDUtil.hashCode(this.props.queryId)} className="datePickerSelector">
                <div className={IDUtil.cssClassName('date-range-select', this.CLASS_PREFIX)}>
                    <div>
                        {this.props.dateRange !== null && (
                        <DatePickerSelector
                            disabled={this.props.dateRange == null}
                            minDate={this.getMinDate()}
                            maxDate={this.getMaxDate()}
                            dateRange={this.props.dateRange}
                            onOutput={this.onComponentOutput.bind(this)}
                        />)}
                    </div>
                </div>
            </div>
        )
    }
}

export default DateRangeSelector;
