import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import {Bar, BarChart, Label, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend} from 'recharts';
import PropTypes from 'prop-types';

export default class MetadataCompletenessChart extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            opacity: {}
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
        this.CLASS_PREFIX = 'mdc'
    }

    hasNoDataForChart() {
        return this.props.data.missing.data.length === 0 &&
            this.props.data.present.data.length === 0 &&
            this.props.data.total.data.length === 0
    }

    generateChartData() {
        //concatenate all the data for each query, because rechart likes it this way
        const temp = {};
        Object.keys(this.props.data).forEach((k) => {
            this.props.data[k].data.forEach((d) => {
                if(temp[d.year]) {
                    temp[d.year][k] = d[k];
                } else {
                    const t = {};
                    t[k] = d[k];
                    temp[d.year] = t;
                }
            })

        });

        return Object.keys(temp).map((k) => {
            const d = temp[k];
            d.year = k;
            return d;
        });
    }

    render() {
        if (this.hasNoDataForChart()) {
            return (
                <div className={IDUtil.cssClassName('md-completeness-chart')}>
                    <div className={[IDUtil.cssClassName('no-data', this.CLASS_PREFIX), 'alert', 'alert-danger'].join(' ')}>
                        No data available for date field: {this.props.dateField}
                    </div>
                </div>
            )
        }
        const timelineData = this.generateChartData();

        return (
            <div className={IDUtil.cssClassName('md-completeness-chart')}>
                <h4>
                    Completeness of metadata field "{this.props.collectionConfig.toPrettyFieldName(this.props.analysisField)}" over time for the selected date field
                </h4>
                <ResponsiveContainer width="100%" minHeight="360px" height="40%">
                    <BarChart width={1200} height={200} data={timelineData} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
                        <CartesianGrid stroke="#cacaca"/>
                        <XAxis dataKey="year" height={100}>
                            <Label value={this.props.collectionConfig.toPrettyFieldName(this.props.dateField)} offset={0} position="outside"
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}/>
                        </XAxis>
                        <YAxis tickFormatter={ComponentUtil.formatNumber} width={100}>
                            <Label value="Number of records" offset={10} position="insideBottomLeft" angle={-90}
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}/>
                        </YAxis>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Legend verticalAlign="top" height={36}/>
                        <Bar dataKey="present" stackId="a" fill="#468dcb" />
                        <Bar dataKey="missing" stackId="a" fill="#f26c50" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        )
    }
}

MetadataCompletenessChart.PropTypes = {
    dateField: PropTypes.string.isRequired,
    analysisField : PropTypes.string.isRequired,
    collectionConfig : PropTypes.object.isRequired,
    data : PropTypes.object.isRequired //TODO further specify
}


class CustomTooltip extends React.Component {

    constructor(props) {
        super(props);
        this.CLASS_PREFIX = 'mdc';
    }

    calcPresentPercentage(data) {
        if(data['present'] !== 0 || data['total'] !== 0) {
            return ComponentUtil.formatNumber(
                parseFloat(
                    ((data['present'] / data['total']) * 100).toFixed(2)
                )
            )
        }
        return 0
    }

    calcMissingPercentage(data) {
        if(data['missing'] !== 0 || data['total'] !== 0) {
            return ComponentUtil.formatNumber(
                parseFloat(
                    ((data['missing'] / data['total']) * 100).toFixed(2)
                )
            )
        }
    }

    render() {
        const {active} = this.props;
        if (active) {
            const {payload, label} = this.props;
            if(payload && payload.length > 0) {
                const presentPerc = this.calcPresentPercentage(payload[0].payload);
                const missingPerc = this.calcMissingPercentage(payload[0].payload);
                return (
                    <div className="ms__custom-tooltip">
                        <h4>Field Completeness</h4>
                        <p>
                            Year:
                            <span className="rightAlign">{`${label}`}</span>
                        </p>
                        <p>
                            Present:
                            <span className="rightAlign">
                                <span className={IDUtil.cssClassName('percentage', this.CLASS_PREFIX)}>{presentPerc}%</span>
                                {ComponentUtil.formatNumber(payload[0].payload['present'])}
                                </span>
                        </p>
                        <p>
                            Missing:
                            <span className="rightAlign">
                                <span className={IDUtil.cssClassName('percentage', this.CLASS_PREFIX)}>{missingPerc}%</span>
                                {ComponentUtil.formatNumber(payload[0].payload['missing'])}
                            </span>
                        </p>
                        <p>
                            Total:
                            <span className="rightAlign">{ComponentUtil.formatNumber(payload[0].payload['total'])}</span>
                        </p>
                    </div>
                );
            }

        }
        return null;
    }
}
