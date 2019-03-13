import IDUtil from '../../util/IDUtil';

import MetadataTablePreview from './MetadataTablePreview';
import HighlightOverview from './HighlightOverview';

//TODO probably also merge the MetadataTablePreview (or merge the MetadataTablePreview and the MetadataTable)
//TODO probably also move the paging functions to this component
class QuickViewer extends React.Component {

	constructor(props) {
		super(props);
	}

	moveQuickViewResource(moveNext) {
		if(this.props.moveQuickViewResource && typeof this.props.moveQuickViewResource === 'function') {
			this.props.moveQuickViewResource(moveNext);
		}
	}

	selectItem = () => {
	    if(this.props.onSelected && typeof this.props.onSelected === 'function') {
        	this.props.onSelected(this.props.data.formattedData.resourceId, !this.props.selected)
        }
	}

    renderResultListPagingButtons = () => {
        return (
    		<div className="navigation-bar">
	            <div className="checkbox">
					<label>
						<input type="checkbox" checked={this.props.selected} onChange={this.selectItem}/>
						&nbsp;Select item
					</label>
				</div>
	            <button className="btn btn-primary"	disabled={this.props.isFirstResource} onClick={this.moveQuickViewResource.bind(this, false)}>
	                <i className="glyphicon glyphicon-step-backward" aria-hidden="true"/> Previous resource
				</button>
				<button className="btn btn-primary" disabled={this.props.isLastResource} onClick={this.moveQuickViewResource.bind(this, true)}>
	                Next resource <i className="glyphicon glyphicon-step-forward" aria-hidden="true"/>
	            </button>
        	</div>
        )
    }

	render() {
		return (
            <div className={IDUtil.cssClassName('quick-viewer')}>
                <div className="col-md-12">
                	{this.renderResultListPagingButtons()}
                </div>
                <h4>Metadata</h4>
                <MetadataTablePreview data={this.props.data.formattedData}/>
                <HighlightOverview collectionConfig={this.props.data.collectionConfig} data={this.props.data.highlights}/>
            </div>
      	)
	}
}

export default QuickViewer;
