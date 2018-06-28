import IDUtil from '../../util/IDUtil';
import { LineChart, Line, Label, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Legend, Bar } from 'recharts';
/*
See:
	- http://rawgraphs.io/
	- https://bl.ocks.org/mbostock/3048450
	- http://alignedleft.com/tutorials/d3/scales/
	- https://github.com/d3/d3-scale/blob/master/README.md#time-scales
	- http://www.d3noob.org/2012/12/setting-scales-domains-and-ranges-in.html

	- https://github.com/d3/d3-selection/blob/master/README.md#selection_data
	- https://bost.ocks.org/mike/join/
	- http://recharts.org/#/en-US Recharts is the React-D3 component used to render graphs.
*/


//TODO add a bar for the dates that are out of range
class Histogram extends React.Component {

	constructor(props) {
		super(props);
	}

	//only update if the search id is different
	shouldComponentUpdate(nextProps, nextState) {
		return nextProps.searchId != this.props.searchId;
	}

	//this also checks if the retrieved dates are outside of the user's range selection
	getGraphData() {
		let startMillis = null;
		let endMillis = null;
		if(this.props.dateRange) {
			startMillis = this.props.dateRange.start
			endMillis = this.props.dateRange.end
		}
		return this.props.data.map((aggr, index) => {
			let inRange = true;
			if ((startMillis != null && aggr.date_millis < startMillis) ||
				endMillis != null && aggr.date_millis > endMillis) {
				inRange = false;
			}
			return {
				year : new Date(aggr.date_millis).getFullYear(),
				count : aggr.doc_count,
				inRange : inRange
			}
		});
	}

    //TODO better ID!! (include some unique part based on the query)
    render() {
        const data = this.getGraphData();
        let totalHitsPerQuery = 0;
        data.map(item => totalHitsPerQuery += item.count);
        const graphTitle = totalHitsPerQuery + " records for query";
        return (
        	<div className={IDUtil.cssClassName('histogram')}>
				<ResponsiveContainer width="100%" height="40%">
					<BarChart width={830} height={250} data={data} barCategoryGap="1%">
                        <Legend verticalAlign="top" height={36}/>
						<CartesianGrid strokeDasharray="1 6"/>
						<XAxis dataKey="year" height={100}>
                        	<Label value={this.props.title} offset={0} position="outside"
								   style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}/>
						</XAxis>
						<YAxis width={100} >
                            <Label value="Number of records" offset={10} position="insideLeft" angle={-90}
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}/>
						</YAxis>
						<Tooltip cursor={{ fill: '#F5F5F5' }}/>
						<Bar dataKey="count" fill="#3173ad" name={graphTitle}/>
					</BarChart>
				</ResponsiveContainer>
			</div>
        )
    }
}
export default Histogram;