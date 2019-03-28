import DatePicker from "react-datepicker";
import IDUtil from '../../util/IDUtil';
import moment from "moment";

class DatePickerSelector extends React.Component {
    constructor(props) {
        super(props);
        this.CLASS_PREFIX = 'dps';
    }

    getStartDate() {
        if (this.props.dateRange) {
            if (this.props.dateRange.start !== null) {
                return moment(this.props.dateRange.start);
            }
        }
        return null;
    }

    getEndDate() {
        if (this.props.dateRange) {
            if (this.props.dateRange.end !== null) {
                return moment(this.props.dateRange.end);
            }
        }
        return null;
    }

    startDateChanged(d) {
       let start = null;
       if (d){
           let tzOffset = moment(d)
                .toString()
                .split(" ")[5]
                .slice(-4)
                .slice(0, 2);
            start = moment(d).add(parseInt(tzOffset), "hours");
        }
        this.props.onOutput(this.constructor.name, {
            start,
            end: this.getEndDate()
        });
    }

    endDateChanged(d) {
        let end = null;
        if (d){
            let tzOffset = moment(d)
                .toString()
                .split(" ")[5]
                .slice(-4)
                .slice(0, 2);
            end = moment(d).add(parseInt(tzOffset), "hours");
        }
        this.props.onOutput(this.constructor.name, {
            start: this.getStartDate(),
            end
        });
    }

    render() {
        const startDate = this.getStartDate();
        const endDate = this.getEndDate();
        return (
            <div className={IDUtil.cssClassName('date-picker-selector', this.CLASS_PREFIX)}>
                <DatePicker
                    disabled={this.props.disabled}
                    selected={startDate}
                    selectsStart={true}
                    openToDate={this.props.minDate}
                    minDate={this.props.minDate}
                    maxDate={this.props.maxDate}
                    onChange={this.startDateChanged.bind(this)}
                    showMonthDropdown={true}
                    showYearDropdown={true}
                    dropdownMode="select"
                    className="form-control"
                    placeholderText="Start date"
                />
                {/* <i className="fa fa-calendar" aria-hidden="true" />*/ }
                to
                <DatePicker
                    disabled={this.props.disabled}
                    selected={endDate}
                    selectsEnd={true}
                    openToDate={this.props.maxDate}
                    minDate={this.props.minDate}
                    maxDate={this.props.maxDate}
                    onChange={this.endDateChanged.bind(this)}
                    showMonthDropdown={true}
                    showYearDropdown={true}
                    dropdownMode="select"
                    className="form-control"
                    placeholderText="End date"
                />
                {/* <i className="fa fa-calendar" aria-hidden="true" />*/ }
            </div>
        );
    }
}

export default DatePickerSelector;
