import IDUtil from '../util/IDUtil';
import TimeUtil from "../util/TimeUtil";

const QueryModel = {

	//when a collectionConfig is provided, it means that defaults from this should be used to populate the query object
	ensureQuery : function(obj, collectionConfig) {
		obj = obj || {};
		return {
			//give the query an ID for internal reference (e.g. for components that can handle multiple queries)
			id : obj.id || IDUtil.guid(),

			//the collection to search through TODO validate that this is always filled in!!!!
			collectionId : (collectionConfig ? collectionConfig.getSearchIndex() : obj.collectionId) || null,

			//what layers to search through (always check them with the collection config)
			searchLayers: QueryModel.determineSearchLayers(obj, collectionConfig),

			//the search term entered by the user
			term: obj.term || '',

			//the selected date field and range (start/end dates)
			dateRange: obj.dateRange || null, //not looking at collecitonConfig

			//currently only clusters of fields are supported for field-specific search (both in the UI and search API)
			//field clusters can be defined by subclassing CollectionConfig and implementing getMetadataFieldCategories()
			fieldCategory: obj.fieldCategory || null,

			//filters selected by the user (by selecting certain values from the desiredFacets)
			selectedFacets: obj.selectedFacets || {},

			//which aggregations should be included next to the search results
			desiredFacets: obj.desiredFacets || QueryModel.getInitialDesiredFacets(obj, collectionConfig),

			//sort by a certain field and order (asc/desc)
			sort: obj.sort && obj.sort.field ? obj.sort : { "field": "_score", "order": "desc"},

			//used for paging
			offset: obj.offset || 0,
			size: obj.size || 20,

			//(fragment search only) define the path to the desired nested document, e.g. document.page.paragraph
			fragmentPath: obj.fragmentPath || collectionConfig ? collectionConfig.getFragmentPath() : null,

			//(fragment search only) define which fields of the indicated nested document to retrieve
			fragmentFields: obj.fragmentFields || collectionConfig ? collectionConfig.getFragmentTextFields() : null,

			//(fragment search only) decide whether to return sub fragments as well
			//(e.g. when retrieving a paragraph it's possible to exclude the list of sentences)
			includeFragmentChildren: obj.includeFragmentChildren === true ? true : collectionConfig && collectionConfig.includeFragmentChildren(),

			//(fragment search only) decide whether to search/retrieve the document level as well
			includeMediaObjects: obj.includeMediaObjects === false ? false : collectionConfig && collectionConfig.includeMediaObjects(),

			//paging within inner hits is not really supported/reflected by the UI (yet)
			innerHitsOffset: obj.innerHitsOffset || 0,
			innerHitsSize: obj.innerHitsSize || 5,

			//remove certain fields from the returned data
			exclude: obj.exclude || collectionConfig ? collectionConfig.getFieldsToExclude() : null
		};
	},

	determineSearchLayers(query, config) {
		let searchLayers = null;
		let foundLayer = false;
		if(config && config.getCollectionIndices()) {
			searchLayers = {};
			config.getCollectionIndices().forEach((layer) => {
				if(query && query.searchLayers) {
					if(query.searchLayers[layer] !== undefined) {
						searchLayers[layer] = query.searchLayers[layer];
						foundLayer = true;
					} else {
						searchLayers[layer] = false;
					}
				} else { //include all default layers
					searchLayers[layer] = true;
					foundLayer = true;
				}
			});
		}
		//if for some shitty reason the search layer (entered in the URL) does not match the collection ID
		//just set it manually (maybe this is being too nice)
		if(!foundLayer) {
			searchLayers = {};
			searchLayers[config.getCollectionId()] = true;
		}
		return searchLayers;
	},

	getInitialDesiredFacets(query, config) {
		let df = config ? config.getFacets() : null || [];
		if(query.dateRange && query.dateRange.field) {
			df.push({
				field: query.dateRange.field,
				title : config.toPrettyFieldName(query.dateRange.field),
				id : query.dateRange.field,
				type : 'date_histogram'
			});
		}
		return df;
	},

	toHumanReadableString(query) {
		if(query) {
			const strList = [];
			if(query.term) {
				strList.push('Search term: ' + query.term);
			} else {
				strList.push('No search term');
			}
			if(query.selectedFacets && Object.keys(query.selectedFacets).length > 0) {
				strList.push('# filters: ' + Object.keys(query.selectedFacets).length);
			}
			return strList.join('; ');
		}
		return null;
	},

    __getFieldsCategory(fieldCategories) {
        const header = "<p><u>Fields category</u></p>";
        let fieldsCategory = null;
        if (fieldCategories) {
            fieldsCategory = header + "<ul>";
            fieldCategories.map(item => fieldsCategory += "<li>" + item.label + "</li>")
            fieldsCategory += "</ul>";
            return fieldsCategory;
        }
        return null;
    },
    __getSelectedFacets(selectedFacets) {
        const header = "<div class='bg_queryDetails-wrapper'><p><u>Selected category</u></p><div class='bg__selectedFacet-list'>";
        let fieldsCategory = null;

        if (selectedFacets) {
            if(Object.keys(selectedFacets).length > 0 && selectedFacets.constructor === Object) {
                fieldsCategory = header;
                const keys = Object.keys(selectedFacets);
                keys.map(k => {
                    fieldsCategory += "<p>Facet name: " + k + " </p><ul>";
                    selectedFacets[k].map(facet => {
                        fieldsCategory += "<li>" + facet + "</li>";
                    });
                    fieldsCategory += "</ul>";
                });
                fieldsCategory += "</div></div>";
                return fieldsCategory;
            }
            return "";
        }
    },
    queryDetailsTooltip(query) {
        if (query) {
            const queryDetailsHeader = "<h3>Query details</h3>",
                queryName = query.name ? "<div class='bg_queryDetails-wrapper'><p><u>Name:</u> " + query.name + "</p></div>" : '',
                dateFieldName = query.query.dateRange && query.query.dateRange.field
                    ? "<li>Name: " + query.query.dateRange.field + "</li>" : "",
                startDate = query.query.dateRange && query.query.dateRange.start
                    ? "<li>Start: " + TimeUtil.UNIXTimeToPrettyDate(query.query.dateRange.start) + "</li>" : "",
                endDate = query.query.dateRange && query.query.dateRange.end
                    ? "<li>End: " + TimeUtil.UNIXTimeToPrettyDate(query.query.dateRange.end) + "</li>" : "",
                date = dateFieldName || startDate || endDate
                    ? "<div class='bg_queryDetails-wrapper'><p><u>Date Field: </u></p><ul>" + dateFieldName + startDate + endDate + "</ul></div>"
                    : "",
                searchTerm = query.query.term
                    ? "<div class='bg_queryDetails-wrapper'><p><u>Search Term:</u> " + query.query.term + "</p></div>" : "",
                selectedFacets = query.query.selectedFacets ? QueryModel.__getSelectedFacets(query.query.selectedFacets) : "",
                fieldCategory = query.query.fieldCategory && query.query.fieldCategory.length > 0
                    ? QueryModel.__getFieldsCategory(query.query.fieldCategory) : "";
            return queryDetailsHeader + queryName + searchTerm + date + fieldCategory + selectedFacets;
        } else {
            return null;
        }
    }

	/*----------------------------------------------------------------------
	*---------------------------- NOT USED YET ------------------------------
	----------------------------------------------------------------------*/

	//e.g. { "nisv-catalogue-aggr": true}
	// validateSearchLayers : function(obj) {
    //
	// },

	// validateDateRange : function(obj) {
	// 	return {
	// 		field : obj.field || null,
	// 		start : obj.start || -1,
	// 		end : obj.end || -1
	// 	};
	// },

	// validateFieldCategories : function(list) {
	// 	return {
	// 		id : obj.id,
	// 		label : obj.label,
	// 		fields : obj.fields || []
	// 	};
	// },

	//e.g. {bg:publications.bg:publication.bg:broadcasters.bg:broadcaster: ["VARA"]}
	// validateSelectedFacets : function(obj) {
    //
	// },

	// validateDesiredFacets : function(list) {
	// 	return {
	// 		id : obj.id || null, //"broadcaster",
	// 		title : obj.title || null, //"Broadcaster",
	// 		field : obj.field || null, //"bg:publications.bg:publication.bg:broadcasters.bg:broadcaster",
	// 		type : obj.type || null, // "string" | "date_histogram"
	// 	};
	// }
};

export default QueryModel;
