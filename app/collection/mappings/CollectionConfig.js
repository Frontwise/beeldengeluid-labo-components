import MetadataSchemaUtil from '../../util/MetadataSchemaUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import RegexUtil from '../../util/RegexUtil';

/*
TODO:
- nadenken hoe automatisch facets te genereren
- apart component maken voor zoeken in fragmenten
- component met audio player
- play-out van een fragment goed integreren (b.v. vanuit woordenwolk naar player)
- make sure the config 'knows' which kind of view it should generate data for
*/

//base class for each collection configuration
class CollectionConfig {

	//requires the output of [SEARCH_API]/api/v1/collections/show_stats?collectionId=[ID]
	constructor(clientId, user, collectionId, collectionStats, collectionInfo) {
		this.clientId = clientId;
		this.user = user;
		this.collectionId = collectionId; //based on the ES index name
		this.collectionStats = collectionStats; //ES stats (mostly about field types)
		this.collectionInfo = collectionInfo; //CKAN metadata (null for personal collections or outside of CLARIAH)

		this.docType = null;
		this.stringFields = [];
		this.textFields = [];
		this.dateFields = [];
		this.nonAnalyzedFields = [];
		this.keywordFields = [];
		this.longFields = [];
		this.doubleFields = [];
		this.nestedFields = [];

		if(collectionStats && collectionStats.collection_statistics) {
			let temp = null;

			//extract the preferred doc type
			if(collectionStats.collection_statistics.document_types) {
				collectionStats.collection_statistics.document_types.forEach(function(dt) {
					if(temp == null) {
						temp = dt;
					} else if(temp.doc_count < dt.doc_count) {
						temp = dt;
					}
				}.bind(this));
				this.docType = temp.doc_type;
			}

			//extract the field info
			if(temp && temp.fields) {
				//merged in getStringFields(). ES5 uses 'text' and older versions only use 'string'
				this.stringFields = temp.fields['string'];
				this.textFields = temp.fields['text'];

				//merged in getNonAnalyzedFields()
				this.nonAnalyzedFields = temp.fields['not_analyzed'];

                if(temp.fields['keyword']){
                    this.keywordFields = temp.fields['keyword'];
                }

				this.dateFields = temp.fields['date'];
				this.longFields = temp.fields['long'];
				this.doubleFields = temp.fields['double'];

				this.nestedFields = temp.fields['nested'];
			}
		}
	}

	getCollectionMediaTypes() {
		return [];
	}

	//Important for generating replacable PIDs for playable content; should override!
	getNamespace() {
		return 'http://' + this.collectionId.replace(/-/g, '.'); + '.clariah.nl#';
	}

	//TODO see if this is necessary or we just directly access the global variable
	getCollectionId() {
		return this.collectionId;
	}

	//checks if there is a proper title / name from CKAN / workspace API, otherwise just returns the ID
	getCollectionTitle() {
		if(this.collectionInfo) {
			return this.collectionInfo.title || this.collectionInfo.name;
		}
		return this.collectionId;
	}

	getCollectionStats() {
		return this.collectionStats;
	}

	getCollectionInfo() {
		return this.collectionInfo;
	}

	//TODO this will become a much more important function later on
	//FIXME make the difference between CKAN / workspace API versions of the collectionInfo less weird
	getSearchIndex() {
		let searchIndex = this.collectionId;
		if(this.collectionInfo) {
			searchIndex = this.collectionInfo.index;
			if(!searchIndex && this.collectionInfo.user && this.collectionInfo.id) {
				searchIndex = 'pc__' + this.clientId + '__' + this.collectionInfo.user + '__' + this.collectionInfo.id;
			}
		}
		return searchIndex
	}

	getImageBaseUrl() {
		return null
	}

	getVideoBaseUrl() {
		return null
	}

	getAudioBaseUrl() {
		return null
	}

	requiresPlayoutAccess() {
		return false
	}

	hideOffAirContent() {
		return false
	}

	getThumbnailContentServerId() {
		return null;
	}

	//should always be overloaded
	loadFieldDescriptions(callback) {
		callback([])
	}

	getDocumentType() {
		return this.docType;
	}

