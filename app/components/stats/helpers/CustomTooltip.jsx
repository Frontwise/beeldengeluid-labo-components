import PropTypes from "prop-types";

export default class CustomTooltip extends React.Component{

    getStyle = (p) => {
        return {
            color: p.color,
            display: 'block',
            right: '0',
            margin: '0',
            padding: '0',
        }
    }

    render() {
        const {active} = this.props;
        if (active) {
            const {payload, label} = this.props;
            if(payload && label) {
                if (this.props.viewMode === 'relative') {
                    const labelPercentage = payload.length > 1 ? 'Percentages' : 'Percentage';
                    const valueLabel = payload.length > 1 ? 'Values' : 'Value';
                    const point = payload.map(
                        (p, index) => <span style={this.getStyle(p)}>Query#{index+1} {p.value ? p.value.toFixed(2) : 0}%</span>
                    );

                    return (
                        <div className="ms__histogram-custom-tooltip">
                            <h4>{this.props.viewMode} {valueLabel}</h4>
                            <p>Year: <span className="rightAlign">{label}</span></p>
                            <p>{labelPercentage}:&nbsp;<span className="rightAlign">{point}</span></p>
                        </div>
                    );
                } else {
                    const point = payload.map((p,index) => {
                        return (
                            <span style={this.getStyle(p)}>
                                Query#{this.props.colorIndexes[index]+1} {p.value ? p.value : 0}
                            </span>
                        )
                    })
                    const labelTotals = payload.length > 1 ? 'Totals' : 'Total';
                    const valueLabel = payload.length > 1 ? 'Values' : 'Value';

                    return (
                        <div className="ms__histogram-custom-tooltip">
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
    colorIndexes: PropTypes.array //array of colors to match with the colors of the lines drawn in the line/bar chart
};
