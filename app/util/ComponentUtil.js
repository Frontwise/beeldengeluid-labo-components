//Generic functions for UI components

const ComponentUtil = {

	//shows the only FlexModal attached to a component
	showModal(component, stateVariable) {
		const stateObj = {};
		stateObj[stateVariable] = true;
		component.setState(stateObj);
	},

	//hides a FlexModal (used in AggregationBox, ItemDetailsRecipe, SearchHit)
	hideModal(component, stateVariable, elementId, manualCloseRequired, callback) {
		const stateObj = {}
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
	* ------------------------- CRUD OF ARRAYS WITH IDS IN LOCALSTORAGE -----------------
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
				}
				return val === item;
			})) {
                currentDataOnStorage.push(item);
            }

            ComponentUtil.storeJSONInLocalStorage(key, currentDataOnStorage)
        }
    },

    removeItemInLocalStorage(key, item) {
        const currentDataOnStorage = ComponentUtil.getJSONFromLocalStorage(key);
        const indexFromItemToRemove = currentDataOnStorage.findIndex(current =>current._id === item);
        currentDataOnStorage.splice(indexFromItemToRemove,1);
        if(currentDataOnStorage.length) {
            ComponentUtil.storeJSONInLocalStorage(key, currentDataOnStorage);
        } else {
           ComponentUtil.removeJSONByKeyInLocalStorage(key);
        }
    },

    updateLocalStorage(key, item, data) {
        if (ComponentUtil.supportsHTML5Storage()) {
            try {
                if (data.selected) {
                    ComponentUtil.pushItemToLocalStorage(key, item);
                } else {
                    ComponentUtil.removeItemInLocalStorage(key, data.resourceId);
                }
                return true
            } catch (e) {
                console.error(e);
            }
        }
        return false
    }

};

export default ComponentUtil;
