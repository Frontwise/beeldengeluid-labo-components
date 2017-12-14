import AnnotationAPI from '../../api/AnnotationAPI';
import AnnotationRow from './AnnotationRow';
import AnnotationStore from '../../flux/AnnotationStore';
import AnnotationUtil from '../../util/AnnotationUtil';
import BookmarkTable from './BookmarkTable';
import ComponentUtil from '../../util/ComponentUtil';
import IDUtil from '../../util/IDUtil';
import ItemDetailsModal from './ItemDetailsModal';
import ProjectAPI from '../../api/ProjectAPI';
import ProjectWrapper from './ProjectWrapper';
import { exportDataAsJSON } from '../helpers/Export';
import BulkActions from '../helpers/BulkActions';

class AnnotationView extends React.PureComponent {

  constructor(props) {
    super(props);
    
    this.annotationTypes = [
      {value: "classification", name: "Classification"},
      {value: "comment", name: "Comment"},
      {value: "link", name: "Link"},
      {value: "metadata", name: "Metadata"},
    ];

    this.orders = [
      {value:"created", name:"Annotation created"},
    ];

    this.bulkActions = [
      {title: 'Delete', onApply: this.deleteAnnotations.bind(this) },
      {title: 'Export', onApply: this.exportAnnotations.bind(this) }
    ];


    this.state = {
      annotations: [],  
      selection: [],    
      loading : true,
      detailBookmark: null,
      filters: []
    }

    // bind functions
    this.closeItemDetails = this.closeItemDetails.bind(this);
    this.deleteAnnotation = this.deleteAnnotation.bind(this);
    this.filterAnnotations = this.filterAnnotations.bind(this);
    this.renderResults = this.renderResults.bind(this);
    this.selectAllChange = this.selectAllChange.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.sortAnnotations = this.sortAnnotations.bind(this);
    this.viewBookmark = this.viewBookmark.bind(this);
  }

  componentWillMount() {
    this.loadAnnotations();
  }

  /**
   * Load Annotation from Store
   */
  loadAnnotations() {
    AnnotationStore.getUserProjectAnnotations(
      this.props.user,
      this.props.project,
      this.onLoadAnnotations.bind(this)
    )
  }


/**
   * Get filter list of existing annotation types
   * @param  {array} items List of annotations
   * @return {array}       List of filters
   */
  getFilters(items){
  let filters = [];
    // only add existing types to the filter
    this.annotationTypes.forEach((type)=>{
      if (items.some((annotation)=>(annotation.annotationType == type.value))){
        filters.push(type);
      }
    });
    return filters;
  }

  /**
   * Annotation load callback: set data to state
   * @param  {Object} data Response object with annotation list
   */
  onLoadAnnotations(data) {
    var annotations = AnnotationUtil.nestedAnnotationListToAnnotationList(
      data.annotations || []
    )

    // get unique bookmarks from annotations
    let uniqueBookmarks = Array.from(new Set(annotations.map((a)=>(a.bookmarkAnnotation))));

    // populate the unique bookmarks with object data
    AnnotationUtil.nestedAnnotationListToResourceList(
      uniqueBookmarks,
      (bookmarks)=>{
        // lookup table for bookmark id
        let lookup = {};
        bookmarks.forEach((b, index)=>{lookup[b.id] = index;})

        // populate annotations with bookmark data
        annotations = annotations.map((a)=>{
          a.bookmarks = [ bookmarks[ lookup[a.bookmarkAnnotation.id] ] ];
          return a;
        });

        // update state with populated annotations
        this.setState({
          annotations: annotations,
          loading : false,      
          filters: this.getFilters(annotations),
        });

        this.updateSelection(annotations);
      }
    )
   
  }
 

 /** 
   * Update Selection list, based on available items
   * @param  {array} items  Current data
   */
  updateSelection(items){
    this.setState({
      selection: items.map((item)=>(item.id)).filter((itemId)=>(this.state.selection.includes(itemId)))
    })
  }

  /**
   * Filter annotation list by given filter
   * @param  {array} annotations  Annotations array
   * @param  {object} filter    Filter object
   * @return {array}            Filtered annotations array
   */
  filterAnnotations(annotations, filter){
    
    // filter on keywords in title, dataset or type
    if (filter.keywords){
      let keywords = filter.keywords.split(" ");
      keywords.forEach((k)=>{
        k = k.toLowerCase();
        annotations = annotations.filter(
            (annotation)=>(
              annotation.text && annotation.text.toLowerCase().includes(k)
              || (annotation.vocabulary && annotation.vocabulary.toLowerCase().includes(k))
              || (annotation.label && annotation.label.toLowerCase().includes(k))
              || (annotation.template && annotation.template.toLowerCase().includes(k))

              // search the properties of a metadata annotation; both key/value fields
              || (annotation.properties && annotation.properties.some((property)=>( (property.key && property.key.toLowerCase().includes(k)) || (property.value && property.value.toLowerCase().includes(k)))) )
        ));
      });
    }

    // filter on type
    if (filter.type){
      annotations = annotations.filter((annotation)=>(annotation.annotationType.toLowerCase().includes(filter.type)));
    }

    return annotations;
  }

  /** 
   * Sort annotations 
   * @param {Array} annotations List of annotations to be sorted
   * @param {string} sort Sort field
   * @return {Array} Sorted annotations 
   */
  sortAnnotations(annotations, field){
   let sorted = annotations;
   switch(field){
    case 'created':
      sorted.sort((a,b) => (a.created > b.created));
    break;    
    default:
      // no sorting,just return
      return sorted;
   }

   return sorted;

  }