	//CURRENT this gets the layers from additional indices with the __[LAYER NAME] suffix
	getCollectionIndices() {
		const indices = [this.getCollectionId()];
		const stats = this.getCollectionStats();
		if(stats && stats['collection_annotation_indices']) {
			return indices.concat(
				stats['collection_annotation_indices'].map((i) => {
					return i.collection;
				})
			);
		}
		return indices;
	}

	//used whenever you want to search by default in nested documents (only when no field categories/clusters are selected)
	//should return an object like this: {path : 'layer__asr', fields : ['layer__asr.words']}
	getNestedSearchLayers() {
		return null;
	}

	//the nested path used for forming the ES query in the search API
	getFragmentPath() {
		return null
	}

	//which of the fragment fields are text fields and suitable for match queries?
	getFragmentTextFields() {
		return null
	}

	//by default enable & disable when a fragment path is set
	includeMediaObjects() {
		return this.getFragmentPath() == null ? true : false
	}

	//by default never return the children of nested documents
	includeFragmentChildren() {
		return false
	}

	getStringFields() {
		let tmp = [];
		if(this.stringFields) {
			tmp = tmp.concat(this.stringFields);
		}
		if(this.textFields) {
			tmp = tmp.concat(this.textFields);
		}
		return tmp.length > 0 ? tmp : null
	}

	getTextFields() {
		return this.textFields;
	}

	getDateFields() {
		return this.dateFields;
	}

	getNonAnalyzedFields() {
		let tmp = [];
		if(this.nonAnalyzedFields) {
			tmp = tmp.concat(this.nonAnalyzedFields);
		}
		if(this.keywordFields) {
			tmp = tmp.concat(this.keywordFields);
		}
		return tmp.length > 0 ? tmp : null;
	}

	getKeywordFields() {
		return this.keywordFields;
	}

	//checks if the field is a keyword field and makes sure to return the matched keyword field name
	getMatchedKeywordField(fieldName) {
		const kwMatch = this.getKeywordFields().find((kw) => kw.indexOf(fieldName) !== -1);
		if(kwMatch) {
			return fieldName === kwMatch ? fieldName : fieldName + '.keyword';
		}
		return null;
	}

	//used by the collection analyzer (field analysis pull down)
	getAllFields() {
		let tmp = [];

		//console.debug(this.keywordFields);

		if(this.dateFields) {
			this.dateFields.forEach(f => {
				tmp.push({id : f, type : 'date', keywordMultiField : false, title : this.toPrettyFieldName(f)})
			});
		}

		if(this.stringFields) {
			this.stringFields.forEach(f => {
				tmp.push({id : f, type : 'text', keywordMultiField : false, title : this.toPrettyFieldName(f)})
			});
		}
		if(this.textFields) {
			this.textFields.forEach(f => {
				tmp.push({id : f, type : 'text', keywordMultiField : false, title : this.toPrettyFieldName(f)})
			});
		}

		if(this.longFields) {
			this.longFields.forEach(f => {
				tmp.push({id : f, type : 'numeric', keywordMultiField : false, title : this.toPrettyFieldName(f)})
			});
		}
		if(this.doubleFields) {
			this.doubleFields.forEach(f => {
				tmp.push({id : f, type : 'numeric', keywordMultiField : false, title : this.toPrettyFieldName(f)})
			});
		}

		//mark all the nested fields
		tmp.forEach(f => {
			if(this.nestedFields && this.nestedFields.indexOf(f.id) !== -1) {
				f.nested = true;
			}
		});

		//mark all the fields that are a multi-field keyword field
		if(this.keywordFields) {
			tmp.forEach(f => {
				if(this.keywordFields.indexOf(f.id + '.keyword') !== -1) {
					f.keywordMultiField = true;
				}
			});
		}
		if(this.nonAnalyzedFields) {
			tmp.forEach(f => {
				if(this.nonAnalyzedFields.indexOf(f.id + '.raw') !== -1) {
					f.keywordMultiField = true;
				}
			});
		}

		//finally add all the pure keyword fields
		if(this.keywordFields) {
			this.keywordFields.forEach(f => {
				if(f.indexOf('.keyword') === -1) {
					tmp.push({id : f, type : 'keyword', keywordMultiField : false, title : this.toPrettyFieldName(f)})
				}
			});
		}
		return tmp.length > 0 ? tmp : null;
	}

