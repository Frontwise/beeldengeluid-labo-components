import IDUtil from '../../util/IDUtil';
import {LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Label, ResponsiveContainer, BarChart, Legend, Bar} from 'recharts';
import TimeUtil from '../../util/TimeUtil';
import QueryBuilder from '../search/QueryBuilder';
import SearchAPI from '../../api/SearchAPI';

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
        this.originalData = null;
    }
    componentWillMount() {
        this.originalData = this.props.data || null
    }

    onOutput(data) {
        if (data && !data.error) {
            this.setState({
                isSearching: false,
                data: data.aggregations[data.query.dateRange.field]
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

    getRelativeValues() {
        if (this.state.viewMode === 'relative') {
            this.setState({
                    viewMode: 'absolute',
                    query: {
                        ...this.state.query,
                        term: ''
                    }
                }, () => {
                    this.doSearch(this.state.query, false)
                }
            )
        } else {
            this.setState({
                    viewMode: 'relative',
                    query: {
                        ...this.state.query,
                        term: ''
                    }
                }, () => {
                    this.doSearch(this.state.query, false)
                }
            )
        }
    }

    //TODO better ID!! (include some unique part based on the query)
    render() {
        // console.log(this.originalData);
        // if this.state.data draw data ELSE make a call using the props query and collectionConfig.
        // If there is data already draw the line chart.
        // if(this.state.data || this.state.viewMode === 'absolute') {
        //
        // } else {
        //     console.log('no data')
        //     // make a query with using this.state.query + this.props.collectionConfig
        //     this.doSearch(this.state.query, false)
        // }

        const dataPrettyfied = this.state.data.map(function (dataRow, i) {
            const point = {};
            if (this.state.viewMode === 'relative') {
                point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
                point["count"] = dataRow.doc_count ? (dataRow.doc_count / this.originalData[i].doc_count)*100 : 0; // compare this one to the total !!! with the previous query
            } else {
                point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
                point["count"] = dataRow.doc_count;
            }
            return point;
        }, this);
        let viewModeLabel = this.state.viewMode;

        return (
            <div className={IDUtil.cssClassName('query-line-chart')}>
                <button type="button" onClick={this.getRelativeValues.bind(this)} className="btn btn-primary btn-xs">{viewModeLabel}</button>

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