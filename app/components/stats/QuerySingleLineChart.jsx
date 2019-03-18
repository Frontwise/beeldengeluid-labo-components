import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import {LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Label, ResponsiveContainer, BarChart, Legend, Bar} from 'recharts';
import TimeUtil from '../../util/TimeUtil';
import SearchAPI from '../../api/SearchAPI';
import PropTypes from 'prop-types';
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
        this.state = {
            viewMode: 'absolute', // Sets default view mode to absolute.
            query: this.props.query,
            data: this.props.data || null,
            isSearching: false
        }
    }

    onOutput(data) {
        if (data && !data.error) {
            this.setState({
                isSearching: false,
                data: this.commonData(data.aggregations[data.query.dateRange.field], this.props.data)
            });
        }
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
                        fieldCategory: [],
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
        const viewModeLabel = this.state.viewMode,
            strokeColors = ['#8884d8', 'green'];
        let dataPrettyfied = null;

        if(this.props.data && this.state.viewMode === 'absolute') {
            dataPrettyfied = this.props.data.map(function (dataRow, i) {
                const point = {};
                point["dataType"] = 'absolute';
                point["strokeColor"] = strokeColors[0];
                point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
                point["count"] = dataRow.doc_count;
                return point;
            }, this);
        } else {
            dataPrettyfied = this.props.data.map(function (dataRow, i) {
                const point = {};
                point["dataType"] = 'relative';
                point["strokeColor"] = strokeColors[1];
                point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
                point["count"] = dataRow.doc_count && this.state.data[i].doc_count !== 0
                    ? ((dataRow.doc_count / this.state.data[i].doc_count) * 100)
                    : 0;
                return point;
            }, this);
        }
        let totalHitsPerQuery = 0;
        this.props.data.map(item => totalHitsPerQuery += item.doc_count);
        const graphTitle = "Timeline chart of query results (" + totalHitsPerQuery + ")",
            prettySelectedFieldName = this.props.collectionConfig.toPrettyFieldName(this.props.query.dateRange.field);
        return (
            <div className={IDUtil.cssClassName('query-line-chart')}>
                <span className="ms_toggle_btn" >
                    <input id="toggle-1" className="checkbox-toggle checkbox-toggle-round" type="checkbox" onClick={this.getRelativeValues.bind(this)}/>
                    <label htmlFor="toggle-1" data-on="Relative" data-off="Absolute"/>
                </span>
                <ResponsiveContainer width="100%" minHeight="360px" height="40%">
                    <LineChart  key={viewModeLabel}  width={600} height={300} data={dataPrettyfied} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                        <Legend verticalAlign="top" height={36}/>
                        <CartesianGrid strokeDasharray="1 6"/>
                        <XAxis dataKey="date" height={100}>
                            <Label value={prettySelectedFieldName} offset={0} position="outside"
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}/>
                        </XAxis>
                        <YAxis width={100} >
                            <Label value="Number of records" offset={10} position="insideBottomLeft" angle={-90}
                                   style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}/>
                        </YAxis>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Line isAnimationActive={true} dataKey="count"
                              stroke={dataPrettyfied[0].strokeColor} activeDot={{r: 8}} name={graphTitle}/>
                    </LineChart>
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
            const {payload, label} = this.props,
                relativeValue = payload[0].value ? payload[0].value.toFixed(2) : 0,
                dataType = payload[0].payload.dataType;
            if (dataType === 'relative') {
                return (
                    <div className="ms__custom-tooltip">
                        <h4>{dataType} value</h4>
                        <p>Year: <span className="rightAlign">{`${label}`}</span></p>
                        <p>Percentage: <span className="rightAlign">{relativeValue}%</span></p>
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
CustomTooltip.propTypes = {
    dataType: PropTypes.string,
    payload: PropTypes.array,
    label: PropTypes.number
};
export default QuerySingleLineChart;
