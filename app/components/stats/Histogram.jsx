import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil'
import { Label, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Legend, Bar } from 'recharts';
import SearchAPI from "../../api/SearchAPI";
import TimeUtil from "../../util/TimeUtil";
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
		this.state = {
            viewMode: 'absolute', // Sets default view mode to absolute.
            query: this.props.query,
            data: this.props.data || null,
            isSearching: false
        }
	}

	//only update if the search id is different or the data has changed (relative values)
	shouldComponentUpdate(nextProps, nextState) {
		return (nextProps.searchId !== this.props.searchId || nextState.data !== this.props.data);
	}

	//this also checks if the retrieved dates are outside of the user's range selection
	getGraphData() {
		let startMillis = null;
		let endMillis = null;
		if(this.props.query.dateRange) {
			startMillis = this.props.query.dateRange.start
			endMillis = this.props.query.dateRange.end
		}
		return this.props.data.map(aggr => {
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
    doSearch(query, updateUrl = false) {
        this.setState(
            {isSearching : true},
            SearchAPI.search(
                query,
                this.props.collectionConfig,
                this.onOutput.bind(this),
                updateUrl
            )
        )
    }
    commonData(relative, absolute) {
        return  absolute.map((x,y) => {
            return relative.find(function(element) {
                return element.key === x.key;
            });
        });
    }
    onOutput(data) {
        if (data && !data.error) {
            this.setState({
                isSearching: false,
                data: this.commonData(data.aggregations[data.query.dateRange.field], this.state.data)
            });
        }
    }
    getRelativeValues(){
        if (this.state.viewMode === 'relative') {
            this.setState({
                    viewMode: 'absolute'
                }
            )
        } else {
            this.setState({
                    viewMode: 'relative',
                    query: {
                        ...this.state.query,
                        term: '',
                        selectedFacets: {},
                        dateRange: {
                            ...this.state.query.dateRange,
                            end:null,
                            start:null
                        }
                    }
                }, () => {
                    this.doSearch(this.state.query, false)
                }
            )
        }
    }
    //TODO better ID!! (include some unique part based on the query)
    render() {
        const strokeColors = ['#8884d8', 'green'];
        const data = this.getGraphData();
        let dataPrettyfied = null;
        if(this.props.data) {
            if(this.state.viewMode === 'absolute') {
                dataPrettyfied = this.props.data.map((dataRow, i) => {
                    const point = {};
                    point["dataType"] = 'absolute';
                    point["strokeColor"] = strokeColors[0];
                    point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
                    point["count"] = dataRow ? dataRow.doc_count : 0; //FIXME somehow the dataRow is empty sometimes... (when switching from absolute -> relative)
                    return point;
                });
            } else {
                dataPrettyfied = this.props.data.map((dataRow, i) => {
                    let count = 0;
                    if(dataRow && this.state.data[i]) { //FIXME somehow the dataRow is empty sometimes... (when switching from absolute -> relative)
                        count = dataRow.doc_count && this.state.data[i].doc_count !== 0
                        ? ((dataRow.doc_count / this.state.data[i].doc_count) * 100)
                        : 0;
                    }
                    const point = {};
                    point["dataType"] = 'relative';
                    point["strokeColor"] = strokeColors[1];
                    point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
                    point["count"] = count;
                    return point;
                });
            }
        }

        const totalHitsPerQuery = data.reduce((acc, cur) => acc += cur.count, 0);
        const graphTitle = "Timeline chart of query results (" + ComponentUtil.formatNumber(totalHitsPerQuery) + ")";
        return (
        	<div className={IDUtil.cssClassName('histogram')}>
				<span className="ms_toggle_btn" >
                    <input id="toggle-1" className="checkbox-toggle checkbox-toggle-round" type="checkbox" onClick={this.getRelativeValues.bind(this)}/>
                    <label htmlFor="toggle-1" data-on="Relative" data-off="Absolute"/>
                </span>
				<ResponsiveContainer width="100%" minHeight="360px" height="40%">
					<BarChart width={830} height={250} data={dataPrettyfied} barCategoryGap="1%">
                        <Legend verticalAlign="top" height={36}/>
						<CartesianGrid strokeDasharray="1 6"/>
						<XAxis dataKey="date" height={100}>
                        	<Label value={this.props.title} offset={0} position="outside"
								   style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}/>
						</XAxis>
						<YAxis tickFormatter={ComponentUtil.formatNumber} width={100} >
                            <Label value="Number of records" offset={10} position="insideBottomLeft" angle={-90}
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}/>
						</YAxis>
						<Tooltip content={<CustomTooltip/>}/>
						<Bar dataKey="count" fill="#3173ad" name={graphTitle}/>
					</BarChart>
				</ResponsiveContainer>
			</div>
        )
    }
}

class CustomTooltip extends React.Component{
    render() {
        const {active} = this.props;
        if (active) {
            const payload = this.props.payload,
                label = payload[0].payload.date,
                relativeValue = payload[0].value ? parseFloat(payload[0].value.toFixed(2)) : 0,
                dataType = payload[0].payload.dataType;
            if (dataType === 'relative') {
                return (
                    <div className="ms__custom-tooltip">
                        <h4>{dataType} value</h4>
                        <p>Year: <span className="rightAlign">{`${label}`}</span></p>
                        <p>Percentage: <span className="rightAlign">{ComponentUtil.formatNumber(relativeValue)}%</span></p>
                    </div>
                );
            } else {
                return (
                    <div className="ms__custom-tooltip">
                        <h4>{dataType} value</h4>
                        <p>Year: <span className="rightAlign">{`${label}`}</span> </p>
                        <p>Total: <span className="rightAlign">{ComponentUtil.formatNumber(payload[0].value)}</span></p>
                    </div>
                );
            }

        }

        return null;
    }
}
export default Histogram;
