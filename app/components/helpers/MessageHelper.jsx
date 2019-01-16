import TimeUtil from '../../util/TimeUtil';

const MessageHelper = {

	getNoDocumentsWithDateFieldMessage : function() {
		return (<div className="alert alert-danger">
			<strong>Notice:</strong> None of the search results contain the selected date field, so plotting a timeline based on this field is not possible.
			<br/><br/>
			Try selecting another date field if you are interested in how the search results are distributed over time (based on the selected date field).
		</div>)
	},

	getNoSearchResultsMessage : function(query, clearSearchFunc) {
		return (
			<div>
				<h4>Your query did not yield any results</h4>

				<h5>Query details:</h5>
				<div className='bg_queryDetails-wrapper'><p><u>Search Term:</u>{query.term}</p></div>
				{MessageHelper.__getDateRange(query.dateRange)}
				{MessageHelper.__getSelectedFacets(query.selectedFacets)}
				{MessageHelper.__getFieldsCategory(query.fieldCategories)}
				<strong>Note:</strong> Please try to refine or clear your search
				<button
	                onClick={() => clearSearchFunc()}
	                type="button"
	                className="btn btn-primary btn-xs bg__clear-query-btn">
	                Clear search
	            </button>
			</div>
		)
	},

	__getDateRange : function(dateRange) {
		if(dateRange) {
			return (
				<div className='bg_queryDetails-wrapper'><p><u>Date Field: </u></p>
					<ul>
						<li>Name: {dateRange.field}</li>
						<li>Start: {TimeUtil.UNIXTimeToPrettyDate(dateRange.start)}</li>
						<li>End: {TimeUtil.UNIXTimeToPrettyDate(dateRange.end)}</li>
					</ul>
				</div>
			)
		}
		return null;
	},

	__getSelectedFacets : function(selectedFacets) {
        if (selectedFacets) {
            if(Object.keys(selectedFacets).length > 0 && selectedFacets.constructor === Object) {
                const facets = Object.keys(selectedFacets).map(k => {

                    const selected = selectedFacets[k].map(facet => {
                        return (<li>{facet}</li>);
                    });
                    return (<div><p>Facet name:{k}</p><ul>{selected}</ul></div>)
                });
                return (
	            	<div className='bg_queryDetails-wrapper'>
	            		<p>
	            			<u>Selected category</u>
	            		</p>
	            		<div className='bg__selectedFacet-list'>
	            			{facets}
	            		</div>
	            	</div>

	            )
            }
        }
        return null;
    },

	__getFieldsCategory : function(fieldCategories) {
        if (fieldCategories) {
            return (
            	<div>
            		<p>
            			<u>Fields category</u>
            		</p>
            		<ul>
            			{fieldCategories.map(item => {
            				return (<li>{item.label}</li>)
            			})}
            		</ul>
            	</div>
            )
        }
        return null;
    }

}

export default MessageHelper;