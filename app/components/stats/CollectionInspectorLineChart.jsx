import IDUtil from '../../util/IDUtil';
import {Bar, BarChart, Label, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend} from 'recharts';

class CollectionInspectorLineChart extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            opacity: {}
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
    }

    render() {
        //concatenate all the data for each query, because rechart likes it this way (TODO make nicer)
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
        const timelineData = Object.keys(temp).map((k) => {
            const d = temp[k];
            d.year = k;
            return d;
        });

        const fieldLabel = this.props.dateField ? this.props.dateField : '';
        return (
            <div className={IDUtil.cssClassName('collection-inspector-line-chart')}>
                <h4>
                    Completeness of metadata field "{fieldLabel}" over time for the selected date field
                </h4>
                <ResponsiveContainer width="100%" minHeight="360px" height="40%">
                    <BarChart width={1200} height={200} data={timelineData} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
                        <CartesianGrid stroke="#cacaca"/>
                        <XAxis dataKey="year" height={100}>
                            <Label value={this.props.dateField} offset={0} position="outside"
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}/>
                        </XAxis>
                        <YAxis width={100}>
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

class CustomTooltip extends React.Component{

    calcPresentPercentage(data) {
        if(data['present'] !== 0 || data['total'] !== 0) {
            return ((data['present'] / data['total']) * 100).toFixed(2)
        }
        return 0
    }

    calcMissingPercentage(data) {
        if(data['missing'] !== 0 || data['total'] !== 0) {
            return ((data['missing'] / data['total']) * 100).toFixed(2)
        }
    }

    render() {
        const {active} = this.props;
        if (active) {
            const {payload, label} = this.props;
            if(payload && payload.length > 0) {
                const relativeValue = payload[0].value ? payload[0].value.toFixed(2) : 0;
                const dataType = payload[0].payload.dataType;
                const presentPerc = this.calcPresentPercentage(payload[0].payload);
                const missingPerc = this.calcMissingPercentage(payload[0].payload);
                if (dataType === 'relative') {
                    return (
                        <div className="ms__custom-tooltip">
                            <h4>{dataType} Completeness</h4>
                            <p>Year: <span className="rightAlign">{`${label}`}</span></p>
                            <p>Percentage: <span className="rightAlign">{relativeValue}%</span></p>
                        </div>
                    );
                } else {
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
                                    <span className="percentage">{presentPerc}%</span>
                                    {payload[0].payload['present']}
                                    </span>
                            </p>
                            <p>
                                Missing:
                                <span className="rightAlign">
                                    <span className="percentage">{missingPerc}%</span>
                                    {payload[0].payload['missing']}
                                </span>
                            </p>
                            <p>
                                Total:
                                <span className="rightAlign">{payload[0].payload['total']}</span>
                            </p>
                        </div>
                    );
                }
            }
        }
        return null;
    }
}

export default CollectionInspectorLineChart;
