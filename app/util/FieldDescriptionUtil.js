/**
 * Provide description for metadata fields in collections
 */

const cache = {};
const dataRoot = "https://transfer.frontwise.com/beeldengeluid/mediasuite/examples/fielddescriptions/";

const FieldDescriptionUtil = {

    getDescriptions(collectionId, callback){
        const url = dataRoot +  collectionId + '.json';
        
        // return cached data if available
        if (collectionId in cache){
            callback(cache[collectionId]);
            return;
        }

        // in case of an error, just return an empty array
        // so it is clear that loading finished, but no data is there
        const callError = ()=>{
            console.debug('No field descriptions could be loaded for ' + collectionId);
            cache[collectionId] = [];   
            callback([]);
        }

        fetch(url).then((response) => {
            if (response.status !== 200){
                callError();
                return;
            }
            return response.json();
        }).then((json)=>{
            // store to cache for later use
            cache[collectionId] = json;   

            // callback with the json data
            callback(json);
        }).catch((error) => {
            console.warn(error);
            callError();
        });
    }


}

export default FieldDescriptionUtil;