import MetadataTable from './MetadataTable';
import MetadataTablePreview from './MetadataTablePreview';
import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';

//FIXME remove the paging buttons from this component and check out the weird preview option
class ItemDetails extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
		    selected: this.props.initialSelected
		};
	}

	moveQuickViewResource(moveNext) {
		if(this.props.moveQuickViewResource && typeof this.props.moveQuickViewResource === 'function') {
			this.props.moveQuickViewResource(moveNext);
		}
	}

	//FIXME there is a bug that you have to click twice on the checkbox for it to work
	gotoBookmark() {
	    var selected = !this.state.selected;
	    if(this.props.onSelected && typeof this.props.onSelected === 'function') {
        	this.props.onSelected(this.props.data.resourceId, selected)
        }
	    this.setState({selected: selected});
	}

	//only render when coming from the single search recipe (checking this.props.param.bodyClass == noHeader)
    renderResultListPagingButtons() {
     	let isFirstResource = false; //TODO fill these variables
     	let isLastHit = false; //TODO fill these variables

        return (
    		<div className="navigation-bar">
	            <div className="checkbox">
					<label>
						<input type="checkbox" checked={this.props.selected} onChange={this.gotoBookmark.bind(this)}/>
						&nbsp;Select item
					</label>
				</div>
	            <button className="btn btn-primary"	disabled={isFirstResource} onClick={this.moveQuickViewResource.bind(this, false)}>
	                <i className="glyphicon glyphicon-step-backward" aria-hidden="true"/> Previous resource
				</button>
				<button className="btn btn-primary" disabled={isLastHit} onClick={this.moveQuickViewResource.bind(this, true)}>
	                Next resource <i className="glyphicon glyphicon-step-forward" aria-hidden="true"/>
	            </button>
        	</div>
        )
    }

	render() {
		//draw the block with different media objects
		let mediaBlock = null;
		if(this.props.data['playableContent']) {
			//TODO cluster all of the media players, so it's possible to draw them in a separate panel for each media type
			const mediaItems = this.props.data['playableContent'].map((mediaItem, index) => {
				let mediaPlayer = 'Unknown Media Object: ' + index;

				/*
				* Draw a media player based on the mimetype of each item
				* TODO put each player in a separate React component
				*/
				if(mediaItem.mimeType.indexOf('image') !== -1) {//image player
					mediaPlayer = (
						<a href={mediaItem.url}
							target="__external">
							<img src={mediaItem.url}/>
						</a>
					)
				} else if(mediaItem.mimeType.indexOf('audio') != null) {//audio player
					mediaPlayer = (
						<audio controls>
							<source src={mediaItem.url} type={mediaItem.mimeType}/>
							Your browser does not support the audio element
						</audio>
					)
				} else if(mediaItem.mimeType.indexOf('video') !== -1) {//video player
					mediaPlayer = (
						<video width="320" height="240" controls>
							<source src={mediaItem.url} type={mediaItem.mimeType}/>
							Your browser does not support the video element
						</video>
					)
				}

				return (
					<div key={'media__' + index} className="media-player">
						{mediaPlayer}
					</div>
				);
			});

			//only show the first 5 media items for now
			mediaBlock = (
				<div>
					<h4>Media</h4>
					{mediaItems.slice(0, 5)}
				</div>
			);
		}
		if(this.props.previewMode) {
			return (
	            <div className={IDUtil.cssClassName('item-details')}>
	                <div className="col-md-12">
	                	{this.renderResultListPagingButtons()}
	                </div>
	                <h4>Metadata</h4>
	                <MetadataTablePreview data={this.props.data}/>
	            </div>
          	)
		}
		return (
			<div className={IDUtil.cssClassName('item-details')}>
				<h4>Metadata</h4>
				<MetadataTable data={this.props.data}/>
				{mediaBlock}
			</div>
		)
	}
}

export default ItemDetails;
