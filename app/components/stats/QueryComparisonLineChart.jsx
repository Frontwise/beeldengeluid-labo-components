import IDUtil from '../../util/IDUtil';
import {LineChart,Line, CartesianGrid, XAxis, YAxis, Tooltip,ResponsiveContainer, Legend} from 'recharts';
import SearchAPI from '../../api/SearchAPI';
import ElasticsearchDataUtil from "../../util/ElasticsearchDataUtil";
import PropTypes from 'prop-types';
import CKANAPI from "../../api/CKANAPI";
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

class QueryComparisonLineChart extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            opacity: {},
            viewMode: this.props.data.total ? 'inspector' : 'absolute',
            isSearching: false,
            data: this.props.data || null,
            collectionList : null
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
    }

    componentDidMount() {
        CKANAPI.listCollections((collections) => {
            this.setState({collectionList :  collections});
        });
    }

    toggleLine(event) {
        console.log(event, this.state)
        const dataKey = event.dataKey;
        let currentKeyValue = this.state.opacity[dataKey];
        let opacity = this.state.opacity;

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
        // console.debug(event)
        // console.debug(index)
        // console.debug('Dikke scheet');
    }

    onOutput(data) {
        if (this.state.viewMode === 'relative') {
            let relativeData = [];
            data.map(
                dataSet => {
                    if (dataSet.length > 0) {
                        relativeData.push(this.commonData(dataSet, this.props.data, Object.keys(dataSet[0])[1]))
                    }
                }
            );
            this.getRelValues(relativeData);
            this.setState({
                isSearching: false,
                data: relativeData
            });
        }
    }

    commonData(relative, absolute, key) {
        return absolute[key].data.map((x, y) => {
            return relative.find(function (element) {
                return element.year === x.year;
            })
        })
    }

    getRelValues(relData) {
        const that = this.props.data; // absolute values
        Object.keys(that).map(function (queryID) {
            relData.map(
                item => {
                    item.map((val, index) => {
                        return val[queryID] = (val && val[queryID])
                            ? (that[queryID].data[index][queryID]/val[queryID])*100 : 0;
                    })
                }
            );
        })
    }

    async getData(key) {
        const that = this;

        return new Promise(function(resolve, reject) {
            const query = {
            ...that.props.data[key].query,
                term: '',
                selectedFacets: {},
                fieldCategory: [],
                dateRange: {
                    ...that.props.data[key].query.dateRange,
                    end:null,
                    start: (that.props.data[key].collectionConfig && that.props.data[key].collectionConfig.getMinimunYear()) || null
                }
            };

            SearchAPI.search(
                query,
                that.props.data[key].collectionConfig,
                data => resolve(data),
                false
            )
        })
    }

    async processData(data) {
        const promises = Object.keys(data).map(this.getData.bind(this));
        await Promise.all(promises).catch(d => console.log(d)).then(
            (dataPerQuery) => {
                let formattedData = [];
                dataPerQuery.map( data => {
                    formattedData.push(ElasticsearchDataUtil.searchResultsToTimeLineData(
                        data.query,
                        data.aggregations,
                    ));
                });
                this.onOutput(formattedData);
            });
    }

    getRelativeValues() {
        if (this.state.viewMode === 'relative') {
            this.setState({
                    viewMode: 'absolute'
                })
        } else {
            this.setState({
                    viewMode: 'relative',
                    query: {
                        ...this.props.query,
                        term: ''
                    }
                }, () => {
                    this.processData(this.props.data, false)
                }
            )}
    }

    //TODO better ID!! (include some unique part based on the query)
    render() {
        const lines = Object.keys(this.props.data).map((k, index) => {
            //fix onClick with this? https://github.com/recharts/recharts/issues/261
            return (
                <Line
                    label={<LabelAsPoint/>} //the LabelAsPoint class handles the onclick of a dot
                    activeDot={false}
                    name={this.props.data[k].label}
                    type="monotone"
                    onClick={this.showMeTheMoney.bind(this)}
                    dataKey={k} //is equal to the queryId
                    stroke={this.COLORS[index]}
                    strokeOpacity={this.state.opacity[k] != undefined ? this.state.opacity[k] : 1}
                    dot={{stroke: this.COLORS[index], strokeWidth: 2}}
                    //activeDot={{stroke: this.COLORS[index], strokeWidth: 2, r: 1}}
                />);
        });

        //concatenate all the data for each query, because rechart likes it this way (TODO make nicer)
        const temp = {};
        if (this.state.viewMode === 'relative') {
            Object.keys(this.state.data).forEach(
                (k) => {
                    if (Array.isArray(this.state.data[k])) {
                        this.state.data[k].forEach(
                            item => {
                                if (temp[item.year]) {
                                    let parId = Object.keys(item)[1];
                                    temp[item.year][parId] = item[parId];
                                } else {
                                    let t = {},
                                        parYear = 'year',
                                        parId = Object.keys(item)[1];
                                    t[parYear] = item.year;
                                    t[parId] = item[parId];
                                    temp[item.year] = t;
                                }
                            }
                        )
                    }
                }
            )
        } else {
            Object.keys(this.props.data).forEach((k) => {
                this.props.data[k].data.forEach((d) => {
                    if (temp[d.year]) {
                        temp[d.year][k] = d[k];
                    } else {
                        let t = {};
                        t[k] = d[k];
                        temp[d.year] = t;
                    }
                })
            });
        }

        const timelineData = Object.keys(temp).map((k) => {
            let d = temp[k];
            d.year = k;
            return d;
        });
        //TODO fix the stupid manual multiple lines
        return (

            <div className={IDUtil.cssClassName('query-line-chart')}>
				<span className="ms_toggle_btn">
                    <input id="toggle-1" className="checkbox-toggle checkbox-toggle-round" type="checkbox"
                           onClick={this.getRelativeValues.bind(this)}/>
                    <label htmlFor="toggle-1" data-on="Relative" data-off="Absolute"></label>
                </span>
                <ResponsiveContainer width="100%" height="50%">
                    <LineChart width={1200} height={200} data={timelineData}
                               margin={{top: 5, right: 20, bottom: 5, left: 0}}>
                        {lines}
                        <CartesianGrid stroke="#cacaca"/>
                        <XAxis dataKey="year"/>
                        <YAxis/>
                        <Tooltip content={<CustomTooltip  viewMode={this.state.viewMode}/>}/>
                        <Legend
                            verticalAlign="bottom"
                            wrapperStyle={{ position: null }}
                            height={39}
                        content={<CustomLegend selectedQueries={this.props.selectedQueries} lineColour={this.COLORS} labelData={this.state.collectionList} external={external}/>}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }
}

