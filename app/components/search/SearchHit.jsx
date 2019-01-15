import FlexRouter from '../../util/FlexRouter';
import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import SearchSnippet from './SearchSnippet';
import ItemDetails from './ItemDetails';
import ReactTooltip from 'react-tooltip';
import CollectionUtil from '../../util/CollectionUtil';

class SearchHit extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			previewMode : false
		};
		this.CLASS_PREFIX = 'sh';
	}

	//BIG TODO: there must be an overarching persistent ID system to load individual records
	//eventually this should simply handle persistent (media fragment) URIs, instead of these silly params

	//this function works with search snippet data (consulted the related config.getResultSnippetData())
	gotoItemDetails(result, e) {
		if(this.props.itemDetailsPath && result.resourceId) {
            ComponentUtil.pushItemToLocalStorage('visitedHits', result.resourceId);
            FlexRouter.gotoItemDetails(this.props.itemDetailsPath, result, this.props.searchTerm);
		} else {
			this.setState({showModal: true})
		}
	}

	safeModalId() {
		return this.CLASS_PREFIX + Math.floor((Math.random()*10000) + 1) + '__modal';
	}

	select(e) {
		e.stopPropagation();
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, {
				resourceId : this.props.result._id,
				resource : this.props.result,
				selected : !this.props.isSelected,
				collectionConfig : this.props.collectionConfig
			})
		}
	}

    renderToolTipContent() {
    	if(!this.props.bookmark) {
    		return null;
    	}
    	let html = ''
    	if (this.props.bookmark.groups && this.props.bookmark.groups.length > 0) {
    		html += '<h5><u>Bookmark group(s)</u>:</h5><ul>';
    		html += this.props.bookmark.groups.map(
         	   group => group.label ? "<li>" + group.label + "</li>" : ''
        	).join('')
        	html += '</ul>';
    	}
    	let bodyCount = 0;    	
    	if(this.props.bookmark.annotations) {
    		bodyCount += this.props.bookmark.annotations.length
    		
    	}
    	if(this.props.bookmark.segments) {
    		this.props.bookmark.segments.forEach(segment => bodyCount += segment.annotations ? segment.annotations.length : 0)    		
    	}
    	html += '<h5><u>Number of annotations</u>: '+bodyCount+'</h5>';
        return html;
    }

    onQuickView(){
        if(this.props.onQuickView){
            this.props.onQuickView(this.props.resultDetailData, this.props.highlightData);
        }
    }

	render() {
		const result = this.props.resultDetailData;
		const snippet = this.props.collectionConfig.getResultSnippetData(result);
		snippet['highlights'] = this.props.highlightData[0];
		const collectionMediaTypes = this.props.collectionConfig.getCollectionMediaTypes();
		const selectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
        const visitedItems = ComponentUtil.getJSONFromLocalStorage('visitedHits');
		const modalID = this.safeModalId(result.resourceId);
		//let modal = null;
		let bookmarkIcon = null;

		//draw the checkbox using the props.isSelected to determine whether it is selected or not
		const checkBox = (
			<div  className={IDUtil.cssClassName('select', this.CLASS_PREFIX)} >
				<input
					type="checkbox"
                    onChange={this.select.bind(this)}
                    checked={this.props.isSelected}
					id={'cb__' + modalID}
                    key={modalID}
				/>
				<label htmlFor={'cb__' + modalID}><span/></label>
			</div>
		);

		//draw an icon with tooltip if this item was bookmarked
		if(this.props.bookmark) {
			bookmarkIcon = (
	            <div data-for={'__qb__tt' +this.props.bookmark.id} data-tip={this.renderToolTipContent(this)}
	                 data-html={true} className={IDUtil.cssClassName('bookmarked', this.CLASS_PREFIX)}>
	                <i className="fa fa-bookmark"/>
	                <ReactTooltip id={'__qb__tt' + this.props.bookmark.id}/>
	            </div>
	        )
		} else {
			bookmarkIcon = (
            	<div style={{opacity: '0'}} className={IDUtil.cssClassName('bookmarked', this.CLASS_PREFIX)}>
					<i className="fa fa-bookmark"/>
				</div>
        	)
		}

		const classNames = [IDUtil.cssClassName('search-hit')];
		if(snippet.type === 'media_fragment') {
			classNames.push('fragment')
		}
		if(visitedItems && visitedItems.find(item => item === this.props.result._id)) {
            classNames.push('visitedItem')
		}

		return (
			<div className={classNames.join(' ')}>
				{checkBox}
                <div className={IDUtil.cssClassName('quickview', this.CLASS_PREFIX)}>
					<button className="btn btn-default fa fa-file-text"
						onClick={this.onQuickView.bind(this)} title="Quick view">
					</button>
				</div>
                {bookmarkIcon}
                <div onClick={this.gotoItemDetails.bind(this, result)}>
					<SearchSnippet
						data={snippet}
						collectionMediaTypes={collectionMediaTypes}
						searchTerm={this.props.searchTerm}
					/>
				</div>
			</div>
		);
	}
}

export default SearchHit;
