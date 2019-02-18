import TimeUtil from '../../../util/TimeUtil';
import IDUtil from '../../../util/IDUtil';

export default class QueryInfoBlock extends React.Component {

    getStyle = (p) => {
        return {
            color: p,
            listStyle: 'none',
            padding: '10px 20px'
        }
    }

    toQueryInfoData = (selectedQueries) => {
        if(!selectedQueries) return null;

        return selectedQueries.map((query, index) => {
            return {
                savedQueryName: query.name,
                collectionTitle: (query.collectionConfig && query.collectionConfig.collectionConfig.collectionInfo)
                    ? query.collectionConfig.collectionConfig.collectionInfo.title
                    : null,
                queryTerm: query.query.term,
                dateRange: query.query.dateRange,
                selectedFacets: query.query.selectedFacets,
                fieldCategory: query.query.fieldCategory,
                lineColour: this.props.lineColour[index]
            }
        })
    }

    renderQueryInfoBlocks = (queryInfoData) => {
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
                fieldCategoryList = item.fieldCategory.map(field => <li>{field.label}</li>)
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
                    <h4 style={this.getStyle(item.lineColour)}>Query #{index+1}: {item.savedQueryName}</h4>
                    <p><b>Collection name:</b> {item.collectionTitle}</p>
                    <p><b>Query term (Search term):</b> {item.queryTerm}</p>
                    {fieldClusterHeader}
                    <ul>{fieldCategoryList}</ul>
                    {dateRangeHeader}
                    {dateRangeFields}
                </div>
            )
        })
    }

    render() {
        const queryInfoData = this.toQueryInfoData(this.props.selectedQueries);
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
