import PropTypes from "prop-types";

import IDUtil from '../../../util/IDUtil';
import ComponentUtil from '../../../util/ComponentUtil';

export default class CustomTooltip extends React.Component{

    getStyle = color => ({
        color: color,
        display: 'flex',
        right: '0',
        margin: '0',
        padding: '0',
    });

    render() {
        if (this.props) {
            const {payload, label} = this.props;
            if(payload && label) {
                if (this.props.viewMode === 'relative') {
                    const labelPercentage = payload.length > 1 ? 'Percentages' : 'Percentage';
                    const valueLabel = payload.length > 1 ? 'Values' : 'Value';
                    const point = payload.map((p, index) => {
                        return (
                            <span className="bg__tooltip-spaceBetween" style={this.getStyle(this.props.queryStats[p.dataKey].color)}>
                                <span>Query#{this.props.queryStats[p.dataKey].queryIndex}</span>
                                <span className="bg__tooltip-spaceBetween">
                                    {p.value ? ComponentUtil.formatNumber(parseFloat(p.value.toFixed(2))) : 0}%
                                </span>
                            </span>
                        )
                    });

                    return (
                        <div className={IDUtil.cssClassName('custom-tooltip')}>
                            <h4>{this.props.viewMode} {valueLabel}</h4>
                            <p>Year: <span className="rightAlign">{label}</span></p>
                            <p>{labelPercentage}:&nbsp;<span className="rightAlign">{point}</span></p>
                        </div>
                    );
                } else {
                    const point = payload.map((p, index) => {
                        return (
                            <span className="bg__tooltip-spaceBetween" style={this.getStyle(this.props.queryStats[p.dataKey].color)}>
                                <span>Query#{this.props.queryStats[p.dataKey].queryIndex}</span>
                                <span className="bg__tooltip-spaceBetween">{p.value ? ComponentUtil.formatNumber(p.value) : 0}</span>
                            </span>
                        )
                    });
                    const labelTotals = payload.length > 1 ? 'Totals' : 'Total';
                    const valueLabel = payload.length > 1 ? 'Values' : 'Value';

                    return (
                        <div className={IDUtil.cssClassName('custom-tooltip')}>
                            <h4>{this.props.viewMode} {valueLabel}</h4>
                            <p>Year: <span className="rightAlign">{label}</span></p>
                            <p>{labelTotals}: <span className="rightAlign">{point}</span></p>
                        </div>
                    );
                }
            }
        }
        return null;
    }
}

CustomTooltip.propTypes = {
    //default props from Recharts
    active: PropTypes.bool.isRequired, //is this tooltip active or not (only show when active)
    payload: PropTypes.array.isRequired, //the data for the active y coordinate
    label: PropTypes.number, //the label/value of the active y coordinate

    //custom props
    viewMode: PropTypes.string, //relative or absolute
    queryStats: PropTypes.object //array of colors to match with the colors of the lines drawn in the line/bar chart
};
