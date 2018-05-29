import AnnotationAPI from '../../../../api/AnnotationAPI';
import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';
import ComponentUtil from '../../../../util/ComponentUtil';
import BookmarkUtil from '../../../../util/BookmarkUtil';
import AnnotationUtil from '../../../../util/AnnotationUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import { exportDataAsJSON } from '../../helpers/Export';
import BulkActions from '../../helpers/BulkActions';
import { createOptionList, createClassificationOptionList, createSimpleArrayOptionList } from '../../helpers/OptionList';

import ResourceViewerModal from '../../ResourceViewerModal';

import BookmarkRow from './BookmarkRow';
import NestedTable from './NestedTable';
import classNames from 'classnames';
import PropTypes from 'prop-types';

/**
* This view handles the loading, filtering and selection of data of
* the Bookmarks list of a project. It is displayed using the NestedTable component.
*/
class BookmarkTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.orders = [
            { value: 'created', name: 'Bookmark created' },
            { value: 'newest', name: 'Newest objects first' },
            { value: 'oldest', name: 'Oldest objects first' },
            { value: 'name-az', name: 'Title A-Z' },
            { value: 'name-za', name: 'Title Z-A' },
            { value: 'mediatype', name: 'Media' },
            { value: 'dataset', name: 'Dataset' },
            { value: 'group', name: 'Groups' },
        ];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteBookmarks.bind(this) },
            { title: 'Export', onApply: this.exportBookmarks.bind(this) }
        ];

        this.state = {
            annotations: [],
            bookmarks: [],
            selection: [],
            showSub: {},
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
        this.toggleSub = this.toggleSub.bind(this);
        this.unFoldAll = this.unFoldAll.bind(this);
        this.foldAll = this.foldAll.bind(this);
    }

    componentWillMount() {
        this.loadBookmarks();
    }

    loadBookmarks() {
        this.setState({
            loading:true
        });

        AnnotationStore.getUserProjectAnnotations(
            this.props.user,
            this.props.project,
            this.onLoadBookmarks.bind(this)
        );
    }
    //Annotation load callback: set data to state
    onLoadBookmarks(data) {
        
        // create bookmark lists
        if (data && data.annotations && data.annotations.length){
            // store annotation data
            this.setState({annotations:data.annotations});

            AnnotationUtil.generateBookmarkCentricList(
                data.annotations,
                this.onLoadResourceList.bind(this)
            );
        } else{
            this.setState({
                annotations: [],
                bookmarks: [],
                selection: [],
                filters: this.getFilters([])
            });
        }        
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

    //Get filter object
    getFilters(items) {
        return [

            // search filter
            {
                title:'',
                key: 'keywords',
                type: 'search'
            },
            
            // type filter        
            {
                title:'Media',
                key: 'mediaType',
                type: 'select',
                options: createSimpleArrayOptionList(items, (i)=>(i.object.mediaTypes) )
            },
            // group filter        
            {
                title:'Group',
                key: 'group',
                type: 'select',
                options: createClassificationOptionList(items,'groups')
            },

        ];      
    }



    //Update Selection list, based on available items
    updateSelection(items) {
        this.setState({
            selection: items.map(item => item.resourceId).filter(
                itemId => this.state.selection.includes(itemId)
            )
        });
    }

    filterBookmarks(bookmarks, filter) {
        // filter on type
        if (filter.mediaType) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.object.mediaTypes.includes(filter.mediaType)
            );
        }

        // filter on group
        if (filter.group) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.groups.some((g) => (g.annotationId == filter.group))
            );
        }

        // filter on keywords in title, dataset or type
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                bookmarks = bookmarks.filter(
                    bookmark =>
                    // object
                    (bookmark.object && Object.keys(bookmark.object).some((key)=>(
                        typeof bookmark.object[key] == 'string' && bookmark.object[key].toLowerCase().includes(k))
                        ))
                    || 
                    // annotations
                    (bookmark.annotations && bookmark.annotations.some((annotation)=>(
                        Object.keys(annotation).some((key)=>(typeof annotation[key] == 'string' && annotation[key].toLowerCase().includes(k)))
                        )))
                );
            });
        }

      

        return bookmarks;
    }

    sortBookmarks(bookmarks, field) {
        const getFirst = (a, empty)=>(            
            a.length > 0 ? a[0] : empty
            );

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
            case 'mediatype':{
                    // '~' > move empty to bottom
                    const e = '~';
                    sorted.sort((a, b) => getFirst(a.object.mediaTypes, e) > getFirst(b.object.mediaTypes, e));
                    break;
                }
            case 'dataset':
                sorted.sort((a, b) => a.object.dataset > b.object.dataset);
                break;
            case 'group':{
                    // '~' > move empty to bottom
                    const e = {label:'~'};
                    sorted.sort((a, b) => getFirst(a.groups, e).label > getFirst(b.groups, e).label);
                    break;
                }
            default: return sorted;
        }

        return sorted;
    }

    //delete multiple bookmarks
    deleteBookmarks(bookmarkIds) {
        if(bookmarkIds) {
            if (!confirm('Are you sure you want to remove the selected bookmarks and all its annotations?')) {
                return;
            }

            // delete each bookmark
            BookmarkUtil.deleteBookmarks(
                this.state.annotations,
                this.state.bookmarks,
                bookmarkIds,
                (success) => {
                    // add a time out, because sometimes it may take a while for
                    // the changes to be reflected in the data
                    setTimeout(()=>{
                            // load new data
                            this.loadBookmarks();

                            // update bookmark count in project menu
                            this.props.loadBookmarkCount();
                        }
                        , 500);
                }
            )
        }
    }

    exportBookmarks(selection) {
        const data = this.state.bookmarks.filter(item =>
            selection.includes(item.resourceId)
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

    selectAllChange(items, e) {
        if (e.target.checked) {
            const newSelection = this.state.selection.slice();
            items.forEach(item => {
                if (!newSelection.includes(item.resourceId)) {
                    newSelection.push(item.resourceId);
                }
            });
            // set
            this.setState({
                selection: newSelection
            });
        } else {
            items = items.map(item => item.resourceId);
            // unset
            this.setState({
                selection: this.state.selection.filter(item => !items.includes(item))
            });
        }
    }

    selectItem(item, select) {
        if (select) {
            if (!this.state.selection.includes(item.resourceId)) {
                // add to selection
                this.setState({
                    selection: [...this.state.selection, item.resourceId]
                });
            }
            return;
        }

        // remove from selection
        if (!select) {
            this.setState({
                selection: this.state.selection.filter(selected => selected !== item.resourceId)
            });
        }
    }

    //Close itemDetails view, and refresh the data (assuming changes have been made)
    closeItemDetails() {
        // set viewbookmark to null
        this.viewBookmark(null);

        // update bookmark count in project menu
        this.props.loadBookmarkCount();

        // refresh data
        this.loadBookmarks();
    }

    // Toggle sublevel visibility
    toggleSub(id){
        const showSub = Object.assign({}, this.state.showSub);
        if (id in showSub){
            delete showSub[id];
        } else{
            showSub[id] = true;
        }
        this.setState({showSub});
    }

    unFoldAll(){
        const showSub = {};
        this.state.bookmarks.forEach((b)=>{
            if (b.annotations && b.annotations.length > 0){
                showSub[b.resourceId] = true;        
            }            
        });
        this.setState({showSub});
    }

    foldAll(){
        this.setState({showSub:{}});
    }

    renderResults(renderState) {
        return (
            <div>
                <h2>
                    <input
                        type="checkbox"
                        checked={
                            renderState.visibleItems.length > 0 && renderState.visibleItems.every(item =>
                                this.state.selection.includes(item.resourceId)
                            )
                        }
                        onChange={this.selectAllChange.bind(this, renderState.visibleItems)}/>

                    Bookmarks:{' '}
                    <span className="count">{renderState.visibleItems.length || 0}</span>
                    <div className="fold" onClick={this.unFoldAll}>Unfold all</div>
                    <div className="fold" onClick={this.foldAll}>Fold all</div>
                </h2>

                <div className="bookmark-table">
                    {renderState.visibleItems.length ? 
                        renderState.visibleItems.map((bookmark, index) => (
                        <BookmarkRow
                            key={bookmark.resourceId}
                            bookmark={bookmark}
                            onDelete={this.deleteBookmarks}
                            onView={this.viewBookmark}
                            selected={this.state.selection.includes(bookmark.resourceId)}
                            onSelect={this.selectItem}
                            showSub={bookmark.resourceId in this.state.showSub}
                            toggleSub={this.toggleSub}
                            />
                    ))
                    : <h3>∅ No results</h3>
                }
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
            <div className={classNames(IDUtil.cssClassName('bookmark-table'),{loading:this.state.loading})}>
                <NestedTable
                    items={this.state.bookmarks}
                    selection={this.state.selection}
                    sortItems={this.sortBookmarks}
                    orders={this.orders}
                    filterItems={this.filterBookmarks}
                    filters={this.state.filters}
                    renderResults={this.renderResults}
                    onExport={exportDataAsJSON}
                    showSub={this.state.showSub}
                    uid={this.props.project.id + "-bookmarks"}
                    />

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
    project: PropTypes.object.isRequired,
    loadBookmarkCount: PropTypes.func.isRequired,
};

export default BookmarkTable;