	usesLayeredModel() {
		return false;
	}

	//simply return the first date field by default (this function is used by QueryBuilder)
	getPreferredDateField() {
		const dfs = this.getDateFields();
		if(dfs && dfs.length > 0) {
			return dfs[0];
		}
		return null;
	}

	// returns the date as a single value to use in sorting.
	getInitialDate(date) {
	    return date ? date : null;
    }

	//if the data has translations within its metadata
	getPreferredLanguage() {
		return null;
	}

	//Try to generate at least some date facets to be able to draw a timeline
	//TODO the queryDataFormat can be detected from a retrieved date (implement this somewhere)
	getFacets() {
		return ElasticsearchDataUtil.extractFacetsFromStats(this.dateFields, this.stringFields);
	}

	//enables the user to narrow down full-text search to certain parts of the top-level metadata (e.g. search only in titles)
	getMetadataFieldCategories() {
		return null;
	}

	//TODO also fetch some data if there is no structured data
	getItemDetailData(result, currentDateField=null) {
		//first flatten the pure ES response
		result = this.formatSearchResult(result);

		if(!result) {
			return null;
		}

		//initiate the formatted result with the most basic data from ES
		let formattedResult = {
			resourceId : result._id,
			index : result._index,
			docType : result._type
		};

		//then fetch any data that can be fetched from known schemas (DIDL, DC, ...)
		const structuredData = MetadataSchemaUtil.extractStructuredData(result);
		if(structuredData) {
			formattedResult = Object.assign(structuredData, formattedResult);
		}

		//if there are no title and date try to fetch them via the ES stats or the raw data itself
		if(formattedResult.title == null) {
			if(result.title) {
				formattedResult.title = result.title;
			} else if(this.stringFields != null && this.stringFields.length > 0) {
				formattedResult.title = result[this.stringFields[0]];
			} else {
				formattedResult.title = '<No title available>';
			}
		}
		if(formattedResult.description == null && result.description) {
			formattedResult.description = result.description;
		}
		if(formattedResult.posterURL == null && result.posterURL) {
			formattedResult.posterURL = result.posterURL;
		}
		if(formattedResult.playableContent == null && result.playableContent) {
			formattedResult.playableContent = result.playableContent;
		}
		if(formattedResult.date == null) {
			if(currentDateField && result[currentDateField]) {
				formattedResult.date = result[currentDateField];//TODO nested fields can't be found in this way!! fix this
				formattedResult.dateField = currentDateField;
			} else if(this.dateFields != null && this.dateFields.length > 0) {
				formattedResult.date = result[this.dateFields[0]];
				formattedResult.dateField = this.dateFields[0];
			} else {
				formattedResult.date = '<No date available>';
				formattedResult.dateField = '<None available>'
			}
		}

		//then add the raw data
		formattedResult.rawData = result;

		return formattedResult
	}

	//the result passed is a raw result and needs to be formatted first
	getResultSnippetData(rawResult, numHighlights) {
		const result = rawResult;

		//populate the list of media types, merging general collection level media types with result specific types
		let mediaTypes = this.getCollectionMediaTypes();
		if(result.mediaTypes) {
			mediaTypes = mediaTypes.concat(
				result.mediaTypes.filter(mt => !mediaTypes.includes(mt))
			);
		}

	    const snippet = {
			id : result.resourceId,
			type : result.docType,
			title: result.title || 'No title for: ' + result.resourceId + '',
			date: result.date,
			description: result.description,
			posterURL : result.posterURL,
			mediaFragment : result.mediaFragment,
			tags : result.tags ? result.tags : [],
			mediaTypes : mediaTypes
		}
		if(result.playableContent && result.playableContent.length > 0) {
		    snippet['playable'] = true;
		} else {
		    snippet['playable']= false;
		}
		//finally assign the highlight data to the snippet for the SearchSnippet component
		snippet['highlightMsg'] = this.getMatchingTermsMsg(numHighlights, true);

		//FIXME not sure if this is still used...
		if(result.docType === 'media_fragment' && result.rawData) {
			result.start = result.rawData.start ? result.rawData.start : 0;
			result.end = result.rawData.end ? result.rawData.end : -1;
		}

		return snippet;
	}

