import IDUtil from '../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../helpers/BreadCrumbs';
import { initHelp } from '../helpers/helpDoc';
import CollectionTable from './CollectionTable';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
* Top level component/page for the collections overview.
* The data handling is done in the CollectionTable component.
*/
class CollectionListView extends React.PureComponent {

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        setBreadCrumbsFromMatch(this.props.match);
        initHelp('User Collections', '/feature-doc/workspace/user-collections');
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('collection-list-view')}>
                <div className="info-bar">
                    <Link to="/workspace/collections/create" className="btn primary add">
                        Add User Collection
                    </Link>
                    <h2>User Collections</h2>
                    <p>Add private collections to use them in the Media Suite</p>
                </div>

                <CollectionTable api={this.props.api} user={this.props.user} />
            </div>
        )
    }
}

CollectionListView.propTypes = {
    // collection api
    api: PropTypes.shape({
        list: PropTypes.func.isRequired
    }),

    // current user object used for defining access roles per collection
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }).isRequired
};

export default CollectionListView;
