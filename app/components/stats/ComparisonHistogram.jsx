import IDUtil from '../../util/IDUtil';
import { Label, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import SearchAPI from "../../api/SearchAPI";
import CustomTooltip from './helpers/CustomTooltip';

//implemented using recharts: http://recharts.org/en-US/examples

//FIXME part of this code is duplicate with whatever is in the QueryComparisonLineChart!

export default class ComparisonHistogram extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            viewMode: 'absolute', // Sets default view mode to absolute.
            relData: null,
            absData: this.getJoinedData(this.props.data) || null,
            queriesIds: this.getQueriesIds(this.props.data) || null,
            isSearching: false
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

    getQueriesIds = dataSets => dataSets.map(set => set.query.id)

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

        return validRange.map(year => {
            let tempObj = {};

            relGraphData.forEach(set => {
                const matchData = set.find(it => new Date(it.date_millis).getFullYear() === year);
                if(matchData !== undefined) {
                    tempObj = {...tempObj, ...matchData};
                }

            });
            return tempObj
        });
    }

    getRelValues = (absoluteValues, relativeValues) => {
        const relVals = this.__getGraphData(relativeValues, 'obj');
        return absoluteValues.map(point => {
            const relPoint = {date: point["date"]};
            Object.keys(point).forEach(prop => {
                if (prop !== 'date' && prop !== 'key' && prop !== 'date_millis' && prop !== 'key_as_string' && prop !== 'doc_count') {
                    const tt = relVals[prop].find(obj => obj.date === point.date);
                    relPoint[prop] = (tt[prop] === 0 || point[prop] === 0
                        ? 0
                        : point[prop] / tt[prop] * 100
                    );
                }
            });
            return relPoint
        })
    }

    onRelativeDataReceived = (relData) => {
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
            (dataPerQuery) => this.onRelativeDataReceived(dataPerQuery)
        );
    }

    // Get relatives values by resetting params
    getRelativeValues = () => {
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

    getColorIndices = dataSet => {
        if(!dataSet) return null;
        const indexes = [];
        dataSet.forEach((k, index) => {
            if (k.aggregations[k.query.dateRange.field].length > 0) {
                indexes.push(index)
            }
        });
        return indexes
    }

    renderStackBars = dataKeys => dataKeys.map((id, index) => (
        <Bar
            isAnimationActive={true}
            dataKey={id}
            fill={this.COLORS[index]}
            stackId="a"
            name=""
        />)
    )

    render() {
        const random = Math.floor(Math.random() * 1000) + 1;
        const dataToPrint = this.state.viewMode === 'relative' ? this.state.relData : this.state.absData;
        const colorIndexes = this.getColorIndices(this.props.data);
        const bars = this.state.queriesIds ? this.renderStackBars(this.state.queriesIds) : null;

        return (
            <div className={IDUtil.cssClassName('query-comparison-histogram')}>
				<span className="ms_toggle_btn" >
                    <input id="toggle-1" className="checkbox-toggle checkbox-toggle-round" type="checkbox" onClick={this.getRelativeValues}/>
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
                        <XAxis dataKey="date" height={100}>
                            <Label
                                value="Year (selected date field varies per query)"
                                position="outside"
                                offset={0}
                                style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}
                            />
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
                            content={<CustomTooltip colorIndexes={colorIndexes}/>}
                            viewMode={this.state.viewMode}/>
                        {bars}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        )
    }
}
