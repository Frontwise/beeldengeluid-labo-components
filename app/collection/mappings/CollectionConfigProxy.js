import CollectionConfig from './CollectionConfig';
import FieldDescriptionUtil from '../../util/FieldDescriptionUtil';

class CollectionConfigProxy extends CollectionConfig {

	constructor(clientId, user, collectionId, stats, info, overrides) {
		super(clientId, user, collectionId, stats, info);

		//add all the overridden functions
		Object.keys(overrides).forEach((fn) => {
			if(fn == 'init') {
				overrides[fn]();
			} else {
				//console.debug(fn);
				Object.defineProperty(this, fn, {value: overrides[fn], writable : true});
			}
		})
	}

	__callSuper(fn) {
		return super[fn]();
	}

	//"magic" method for loading the field descriptions
	__loadFieldDescriptions(collectionId, callback) {
		FieldDescriptionUtil.getDescriptions(collectionId, callback);
	}
}

export default CollectionConfigProxy;