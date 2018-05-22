import PersonalCollectionAPI from '../../../api/PersonalCollectionAPI';

import IDUtil from '../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../helpers/BreadCrumbs';

import CollectionForm from './CollectionForm';

import PropTypes from 'prop-types';

class CollectionCreateView extends React.PureComponent {

    componentDidMount() {
        setBreadCrumbsFromMatch(this.props.match);
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('project-create')}>
                <div className="info-bar">
                    <h2>Register User Collection</h2>
                    <p>A user collection can be used to register your own dataset in the Media Suite</p>
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
