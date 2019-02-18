import IDUtil from '../../util/IDUtil';
import {LineChart, Label, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend} from 'recharts';
import SearchAPI from '../../api/SearchAPI';
import ElasticsearchDataUtil from "../../util/ElasticsearchDataUtil";
import CustomTooltip from './helpers/CustomTooltip';

//implemented using recharts: http://recharts.org/en-US/examples

class QueryComparisonLineChart extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            viewMode: this.props.data.total ? 'inspector' : 'absolute',
            isSearching: false,
            absData : this.getJoinedData(this.props.data),
            relData : null
        };
        this.COLORS = ['#468dcb', 'rgb(255, 127, 14)', 'rgba(44, 160, 44, 14)', 'wheat', 'crimson', 'dodgerblue'];
        this.layout = document.querySelector("body");
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.data !== this.props.data
            || nextState.viewMode !== this.state.viewMode
            || this.state.isSearching !== nextState.isSearching
        );
    }

    onRelativeDataReceived = (relData) => {
        const relativeValues = this.getRelValues(this.state.absData, relData);
        this.setState({
                viewMode: 'relative',
                isSearching: false,
                relData: relativeValues
            }, () => {
                this.layout.classList.remove("spinner");
            }
        );
    }

    getRelValues = (absoluteValues, relativeValues) => {
        return absoluteValues.map(point => {
            const relPoint = {"year": point["year"]};

            Object.keys(point).forEach(prop => {
                if (prop !== 'year') {
                    const relVal = relativeValues[prop].find(obj => {
                        return obj.year === point.year
                    });

                    relPoint[prop] = (relVal[prop] === 0 || point[prop] === 0
                        ? 0
                        : point[prop] / relVal[prop] * 100
                    );
                }
            });
            return relPoint
        });
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
            dataPerQuery => {
                const relValues = {};
                dataPerQuery.forEach( data => {
                    relValues[data.query.id] = ElasticsearchDataUtil.searchResultsToTimeLineData(
                        data.query,
                        data.aggregations,
                    );
                });
                this.onRelativeDataReceived(relValues);
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

    getColorIndexes = dataSet => {
        const indexes = [];
        Object.keys(dataSet).forEach((k, index) => {
            if (dataSet[k].data.length > 0) {
                indexes.push(index)
            }
        });
        return indexes
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
            let arrYearsPerQuery = arrQueryResults[0] === null ? []
                : arrQueryResults.map(arr => arr.map(item => item.year)).map(arr => end(...arr));
            return end(...arrYearsPerQuery);
        };
        /*
            Gets an object with query info with queryId as key.
            Every object has the data as an array {queryId: 'xxx', year: 'xxxx'}
        */
        const __getGraphData = dataSet => Object.keys(dataSet)
            .filter(query => (dataSet[query].data.length !== 0))
            .map(k => dataSet[k].data);

        /*  @returns a year's range.
        // @params: starting year and number of years until the end
        */
        const __getValidRange = (min, max) => Array.from(new Array(max - min + 1),(val,index)=>index+min);
        const relGraphData = __getGraphData(dataSet);
        const minYear = __endYear(relGraphData, Math.min);
        const maxYear = __endYear(relGraphData, Math.max);
        const validRange = __getValidRange(minYear, maxYear);

        const dataForGraph = validRange.map(year => {
            let tempObj = {};
            relGraphData.forEach(set => {
                const matchData = set.find(it => it.year === year);
                if(matchData !== undefined) {
                    tempObj = {...tempObj, ...matchData};
                }

            });
            return tempObj
        });

        return dataForGraph;
    }

    renderLines = () => {
        return Object.keys(this.props.data).map((k, index) => {
            const random = Math.floor(Math.random() * 1000) + 1;
            return (
                <Line
                    key={random}
                    isAnimationActive={true}
                    label={<LabelAsPoint/>} //the LabelAsPoint class handles the onclick of a dot
                    name={this.props.data[k].label}
                    type="monotone"
                    dataKey={k} //is equal to the queryId
                    stroke={this.COLORS[index]}
                    dot={{stroke: this.COLORS[index], strokeWidth: 2}}
                    activeDot={{stroke: this.COLORS[index], strokeWidth: 6, r: 3}}
                />
            );
        })
    }


    //TODO better ID!! (include some unique part based on the query)
    render() {
        const lines = this.renderLines();
        const timelineData = this.state.viewMode === 'relative' ? this.state.relData : this.state.absData;
        const colorIndexes = this.props.data ? this.getColorIndexes(this.props.data) : null;

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
                        <Tooltip content={<CustomTooltip colorIndexes={colorIndexes} viewMode={this.state.viewMode}/>}/>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }
}

export default QueryComparisonLineChart;

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
