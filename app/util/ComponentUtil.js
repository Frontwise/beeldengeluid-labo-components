//Generic functions for UI components

const ComponentUtil = {

	//shows the only FlexModal attached to a component
	showModal(component, stateVariable) {
		const stateObj = {}
		stateObj[stateVariable] = true
		component.setState(stateObj);
	},

	//hides a FlexModal (used in AggregationBox, ItemDetailsRecipe, SearchHit)
	hideModal(component, stateVariable, elementId, manualCloseRequired, callback) {
		const stateObj = {}
		stateObj[stateVariable] = false
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

	storeJSONInLocalStorage(key, data) {
		if(ComponentUtil.supportsHTML5Storage() && data) {
			try {
				localStorage[key] = JSON.stringify(data);
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
	}

}

export default ComponentUtil;