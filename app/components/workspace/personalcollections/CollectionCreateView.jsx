import PersonalCollectionAPI from '../../../api/PersonalCollectionAPI';

import IDUtil from '../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../helpers/BreadCrumbs';

import CollectionForm from './CollectionForm';

import PropTypes from 'prop-types';
import { initHelp } from '../helpers/helpDoc';

class CollectionCreateView extends React.PureComponent {

    componentDidMount() {
        setBreadCrumbsFromMatch(this.props.match);

        initHelp('User Collection Create', '/feature-doc/howtos/user-collections/create');
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('project-create')}>
                <div className="info-bar">
                    <h2>Create personal collection</h2>
                    <p>
                        Upload your own dataset with links to externally hosted (private) content.
                    </p>
                </div>
                <CollectionForm
                    submitButton="create"
                    cancelLink="/workspace/collections"
                    collection={{
                        name: '',
                        description: '',
                        dateCreated: '',
                        creator: '',
                        isPrivate: false,
                        user: this.props.user.id
                    }}
                    collectionDidSave={collectionId => {
                    // navigate to new project page
                    this.props.history.push(
                        '/workspace/collections/'
                        );
                    }}
                    user={this.props.user}
                    api={this.props.api}/>
            </div>
        )
    }
}

CollectionCreateView.propTypes = {
    api: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired
};

export default CollectionCreateView;
