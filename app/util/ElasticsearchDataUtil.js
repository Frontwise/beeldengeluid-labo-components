import TimeUtil from './TimeUtil';

//TODO maybe move this to some other utility class
const ElasticsearchDataUtil = {

	//transforms a query from the QueryBuilder into something readable for the user
	toPrettyQuery(query) {
		if(query) {
			//console.debug(query);
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

	/* ----------------------------- Used by: ComparativeSearchRecipe ------------------------------------------------ */

	//TODO make sure the different date formats can be handled!
	searchResultsToTimeLineData : function(data) {
		if(data && data.dateField) {
		 	const timelineData = []
		 	if(data && data.results && data.dateField) {
			 	if(data.aggregations && data.aggregations[data.dateField]) {
					data.aggregations[data.dateField].forEach((a) => {
						const y = new Date(a.date_millis).getFullYear();
						if (!(isNaN(y))) {
							let td = {
								year: y
							}
							td[data.queryId] = a.doc_count//
							timelineData.push(td);
						}
					});

				}
			}
			return timelineData;
		}
		return null;
	},

	/* ----------------------------- Used by: AggregationBox, AggregationList, DateRangeSelector ------------ */

	getAggregationTitle(aggrId, configuredAggregations) {
		let title = null;
		for(const f of configuredAggregations) {
			if(f.field == aggrId) {
				title = f.title;
				break;
			}
		}
		return title;
	},

	isHistogram(aggrId, configuredAggregations) {
		let h = false;
		for(const f of configuredAggregations) {
			if(f.field == aggrId) {
				h = f.type == 'date_histogram';
				break;
			}
		}
		return h;
	},

	/* ----------------------------- Used by: CollectionConfig -----------------------------------------------  */

	//tries to automatically detect facets based on the Search API's collection statistics
	//See CollectionConfig.jsx for more insight
	//TODO also extend this with autodection based on known schemata
	extractFacetsFromStats : function(dateFields, stringFields, longFields, doubleFields) {
		const facets = [];
		if(dateFields && dateFields.length > 0) {
			//2010-03-15 voor dc:date
			//DIDL 2016-01-12T14:37:36.671Z
			facets.push({
				field: dateFields[0],
				title : 'Date',
				id : 'date',
				operator : 'AND',
				size : 10,
				type : 'date_histogram',
				display: true
			});
		}
		//look for genre, subject, coverage & contributors in the string fields
		if(stringFields && stringFields.length > 0) {
			const genres = stringFields.filter((sf)=>{
				return sf.indexOf('genre') != -1;
			});
			const subjects = stringFields.filter((sf)=>{
				return sf.indexOf('subject') != -1;
			});
			const locations = stringFields.filter((sf)=>{
				return sf.indexOf('coverage') != -1;
			});
			const contributors = stringFields.filter((sf)=>{
				return sf.indexOf('contributor') != -1;
			});
			if(genres.length > 0) {
				facets.push({
					field: genres[0],
					title : 'Genre',
					id : 'genre',
					type : 'string'
				});
			}
			if(subjects.length > 0) {
				facets.push({
					field: subjects[0],
					title : 'Subject',
					id : 'subject',
					type : 'string'
				});
			}
			if(locations.length > 0) {
				facets.push({
					field: locations[0],
					title : 'Location',
					id : 'location',
					type : 'string'
				});
			}
			if(contributors.length > 0) {
				facets.push({
					field: contributors[0],
					title : 'Contributor',
					id : 'contributor',
					type : 'string'
				});
			}
		}
		return facets.length > 0 ? facets : null;
	}

};

export default ElasticsearchDataUtil;