import TimeUtil from '../../../util/TimeUtil';
import IDUtil from '../../../util/IDUtil';

export default class QueryInfoBlock extends React.Component {

    constructor(props) {
        super(props);
        this.CLASS_PREFIX = 'qib';
    }

    getStyle = colour => {
        return {
            color: colour,
            listStyle: 'none',
            padding: '10px 20px'
        };
    };

    toQueryInfoData = (items, colours, queryStats) => {
        if(!items) return null;

        return items.map((item, index) => {
            return {
                savedQueryName: item.name,
                collectionTitle: (item.collectionConfig && item.collectionConfig.collectionConfig.collectionInfo)
                    ? item.collectionConfig.collectionConfig.collectionInfo.title
                    : null,
                queryTerm: item.query.term,
                dateRange: item.query.dateRange,
                selectedFacets: item.query.selectedFacets,
                fieldCategory: item.query.fieldCategory,
                lineColour: colours[index],
                stats: queryStats[item.query.id]
            }
        })
    }

    renderQueryInfoBlocks = queryInfoData => {
        if(!queryInfoData) return null;

        return queryInfoData.map((item, index) => {
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
                <div className="query-details" onClick={this.toggleLine}>
                    <h4 style={this.getStyle(item.lineColour)}>
                        Query #{index+1}: {item.savedQueryName}
                    </h4>
                    <strong>Collection name:</strong> {item.collectionTitle}

                    <strong>Query term (Search term):</strong> {item.queryTerm}

                    {fieldClusterHeader}
                    {fieldCategoryList}
                    {dateRangeHeader}
                    {dateRangeFields}

                    <strong>Total hits:</strong> {item.stats ? item.stats.totalHits : 0}

                    <div className={IDUtil.cssClassName('error', this.CLASS_PREFIX)}>
                        {item.stats && item.stats.noDateInformation === true ? 'No date information could be retreived' : null}
                        {item.stats && item.stats.error === true ? 'This query could not be executed' : null}
                    </div>
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
