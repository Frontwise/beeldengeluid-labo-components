import IDUtil from '../../util/IDUtil';
import {LineChart, Label, Line, CartesianGrid, XAxis, YAxis, Tooltip,ResponsiveContainer, Legend} from 'recharts';
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
            absData : null,
            relData : null,
            collectionList : null
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
        this.layout = document.querySelector("body");
    }

    componentDidMount() {
        const timelineData = this.getJoinedData(this.props.data);
        CKANAPI.listCollections((collections) => {
            this.setState({
                collectionList :  collections,
                absData : timelineData
            });
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.data !== this.props.data
            || nextState.viewMode !== this.state.viewMode
            || this.state.isSearching !== nextState.isSearching
            || this.state.collectionList !== nextState.collectionList
        );
    }

    toggleLine(event) {
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

    onOutput(relData) {
        const relativeValues = this.getRelValues(this.state.absData, relData);
        this.setState({
                viewMode: 'relative',
                isSearching: false,
                relData: relativeValues
            }, () => {
                this.layout.classList.remove("spinner")
            }
        );
    }

    getRelValues(absoluteValues, relativeValues) {
        let points = [];
        absoluteValues.forEach(point => {
            let relPoint = {"year": point["year"]};

            Object.keys(point).forEach(propt => {
                    if (propt !== 'year') {
                        let tt = relativeValues[`${propt}`].find(obj => {
                            return obj.year === point.year
                        });

                        relPoint[`${propt}`] = (tt[`${propt}`] === 0 || point[`${propt}`] === 0
                            ? 0
                            : point[`${propt}`] / tt[`${propt}`] * 100
                        );
                    }
                }
            );
            points.push(relPoint)

        });
        return points
    }

    async getData(key) {
        const that = this;

        //FIXME this is not right, fix this with the query model
        return new Promise(function(resolve, reject) {
            const query = {
            ...that.props.data[key].query,
                term: '',
                selectedFacets: {},
                fieldCategory: []
            };
            SearchAPI.search(
                query,
                that.props.data[key].collectionConfig,
                data => resolve(data),
                false
            )
        })
    }

    async processData() {
        const data = this.props.data || null;
        const promises = Object.keys(data).map(this.getData.bind(this));
        await Promise.all(promises).catch(d => console.log(d)).then(
            (dataPerQuery) => {
                let relValues = {};
                dataPerQuery.forEach( data => {
                    relValues[data.query.id] = ElasticsearchDataUtil.searchResultsToTimeLineData(
                        data.query,
                        data.aggregations,
                    );
                });
                this.onOutput(relValues);
            });
    }

    getRelativeValues() {
        if (this.state.viewMode === 'relative') {
            this.setState({
                viewMode: 'absolute'
            })
        } else {
            this.setState({
                    isSearching: true,
                    viewMode: 'relative'
                }, () => {
                if (this.state.relData === null) {
                        this.processData();
                    this.layout.classList.add("spinner");

                }
                }
            )
        }
    }

    getJoinedData = dataSet => {
        /*
            Function to return the min/max when an array of query arrays is given
            as parameter with the shape [Array[12], Array[23],...]
            with year as a the name of the object property to search within.
            Call as endYear(absValuesArray, Math.min/Math.max) returning either min/max values (years)
             @args : array and Math method, either Math.min or Math.max
         */
        const __endYear = (arrQueryResults, end) => {
            // returns an array with 1 array per query with the years only
            let arrYearsPerQuery = arrQueryResults.map(arr => arr.map(item => item.year)).map(arr => end(...arr));
            return end(...arrYearsPerQuery);
        };
        /*
            Gets an object with query info with queryId as key.
            Every object has the data as an array {queryId: 'xxx', year: 'xxxx'}
        */
        const __getGraphData = dataSet => Object.keys(dataSet).map(k => {
            return dataSet[k].data
        });

        /*  @returns a year's range.
        // @params: starting year and number of years until the end
        */
        const __getValidRange = (min, max) => Array.from(new Array(max - min + 1),(val,index)=>index+min);
        const relGraphData = __getGraphData(dataSet);
        const minYear = __endYear(relGraphData, Math.min);
        const maxYear = __endYear(relGraphData, Math.max);
        const validRange = __getValidRange(minYear, maxYear);
        let dataForGraph = [];

        validRange.forEach(year => {
            let tempObj = {};

            relGraphData.forEach(set => {
                const matchData = set.find(it => it.year === year);
                if(matchData !== undefined) {
                    tempObj = {...tempObj, ...matchData};
                }

            });
            dataForGraph.push(tempObj);
        });

        return dataForGraph;
    };


    //TODO better ID!! (include some unique part based on the query)
    render() {
        const lines = Object.keys(this.props.data).map((k, index) => {
            const random = Math.floor(Math.random() * 1000) + 1;
            //fix onClick with this? https://github.com/recharts/recharts/issues/261
            return (
                <Line
                    key={random}
                    isAnimationActive={true}
                    label={<LabelAsPoint/>} //the LabelAsPoint class handles the onclick of a dot
                    name={this.props.data[k].label}
                    type="monotone"
                    onClick={this.showMeTheMoney.bind(this)}
                    dataKey={k} //is equal to the queryId
                    stroke={this.COLORS[index]}
                    strokeOpacity={this.state.opacity[k] !== undefined ? this.state.opacity[k] : 1}
                    dot={{stroke: this.COLORS[index], strokeWidth: 2}}
                    activeDot={{stroke: this.COLORS[index], strokeWidth: 6, r: 3}}
                />);
        });

        let timelineData = null;
        if (this.state.viewMode === 'relative') {
            timelineData = this.state.relData;
        } else {
            timelineData = this.state.absData;
        }

        //TODO fix the stupid manual multiple lines
        return (
            <div className={IDUtil.cssClassName('query-comparison-line-chart')}>
				<span className="ms_toggle_btn">
                    <input
                        id="toggle-1"
                        className="checkbox-toggle checkbox-toggle-round"
                        type="checkbox"
                        onClick={this.getRelativeValues.bind(this)}
                    />
                    <label htmlFor="toggle-1" data-on="Relative" data-off="Absolute"/>
                </span>
                <ResponsiveContainer width="100%" minHeight="360px" height="40%">
                    <LineChart
                        width={1200}
                        height={200}
                        data={timelineData}
                        margin={{top: 5, right: 20, bottom: 5, left: 0}}>
                        {lines}
                        <CartesianGrid stroke="#cacaca"/>
                        <XAxis dataKey="year"/>
                        <YAxis width={100} >
                            <Label
                                value="Number of records"
                                offset={10}
                                position="insideBottomLeft"
                                angle={-90}
                                style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}
                            />
                        </YAxis>
                        <Tooltip content={<CustomTooltip  viewMode={this.state.viewMode}/>}/>
                        <Legend
                            verticalAlign="bottom"
                            wrapperStyle={{ position: null }}
                            height={39}
                            content={
                                <CustomLegend
                                    selectedQueries={this.props.selectedQueries}
                                    lineColour={this.COLORS}
                                    labelData={this.state.collectionList}
                                    external={external}
                                />
                            }
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }
}

export default QueryComparisonLineChart;

//custom legend
class CustomLegend extends React.Component{

    stylings(p){
        return {
            color: p,
            listStyle: 'none',
            padding: '10px 20px'
        }
    }

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
    }

    render() {
        const selectedQueries = this.props.selectedQueries,
            payload = this.props.payload,
            that = this;
        let colours = [],
            queryInfoBlocks = null;
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
        );
        if (queryInfo) {
            return (
                <div className="ms__custom-legend">
                    {queryInfoBlocks}
                </div>
            );
        }
        return null;
    }
}

