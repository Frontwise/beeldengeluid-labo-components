import ComponentUtil from '../../../util/ComponentUtil';
import IDUtil from '../../../util/IDUtil';

//import { exportDataAsJSON } from '../helpers/Export';

import SortTable from '../SortTable';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
* Table that shows all the collections. It handles the loading and filtering of the collection data.
*/
class CollectionTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.head = [
            { field: 'name', content: 'Name', sortable: true },
            { field: 'owner', content: 'Owner', sortable: true },
            { field: 'access', content: 'Access', sortable: true },
            { field: 'created', content: 'Created', sortable: true },
            { field: '', content: '', sortable: false },
            //{ field: '', content: '', sortable: false },
            { field: '', content: '', sortable: false }
        ];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteCollections.bind(this) }
            /*{ title: 'Export', onApply: exportDataAsJSON.bind(this) }*/
        ];

        this.defaultSort = {
            field: 'name',
            order: 'asc'
        };

        this.state = {
            collections: [],
            loading: true,
            filter: {
                keywords: '',
                currentUser: false
            }
        };

        this.requestDataTimeout = -1;
        this.sortCollections = this.sortCollections.bind(this);
        this.getCollectionRow = this.getCollectionRow.bind(this);
    }

    componentDidMount() {
        this.loadData();
    }

    //Listen for update, request new data if filter has been changed
    componentDidUpdate() {
        if (this.lastFilter !== this.state.filter) {
            this.lastFilter = this.state.filter;

            // throttle data requests
            clearTimeout(this.requestDataTimeout);
            this.requestDataTimeout = setTimeout(this.loadData.bind(this), 500);
        }
    }

    loadData() {
        this.setState({
            loading: true
        });

        this.props.api.list(
            this.props.user.id,
            this.state.filter,
            this.setCollections.bind(this)
        );
    }

    //set the collections to the state
    setCollections(collections) {
        // decorate the collections
        this.toDummyData(collections || []);

        // we filter the results now on client side
        collections = this.filterCollections(collections || []);

        //TODO this is for now the only place where this is set. Probably not good enough
        ComponentUtil.storeJSONInLocalStorage('myCollections', collections);

        this.setState({
            collections: collections,
            loading: false
        });
    }

    //filter collections (client-side for now)
    filterCollections(collections) {
        const userId = this.props.user.id;
        let result = collections.filter(collection => collection.getAccess(userId));
        const filter = this.state.filter;

        // filter on keywords
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                result = result.filter(
                    collection =>
                    collection.name.toLowerCase().includes(k) ||
                    collection.description.toLowerCase().includes(k)
                );
            });
        }

        // filter on current user
        if (filter.currentUser) {
            result = result.filter(collection => collection.owner.id === userId);
        }

        return result;
    }

    //Decorate collection data with helper functions
    //(currently placeholders) - See ProjectTable.jsx as well.
    toDummyData(collections) {
        return collections.map(c => {
            c.getAccess = function() {
                return 'Admin';
            };
            c.canDelete = function() {
                return true;
            };
            c.canExport = function() {
                return true;
            };
            c.canOpen = function() {
                return true;
            };
            c.owner = {
                id: this.props.user.id,
                name: this.props.user.name
            };
            return c;
        });
    }

    //whenever the user types in the filter field
    keywordsChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                keywords: e.target.value
            })
        });
    }

    //whenever the checkbox is triggered
    currentUserChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                currentUser: e.target.checked
            })
        });
    }

    //Enrich collection with selected enrichment service
    enrichCollection(collection, event) {
        let enrichmentservice = event.target.value;
        if (enrichmentservice === "ASR"){
            //TODO do something with collection
        }
    }

    deleteCollection(collection) {
        if (window.confirm('Are you sure you want to delete collection ' + collection.name)) {
            this.props.api.delete(this.props.user.id, collection.id, status => {
                if (status && status.success) {
                    // just retrieve the latest data
                    this.loadData();
                }
            });
        }
    }

    //delete multiple collections
    deleteCollections(collections) {
        if (window.confirm('Are you sure you want to delete ' + collections.length + ' collections?')) {
            let calls = collections.length;
            // after each return calls is decreased
            // when calls is 0, data is reloaded
            // this is async safe
            collections.forEach((collection, index) => {
                this.props.api.delete(this.props.user.id, collection.id, status => {
                    calls--;
                    if (calls === 0) {
                        // after the last delete just retrieve the latest data
                        this.loadData();
                    }
                });
            });
        }
    }

    sortCollections(collections, sort) {
        const sorted = collections;
        switch (sort.field) {
            case 'name': sorted.sort((a, b) => a.name > b.name); break;
            case 'owner': sorted.sort((a, b) => a.owner.name > b.owner.name); break;
            case 'access': sorted.sort((a, b) => a.getAccess(this.props.user.id) > b.getAccess(this.props.user.id)); break;
            case 'created': sorted.sort((a, b) => a.created > b.created); break;
            default: return sorted;
        }
        return sort.order === 'desc' ? sorted.reverse() : sorted;
    }

    //generate a table row
    getCollectionRow(collection) {
        const currentUserId = this.props.user.id;
        return [
            {
                props: { className: 'primary' },
                content: (
                    <Link to={'/workspace/collections/' + collection.id + '/edit'}>{collection.name}</Link>
                    )
            },
            {
                content: (
                    <span>
                    {collection.owner.name}{' '}

                    </span>
                    )
            },
            {
                props: { className: 'access' },
                content: collection.getAccess(currentUserId)
            },
            {
                props: { className: 'smaller' },
                content: collection.created.substring(0, 10)
            },
            {
                content: collection.canDelete(currentUserId) ? (
                    <a className="btn blank warning" onClick={this.deleteCollection.bind(this, collection)}>
                        Delete
                    </a>) : ('')
            },
            /*
            {
                content: (
                    <select onChange={this.enrichCollection.bind(this, collection)}>
                    <option value="None">Select Enrichment</option>
                    <option value="ASR">ASR</option>
                    </select>
                )
            },*/
            {
                content: collection.canOpen(currentUserId) ? (
                    <Link to={'/workspace/collections/' + collection.id + '/edit'} className="btn">
                        Open
                    </Link>) : ('')
            }
        ];
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('collection-table')}>
                <div className="tools">
                    <div className="left">
                        <h3>Filters</h3>
                        <div className="filter-container">
                            <input
                                className="search"
                                type="text"
                                placeholder="Search"
                                value={this.state.filter.keywords}
                                onChange={this.keywordsChange.bind(this)}/>
                        </div>
                        <div className="filter-container">
                            <input
                                type="checkbox"
                                id="current-user"
                                checked={this.state.filter.currentUser}
                                onChange={this.currentUserChange.bind(this)}/>
                            <label htmlFor="current-user">Show only my collections</label>
                        </div>
                    </div>
                </div>

                <SortTable
                    items={this.state.collections}
                    head={this.head}
                    row={this.getCollectionRow}
                    onSort={this.sortCollections}
                    loading={this.state.loading}
                    bulkActions={this.bulkActions}
                    defaultSort={this.defaultSort}/>
            </div>
        );
    }
}

CollectionTable.propTypes = {
    // personalcollection api
    api: PropTypes.shape({
        list: PropTypes.func.isRequired
    }),

    // current user object used for defining access roles per collection
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }).isRequired
};

export default CollectionTable;
