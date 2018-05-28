import AnnotationAPI from '../../../../api/AnnotationAPI';
import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';
import BookmarkUtil from '../../../../util/BookmarkUtil';
import ComponentUtil from '../../../../util/ComponentUtil';
import AnnotationUtil from '../../../../util/AnnotationUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import BulkActions from '../../helpers/BulkActions';
import { createOptionList } from '../../helpers/OptionList';
import { exportDataAsJSON } from '../../helpers/Export';

import ResourceViewerModal from '../../ResourceViewerModal';

import NestedTable from './NestedTable';
import AnnotationRow from './AnnotationRow';
import classNames from 'classnames';

import PropTypes from 'prop-types';


/**
* This view handles the loading, filtering and selection of data of
* the Annotations list of a project. It is displayed using the NestedTable component.
*/
class AnnotationTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.title = props.title;

        this.annotationTypes = [
            { value: 'classification', name: 'Code' },
            { value: 'comment', name: 'Comment' },
            { value: 'link', name: 'Link' },
            { value: 'metadata', name: 'Metadata' }
        ];

        this.orders = [{ value: 'created', name: 'Annotation created' }];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteAnnotations.bind(this) },
            { title: 'Export', onApply: this.exportAnnotationsByIds.bind(this) }
        ];

        this.state = {
            parentAnnotations : null,
            annotations: [],
            selection: [],
            loading: true,
            detailBookmark: null,
            filters: [],
            showSub: {}
        };

        // bind functions (TODO get rid of these, they are unnecessary and confusing)
        this.closeItemDetails = this.closeItemDetails.bind(this);
        this.deleteAnnotations = this.deleteAnnotations.bind(this);
        this.exportAnnotations = this.exportAnnotations.bind(this);
        this.filterAnnotations = this.filterAnnotations.bind(this);
        this.renderResults = this.renderResults.bind(this);
        this.selectAllChange = this.selectAllChange.bind(this);
        this.selectItem = this.selectItem.bind(this);
        this.sortAnnotations = this.sortAnnotations.bind(this);
        this.viewBookmark = this.viewBookmark.bind(this);
        this.toggleSub = this.toggleSub.bind(this);
        this.unFoldAll = this.unFoldAll.bind(this);
        this.foldAll = this.foldAll.bind(this);
    }

    componentWillMount() {
        this.loadAnnotations();
    }

    loadAnnotations() {
        AnnotationStore.getUserProjectAnnotations(
            this.props.user,
            this.props.project,
            this.onLoadAnnotations.bind(this)
        );
    }


    onLoadAnnotations(data) {
        const parentAnnotations = data.annotations || [];

        let annotations = AnnotationUtil.generateAnnotationCentricList(
            parentAnnotations, this.props.type, (annotations)=>{
                this.setState({
                    parentAnnotations: data.annotations,
                    annotations: annotations,
                    loading: false,
                    filters: this.getFilters(annotations)
                },
                () => {
                    this.updateSelection(annotations)
                }
            )
        }
        );
      
    }

    //Get filter object
    getFilters(items) {
        return this.props.filters.map((filter)=>{
            switch(filter){
                case 'search':
                    // search filter
                    return {
                        title:'',
                        key: 'keywords',
                        type: 'search'
                    }                    
                break;
                case 'vocabulary':
                    return {
                        title:'Vocabulary',
                        key: 'vocabulary',
                        type: 'select',
                        options: createOptionList(items,  (i)=>(i['vocabulary']) )
                    }
                break;
                case 'bookmarkGroup':
                    return {
                        title:'Bookmark group',
                        key: 'bookmarkGroup',
                        type: 'select',
                        options: createOptionList(items, (i)=>(i['bookmarkGroup']))
                    }
                break;
                case 'code':
                    return {
                        title:'Code',
                        key: 'code',
                        type: 'select',
                        options: createOptionList(items, (i)=>(i['code']))
                    }
                break;
                default:
                    console.error('Unknown filter preset', filter);
            }
        })
    }

    //Update Selection list, based on available items
    updateSelection(items) {
        this.setState({
            selection: items
            .map(item => item.annotationId)
            .filter(itemId => this.state.selection.includes(itemId))
        });
    }

    //Filter annotation list by given filter
    filterAnnotations(annotations, filter) {
        
        const simpleKeyCheck = (items, getValue, value) =>(items.filter((i)=>(getValue(i) === value)));
        
        if (filter.vocabulary){
            annotations = simpleKeyCheck(annotations, (a)=>(a['vocabulary']), filter.vocabulary);
        }

        if (filter.code){
            annotations = simpleKeyCheck(annotations, (a)=>(a['code']), filter.code);
        }

        if (filter.bookmarkGroup){
            annotations = simpleKeyCheck(annotations, (a)=>(a['bookmarkGroup']), filter.bookmarkGroup);
        }

        // filter on keywords in title, dataset or type
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                annotations = annotations.filter(
                    annotation =>
                    // annotation
                    (Object.keys(annotation).some((key)=>(
                        typeof annotation[key] == 'string' && annotation[key].toLowerCase().includes(k))
                        ))
                    || 
                    // annotations
                    (annotation.bookmarks && annotation.bookmarks.some((bookmark)=>(
                        Object.keys(bookmark).some((key)=>(typeof bookmark[key] == 'string' && bookmark[key].toLowerCase().includes(k)))
                        ))
                    )
                );
            });
        }

        return annotations;
    }

    sortAnnotations(annotations, field) {
        const sorted = annotations;
        switch (field) {
            case 'created': sorted.sort((a, b) => a.created > b.created); break;
            default: return sorted;
        }

        return sorted;
    }

    deleteAnnotations(annotationIds) {
        if(annotationIds) {
            // always ask before deleting
            let msg = 'Are you sure you want to remove the selected annotation';
            msg += annotationIds.length == 1 ? '?' : 's?';
            if (!confirm(msg)) {
                return;
            }

            BookmarkUtil.deleteAnnotations(
                this.state.parentAnnotations,
                this.state.annotations,
                annotationIds,
                (success) => {
                    console.debug('reloading annotation-list', this)
                    setTimeout(this.loadAnnotations.call(this), 250);
                }
            )
        }
    }

    exportAnnotationsByIds(annotationIds) {
        const data = this.state.annotations.filter(item =>
            annotationIds.includes(item.annotationId)
        );
        this.exportAnnotations(data);
    }

    exportAnnotations(annotations) {
        let data = this.state.annotations.filter(item =>
            annotations.includes(item)
        );

        // remove cyclic structures
        data = data.map(d => {
            delete d.bookmarkAnnotation;
            delete d.bookmarks;
            return d;
        });

        exportDataAsJSON(data);
    }

    viewBookmark(bookmark) {
        this.setState({
            detailBookmark: bookmark
        });
    }


    //Close itemDetails view, and refresh the data (assuming changes have been made)
    closeItemDetails() {
        // set viewbookmark to null
        this.viewBookmark(null);

        // refresh data
        this.loadAnnotations();
    }

    sortChange(e) {
        this.setSort(e.target.value);
    }

    selectAllChange(items, e) {
        if (e.target.checked) {
            const newSelection = this.state.selection.slice();
            items.forEach(item => {
                if (!newSelection.includes(item.annotationId)) {
                    newSelection.push(item.annotationId);
                }
            });
            // set
            this.setState({
                selection: newSelection
            });
        } else {
            items = items.map(item => item.annotationId);
            // unset
            this.setState({
                selection: this.state.selection.filter(item => !items.includes(item))
            });
        }
    }

    selectItem(item, select) {
        if (select) {
            if (!this.state.selection.includes(item.annotationId)) {
                // add to selection
                this.setState({
                    selection: [...this.state.selection, item.annotationId]
                });
            }
            return;
        }

        // remove from selection
        if (!select) {
            this.setState({
                selection: this.state.selection.filter(
                    selected => selected !== item.annotationId
                )
            });
        }
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
        this.state.annotations.forEach((b)=>{
            if (b.bookmarks && b.bookmarks.length > 0){
                showSub[b.annotationId] = true;    
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
                            renderState.visibleItems.length > 0 &&
                            renderState.visibleItems.every(item =>
                                this.state.selection.includes(item.annotationId)
                            )
                        }
                        onChange={this.selectAllChange.bind(this, renderState.visibleItems)}/>

                    {this.title} {this.state.renders} :{' '}<span className="count">{renderState.visibleItems.length || 0}</span>

                    <div className="fold" onClick={this.unFoldAll}>Unfold all</div>
                    <div className="fold" onClick={this.foldAll}>Fold all</div>
                </h2>
                <div className="bookmark-table">
                    {renderState.visibleItems.map((annotation, index) => (
                        <AnnotationRow
                            key={annotation.annotationId}
                            annotation={annotation}
                            onDelete={this.deleteAnnotations}
                            onView={this.viewBookmark}
                            selected={this.state.selection.includes(annotation.annotationId)}
                            onSelect={this.selectItem}
                            showSub={annotation.annotationId in this.state.showSub}
                            toggleSub={this.toggleSub}
                            />
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
            <div className={classNames(IDUtil.cssClassName('annotation-table'),{loading:this.state.loading})}>
                <NestedTable
                    items={this.state.annotations}
                    selection={this.state.selection}
                    sortItems={this.sortAnnotations}
                    orders={this.orders}
                    filterItems={this.filterAnnotations}
                    filters={this.state.filters}
                    renderResults={this.renderResults}
                    onExport={this.exportAnnotations}
                    showSub={this.state.showSub}
                    />

                <BulkActions
                    bulkActions={this.bulkActions}
                    selection={this.state.selection}
                    />

                {detailsModal}
            </div>
        )
    }
}

AnnotationTable.propTypes = {
    api: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
    type: PropTypes.string,
    title: PropTypes.string,
    filters: PropTypes.array.isRequired,
};

AnnotationTable.defaultTypes = {
    filters: []
}

export default AnnotationTable;
