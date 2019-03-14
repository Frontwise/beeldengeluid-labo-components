import PersonalCollectionAPI from '../../../api/PersonalCollectionAPI';

import IDUtil from '../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../helpers/BreadCrumbs';

import CollectionForm from './CollectionForm';
import DataEntryTable from './DataEntryTable'

import PropTypes from 'prop-types';
import { initHelp } from '../helpers/helpDoc';


class CollectionEditView extends React.PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            collection: null,
            dataList: []
        };
    }

    componentDidMount() {
        // get collection id from url
        const collectionId = this.props.match.params.id;

        // load collection data, and set state
        PersonalCollectionAPI.get(this.props.user.id, collectionId, collection => {
            // inject collection name to breadcrumbs
            const titles = {};
            titles[collection.id] = collection.name;
            // update breadcrumbs
            setBreadCrumbsFromMatch(this.props.match, titles);

            this.setState({
                loading: false,
                collection,
                dataList: collection['dataentries']
            });
        });

        initHelp('User Collection Edit', '/feature-doc/workspace/user-collections/edit');
    }

    render() {
        //draw the collection form or show a loading/status message
        let formOrMessage = null;
        let dataEntryTable = null;
        if(this.state.loading) {
            formOrMessage = <h3 className="loading">Loading...</h3>
        } else {
            if(this.state.collection) {
                formOrMessage = (
                    <CollectionForm
                        submitButton="save"
                        cancelLink={
                            '/workspace/collections/'
                        }
                        collection={this.state.collection}
                        collectionDidSave={collectionId => {
                            // navigate to new collection page
                            this.props.history.push(
                                '/workspace/collections/'
                                );
                            }
                        }
                        user={this.props.user}
                        api={this.props.api}/>
                )

                //draw the data entry table
                dataEntryTable = (
                   <DataEntryTable
                        api={this.props.api}
                        user={this.props.user}
                        clientId={this.props.clientId}
                        collection={this.state.collection}/>
                )
            } else {
                formOrMessage = <h3 className="error">Collection could not be found</h3>
            }
        }

        return (
            <div className={IDUtil.cssClassName('project-edit')}>
                <div className="info-bar">
                    <h2>Edit User Collection</h2>
                    <p>A user collection contains personal metadata and possibly links to private collection data.</p><p>Currently all user collections are private and cannot be shared with others.</p>
                </div>
                {formOrMessage}
                {dataEntryTable}
            </div>
        )
    }
}

CollectionEditView.propTypes = {
    api: PropTypes.shape({
        saveEntry: PropTypes.func.isRequired,
        deleteEntry: PropTypes.func.isRequired
    }),
    user: PropTypes.object.isRequired,
    clientId: PropTypes.string.isRequired
};

export default CollectionEditView;