export default QueryComparisonLineChart;

//custom legend
const CustomLegend = React.createClass({

    stylings(p){
        return {
            color: p,
            listStyle: 'none',
            padding: '10px 20px'
        }
    },

    getCollectionTitle(collectionId) {
        if(collectionId ) {
            const that= this;
            Object.keys(this.props.labelData).map(function(collection) {
                if (that.props.labelData[collection].index === collectionId) {
                    return that.props.labelData[collection].title
                }
                return;
            });
        }
    },

    render() {
        const selectedQueries = this.props.selectedQueries,
            payload = this.props.payload,
            that = this;
        let colours = [],
            queryInfoBlocks;
        payload.map(d => {
            colours[d.dataKey] = d.color
        });

        let queryInfo = selectedQueries.map(
            () => {
                const collectionInfo = that.props.labelData || null,
                    selectedQueries = that.props.selectedQueries;
                let queryDetails = [];
                if (collectionInfo && selectedQueries) {
                    selectedQueries.map((query, index) => {
                        collectionInfo.map(collection => {
                            if (query.query.collectionId === collection.index) {
                                queryDetails.push({
                                    "savedQueryName": query.name,
                                    "collectionTitle": collection.title,
                                    "queryTerm": query.query.term,
                                    "dateRange": query.query.dateRange,
                                    "selectedFacets": query.query.selectedFacets,
                                    "fieldCategory": query.query.fieldCategory,
                                    "dateRange": query.query.dateRange,
                                    "lineColour": that.props.lineColour[index]
                                })
                            }
                        })
                    })
                }
                if(queryDetails.length > 0) {
                    let fieldCategoryList = null,
                        fieldClusterHeader = null,
                        dateRangeHeader = null,
                        dateRangeFields = null,
                        dateField = null,
                        dateStart = null,
                        dateEnd = null;

                    queryInfoBlocks = queryDetails.map(
                        item =>{
                            if(item.fieldCategory && item.fieldCategory.length > 0) {
                                fieldCategoryList = item.fieldCategory.map(field => {
                                   return (<li>{field.label} </li>);
                                })
                            }

                            if(item.dateRange) {
                                dateRangeFields = Object.keys(item.dateRange).map(dateObj => {
                                    switch (dateObj) {
                                        case 'field':
                                            dateField = item.dateRange[dateObj];
                                            break;
                                        case 'start':
                                            dateStart = TimeUtil.UNIXTimeToPrettyDate(item.dateRange[dateObj]);
                                            break;
                                        case 'end':
                                            dateEnd = TimeUtil.UNIXTimeToPrettyDate(item.dateRange[dateObj]);
                                            break;
                                    }
                                    if(dateField && dateStart && dateEnd) {
                                        return (
                                            <ul>
                                                <li><u>Selected date field:</u> {dateField}</li>
                                                <li><u>Initial date:</u> {dateStart}</li>
                                                <li><u>End date:</u> {dateEnd}</li>
                                            </ul>
                                        )
                                    }

                                })

                            }
                            if(dateRangeFields) {
                                dateRangeHeader = <p><b>Date Range:</b></p>
                            }
                            if(fieldCategoryList) {
                                fieldClusterHeader = <p><b>Field cluster:</b></p>
                            }
                            return (<div className="bg__comparative_queryLine" onClick={this.toggleLine}>
                                <h4 style={this.stylings(item.lineColour)}>Query title: {item.savedQueryName}</h4>
                                <p><b>Collection name:</b> {item.collectionTitle}</p>
                                <p><b>Query term (Search term):</b> {item.queryTerm}</p>
                                {fieldClusterHeader}
                                <ul>{fieldCategoryList}</ul>
                                {dateRangeHeader}
                                {dateRangeFields}
                            </div>)
                        }
                    )
                }
            }
        )
        if (queryInfo) {
            return (
                <div className="ms__custom-legend">
                    {queryInfoBlocks}
                </div>
            );
        }
        return null;
    }
});

