/*
Check this out later: https://zhirzh.github.io/2017/01/30/browser-history-functioning-&-loopback-gotcha/
*/
import QueryModel from '../model/QueryModel';

const FlexRouter = {

	routeQueryToSingleSearch : function(query) {
		const paramList = FlexRouter.__toUrlParamList(
			QueryModel.toUrlParams(query)
		)
		let url = FlexRouter.__getBaseUrl() + '/tool/single-search';
		if(paramList) {
			url += '?' + paramList.join('&');
		}
		document.location.href =  url;
	},

	//this is typically called from a search recipe after clicking a search result
	gotoItemDetails : function(itemDetailsRecipePath, searchResult, searchTerm) {
		let url = FlexRouter.__getBaseUrl() + '/' + itemDetailsRecipePath + '?id=' + searchResult.resourceId;
		url += '&cid=' + searchResult.index;
		if(searchTerm) {
			url += '&st=' + searchTerm;
		}
		//check the collection config to see how the mediaFragment was added to the result object
		if(searchResult.mediaFragment) {
			/*
				FIXME the URL should be a "safe" URL, so for B&G only the safe play-out link should be shown.
				Also the resource viewer must be able to identify the right media object using this safe URL
			*/

			//TODO test this change to assetId thoroughly!
			if(searchResult.mediaFragment.hasOwnProperty('url')) { url += '&fragmentUrl=' + searchResult.mediaFragment.url; }
			//if(searchResult.mediaFragment.hasOwnProperty('assetId')) { url += '&assetId=' + searchResult.mediaFragment.assetId; }

			if(searchResult.mediaFragment.hasOwnProperty('start')) { url += '&s=' + searchResult.mediaFragment.start; }
			if(searchResult.mediaFragment.hasOwnProperty('end')) { url += '&e=' + searchResult.mediaFragment.end; }
			if(searchResult.mediaFragment.hasOwnProperty('x')) { url += '&x=' + searchResult.mediaFragment.x; }
			if(searchResult.mediaFragment.hasOwnProperty('y')) { url += '&y=' + searchResult.mediaFragment.y; }
			if(searchResult.mediaFragment.hasOwnProperty('w')) { url += '&w=' + searchResult.mediaFragment.w; }
			if(searchResult.mediaFragment.hasOwnProperty('h')) { url += '&h=' + searchResult.mediaFragment.h; }
			if(searchResult.mediaFragment.hasOwnProperty('layer')) { url += '&l=' + searchResult.mediaFragment.layer; }
		}
		document.location.href = url;
	},

	//this is typically called from a collection browsing recipe after selecting a collection for closer study
	gotoSearch : function(searchRecipePath, collectionIds) {
		const url = FlexRouter.__getBaseUrl() + '/' + searchRecipePath + '?cids=' + collectionIds.join(',');
		document.location.href =  url;
	},

	__getBaseUrl : function() {
		const temp = window.location.href;
		const arr = temp.split("/");
		return arr[0] + "//" + arr[2];
	},

	__toUrlParamList : function(params) {
		let paramList = null;
		if(params && typeof(params) == 'object' && Object.keys(params).length > 0) {
			paramList = [];
			for(const p in params) {
				paramList.push(p + '=' + params[p]);
			}
		}
		return paramList
	},

	//TODO extend this function so it is optional to put the params in the URL
	setBrowserHistory : function(params, stateTitle) {
		let url = document.location.pathname;
		const paramList = FlexRouter.__toUrlParamList(params);
		if(paramList) {
			url += '?' + paramList.join('&');
		}
		window.history.pushState(params, stateTitle, url);

	}

}

export default FlexRouter;