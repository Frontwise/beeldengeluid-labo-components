import IDUtil from '../util/IDUtil';

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
			sort: obj.sort || { "field": "_score", "order": "desc"},

			//used for paging
			offset: obj.offset || 0,
			size: obj.size || 20,

			//(fragment search only) define the path to the desired nested document, e.g. document.page.paragraph
			fragmentPath: obj.fragmentPath || collectionConfig ? collectionConfig.getFragmentPath() : null,

			//(fragment search only) define which fields of the indicated nested document to retrieve
			fragmentFields: obj.fragmentFields || collectionConfig ? collectionConfig.getFragmentTextFields() : null,

			//(fragment search only) decide whether to return sub fragments as well
			//(e.g. when retrieving a paragraph it's possible to exclude the list of sentences)
			includeFragmentChildren: obj.includeFragmentChildren === true || false,

			//(fragment search only) decide whether to search/retrieve the document level as well
			includeMediaObjects: obj.includeMediaObjects === false || true,

			//paging within inner hits is not really supported/reflected by the UI (yet)
			innerHitsOffset: obj.innerHitsOffset || 0,
			innerHitsSize: obj.innerHitsSize || 5
		}
	},

	determineSearchLayers(query, config) {
		let searchLayers = null;
		if(config && config.getCollectionIndices()) {
			searchLayers = {};
			config.getCollectionIndices().forEach((layer) => {
				if(query && query.searchLayers) {
					if(query.searchLayers[layer] !== undefined) {
						searchLayers[layer] = query.searchLayers[layer];
					} else {
						searchLayers[layer] = false;
					}
				} else { //include all default layers
					searchLayers[layer] = true;
				}
			});
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
		return df
	},

	toHumanReadableString(query) {
		if(query) {
			const strList = []
			if(query.term) {
				strList.push('Search term: ' + query.term);
			} else {
				strList.push('No search term');
			}
			if(query.selectedFacets && Object.keys(query.selectedFacets).length > 0) {
				strList.push('# filters: ' + Object.keys(query.selectedFacets).length);
			}
			return strList.join('; ')
		}
		return null;
	},

	//TODO add support for missing params such as: desiredFacets
	toUrlParams(query) {
		const params = {
			fr : query.offset,
			sz : query.size,
			cids : query.collectionId
		}

		if(query.searchLayers) {
			const sl = Object.keys(query.searchLayers).filter((l) => {
				return query.searchLayers[l];
			});
			if(sl.length > 0) {
				params['sl'] = sl.join(',');
			}
		}

		if(query.term) {
			params['st'] = query.term;
		}

		if(query.dateRange) {
			let dr = query.dateRange.field + '__';
			dr += query.dateRange.start + '__';
			dr += query.dateRange.end;
			params['dr'] = dr;
		}

		if(query.fieldCategory) {
            params['fc'] ='';
            query.fieldCategory.map(function(item){
                params['fc'] += item.id + '|';
			});
            params['fc'] = params['fc'].slice(0, -1);
		}

		let sf = []
		if(query.selectedFacets) {
			sf = Object.keys(query.selectedFacets).map((key) => {
				return query.selectedFacets[key].map((value) => {
					return key + '|' + value;
				})
			});
			params['sf'] = sf.join(',');
		}

		if(query.sort) {
			let s = query.sort.field + '__';
			s += query.sort.order;
			params['s'] = s;
		}
		return params;
	},

	//TODO probably better to return a default query instead of null whenever the urlParams are null
	urlParamsToQuery : function(urlParams, collectionConfig) {
		if(urlParams) {
			const numParams = Object.keys(urlParams).length;
			if(numParams == 0) {
				return null;
			} else if(numParams == 1 && urlParams.cids) {
				return null;
			}
		} else {
			return null;
		}
		const searchTerm = urlParams.st ? urlParams.st : '';
		const fc = urlParams.fc;
		const fr = urlParams.fr ? urlParams.fr : 0;
		const size = urlParams.sz ? urlParams.sz : 10;
		const sf = urlParams.sf;
		const sl = urlParams.sl;
		const dr = urlParams.dr;
		const s = urlParams.s;

		//populate the field category
		let fieldCategory = [];

		if(fc) {
            // split field selected parameters.
            let selectedFields = [];
            fc.split('|').forEach(function(field){
                selectedFields.push(field);
            });

			const tmp = collectionConfig.getMetadataFieldCategories();
			let currentSelectedfields= [];

            selectedFields.map(selField => {
				tmp.map(fieldsArray => {
					if( fieldsArray.id == selField){
                        currentSelectedfields.push(fieldsArray)
					}
				})
            });
            fieldCategory = currentSelectedfields;
		}

		//populate the facets
		const selectedFacets = {};
		if(sf) {
			const tmp = sf.split(',');
			tmp.forEach((aggr) => {
				const a = aggr.split('|');
				const key = a[0];
				const value = a[1];
				if(selectedFacets[key]) {
					selectedFacets[key].push(value);
				} else {
					selectedFacets[key] = [value];
				}
			});
		}

		//populate the search layers
		let searchLayers = []
		if(sl) {
			searchLayers = {}
			sl.split(',').forEach(layer => {
				searchLayers[layer] = true;
			});
		}
		console.debug(searchLayers)

		//populate the date range TODO think of a way to include min/max :s
		let dateRange = null;
		if(dr) {
			const tmp = dr.split('__');
			if(tmp.length == 3) {
				dateRange = {
					field : tmp[0],
					start : parseInt(tmp[1]),
					end : parseInt(tmp[2])
				}
			}
		}

		//populate the sort
		let sortParams = null;
		if(s) {
			const tmp = s.split('__');
			if(tmp.length == 2) {
				sortParams = {
					field : tmp[0],
					order : tmp[1]
				}
			}
		}

		return QueryModel.ensureQuery (
			{
				searchLayers : searchLayers,
				term : searchTerm,
				dateRange : dateRange,
				fieldCategory : fieldCategory,
				selectedFacets : selectedFacets,
				sortParams : sortParams,
				offset : parseInt(fr),
				size : parseInt(size)
			},
			collectionConfig
		)
	},

	/*----------------------------------------------------------------------
	*---------------------------- NOT USED YET ------------------------------
	----------------------------------------------------------------------*/

	//e.g. { "nisv-catalogue-aggr": true}
	validateSearchLayers : function(obj) {

	},

	validateDateRange : function(obj) {
		return {
			field : obj.field || null,
			start : obj.start || -1,
			end : obj.end || -1
		}
	},

	validateFieldCategories : function(list) {
		return {
			id : obj.id,
			label : obj.label,
			fields : obj.fields || []
		}
	},

	//e.g. {bg:publications.bg:publication.bg:broadcasters.bg:broadcaster: ["VARA"]}
	validateSelectedFacets : function(obj) {

	},

	validateDesiredFacets : function(list) {
		return {
			id : obj.id || null, //"broadcaster",
			title : obj.title || null, //"Broadcaster",
			field : obj.field || null, //"bg:publications.bg:publication.bg:broadcasters.bg:broadcaster",
			type : obj.type || null, // "string" | "date_histogram"
		}
	}
}

export default QueryModel;