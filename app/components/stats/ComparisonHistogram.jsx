import IDUtil from '../../util/IDUtil';
import {
    Label,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import SearchAPI from "../../api/SearchAPI";
import TimeUtil from "../../util/TimeUtil";
import CKANAPI from "../../api/CKANAPI";

class ComparisonHistogram extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            viewMode: 'absolute', // Sets default view mode to absolute.
            relData: null,
            isSearching: false,
            collectionList : null
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
        this.layout = document.querySelector("body");
    }

    componentDidMount() {
        CKANAPI.listCollections((collections) => {
            this.setState({collectionList :  collections});
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.selectedQueries !== this.props.selectedQueries
            || nextState.viewMode !== this.state.viewMode
        );
    }

    async getData(key) {
        const that = this;

        //FIXME this is not right, fix this with the query model
        return new Promise(function(resolve, reject) {
            const query = {
                ...that.props.data[key].query,
                term: '',
                selectedFacets: {},
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

    onOutput(data) {
        this.setState({
                viewMode: 'relative',
                isSearching: false,
                relData: data
            }, () => {
                this.layout.classList.remove("spinner")
            }
        );
    }

    getPrettifiedData() {
        const __getCount = (point) => {
            if (point.viewMode === 'absolute') {
                return point.count
            } else {
                return point.count && point.countInState.doc_count !== 0
                    ? ((point.count / point.countInState.doc_count) * 100)
                    : 0;
            }
        };

        return this.props.data.map(arr => {
            const indexVal = this.state.relData ? this.state.relData.findIndex(item => item.query.id === arr.query.id) : null;
            return arr.aggregations[arr.query.dateRange.field].map((dataRow, i) => {
                    let relVal = null;
                    if (this.state.viewMode === 'relative') {
                        const ind = this.state.relData[indexVal].aggregations[this.state.relData[indexVal].query.dateRange.field]
                            .findIndex(item => item.date_millis === dataRow.date_millis);
                        relVal = this.state.relData[indexVal].aggregations[this.state.relData[indexVal].query.dateRange.field][ind];
                    }
                    const point = {};
                    point["queryId"] = arr.query.id;
                    point["dataType"] = this.state.viewMode;
                    point["date"] = TimeUtil.getYearFromDate(dataRow.date_millis);
                    point[arr.query.id] = __getCount({
                        viewMode: this.state.viewMode,
                        count: dataRow.doc_count,
                        countInState: relVal
                    });
                    return point;
                }
            );
        });
    }

    async processData(data) {
        const promises = Object.keys(data).map(this.getData.bind(this));
        await Promise.all(promises).catch(d => console.log(d)).then(
            (dataPerQuery) => this.onOutput(dataPerQuery));
    }

    // Get relatives values by resetting params
    getRelativeValues() {
        if (this.state.viewMode === 'relative') {
            this.setState({
                viewMode: 'absolute'
            })
        } else {
            this.processData(this.props.data, false);
        }
    }

    render() {
        let prettifiedData = this.getPrettifiedData();
        const dataToGraph = [];
        prettifiedData.forEach(arr => {
            arr.forEach(item => {
                const index = dataToGraph.findIndex( function( ele ) {
                    return ele.date === item.date;
                } );

                if (index > 0) {
                    dataToGraph[index] = Object.assign({}, dataToGraph[index], item);
                } else {
                    dataToGraph.push(item)
                }
            } )
        });

        const bars = prettifiedData.map((k, index) => {
            return (
                <Bar
                    isAnimationActive={true}
                    dataKey={k[index]['queryId']}
                    fill={this.COLORS[index]}
                    stackId="a"
                    name = ""
                />);
        });

        const random = Math.floor(Math.random() * 1000) + 1;
        return (
            <div className={IDUtil.cssClassName('histogram')}>
				<span className="ms_toggle_btn" >
                    <input id="toggle-1" className="checkbox-toggle checkbox-toggle-round" type="checkbox" onClick={this.getRelativeValues.bind(this)}/>
                    <label htmlFor="toggle-1" data-on="Relative" data-off="Absolute"/>
                </span>
                <ResponsiveContainer width="100%" minHeight="360px" height="40%">
                    <BarChart
                        key={random}
                        width={1200}
                        height={200}
                        data={dataToGraph}
                        margin={{top: 5, right: 20, bottom: 5, left: 0}}>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis dataKey="date">
                        </XAxis>
                        <YAxis width={100} >
                            <Label
                                value="Number of records"
                                offset={10}
                                position="insideBottomLeft"
                                angle={-90}
                                style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}/>
                        </YAxis>
                        <Tooltip
                            content={<CustomTooltip/>}
                            viewMode={this.state.viewMode}/>
                        <Legend
                            verticalAlign="bottom"
                            wrapperStyle={{ position: null }}
                            height={39}
                            content={
                                <CustomLegend
                                    selectedQueries={this.props.selectedQueries}
                                    lineColour={this.COLORS}
                                    labelData={this.state.collectionList}
                                />
                            }
                        />
                        {bars}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        )
    }
}
export default ComparisonHistogram;

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
                            return (<div className="bg__comparative_histogram" onClick={this.toggleLine}>
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

class CustomTooltip extends React.Component{
    stylings(p){
        return {
            color: p.color,
            display: 'block',
            right: '0',
            margin: '0',
            padding: '0',
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
                        point = payload.map(p => <span style={this.stylings(p)}>{p.value ? p.value.toFixed(2) : 0}%</span>);

                    return (
                        <div className="ms__histogram-custom-tooltip">
                            <h4>{dataType} {valueLabel}</h4>
                            <p>Year: <span className="rightAlign">{label}</span></p>
                            <p>{labelPercentage}: <span className="rightAlign">{point}</span></p>
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
                        <div className="ms__histogram-custom-tooltip">
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

