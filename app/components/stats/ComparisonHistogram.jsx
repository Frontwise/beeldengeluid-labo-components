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
import CustomLegend from './CustomLegend';

class ComparisonHistogram extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            viewMode: 'absolute', // Sets default view mode to absolute.
            relData: null,
            absData: this.getJoinedData(this.props.data) || null,
            queriesIds: this.getQueriesIds(this.props.data) || null,
            isSearching: false,
            collectionList : null
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
        this.layout = document.querySelector("body");
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

    getQueriesIds = dataSets => dataSets.map(set => set.query.id);

    /*
        Gets an object with query info with queryId as key.
        Every object has the data as an array {queryId: 'xxx', year: 'xxxx'}
    */
    __getGraphData = (dataSet, returnedType) => {
        let dataArr = [];
        let dataObj = {};
        dataSet.forEach(k => {
            let tempDataSet = k.aggregations[k.query.dateRange.field];
            tempDataSet.forEach(point => {
                point[`${k.query.id}`] = point.doc_count;
                point['date'] = new Date(point.date_millis).getFullYear();
            });
           if(returnedType === 'arr') {
               dataArr.push(tempDataSet)
           } else {
               dataObj[`${k.query.id}`] = tempDataSet
           }
        });
        return returnedType === 'arr' ? dataArr : dataObj;
    };

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
            let arrYearsPerQuery = arrQueryResults.map(arr => arr.map(item => item.date_millis)).map(arr => end(...arr));
            return end(...arrYearsPerQuery);
        };

        /*  @returns a year's range.
        // @params: starting year and number of years until the end
        */
        const __getValidRange = (min, max) => Array.from(new Array(max - min + 1),(val,index)=>index+min);

        const relGraphData = this.__getGraphData(dataSet, 'arr');
        const minYear = new Date(__endYear(relGraphData, Math.min)).getFullYear();
        const maxYear = new Date(__endYear(relGraphData, Math.max)).getFullYear();
        const validRange = __getValidRange(minYear, maxYear);
        let dataForGraph = [];

        validRange.forEach(year => {
            let tempObj = {};

            relGraphData.forEach(set => {
                const matchData = set.find(it => new Date(it.date_millis).getFullYear() === year);
                if(matchData !== undefined) {
                    tempObj = {...tempObj, ...matchData};
                }

            });
            dataForGraph.push(tempObj);
        });
        return dataForGraph;
    };

    getRelValues(absoluteValues, relativeValues) {
        const relVals = this.__getGraphData(relativeValues, 'obj');
        let points = [];

        absoluteValues.forEach(point => {
            let relPoint = {"date": point["date"]};

            Object.keys(point).forEach(propt => {
                    if (propt !== 'date' && propt !== 'key' && propt !== 'date_millis' && propt !== 'key_as_string' && propt !== 'doc_count') {
                        let tt = relVals[`${propt}`].find(obj => {
                            return obj.date === point.date
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
            if(this.state.relData === null) {
                this.processData(this.props.data);
                this.layout.classList.add("spinner");
            } else {
                this.setState({
                    viewMode: 'relative'
                })
            }
        }
    }

    getStackBars = dataKeys => dataKeys.map((id, index) => (
        <Bar
            isAnimationActive={true}
            dataKey={id}
            fill={this.COLORS[index]}
            stackId="a"
            name=""
        />)
    );

    render() {
        const random = Math.floor(Math.random() * 1000) + 1;
        let bars = null;
        let dataToPrint = null;

        if (this.state.queriesIds) {
            bars = this.getStackBars(this.state.queriesIds);
        }
        if(this.state.viewMode === 'relative') {
            dataToPrint = this.state.relData;
        } else {
            dataToPrint = this.state.absData;
        }

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
                        data={dataToPrint}
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