	//TODO change this to a more index/db agnostic function. Also change the name
	formatSearchResult(result) {
		if(result && result._source) {
			const formattedResult = JSON.parse(JSON.stringify(result._source));
			formattedResult._id = result._id;
			formattedResult._score = result._score;
			formattedResult._type = result._type;
			formattedResult._index = result._index;

			return formattedResult;
		}
		return null;
	}

    //e.g. a field could be "bga:segment.bg:recordings.bg:recording.bg:startdate"
    toPrettyFieldName(esFieldName) {
        if(esFieldName) {
            //first split the field based on a dot
            let tmp = esFieldName.split('.');

            // remove namespaces
            tmp = tmp.map((field)=>(field.substring(field.indexOf(":") + 1)));

            let isKeywordField = false;

            //if the last field is called raw or keyword (ES reserved names), drop it
            if(tmp[tmp.length -1] === 'raw' || tmp[tmp.length -1] === 'keyword') {
                isKeywordField = true;
                tmp.pop();
            }

            let leaf = tmp.pop();

            // move @ to end of fieldname
            if (leaf.substring(0,1) === '@'){
                leaf = leaf.substring(1) + '@';
            }
            let origin = tmp.join(".");
            if (origin) {
            	if(origin.indexOf('@graph') !== -1) {
            		origin = origin.substring('@graph.'.length);
            	}
            	if(origin.length > 0 && leaf !== 'value@') {
                	origin = ' => ' + origin;
                }
            }
            leaf = leaf === 'value@' ? '' : leaf; //always remove value@, since it is not nice to show
            return leaf + origin + (isKeywordField ? ' *' : '');
        }
        return esFieldName;
    }

    //maps a LD predicate to an ES field name
    predicateToIndexField(p) {
    	return p
    }

	//used to prevent graphs to blow up in case the minimum date is really low (because of incorrect data)
	getMinimunYear() {
		return 1600
	}

	getMaximumYear() {
		return -1
	}

    getFieldDescription(esFieldName) {
        "-"
    }

	getFieldsToExclude() {
		return null
	}

	//FIXME add an extra field (or a separate function) to specify collection-specific "forbidden fields"
	getHighlights(obj, searchTerm, aggregatedHighlights={}, baseField = null) {
        for(const field in obj) {
            if(obj.hasOwnProperty(field) && ["bg:carriers", "bg:publications", "bg:context", "dcterms:isPartOf"].indexOf(field) === -1) {
                let snippets = [];
                if (Array.isArray(obj[field])) { // in case the value is a list
                    this.getHighlights(obj[field], searchTerm, aggregatedHighlights, field); // <- recursive call
                } else if (typeof obj[field] === 'object') { // in case the value is an object
                    this.getHighlights(obj[field], searchTerm, aggregatedHighlights, null); // <- recursive call
                } else { // finally it's possible to add some snippets
                    snippets = RegexUtil.generateHighlightedText(obj[field], searchTerm);
                }

                //Save the snippets in the aggregatedHighlights object, which is eventually returned to the caller
                const keyField = baseField ? baseField : field;
                if(snippets.length > 0) {
                    if(!(keyField in aggregatedHighlights)) {
                        aggregatedHighlights[keyField] = [];
                    }
                    aggregatedHighlights[keyField] = aggregatedHighlights[keyField].concat(snippets);
                }

            }
        }
        return aggregatedHighlights
	}

	/* ---------------------------------- COLLECTION-SPECIFIC STATIC TEXTS -------------------------------- */

	//returns the static text for the search snippet or the highlight overview in the quick viewer
	getMatchingTermsMsg(numHits, forSnippet) {
		if(forSnippet) {
			return numHits > 0 ? (numHits + " match" + (numHits === 1 ? "" : "es") + " in archival metadata") : ' No matches in the archival metadata, matching terms found in the automatic enrichments';
		} else {
        	return numHits <= 0 ? 'No matching terms found in archival metadata' : 'Matching terms in archival metadata';
        }
    }

}

export default CollectionConfig;
