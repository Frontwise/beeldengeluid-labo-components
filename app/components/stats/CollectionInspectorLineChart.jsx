import IDUtil from '../../util/IDUtil';
import {Bar, BarChart, Label, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend} from 'recharts';

/*
See:
	- http://rawgraphs.io/
	- https://bl.ocks.org/mbostock/3048450
	- http://alignedleft.com/tutorials/d3/scales/
	- https://github.com/d3/d3-scale/blob/master/README.md#time-scales
	- http://www.d3noob.org/2012/12/setting-scales-domains-and-ranges-in.html

	- https://github.com/d3/d3-selection/blob/master/README.md#selection_data
	- https://bost.ocks.org/mike/join/

	https://github.com/beeldengeluid/AVResearcherXL/blob/master/avresearcher/static/js/views/search/timeseries.js
*/

class CollectionInspectorLineChart extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            opacity: {}
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
    }

    toggleLine(event) {
        const dataKey = event.dataKey;
        let currentKeyValue = this.state.opacity[dataKey];
        const opacity = this.state.opacity;

        if (currentKeyValue === 1) {
            currentKeyValue = 0;
        } else if(currentKeyValue === 0){
            currentKeyValue = 1;
        } else { //if undefined
            currentKeyValue = 0;
        }
        opacity[dataKey] = currentKeyValue;
        this.setState({
            opacity : opacity
        });
    }

    showMeTheMoney(event, index) {
        console.debug(event);
        console.debug(index);
        console.debug('Dikke scheet');
    }



    //TODO better ID!! (include some unique part based on the query)
    render() {
        const lines = Object.keys(this.props.data).map((k, index) => {
            //fix onClick with this? https://github.com/recharts/recharts/issues/261
            return (
                <Line
                    label={ <LabelAsPoint /> } //the LabelAsPoint class handles the onclick of a dot
                    activeDot={false}
                    name={this.props.data[k].label}
                    onClick={this.showMeTheMoney.bind(this)}
                    dataKey={k} //is equal to the queryId
                    stroke={this.COLORS[index]}
                    strokeOpacity={this.state.opacity[k] !== undefined ? this.state.opacity[k] : 1}
                    dot={{stroke: this.COLORS[index], strokeWidth: 1}}
                    //activeDot={{stroke: this.COLORS[index], strokeWidth: 2, r: 1}}
                />);
        });

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

        const fieldLabel = this.props.analysisField ? this.props.analysisField.title : '';

        //TODO fix the stupid manual multiple lines
        return (
            <div className={IDUtil.cssClassName('collection-inspector-line-chart')}>
                <h4>
                    Completeness of metadata field "{fieldLabel}" over time for the selected date field
                </h4>
                <ResponsiveContainer width="100%" height="50%">
                    <BarChart width={1200} height={200} data={timelineData} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
                        {lines}
                        <CartesianGrid stroke="#cacaca"/>
                        <XAxis dataKey="year" height={100}>
                            <Label value={this.props.dateField} offset={0} position="outside"
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}/>
                        </XAxis>
                        <YAxis width={100}>
                            <Label value="Number of records" offset={10} position="insideLeft" angle={-90}
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}/>
                        </YAxis>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Legend verticalAlign="top" onClick={this.toggleLine.bind(this)} height={36}/>
                        <Bar dataKey="present" stackId="a" fill="#468dcb" />
                        <Bar dataKey="missing" stackId="b" fill="#f26c50" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        )
    }
}
// Custom tooltip.
// TODO: Make it a separated component more customizable.
class CustomTooltip extends React.Component{
    render() {
        const {active} = this.props;
        if (active) {
            const {payload, label} = this.props;
            if(payload && payload.length > 0) {
                const relativeValue = payload[0].value ? payload[0].value.toFixed(2) : 0;
                const dataType = payload[0].payload.dataType;
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
                            <p>Year: <span className="rightAlign">{`${label}`}</span> </p>
                            <p>Present: <span className="rightAlign">{payload[0].payload['present']}</span></p>
                            <p>Missing: <span className="rightAlign">{payload[0].payload['missing']}</span></p>
                            <p>Total: <span className="rightAlign">{payload[0].payload['total']}</span></p>
                        </div>
                    );
                }
            }
        }
        return null;
    }
}

export class LabelAsPoint extends React.Component {
    constructor(props) {
        super(props);
    }

    onClick() {
        console.debug('clicked this ole son of a gun', this.props);
        //TODO do something with the props
    }

    render() {
        const { x, y } = this.props;
        return (
            <circle
                className="dot"
                onClick={this.onClick.bind(this)}
                cx={x}
                cy={y}
                r={8}
                fill="transparent"/>
        );
    }
}
export default CollectionInspectorLineChart;
