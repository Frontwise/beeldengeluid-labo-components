//Generic functions for UI components
import CollectionUtil from './CollectionUtil';

const ComponentUtil = {

	//shows the only FlexModal attached to a component
	showModal(component, stateVariable) {
		const stateObj = {};
		stateObj[stateVariable] = true;
		component.setState(stateObj);
	},

	//hides a FlexModal (used in AggregationBox, ItemDetailsRecipe, SearchHit)
	hideModal(component, stateVariable, elementId, manualCloseRequired, callback) {
		const stateObj = {};
		stateObj[stateVariable] = false;
		if(elementId && manualCloseRequired) {
			$('#' + elementId).modal('hide');
		}
		component.setState(stateObj, () => {
			if(callback) {
				callback()
			}
		});
	},

	supportsHTML5Storage() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null
		} catch (e) {
			return false
		}
	},

	/*--------------------------------------------------------------------------------
	* ------------------------- CRUD OF JSON OBJECTS IN LOCALSTORAGE -----------------
	---------------------------------------------------------------------------------*/

    storeJSONInLocalStorage(key, data) {
        if(ComponentUtil.supportsHTML5Storage()) {
            try {
                if(data === null) {
                    localStorage.removeItem(key);
                } else {
                    localStorage[key] = JSON.stringify(data);
                }
                return true
            } catch (e) {
                console.error(e);
            }
        }
        return false
    },

	getJSONFromLocalStorage(key) {
		if(ComponentUtil.supportsHTML5Storage() && localStorage[key]) {
			try {
				return JSON.parse(localStorage[key])
			} catch (e) {
				console.error(e);
			}
		}
		return null
	},

	removeJSONByKeyInLocalStorage(key) {
        if (ComponentUtil.supportsHTML5Storage()) {
            try {
                localStorage.removeItem(key);
                return true
            } catch (e) {
                console.error(e);
            }
        }
        return false
    },

	/*--------------------------------------------------------------------------------
	* ------------------------- CRUD OF ARRAYS WITH OJECTS/IDS IN LOCALSTORAGE -------
	---------------------------------------------------------------------------------*/

	//if you are pushing an object to the stored array, make sure to supply the identifier field name (string) of that object
	pushItemToLocalStorage(key, item, itemIdentifier=null) {
        const currentDataOnStorage = ComponentUtil.getJSONFromLocalStorage(key);
        let obj = null;
        if(currentDataOnStorage === null) {
            obj = [item];
            ComponentUtil.storeJSONInLocalStorage(key, obj)
        } else {
            // if item is not in array then push it.
            if(!currentDataOnStorage.find(val => {
				if(itemIdentifier) { //for comparing objects
					return val[itemIdentifier] === item[itemIdentifier];
				} else {
					return val === item;
				}
			})) {
                currentDataOnStorage.push(item);
            }
            ComponentUtil.storeJSONInLocalStorage(key, currentDataOnStorage)
        }
    },

	//if you are removing an object from the stored array, make sure to supply the identifier field name (string) of that object
    removeItemInLocalStorage(key, item, itemIdentifier=null) {
        const currentDataOnStorage = ComponentUtil.getJSONFromLocalStorage(key);
        const index = currentDataOnStorage.findIndex(val => {
			if(itemIdentifier) { //for comparing objects
				return val[itemIdentifier] === item[itemIdentifier]
			} else {
				return val === item
			}
		});
        currentDataOnStorage.splice(index, 1);
        if(currentDataOnStorage.length > 0) {
            ComponentUtil.storeJSONInLocalStorage(key, currentDataOnStorage);
        } else {
           ComponentUtil.removeJSONByKeyInLocalStorage(key);
        }
    },

    /*--------------------------------------------------------------------------------
    * ------------------------- NUMBER FORMATTING METHOD -----------------------------
    ---------------------------------------------------------------------------------*/
    formatNumber(number) {
        if(!isNaN(number)) {
            return number.toLocaleString()
        }
		return number;
    },

    /*---------------------------------------------------------------------------------------
    * ------------------------- CONVERTING RAW SEARCH RESULTS AND STORED SELECTED RESULTS ----
    ------------------------------------------------------------------------------------------ */

    convertRawSelectedData(rawSelectData, clientId, user) {
		const collectionClass = CollectionUtil.getCollectionClass(
			clientId, user, rawSelectData._index, true
		);
		const collectionConfig = new collectionClass(
			clientId, user, rawSelectData._index
		);
		return ComponentUtil.convertRawSearchResult(rawSelectData, collectionConfig, rawSelectData.query)
    },

    convertRawSearchResult(rawData, collectionConfig, query) {
    	const searchTerm = query ? query.term : '';
        const highlights = collectionConfig.getHighlights(rawData["_source"], searchTerm);
        const dateField = query && query.dateRange ? query.dateRange.field : null;
		const formattedData = collectionConfig.getItemDetailData(rawData, dateField);
		return {
			rawData : rawData,
			formattedData : formattedData,
			searchTerm : searchTerm,
			dateField : dateField,
			highlights : highlights,
			numHighlights : Object.keys(highlights).length !== 0 ? Object.keys(highlights).reduce((acc, cur) => acc += highlights[cur].length, 0) : 0,
			collectionConfig : collectionConfig
		}
    }

};

export default ComponentUtil;
