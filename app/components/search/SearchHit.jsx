import FlexRouter from '../../util/FlexRouter';
import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import SearchSnippet from './SearchSnippet';
import ItemDetails from './ItemDetails';
import FlexModal from '../FlexModal';

class SearchHit extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showModal : false,
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

	quickView(e) {
		e.stopPropagation();
		this.setState({showModal: true, previewMode: true});
	}

	safeModalId(resourceId) {
		return resourceId.substr(0, resourceId.indexOf('@')) || resourceId + '__modal';
	}

	select(e) {
		e.stopPropagation();
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, {
				resourceId : this.props.result._id,
				selected : !this.props.isSelected
			})
		}
	}

	render() {
		const result = this.props.collectionConfig.getItemDetailData(this.props.result, this.props.dateField);
		const selectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
        const visitedItems = ComponentUtil.getJSONFromLocalStorage('visitedHits');
		//TODO get rid of this separate piece of data
		const snippet = this.props.collectionConfig.getResultSnippetData(result);
		const modalID = this.safeModalId(result.resourceId);
		let modal = null;

		if(this.state.showModal && this.state.previewMode) {
			modal = (
				<FlexModal
					elementId={modalID}
					stateVariable="showModal"
					key={modalID}
					owner={this}
					size="large"
					title={result.title}>
					<ItemDetails data={result} previewMode={this.state.previewMode}/>
				</FlexModal>
			)
		}

        let selectedCheckbox = false;
        if(selectedRows !== null) {
            selectedCheckbox = this.props.result._id in selectedRows;
        } else {
            selectedCheckbox = false;
        }
		//draw the checkbox using the props.isSelected to determine whether it is selected or not
		const checkBox = (
			<div  className={IDUtil.cssClassName('select', this.CLASS_PREFIX)} >
				<input
					type="checkbox"
                    onChange={this.select.bind(this)}
                    checked={this.props.isSelected}
					id={'cb__' + modalID}
                    key={modalID + '__"' + selectedCheckbox + '"'}
				/>
				<label htmlFor={'cb__' + modalID}><span/></label>
			</div>
		);

		const classNames = [IDUtil.cssClassName('search-hit')];
		if(snippet.type === 'media_fragment') {
			classNames.push('fragment')
		}
        const visitedLink = (visitedItems && visitedItems.find(item => item === this.props.result._id))
            ? 'visitedItem' : '';

		return (
            <div className={classNames.join(' ')}>
                {checkBox}
                <div className={IDUtil.cssClassName('quickview', this.CLASS_PREFIX)}>
                    <button className="btn btn-default fa fa-file-text"
                            onClick={this.quickView.bind(this)} title="Quick view">
                    </button>
                </div>
                <div onClick={this.gotoItemDetails.bind(this, result)}>
                    <div className={visitedLink} onClick={this.gotoItemDetails.bind(this, result)}>
                        <SearchSnippet
                            data={snippet}
                            collectionMediaTypes={this.props.collectionConfig.getCollectionMediaTypes()}
                            searchTerm={this.props.searchTerm}
                        />
                    </div>
                    {modal}
                </div>
            </div>
		);
	}
}

export default SearchHit;