// Custom tooltip.
// TODO: Make it a separated component more customizable.
const CustomTooltip = React.createClass({

    stylings(p){
        return {
            color: p.color,
            display: 'block',
            right: '0',
            margin: '0',
            padding: '0'
        }
    },

    render() {
        const {active} = this.props;
        if (active) {
            const {payload, label} = this.props,
                dataType = this.props.viewMode;

            if(payload && label) {
                if (dataType === 'relative') {
                    const labelPercentage = payload.length > 1 ? 'Percentages' : 'Percentage',
                        valueLabel = payload.length > 1 ? 'Values' : 'Value',
                        point = payload.map(p => {
                            return (
                                <p style={this.stylings(p)}>{p.value ? p.value.toFixed(2) : 0}%</p>
                            )
                        });
                    return (
                        <div className="ms__custom-tooltip">
                            <h4>{this.props.viewMode} {valueLabel}</h4>
                            <p>Year: <span className="rightAlign">{`${label}`}</span></p>
                            <p>{labelPercentage}: <span className="rightAlign">{point}</span></p>
                        </div>
                    );
                } else if (dataType === 'inspector') {
                    const point = payload.map((p, i) => {
                            return (
                                <p>
                                    {this.props.payload[i].name}: <span className="rightAlign"><p style={this.stylings(p)}>{p.value ? p.value : 0}</p></span>
                                </p>
                            )
                        });
                    return (
                        <div className="ms__custom-tooltip">
                            <h4>Values for year: {`${label}`}</h4>
                            {point}
                        </div>
                    );
                } else {
                    const point = payload.map(p => {
                            return (
                                <p style={this.stylings(p)}>{p.value ? p.value : 0}</p>
                            )
                        }),
                        labelTotals = payload.length > 1 ? 'Totals' : 'Total',
                        valueLabel = payload.length > 1 ? 'Values' : 'Value';

                    return (
                        <div className="ms__custom-tooltip">
                            <h4>{this.props.viewMode} {valueLabel}</h4>
                            <p>Year: <span className="rightAlign">{`${label}`}</span></p>
                            <p>{labelTotals}: <span className="rightAlign">{point}</span></p>
                        </div>
                    );
                }
            }
        }
        return null;
    }
});
CustomTooltip.propTypes = {
    dataType: PropTypes.string,
    payload: PropTypes.array,
    label: PropTypes.string
};

export class LabelAsPoint extends React.Component {
    constructor(props) {
        super(props);
    }

    onClick() {
        //TODO do something with the props
    }

    render() {
        const {x, y} = this.props;
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