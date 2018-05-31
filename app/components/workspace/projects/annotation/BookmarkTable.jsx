import AnnotationAPI from '../../../../api/AnnotationAPI';
import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';
import ComponentUtil from '../../../../util/ComponentUtil';
import BookmarkUtil from '../../../../util/BookmarkUtil';
import AnnotationUtil from '../../../../util/AnnotationUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import { exportDataAsJSON } from '../../helpers/Export';
import BulkActions from '../../helpers/BulkActions';

import ResourceViewerModal from '../../ResourceViewerModal';

import BookmarkRow from './BookmarkRow';
import NestedTable from './NestedTable';

import PropTypes from 'prop-types';

/**
* This view handles the loading, filtering and selection of data of
* the Bookmarks list of a project. It is displayed using the NestedTable component.
*/
class BookmarkTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.bookmarkTypes = [
            'Video',
            'Video-Fragment',
            'Image',
            'Audio',
            'Entity'
        ];

        this.orders = [
            { value: 'created', name: 'Bookmark created' },
            { value: 'newest', name: 'Newest objects first' },
            { value: 'oldest', name: 'Oldest objects first' },
            { value: 'name-az', name: 'Title A-Z' },
            { value: 'name-za', name: 'Title Z-A' },
            { value: 'type', name: 'Type' },
            { value: 'dataset', name: 'Dataset' },
            { value: 'manual', name: 'Manual' }
        ];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteBookmarks.bind(this) },
            { title: 'Export', onApply: this.exportBookmarks.bind(this) }
        ];

        this.state = {
            annotations : null,
            bookmarks: [],
            selection: [],
            loading: true,
            detailBookmark: null,
            filters: []
        };

        // bind functions (TODO get rid of these, unnecessary and confusing)
        this.viewBookmark = this.viewBookmark.bind(this);
        this.deleteBookmarks = this.deleteBookmarks.bind(this);

        this.filterBookmarks = this.filterBookmarks.bind(this);
        this.sortBookmarks = this.sortBookmarks.bind(this);
        this.renderResults = this.renderResults.bind(this);

        this.selectAllChange = this.selectAllChange.bind(this);
        this.selectItem = this.selectItem.bind(this);

        this.closeItemDetails = this.closeItemDetails.bind(this);
    }

    componentWillMount() {
        this.loadBookmarks();
    }

    loadBookmarks() {
        AnnotationStore.getUserProjectAnnotations(
            this.props.user,
            this.props.project,
            this.onLoadBookmarks.bind(this)
        );
    }

    //Get filter list of unique object types
    getFilters(items) {
        const result = [];
        const hits = {};

        items.forEach(item => {
            const t = item.object.type;
            if (!(t in hits)) {
                result.push({ value: t, name: t.charAt(0).toUpperCase() + t.slice(1) });
                hits[t] = true;
            }
        });
        return result.sort();
    }

    //Annotation load callback: set data to state
    onLoadBookmarks(data) {
        this.setState({
            annotations : data.annotations || null
        }, () => {
            AnnotationUtil.generateBookmarkCentricList(
                data.annotations || [],
                this.onLoadResourceList.bind(this)
            );
        })
    }

    //The resource list now also contains the data of the resources
    onLoadResourceList(bookmarks) {
        this.setState({
            bookmarks: bookmarks,
            loading: false,
            filters: this.getFilters(bookmarks)
        });

        this.updateSelection(bookmarks);
    }

    //Update Selection list, based on available items
    updateSelection(items) {
        this.setState({
            selection: items.map(item => item.id).filter(
                itemId => this.state.selection.includes(itemId)
            )
        });
    }

    filterBookmarks(bookmarks, filter) {
        // filter on keywords in title, dataset or type
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                bookmarks = bookmarks.filter(
                    bookmark =>
                    bookmark.object.title.toLowerCase().includes(k) ||
                    (bookmark.object.dataset &&
                        bookmark.object.dataset.toLowerCase().includes(k)) ||
                    (bookmark.object.type &&
                        bookmark.object.type.toLowerCase().includes(k))
                );
            });
        }

        // filter on type
        if (filter.type) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.object.type.toLowerCase().includes(filter.type.toLowerCase())
            );
        }

        return bookmarks;
    }

    sortBookmarks(bookmarks, field) {
        const sorted = bookmarks;
        switch (field) {
            case 'created':
                sorted.sort((a, b) => a.created > b.created);
                break;
            case 'newest':
                sorted.sort((a, b) => a.object.date < b.object.date);
                break;
            case 'oldest':
                sorted.sort((a, b) => a.object.date > b.object.date);
                break;
            case 'name-az':
                sorted.sort((a, b) => a.object.title > b.object.title);
                break;
            case 'name-za':
                sorted.sort((a, b) => a.object.title < b.object.title);
                break;
            case 'type':
                sorted.sort((a, b) => a.object.type > b.object.type);
                break;
            case 'dataset':
                sorted.sort((a, b) => a.object.dataset > b.object.dataset);
                break;
            case 'manual':
                sorted.sort((a, b) => a.sort > b.sort);
                break;
            default: return sorted;
        }

        return sorted;
    }

    //delete multiple bookmarks
    deleteBookmarks(bookmarkIds) {
        if(bookmarkIds) {
            let msg = 'Are you sure you want to remove the selected bookmark';
            msg += bookmarkIds.length == 1 ? '?' : 's?';
            if (!confirm(msg)) {
                return;
            }

            // delete each bookmark
            BookmarkUtil.deleteBookmarks(
                this.state.annotations,
                this.state.bookmarks,
                bookmarkIds,
                (success) => {
                    console.debug('reloading bookmark-list', this)
                    setTimeout(this.loadBookmarks.call(this), 250);
                }
            )
        }
    }

    exportBookmarks(selection) {
        const data = this.state.bookmarks.filter(item =>
            selection.includes(item.id)
            );
        exportDataAsJSON(data);
    }

    makeActiveProject() {
        ComponentUtil.storeJSONInLocalStorage('activeProject', this.props.project);
    }

    viewBookmark(bookmark) {
        // make current project active
        if (bookmark) {
            this.makeActiveProject();
        }
        this.setState({
            detailBookmark: bookmark
        });
    }

    //change sort type (TODO change functio nanme)
    sortChange(e) {
        this.setSort(e.target.value);
    }

    selectAllChange(items, e) {
        if (e.target.checked) {
            const newSelection = this.state.selection.slice();
            items.forEach(item => {
                if (!newSelection.includes(item.id)) {
                    newSelection.push(item.id);
                }
            });
            // set
            this.setState({
                selection: newSelection
            });
        } else {
            items = items.map(item => item.id);
            // unset
            this.setState({
                selection: this.state.selection.filter(item => !items.includes(item))
            });
        }
    }

    selectItem(item, select) {
        if (select) {
            if (!this.state.selection.includes(item.id)) {
                // add to selection
                this.setState({
                    selection: [...this.state.selection, item.id]
                });
            }
            return;
        }

        // remove from selection
        if (!select) {
            this.setState({
                selection: this.state.selection.filter(selected => selected !== item.id)
            });
        }
    }

    //Close itemDetails view, and refresh the data (assuming changes have been made)
    closeItemDetails() {
        // set viewbookmark to null
        this.viewBookmark(null);

        // refresh data
        this.loadBookmarks();
    }

    renderResults(renderState) {
        return (
            <div>
                <h2>
                    <input
                        type="checkbox"
                        checked={
                            renderState.visibleItems.length > 0 && renderState.visibleItems.every(item =>
                                this.state.selection.includes(item.id)
                            )
                        }
                        onChange={this.selectAllChange.bind(this, renderState.visibleItems)}/>

                    Bookmarks:{' '}
                    <span className="count">{renderState.visibleItems.length || 0}</span>
                </h2>
                <div className="bookmark-table">
                    {renderState.visibleItems.map((bookmark, index) => (
                        <BookmarkRow
                            key={index}
                            bookmark={bookmark}
                            onDelete={this.deleteBookmarks}
                            onView={this.viewBookmark}
                            selected={this.state.selection.includes(bookmark.id)}
                            onSelect={this.selectItem}/>
                    ))}
                </div>
            </div>
        )
    }

    render() {
        let detailsModal = null;
        if(this.state.detailBookmark) {
            detailsModal = (
                <ResourceViewerModal
                    bookmark={this.state.detailBookmark}
                    onClose={this.closeItemDetails}/>
            )
        }
        return (
            <div className={IDUtil.cssClassName('bookmark-table')}>
                <NestedTable
                    items={this.state.bookmarks}
                    selection={this.state.selection}
                    sortItems={this.sortBookmarks}
                    orders={this.orders}
                    filterItems={this.filterBookmarks}
                    filters={this.state.filters}
                    renderResults={this.renderResults}
                    onExport={exportDataAsJSON}/>

                <BulkActions
                    bulkActions={this.bulkActions}
                    selection={this.state.selection}/>

                {detailsModal}
            </div>
        )
    }

}

BookmarkTable.propTypes = {
    user: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired
};

export default BookmarkTable;
