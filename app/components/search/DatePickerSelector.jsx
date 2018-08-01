import DatePicker from 'react-datepicker';
import moment from 'moment';

class DatePickerSelector extends React.Component {

    constructor(props) {
        super(props);
    }

    getStartDate() {
        if (this.props.dateRange) {
            if(this.props.dateRange.start) {
                return moment(this.props.dateRange.start);
            }
        }
        return null;
    }

    getEndDate() {
        if (this.props.dateRange) {
            if(this.props.dateRange.end) {
                return moment(this.props.dateRange.end);
            }
        }
        return null;
    }

    startDateChanged(d) {
        this.props.onOutput(this.constructor.name, {
            start : d,
            end: this.getEndDate()
        });
    }

    endDateChanged(d) {
        this.props.onOutput(this.constructor.name, {
            start : this.getStartDate(),
            end : d
        });
    }

    render() {
        const startDate = this.getStartDate();
        const endDate = this.getEndDate();
        return (
            <div className="row">
                <div className="col-md-12">
                    <table>
                        <tbody>
                        <tr>
                            <td className="date-picker-container">
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
                                    placeholderText="Start date"/>
                                <i className="fa fa-calendar" aria-hidden="true"/>

                            </td>
                            <td className="date-picker-container">
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
                                    placeholderText="End date"/>
                                <i className="fa fa-calendar" aria-hidden="true"/>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        );
    }
}

export default DatePickerSelector;
