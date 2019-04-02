import TimeUtil from '../../../util/TimeUtil';
import IDUtil from '../../../util/IDUtil';

export default class QueryInfoBlock extends React.Component {

    constructor(props) {
        super(props);
        this.CLASS_PREFIX = 'qib';
    }

    toQueryInfoData = (items, colours, queryStats) => {
        if(!items) return null;
        return items.map((item, index) => {
            return {
                savedQueryName: item.name,
                queryTerm: item.query.term,
                dateRange: item.query.dateRange,
                selectedFacets: item.query.selectedFacets,
                fieldCategory: item.query.fieldCategory,
                lineColour: colours[index],
                stats: queryStats[item.query.id]
            }
        })
    }

    renderError = stats => {
        if(stats.hasDateInformation === true && stats.error === false) return null;
        return (
            <div className={IDUtil.cssClassName('error', this.CLASS_PREFIX)}>
                {stats.error === true ? 'This query could not be executed' : null}
                {stats.error === false && stats.hasDateInformation === false ? 'No date information could be retreived' : null}
            </div>
        );
    };

    renderQueryInfoBlocks = queryInfoData => {
        if(!queryInfoData) return null;

        return queryInfoData.map((item, index) => {
            const collectionConfig = item.stats ? item.stats.collectionConfig : null;
            let fieldCategoryList = null;
            let fieldClusterHeader = null;
            let dateRangeHeader = null;
            let dateRangeFields = null;
            let dateField = null;
            let dateStart = null;
            let dateEnd = null;

            if (item.fieldCategory && item.fieldCategory.length > 0) {
                fieldCategoryList = (
                    <ul>
                        {item.fieldCategory.map(field => <li>{field.label}</li>)}
                    </ul>
                );

            }
            if (item.dateRange) {
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
                    if (dateField && dateStart && dateEnd) {
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
            if (dateRangeFields) {
                dateRangeHeader = <p><b>Date Range:</b></p>
            }
            if (fieldCategoryList) {
                fieldClusterHeader = <p><b>Field cluster:</b></p>
            }

            return (
                <div className={IDUtil.cssClassName('block', this.CLASS_PREFIX)} onClick={this.toggleLine}>
                    <div className={IDUtil.cssClassName('query', this.CLASS_PREFIX)}>
                        <h4 style={{color: item.lineColour}}>
                            Query #{index+1}: {item.savedQueryName}
                        </h4>

                        <strong>Collection name:</strong> {collectionConfig && collectionConfig.collectionInfo ? collectionConfig.collectionInfo.title : 'Unknown'}<br/>
                        <strong>Query term (Search term):</strong> {item.queryTerm}<br/>

                        {fieldClusterHeader}
                        {fieldCategoryList}
                        {dateRangeHeader}
                        {dateRangeFields}

                        <strong>Total hits:</strong> {item.stats ? item.stats.totalHits : 0}<br/>
                    </div>
                    {this.renderError(item.stats)}
                </div>
            )
        })
    }

    render() {
        const queryInfoData = this.toQueryInfoData(this.props.queries, this.props.colours, this.props.queryStats);
        if (queryInfoData) {
            return (
                <div className={IDUtil.cssClassName('query-info-block')}>
                    {this.renderQueryInfoBlocks(queryInfoData)}
                </div>
            );
        }
        return null
    }
}
