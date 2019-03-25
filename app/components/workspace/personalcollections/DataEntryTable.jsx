import ComponentUtil from '../../../util/ComponentUtil';
import IDUtil from '../../../util/IDUtil';

import FlexModalN from '../../../components/FlexModalN';

import ResourceViewerModal from '../ResourceViewerModal';
import SortTable from '../SortTable';

import DataEntryForm from './DataEntryForm';

import PropTypes from 'prop-types';

/*
* Displays all the entries of a personal collection.
* Utilises the generic SortTable component; incorporates the ResourceViewerModal for viewing each item.
*/
class DataEntryTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.head = [
            { field: 'title', content: 'Title', sortable: true },
            { field: 'descr', content: 'Description', sortable: true },
            { field: 'dateCreated', content: 'Date created', sortable: true },
            { field: 'creator', content: 'Creator', sortable: true },
            { field: 'fileUrl', content: 'File URL', sortable: false },
            { field: '', content: '', sortable: false }, //delete
            { field: '', content: '', sortable: false } //open
        ];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteEntries.bind(this) }
        ];

        this.defaultSort = {
            field: 'name',
            order: 'asc'
        };

        this.state = {
            entries: [],
            activeEntry : null,
            loading: true,
            activeResource : null,
            filter: {
                keywords: '',
                currentUser: false
            }
        };

        this.requestDataTimeout = -1;

        this.sortEntries = this.sortEntries.bind(this);
        this.getEntryRow = this.getEntryRow.bind(this);
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

    /********************************************************************************
    ****************************** FOR LOADING DATA *********************************
    *********************************************************************************/

    loadData() {
        this.setState({
            loading: true
        });
        this.props.api.get(
            this.props.user.id,
            this.props.collection.id,
            this.onLoadData.bind(this)
        );
    }

    //set the entries to the state
    onLoadData(collection) {
        let entries = collection.dataentries;
        // decorate the entries
        this.toTableData(entries || []);

        // we filter the results now on client side
        entries = this.filterEntries(entries || []);

        //TODO this is for now the only place where this is set. Probably not good enough
        ComponentUtil.storeJSONInLocalStorage('myentries', entries);
        this.setState({
            entries: entries,
            loading: false
        });
    }

    /********************************************************************************
    ****************************** RESOURCE VIEWER **********************************
    *********************************************************************************/

    //TODO the hardcoded 'personalcollection' should be replaced with the client ID!!
    openResourceViewer(entry) {
        const resource = entry ? {
            resourceId : entry.id,
            collectionId : IDUtil.personalCollectionId(
                this.props.clientId,
                this.props.user.id,
                this.props.collection.id
            ),
            type : null,
            title : entry.title
        } : null;
        this.setState({
            activeResource : resource
        })
    }

    //Close itemDetails view, and refresh the data (assuming changes have been made)
    closeResourceViewer() {
        // set viewbookmark to null
        this.openResourceViewer(null);

        // refresh data
        this.loadData();
    }

    closeEditModal() {
        this.setState({
            activeEntry : null
        })
    }

    /********************************************************************************
    ****************************** FUNCTIONS FOR CRUD *******************************
    *********************************************************************************/

    addEntry() {
        this.setState({
            activeEntry : {
                title : '',
                descr : '',
                dateCreated : '',
                creator : '',
                fileUrl : ''
            },
            showEditModal : true
        })
    }

    editEntry(entry) {
        this.setState({
            activeEntry : entry,
            showEditModal : true
        })
    }

    onSaveEntry(data) {
        this.closeEditModal();
        this.loadData();
    }

    deleteEntry(entry) {
        if (window.confirm('Are you sure you want to delete entry ' + entry.title)) {
            this.props.api.deleteEntry(this.props.user.id, this.props.collection.id, entry.id, status => {
                if (status && status.success) {
                    this.loadData();
                } else {
                    alert('An error occured while adding this entry');
                }
            });
        }
    }

    //delete multiple entries
    deleteEntries(entries) {
        if (window.confirm('Are you sure you want to delete ' + entries.length + ' entries?')) {
            let calls = entries.length;
            entries.forEach((entry, index) => {
                this.props.api.deleteEntry(this.props.user.id, this.props.collection.id, entry.id, status => {
                    calls--;
                    if (calls === 0) {
                        // after the last delete just retrieve the latest data
                        this.loadData();
                    }
                });
            });
        }
    }

    /********************************************************************************
    ****************************** FUNCTIONS NEEDED FOR THE SORTTABLE COMPONENT *****
    *********************************************************************************/

    //filter entries (client-side for now)
    filterEntries(entries) {
        const userId = this.props.user.id;
        const filter = this.state.filter;
        let results = entries;
        // filter on keywords
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                results = results.filter(
                    entry =>
                    entry.title.toLowerCase().includes(k) ||
                    entry.descr.toLowerCase().includes(k)
                );
            });
        }

        // filter on current user
        if (filter.currentUser) {
            results = results.filter(entry => entry.owner.id === userId);
        }

        return results;
    }

    sortEntries(entries, sort) {
        const sorted = entries;
        switch (sort.field) {
            case 'title': sorted.sort((a, b) => a.name > b.name); break;
            case 'descr': sorted.sort((a, b) => a.name > b.name); break;
            case 'dateCreated': sorted.sort((a, b) => a.created > b.created); break;
            case 'creator': sorted.sort((a, b) => a.name > b.name); break;
            default: return sorted;
        }
        return sort.order === 'desc' ? sorted.reverse() : sorted;
    }

    //Decorate collection data with helper functions
    //(currently placeholders) - See ProjectTable.jsx as well.
    toTableData(entries) {
        return entries.map(c => {
            c.canDelete = function() {
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

    //generate a table row
    getEntryRow(entry) {
        const currentUserId = this.props.user.id;
        return [
            {
                props: { className: 'primary' },
                content: (
                    <a className="btn blank warning" onClick={this.editEntry.bind(this, entry)}>
                        {entry.title}
                    </a>
                )
            },
            {content: this.__toPrettyDesription(entry.descr)},
            {
                props: { className: 'smaller' },
                content: entry.dateCreated
            },
            {content: entry.creator},
            {content: (
                 <a className="btn blank warning" href={entry.fileUrl} target="_download">
                    {this.__toPrettyFileURL(entry.fileUrl)}
                </a>
            )},
            {
                content: entry.canDelete(currentUserId) ? (
                    <a className="btn blank warning" onClick={this.deleteEntry.bind(this, entry)}>
                        Delete
                    </a>) : ('')
            },
            {
                content: entry.canOpen(currentUserId) ? (
                    <a className="btn blank warning" onClick={this.openResourceViewer.bind(this, entry)}>
                        Open
                    </a>) : ('')
            }
        ];
    }

    __toPrettyFileURL(url) {
        let prettyUrl = url || '';
        if(url && url.indexOf('/') != -1) {
            prettyUrl = url.substring(url.lastIndexOf('/') + 1);
        }
        if(prettyUrl.indexOf('?') != -1) {
            prettyUrl = prettyUrl.substring(0, prettyUrl.indexOf('?'))
        }
        return prettyUrl;
    }

    __toPrettyDesription(desc) {
        if(desc && desc.length > 40) {
            return desc.substring(0, 40) + '...'
        }
        return desc
    }

    /********************************************************************************
    ****************************** JUST RENDER **************************************
    *********************************************************************************/

    render() {
        let resourceViewer = null;
        if(this.state.activeResource) {
            resourceViewer = (
                <ResourceViewerModal
                    bookmark={this.state.activeResource}
                    onClose={this.closeResourceViewer.bind(this)}/>
            )
        }

        let editEntryModal = null;
        if(this.state.activeEntry) {
            editEntryModal = (
                <FlexModalN
                    onClose={this.closeEditModal.bind(this)}>
                        <DataEntryForm
                            submitButton="Save Entry"
                            onCancelEditing={this.closeEditModal.bind(this)}
                            dataEntry={this.state.activeEntry}
                            dataEntryDidSave={this.onSaveEntry.bind(this)}
                            collectionId = {this.props.collection.id}
                            user={this.props.user}
                            api={this.props.api}/>
                </FlexModalN>
            )
        }
        return (
            <div className={IDUtil.cssClassName('entry-table')}>
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
                            <label htmlFor="current-user">Show only my entries</label>
                        </div>
                        <button className="btn" onClick={this.addEntry.bind(this)}>Add</button>
                    </div>
                </div>

                <SortTable
                    items={this.state.entries}
                    head={this.head}
                    row={this.getEntryRow}
                    onSort={this.sortEntries}
                    loading={this.state.loading}
                    bulkActions={this.bulkActions}
                    defaultSort={this.defaultSort}/>
                {resourceViewer}
                {editEntryModal}
            </div>
        );
    }
}

DataEntryTable.propTypes = {
    // personalcollection api
    api: PropTypes.shape({
        list: PropTypes.func.isRequired
    }).isRequired,

    // current user object used for defining access roles per collection
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }).isRequired,

    collection: PropTypes.shape({
        id: PropTypes.number.isRequired
    }).isRequired
};

export default DataEntryTable;
