import TimeUtil from '../../util/TimeUtil';

const MessageHelper = {

	renderNoDocumentsWithDateFieldMessage : function() {
		return (<div className="alert alert-danger">
			<strong>Notice:</strong> None of the search results contain the selected date field, so plotting a timeline based on this field is not possible.
			<br/><br/>
			Try selecting another date field if you are interested in how the search results are distributed over time (based on the selected date field).
		</div>)
	},

	renderNoSearchResultsMessage : function(query, clearSearchFunc) {
		return (
			<div>
				<h4>Your query did not yield any results</h4>
				{MessageHelper.__renderQuery(query)}
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

	renderQueryForTooltip : function(query) {
		return (
			<div>
				{MessageHelper.__renderQuery(query)}
				<div className='bg__copyToClipboardMSN'>On click copy to clipboard</div>
			</div>
		)
	},

	/* -------------------------------- PARTIAL RENDERING FUNCTIONS --------------------------- */

	__renderQuery : function(query) {
		return (
			<div>
				<div className='bg_queryDetails-wrapper'><strong>Search Term:</strong> {query.term}</div>
				{MessageHelper.__renderDateRange(query.dateRange)}
				{MessageHelper.__renderSelectedFacets(query.selectedFacets)}
				{MessageHelper.__renderFieldsCategory(query.fieldCategory)}
			</div>
		)
	},

	__renderDateRange : function(dateRange) {
		if(dateRange) {
			return (
				<div className='bg_queryDetails-wrapper'><strong>Date Field: </strong>
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

	__renderSelectedFacets : function(selectedFacets) {
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
	            			<strong>Selected facets</strong>
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

	__renderFieldsCategory : function(fieldCategories) {
        if (fieldCategories && fieldCategories.length > 0) {
            return (
            	<div>
            		<strong>Selected field categories</strong>
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