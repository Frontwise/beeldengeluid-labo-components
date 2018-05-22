import IDUtil from '../../util/IDUtil';
import {LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Label, ResponsiveContainer, BarChart, Legend, Bar} from 'recharts';
import TimeUtil from '../../util/TimeUtil';
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
class QuerySingleLineChart extends React.Component {
    constructor(props) {
        super(props);
    }

    //TODO better ID!! (include some unique part based on the query)
    render() {
        const dataPrettyfied = this.props.data.map(function(dataRow) {
            const point = {};
            point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
            point["count"] = dataRow.doc_count;
            return point;
        });

        return (
            <div className={IDUtil.cssClassName('query-line-chart')}>
                <ResponsiveContainer width="100%" height="40%">
                    <LineChart width={600} height={300} data={dataPrettyfied} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                        <XAxis dataKey="date"/>
                        <YAxis/>
                        <Tooltip/>
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{r: 8}}/>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }
}

export default QuerySingleLineChart;