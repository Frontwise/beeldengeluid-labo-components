//required imports for the functions
import {render} from 'react-dom';

// tools
import CollectionRecipe from './CollectionRecipe';
import SingleSearchRecipe from './SingleSearchRecipe';
import QueryComparisonRecipe from './QueryComparisonRecipe';
import ItemDetailsRecipe from './ItemDetailsRecipe';

// workspace
import WorkspaceProjectsRecipe from './WorkspaceProjectsRecipe';
import WorkspaceCollectionsRecipe from './WorkspaceCollectionsRecipe';

//other
import ExampleRecipe from './ExampleRecipe';

import '../sass/labo-components.scss';
//CSS must be included in the entry point to allow Webpack
// to detect and run CSS .

//cooking function
//TODO the user variable is now filled with the INSTANCE_NAME from settings.py
//	Instead the user object (with id, name & attributes) will be passed and should be properly handled
export function cookRecipe (recipe, params, user, elementId, clientId = null, collectionMapping = null) {
	let component = null;

	switch(recipe.type){
		// tools
		case 'item-details':
			component = <ItemDetailsRecipe
				recipe={recipe}
				params={params}
				user={user}
				clientId={clientId}
				collectionMapping={collectionMapping} //TODO move the collection mapping externally
			/>;
		break;
		case 'single-search':
			component = <SingleSearchRecipe
				recipe={recipe}
				params={params}
				user={user}
				clientId={clientId}
				collectionMapping={collectionMapping} //TODO move the collection mapping externally
			/>;
		break;
        case 'query-comparison':
            component = <QueryComparisonRecipe
                recipe={recipe}
                params={params}
                user={user}
                clientId={clientId}
                collectionMapping={collectionMapping} //TODO move the collection mapping externally
            />;
            break;
	 	case 'collection-analysis':
			component = <CollectionRecipe
				recipe={recipe}
				params={params}
				user={user}
				clientId={clientId}
				collectionMapping={collectionMapping} //TODO move the collection mapping externally
			/>;
		break;

		// workspace
		case 'workspace-projects':
			component = <WorkspaceProjectsRecipe
				recipe={recipe}
				params={params}
				user={user}
				clientId={clientId}
				collectionMapping={collectionMapping} //TODO move the collection mapping externally
			/>;
		break;
		case 'workspace-collections':
            component = <WorkspaceCollectionsRecipe
                recipe={recipe}
                params={params}
                user={user}
                clientId={clientId}
                collectionMapping={collectionMapping} //TODO move the collection mapping externally
            />;
        break;

		case 'example':
			component = <ExampleRecipe
				recipe={recipe}
				params={params}
				user={user}
				clientId={clientId}
				collectionMapping={collectionMapping} //TODO move the collection mapping externally
			/>;
		break;
		default:
			console.log(recipe);
			console.error('Please provide a valid recipe');
			return
		}

		// render the component
		if (component){
			render(component, document.getElementById(elementId));
		}
}