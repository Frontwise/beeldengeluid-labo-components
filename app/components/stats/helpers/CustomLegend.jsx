import TimeUtil from '../../../util/TimeUtil';

export default class CustomLegend extends React.Component {
    stylings(p) {
        return {
            color: p,
            listStyle: 'none',
            padding: '10px 20px'
        }
    }

    render() {
        const selectedQueries = this.props.selectedQueries;
        let queryInfoBlocks = null;
        const queryInfo = selectedQueries.map(() => {
                const selectedQueries = this.props.selectedQueries;
                const queryDetails = [];
                if (selectedQueries) {
                    selectedQueries.map((query, index) => {
                                queryDetails.push({
                                    "savedQueryName": query.name,
                                    "collectionTitle": query.collectionConfig.collectionInfo.title,
                                    "queryTerm": query.query.term,
                                    "dateRange": query.query.dateRange,
                                    "selectedFacets": query.query.selectedFacets,
                                    "fieldCategory": query.query.fieldCategory,
                                    "lineColour": this.props.lineColour[index]
                                })
                    })
                }
                if (queryDetails.length > 0) {
                    queryInfoBlocks = queryDetails.map(
                        (item, index) => {
                            let fieldCategoryList = null,
                                fieldClusterHeader = null,
                                dateRangeHeader = null,
                                dateRangeFields = null,
                                dateField = null,
                                dateStart = null,
                                dateEnd = null;
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
                                <div className="bg__query-details" onClick={this.toggleLine}>
                                    <h4 style={this.stylings(item.lineColour)}>Query #{index+1}: {item.savedQueryName}</h4>
                                    <p><b>Collection name:</b> {item.collectionTitle}</p>
                                    <p><b>Query term (Search term):</b> {item.queryTerm}</p>
                                    {fieldClusterHeader}
                                    <ul>{fieldCategoryList}</ul>
                                    {dateRangeHeader}
                                    {dateRangeFields}
                                </div>
                            )
                        }
                    )
                }
            }
        );
        if (queryInfo) {
            return (
                <div className="bg__ms__custom-legend">
                    {queryInfoBlocks}
                </div>
            );
        }
        return null;
    }
}