  /**
   * Delete annotation
   * @param {Object} annotation Annotation to be removed
   */
  deleteAnnotation(annotation){
    // always ask before deleting
    if (!confirm('Are you sure you want to remove this annotation?')){
      return;
    }

    // For saving annotations, store the whole bookmark with its annotations, 
    // without the item to be deleted

    // AnnotationAPI.saveAnnotation(annotation)

  

    // delete the bookmark
    // AnnotationAPI.deleteAnnotation(annotation, (data)=>{
    //   if (data && data.status){
    //     if (data.status == 'success'){
    //       this.loadBookmarks();
    //     } else{
    //       alert(data.message ? data.message : 'An unknown error has occured while deleting the annotation');
    //     } 
    //   } else{
    //     alert('An error has occured while deleting the annotation.');
    //   }
      
    // });
  } 

  /**
   * Delete annotations
   * @param {Object} annotation Annotation to be removed
   */
  deleteAnnotations(annotations){
    alert('Todo: Implement delete multiple');
  }

  /**
   * Export annotations
   * @param {Object} annotations Annotations to be exported
   */
  exportAnnotations(selection){
    let data = this.state.annotations.filter((item)=>(selection.includes(item.id)));
    exportDataAsJSON(data)
  }


  /**
   * View bookmark
   * @param {Object} bookmark Bookmark (object) to be viewed
   */
  viewBookmark(bookmark){
    this.setState({
      detailBookmark: bookmark
    })
  }

  /**
   * Close itemDetails view, and refresh the data (assuming changes have been made)
   */
  closeItemDetails(){
    // set viewbookmark to null
    this.viewBookmark(null);

    // refresh data
    this.loadAnnotations();
  }

  /**
   * Sort change
   * @param {string} sort Sort name
   */
  sortChange(e){
    this.setSort(e.target.value);
  }

  /**
   * Select all items
   * @param {array} items Items to be selected
   * @param {SyntheticEvent} e Event
   */
  selectAllChange(items, e){
    if (e.target.checked){
      let newSelection = this.state.selection.slice();
      items.forEach((item)=>{ if(!newSelection.includes(item.id)){ newSelection.push(item.id)}});
      // set
      this.setState({
        selection: newSelection
      });
    } else{
      items = items.map((item)=>(item.id))
      // unset
      this.setState({
        selection: this.state.selection.filter((item)=>(!items.includes(item)))
      });
    }

  }

  /**
   * Select bookmark
   */
  selectItem(item, select){
    
    if (select){

      if(!this.state.selection.includes(item.id)){
        // add to selection
        this.setState({
          selection: [...this.state.selection, item.id]
        });
      }
      return;
    }

    // remove from selection
    if (!select){
      this.setState({
        selection: this.state.selection.filter((selected)=>(selected!== item.id))
      });
    }
  }

  /**
   * Renders the results in the AnnotationTable component
   * @param {object} state State of the render component
   */
  renderResultType(type, items){

    // don't render empty results
    if (items.length == 0){
      return null;
    }

    return(
      <div className="type-list">
        <h3>
          <input type="checkbox" 
                 checked={items.length > 0 && items.every((item)=>(this.state.selection.includes(item.id))) }
                 onChange={this.selectAllChange.bind(this, items)}
                />
          {type}: <span className="count">{items.length || 0}</span>
        </h3>
        <div className="bookmark-table">          
            {items.map((annotation, index)=>(
            <AnnotationRow key={index} 
                         annotation={annotation} 
                         onDelete={this.deleteAnnotation}
                         onView={this.viewBookmark}
                         selected={this.state.selection.includes(annotation.id)}
                         onSelect={this.selectItem}                         
                         />
            ))}           
        </div> 
      </div>
    );
  }

  /**
   * Renders the results in the AnnotationTable component
   * @param {object} state State of the render component
   * @return {Element} View results
   */
  renderResults(renderState){
    return (
      <div>
        <h2>
          <input type="checkbox" 
                 checked={renderState.visibleItems.length > 0 && renderState.visibleItems.every((item)=>(this.state.selection.includes(item.id))) }
                 onChange={this.selectAllChange.bind(this, renderState.visibleItems)}
                />
          Annotations: <span className="count">{renderState.visibleItems.length || 0}</span>
        </h2>
        <div className="table">          
          {this.annotationTypes.map((type) => (
              this.renderResultType(type.name, renderState.visibleItems.filter((item)=>(item.annotationType == type.value )))
            )) }
        </div> 
      </div>
      );
  }

  render(){
    return (
      <div className={IDUtil.cssClassName('annotation-view')}>
        <BookmarkTable 
          items={this.state.annotations}
          sortItems={this.sortAnnotations}
          orders={this.orders}
          filterItems={this.filterAnnotations}
          filters={this.state.filters}          
          renderResults={this.renderResults}
          onExport={exportDataAsJSON}          
          />

        <BulkActions bulkActions={this.bulkActions} 
                     selection={this.state.selection} />

        {this.state.detailBookmark ? 
         <ItemDetailsModal object={this.state.detailBookmark.object}
                           onClose={this.closeItemDetails} />
        : null
      }
  </div>
  )
  }
}

export default AnnotationView;