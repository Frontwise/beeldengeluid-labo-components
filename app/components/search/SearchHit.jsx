import PropTypes from 'prop-types';

import FlexRouter from '../../util/FlexRouter';
import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import SearchSnippet from './SearchSnippet';
import ReactTooltip from 'react-tooltip';

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
	gotoItemDetails() {
		if(this.props.itemDetailsPath && this.props.data.formattedData.resourceId) {
            ComponentUtil.pushItemToLocalStorage('visitedHits', this.props.data.formattedData.resourceId);
            FlexRouter.gotoItemDetails(this.props.itemDetailsPath, this.props.data.formattedData, this.props.data.searchTerm);
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
				resourceId : this.props.data.formattedData.resourceId,
				resource : this.props.data.rawData,
				selected : !this.props.isSelected
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

    onQuickView() {
        if(this.props.onQuickView) {
            this.props.onQuickView(this.props.data, false, false);//FIXME the booleans for first & last quickview hit should be calculated!
        }
    }

	render() {
		//FIXME make sure that this snippet already contains the hightlight data!
		const snippet = this.props.data.collectionConfig.getResultSnippetData(this.props.data.formattedData);

		//assign the highlight data to the snippet for the SearchSnippet component
		snippet['numHighlights'] = this.props.data.numHighlights;

		const collectionMediaTypes = this.props.data.collectionConfig.getCollectionMediaTypes();
		const selectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
        const visitedItems = ComponentUtil.getJSONFromLocalStorage('visitedHits');
		const modalID = this.safeModalId(this.props.data.formattedData.resourceId);
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
		if(visitedItems && visitedItems.find(item => item === this.props.data.formattedData.resourceId)) {
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
                <div onClick={this.gotoItemDetails.bind(this)}>
					<SearchSnippet
						data={snippet}
						collectionMediaTypes={collectionMediaTypes}
						searchTerm={this.props.data.searchTerm}
					/>
				</div>
			</div>
		);
	}
}

SearchHit.PropTypes = {
	//this data is loaded via ComponentUtil.convertRawSearchResult and eventually passed to this component
	data: PropTypes.shape({
	    rawData: PropTypes.object.isRequired,
	    formattedData: PropTypes.object.isRequired,
	    searchTerm: PropTypes.string.isRequired,
	    dateField: PropTypes.string.isRequired,
	    highlights: PropTypes.object.isRequired,
	    numHighlights: PropTypes.number.isRequired,
	    collectionConfig: PropTypes.object.isRequired
	}).isRequired,

	itemDetailsPath : PropTypes.string.isRequired, //which page should the user be directed after clicking this search hit

	bookmark : PropTypes.object, //the bookmark object, containing all information for drawing the bookmark icon & icon tooltip

	isSelected : PropTypes.bool, //whether this hit is selected or not

	onQuickView : PropTypes.func, //what to do when the user clicks the clickview item

	onOutput: PropTypes.func //outputs data to the owner after the user selectes or deselects

}

export default SearchHit;
