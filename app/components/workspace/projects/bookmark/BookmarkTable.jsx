import AnnotationAPI from '../../../../api/AnnotationAPI';

import IDUtil from '../../../../util/IDUtil';
import ComponentUtil from '../../../../util/ComponentUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import { exportDataAsJSON } from '../../helpers/Export';
import BulkActions from '../../helpers/BulkActions';
import {
    createAnnotationOptionList,
    createOptionList,
    createClassificationOptionList,
    createSimpleArrayOptionList
} from '../../helpers/OptionList';

import ResourceViewerModal from '../../ResourceViewerModal';
import FlexRouter from '../../../../util/FlexRouter';
import BookmarkRow from './BookmarkRow';
import NestedTable from '../../helpers/NestedTable';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import CollectionUtil from "../../../../util/CollectionUtil";

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
            { value: 'playable', name: 'Playable'},
            { value: 'dataset', name: 'Dataset' },
            { value: 'group', name: 'Groups' },
        ];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteBookmarks.bind(this) },
            { title: 'Export', onApply: this.exportBookmarks.bind(this) }
        ];

        this.state = {
            annotations: [], //FIXME no longer filled with the new API call!!
            bookmarks: [],
            selection: [],
            subMediaObject: {},
            subSegment: {},
            loading: true,
            detailBookmark: null,
            filters: []
        };

        // bind functions (TODO get rid of these, unnecessary and confusing)
        this.viewBookmark = this.viewBookmark.bind(this);
        this.deleteBookmarks = this.deleteBookmarks.bind(this);
        this.deleteBookmark = this.deleteBookmark.bind(this);

        this.filterBookmarks = this.filterBookmarks.bind(this);
        this.sortBookmarks = this.sortBookmarks.bind(this);
        this.renderResults = this.renderResults.bind(this);

        this.selectAllChange = this.selectAllChange.bind(this);
        this.selectItem = this.selectItem.bind(this);
        this.closeItemDetails = this.closeItemDetails.bind(this);
        this.toggleSubMediaObject = this.toggleSubMediaObject.bind(this);
        this.toggleSubSegment = this.toggleSubSegment.bind(this);
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

        AnnotationStore.getUserProjectBookmarks(
            this.props.user.id,
            this.props.project.id,
            this.onLoadResourceList.bind(this)
        )
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
                type: 'search',
                placeholder: 'Search Bookmarks'
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
                titleAttr: 'Bookmark group',
                options: createClassificationOptionList(items,'groups')
            },
            // annotations filter
            {
                title:'Annotations',
                key: 'annotations',
                type: 'select',
                titleAttr: 'MediaObject annotations',
                options: [
                    {value:'yes',name:'With annotations'},
                    {value:'no',name:'Without annotations'},
                    {value:'',name:'-----------', disabled: true}
                ].concat(createAnnotationOptionList(items)),
            },
            // segment filter
            {
                title:'Fragments',
                key: 'segments',
                type: 'select',
                options: [
                    {value:'yes',name:'With fragments'},
                    {value:'no',name:'Without fragments'},
                ],
            },

        ];
    }



    //Update Selection list, based on available items
    updateSelection(items) {
        this.setState({
            selection: items.filter(
                item => this.state.selection.some((i)=>(i.resourceId == item.resourceId))
            )
        });
    }

    filterBookmarks(bookmarks, filter) {
        // filter on type
        if (filter.mediaType) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.object && bookmark.object.mediaTypes && bookmark.object.mediaTypes.includes(filter.mediaType)
            );
        }

        // filter on group
        if (filter.group) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.groups && bookmark.groups.some((g) => (g.annotationId === filter.group))
            );
        }

        // filter on annotations
        if (filter.annotations) {
            switch(filter.annotations){
                case 'yes':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.annotations.length > 0
                    );
                break;
                case 'no':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.annotations.length === 0
                    );
                break;
                default:
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.annotations.some((a) => (a.annotationType === filter.annotations))
                    );
            }
        }

        // filter on segments
        if (filter.segments) {
            switch(filter.segments){
                case 'yes':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.segments.length > 0
                    );
                break;
                case 'no':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.segments.length === 0
                    );
                break;
            }
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
                        typeof bookmark.object[key] === 'string' && bookmark.object[key].toLowerCase().includes(k))
                        ))
                    ||
                    // annotations
                    (bookmark.annotations && bookmark.annotations.some((annotation)=>(
                        Object.keys(annotation).some((key)=>(typeof annotation[key] === 'string' && annotation[key].toLowerCase().includes(k)))
                        )))
                );
            });
        }
        return bookmarks;
    }

    sortBookmarks(bookmarks, field) {
        if(!bookmarks) {
            return [];
        }
        // Enhance the bookmarks with a formatted date to allow sorting.
        const sorted = bookmarks.map((item) => {
            const collectionClass = CollectionUtil.getCollectionClass(
                this.props.user.id, this.props.user.name, item.object.dataset, true
            );
            if(collectionClass) {
                item.object.formattedDate = collectionClass.prototype.getInitialDate(item.object.date)
            }
            return item
        });

        const getFirst = (a, empty)=> (
            a && a.length > 0 ? a[0] : empty
        );
        const sortOnNull = (order, a, b) => {
            if (order === 'newest') {
                return (a.object.formattedDate === null) - (b.object.formattedDate === null)
                    || -(a.object.formattedDate > b.object.formattedDate) || +(a.object.formattedDate < b.object.formattedDate);
            }
            return (a.object.formattedDate === null) - (b.object.formattedDate === null)
                || +(a.object.formattedDate > b.object.formattedDate) || -(a.object.formattedDate < b.object.formattedDate);
        };

        switch (field) {
            case 'created':
                sorted.sort((a, b) => a.created > b.created ? 1 : -1);
                break;
            case 'newest':
                sorted.sort((a, b) => sortOnNull('newest', a, b));
                break;
            case 'oldest':
                sorted.sort((a, b) => sortOnNull('oldest', a, b));
                break;
            case 'name-az':
                sorted.sort((a, b) => a.object.title > b.object.title ? 1 : -1);
                break;
            case 'name-za':
                sorted.sort((a, b) => a.object.title < b.object.title ? 1 : -1);
                break;
            case 'mediatype':{
                    // '~' > move empty to bottom
                    const e = '~';
                    sorted.sort((a, b) => getFirst(a.object.mediaTypes, e) > getFirst(b.object.mediaTypes, e) ? 1 : -1);
                    break;
                }
            case 'playable':
                sorted.sort((a, b) => a.object.playable < b.object.playable ? -1 : 1);
            case 'dataset':
                sorted.sort((a, b) => a.object.dataset > b.object.dataset ? 1 : -1);
                break;
            case 'group':{
                    // '~' > move empty to bottom
                    const e = {label:'~'};
                    sorted.sort((a, b) => getFirst(a.groups, e).label > getFirst(b.groups, e).label  ? 1 : -1);
                    break;
                }
            default: return sorted;
        }

        return sorted;
    }

    //delete multiple bookmarks
    deleteBookmarks(bookmarks) {
        if(bookmarks) {
            if (!confirm('Are you sure you want to remove the selected bookmarks and all its annotations?')) {
                return;
            }


            //populate the deletion list required for the annotation API
            const deletionList = [];
            bookmarks.forEach(b => {
                b.targetObjects.forEach(targetObject => {
                    deletionList.push({
                        annotationId : targetObject.parentAnnotationId,
                        type : 'target',
                        partId : targetObject.assetId
                    })
                })
            });

            //now delete the whole selection in a single call to the API
            AnnotationAPI.deleteUserAnnotations(
                this.props.user.id,
                deletionList,
                (success) => {
                    setTimeout(()=>{
                        // load new data
                        this.loadBookmarks();

                        // update bookmark count in project menu
                        this.props.loadBookmarkCount();
                    }, 500);
                }
            );
        }
    }

    exportBookmarks(selection) {
        const data = this.state.bookmarks.filter(item =>
            selection.some((i)=>(i.resourceId == item.resourceId))
            );
        exportDataAsJSON(data);
    }

    deleteBookmark(bookmark){
        this.deleteBookmarks([bookmark]);
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

    onGotoItemDetails = (item) => {
        const resource = {index: item.index, resourceId: item.resourceId};
        FlexRouter.gotoItemDetails('tool/default-item-details', resource, null);
    };

    selectAllChange(selectedItems, e) {
        const newSelection = this.state.selection.slice().filter((i)=>(selectedItems.includes(i))); //copy the array
        selectedItems.forEach(item => {
            const found = newSelection.find(selected => selected.resourceId === item.resourceId)
            if(!found && e.target.checked) { // add it to the selection
                newSelection.push(item);
            } else if (!e.target.checked && found) { // remove the selected item
                newSelection.splice(found, 1);
            }
        });
        this.setState({
            selection: newSelection
        });
    }

    selectItem(item, select) {
        let newSelection = this.state.selection.slice(); //copy the array
        const index = newSelection.findIndex(selected => {
            return selected.resourceId === item.resourceId
        });
        if(index === -1 && select) { // add it to the selection
            newSelection.push(item);
        } else if (!select && index !== -1) { // remove the selected item
            newSelection.splice(index, 1);
        }
        this.setState({
            selection: newSelection
        });
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

    // Toggle sublevel mediaobject visibility
    toggleSubMediaObject(id){
        const subMediaObject = Object.assign({}, this.state.subMediaObject);
        if (id in subMediaObject){
            delete subMediaObject[id];
        } else{
            subMediaObject[id] = true;
        }
        // remove from subSegments
        const subSegment = Object.assign({},this.state.subSegment);
        delete subSegment[id];

        this.setState({subMediaObject, subSegment});
    }

    // Toggle sublevel segment visibility
    toggleSubSegment(id){
        const subSegment = Object.assign({}, this.state.subSegment);
        if (id in subSegment){
            delete subSegment[id];
        } else{
            subSegment[id] = true;
        }
        // remove from subMediaObject
        const subMediaObject = Object.assign({},this.state.subMediaObject);
        delete subMediaObject[id];

        this.setState({subMediaObject, subSegment});
    }

    unFoldAll(){
        const showSub = {};
        switch(this.foldTarget.value){
            case 'mediaobject':
                this.state.bookmarks.forEach((b)=>{
                    if (b.annotations && b.annotations.length > 0){
                        showSub[b.resourceId] = true;
                    }
                });
                this.setState({subSegment:{}, subMediaObject: showSub});
            break;
            case 'segments':
                this.state.bookmarks.forEach((b)=>{
                    if (b.segments && b.segments.length > 0){
                        showSub[b.resourceId] = true;
                    }
                });
                this.setState({subMediaObject:{}, subSegment: showSub});
            break;
        }
    }

    foldAll(){
        switch(this.foldTarget.value){
            case 'mediaobject':
                    this.setState({subMediaObject:{}});
            break;
            case 'segments':
                    this.setState({subSegment:{}});
            break;
        }
    }

    renderResults(renderState) {
        const annotationTypeFilter = renderState.filter.annotations && !['yes','no'].includes(
            renderState.filter.annotations
        ) ? renderState.filter.annotations : '';
        return (
            <div>
                <h2>
                    <input
                        type="checkbox"
                        checked={
                            renderState.visibleItems.length > 0 && renderState.visibleItems.every(item =>
                                item && this.state.selection.some((i)=>(i.resourceId == item.resourceId))
                            )
                        }
                        onChange={this.selectAllChange.bind(this, renderState.visibleItems)}/>

                    Bookmarks:{' '}
                    <span className="count">{renderState.visibleItems.length || 0}</span>

                    <div className="fold">
                        <div className="filter">
                            <span onClick={this.unFoldAll}>Show all</span>&nbsp;/&nbsp;<span onClick={this.foldAll}>Hide all</span>
                        </div>
                        <select ref={elem => (this.foldTarget = elem)}>
                            <option value="mediaobject">MediaObject annotations</option>
                            <option value="segments">Segments</option>
                        </select>

                    </div>
                </h2>

                <div className="bookmark-table">
                    {renderState.visibleItems.length ?
                        renderState.visibleItems.map((bookmark, index) => (
                        <BookmarkRow
                            key={bookmark.resourceId}
                            bookmark={bookmark}
                            onDelete={this.deleteBookmark}
                            onExport={exportDataAsJSON}
                            onPreview={this.viewBookmark}
                            onGotoItemDetails={this.onGotoItemDetails}
                            selected={
                                this.state.selection.find(
                                    item => item.resourceId === bookmark.resourceId
                                ) !== undefined
                            }
                            onSelect={this.selectItem}
                            showSubMediaObject={bookmark.resourceId in this.state.subMediaObject}
                            showSubSegment={bookmark.resourceId in this.state.subSegment}
                            toggleSubMediaObject={this.toggleSubMediaObject}
                            toggleSubSegment={this.toggleSubSegment}
                            annotationTypeFilter={annotationTypeFilter}
                            projectId={this.props.project.id}
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
                    uid={this.props.project.id + "-bookmarks"}

                    filterItems={this.filterBookmarks}
                    renderResults={this.renderResults}
                    onExport={exportDataAsJSON}

                    items={this.state.bookmarks}
                    sortItems={this.sortBookmarks}
                    selection={this.state.selection}
                    orders={this.orders}
                    filters={this.state.filters}

                    toggleSubMediaObject={this.state.subMediaObject}
                    toggleSubSegment={this.state.subSegment}
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
    onGotoItemDetails: PropTypes.func.isRequired,
    viewBookmark: PropTypes.func.isRequired
};

export default BookmarkTable;
