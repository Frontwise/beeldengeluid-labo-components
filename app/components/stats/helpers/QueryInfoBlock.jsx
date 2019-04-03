import TimeUtil from '../../../util/TimeUtil';
import IDUtil from '../../../util/IDUtil';

export default class QueryInfoBlock extends React.Component {

    constructor(props) {
        super(props);
        this.CLASS_PREFIX = 'qib';
    }

    toQueryInfoData = (items, queryStats) => {
        if(!items) return null;

        return items.map((item, index) => {
            return {
                savedQueryName: item.name,
                queryTerm: item.query.term,
                dateRange: item.query.dateRange,
                selectedFacets: item.query.selectedFacets,
                fieldCategory: item.query.fieldCategory,
                stats: queryStats[item.query.searchId]
            }
        })
    }

    renderError = stats => {
        if(stats.hasDateInformation === true && stats.error === false) return null;
        return (
            <div className={IDUtil.cssClassName('error', this.CLASS_PREFIX)}>
                {stats.error === true ? 'This query could not be executed' : null}
                {stats.error === false && stats.hasDateInformation === false ? 'No date information could be retreived, try adding a (different) date field' : null}
            </div>
        );
    };

    renderQueryInfoBlocks = queryInfoData => {
        if(!queryInfoData) return null;

        return queryInfoData.map((item, index) => {
            let fieldCategoryList = null;
            let fieldClusterHeader = null;
            let dateRangeHeader = null;
            let dateRangeFields = null;

            if (item.fieldCategory && item.fieldCategory.length > 0) {
                fieldCategoryList = (
                    <ul>
                        {
                            item.fieldCategory.map(field => {
                                return (
                                    <li>{field.label}</li>
                                )
                            })
                        }
                    </ul>
                );

            }
            if (item.dateRange) {
                let dateField = null;
                let dateStart = null;
                let dateEnd = null;
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
                                <li className={IDUtil.cssClassName('value', this.CLASS_PREFIX)}>
                                    <label>Selected date field:</label>
                                    <span>{
                                        item.stats.collectionConfig ? item.stats.collectionConfig.toPrettyFieldName(dateField) : dateField
                                    }</span>
                                </li>
                                <li className={IDUtil.cssClassName('value', this.CLASS_PREFIX)}>
                                    <label>Initial date:</label>
                                    <span>{dateStart}</span>
                                </li>
                                <li className={IDUtil.cssClassName('value', this.CLASS_PREFIX)}>
                                    <label>End date:</label>
                                    <span>{dateEnd}</span>
                                </li>
                            </ul>
                        )
                    }
                })

            }

            return (
                <div className={IDUtil.cssClassName('block', this.CLASS_PREFIX)} onClick={this.toggleLine}>
                    <div className={IDUtil.cssClassName('query', this.CLASS_PREFIX)}>
                        <h4>
                            Query #{item.stats.queryIndex}: {item.savedQueryName}
                            <span className={IDUtil.cssClassName('color', this.CLASS_PREFIX)} style={{backgroundColor: item.stats.color}}></span>
                        </h4>

                        <div className={IDUtil.cssClassName('value', this.CLASS_PREFIX)}>
                            <label>Collection:</label>
                            <span>
                                {
                                    item.stats.collectionConfig && item.stats.collectionConfig.collectionInfo ?
                                    item.stats.collectionConfig.collectionInfo.title : 'Unknown'
                                }
                            </span>
                        </div>

                        <div className={IDUtil.cssClassName('value', this.CLASS_PREFIX)}>
                            <label>Query term:</label>
                            <span>
                                {item.queryTerm}
                            </span>
                        </div>

                        {fieldCategoryList ? <label>Field clusters:</label> : null}
                        {fieldCategoryList}
                        {dateRangeFields ? <label>Date range:</label> : null}
                        {dateRangeFields}

                        <strong>Total hits:</strong> <span className={IDUtil.cssClassName('count', this.CLASS_PREFIX)}>{item.stats.totalHits}</span><br/>
                    </div>
                    {this.renderError(item.stats)}
                </div>
            )
        })
    }

    render() {
        const queryInfoData = this.toQueryInfoData(this.props.queries, this.props.queryStats);
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
