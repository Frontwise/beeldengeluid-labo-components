import ElasticsearchDataUtil from '../util/ElasticsearchDataUtil';
import IDUtil from '../util/IDUtil';
import QueryModel from '../model/QueryModel';

const SearchAPI = {

	//TODO combined search instead of a single query to multiple indices for each layer
	//TODO field specific search in search term syntax
	//TODO query should become a list of queries for each selected index
	search(query, collectionConfig, callback, updateUrl = false) {
		if(query.offset + query.size <= 10000) {
			let url = _config.SEARCH_API_BASE + '/layered_search/' + query.collectionId
			const xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (xhr.readyState == XMLHttpRequest.DONE) {
					if(xhr.status == 200) {
						const data = JSON.parse(xhr.responseText);
						if(data && data.params) {
							//always add a fresh search ID, so the UI knows when to refresh certain components
							data.searchId = IDUtil.guid(); //still a bit weird, has to go probably

							//for convenience add the collection config to the resulting data
							data.collectionConfig = collectionConfig;

							//tell the receiving component to update the URL (still weird to do here)
							data.updateUrl = updateUrl;

							//UNNECESSARY REMOVE (calculates the current page)
							const pageNumber = Math.ceil(query.offset / query.size) + 1;
							data.currentPage = data.results ? pageNumber : -1;

							//make sure the query returned by the server is compatible with the client side model
							//TODO some validation!
							data.query = QueryModel.ensureQuery(data.params, collectionConfig);
							delete data.params

							callback(data);
						}
					} else {
						callback(null);
					}
				}
			}
			xhr.open("POST", url);
			xhr.timeout = 50000;
			xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			xhr.send(JSON.stringify(query));
		} else {
			console.debug('Currently the search engine cannot look beyond this point, please narrow your search terms');
			callback({pagingOutOfBounds : true})
		}
	}

}

export default SearchAPI;