// Custom tooltip.
// TODO: Make it a separated component more customizable.
class CustomTooltip extends React.Component{
    stylings(p){
        return {
            color: p.color,
            display: 'block',
            right: '0',
            margin: '0',
            padding: '0'
        }
    }

    render() {

        const {active} = this.props;
        if (active) {
            const {payload, label} = this.props;
            const dataType = this.props.viewMode;

            if(payload && label) {
                if (dataType === 'relative') {
                    const labelPercentage = payload.length > 1 ? 'Percentages' : 'Percentage',
                        valueLabel = payload.length > 1 ? 'Values' : 'Value',
                        point = payload.map(p => {
                            return (
                                <span style={this.stylings(p)}>{p.value ? p.value.toFixed(2) : 0}%</span>
                            )
                        });
                    return (
                        <div className="ms__custom-tooltip">
                            <h4>{dataType} {valueLabel}</h4>
                            <p>Year: <span className="rightAlign">{label}</span></p>
                            <p>{labelPercentage}: <span className="rightAlign">{point}</span></p>
                        </div>
                    );
                } else if (dataType === 'inspector') {
                    const point = payload.map((p, i) => {
                            return (
                                <span>
                                    {this.props.payload[i].name}: <span className="rightAlign"><span style={this.stylings(p)}>{p.value ? p.value : 0}</span></span>
                                </span>
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
                                <span style={this.stylings(p)}>{p.value ? p.value : 0}</span>
                            )
                        }),
                        labelTotals = payload.length > 1 ? 'Totals' : 'Total',
                        valueLabel = payload.length > 1 ? 'Values' : 'Value';

                    return (
                        <div className="ms__custom-tooltip">
                            <h4>{dataType} {valueLabel}</h4>
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
    dataType: PropTypes.string,
    payload: PropTypes.array,
    label: PropTypes.number
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
