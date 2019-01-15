import MetadataTable from './MetadataTable';
import MetadataTablePreview from './MetadataTablePreview';
import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';

class ItemDetails extends React.Component {

	constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'itd';

		this.state = {
		    selected: this.props.initialSelected
		};
	}

	gotoItemDetails(resource){
	    this.props.onSwitchQuickViewResult(resource, this.props.highlightData);
	}

	gotoBookmark(resource){
	    var selected = !this.state.selected;
        this.props.onSelected(resource.resourceId, selected)
	    this.setState({selected: selected});
	}

	//only render when coming from the single search recipe (checking this.props.param.bodyClass == noHeader)
    renderResultListPagingButtons() {
        const userLastQuery = ComponentUtil.getJSONFromLocalStorage('user-last-query');
    	const searchResults = ComponentUtil.getJSONFromLocalStorage('resultsDetailsData');
    	const selectedRows = ComponentUtil.getJSONFromLocalStorage('selectedRows');
    	const queryOutput = ComponentUtil.getJSONFromLocalStorage('currentQueryOutput');

    	if(!userLastQuery || !searchResults || !queryOutput) {
    		return null;
    	}

        const currentIndex = searchResults.findIndex(elem => elem.resourceId === this.props.data.resourceId);

    	// Search for resourceId in current page (resultSet), if not available it continues in bookmarked items.
    	const prevResource = currentIndex > 0 ? searchResults[currentIndex-1] : false;
        const nextResource = (searchResults.length - 1) > currentIndex ?
        	searchResults[currentIndex+1] : false;

		const isFirstResource = (currentIndex === 0);

        let isLastHit = (currentIndex === searchResults.length-1)

        const previousResourceBtn = (
            <button className="btn btn-primary" disabled={isFirstResource}
                    onClick={this.gotoItemDetails.bind(this, prevResource)}>
                <i className="glyphicon glyphicon-step-backward" aria-hidden="true"/> Previous resource
            </button>
        );
        const nextResourceBtn = (
            <button className="btn btn-primary" disabled={isLastHit}
                    onClick={this.gotoItemDetails.bind(this, nextResource)}>
                Next resource <i className="glyphicon glyphicon-step-forward" aria-hidden="true"/>
            </button>
        );
        const bookmarkBtn = (
            <input type="checkbox"
                className="btn btn-primary"
                checked={this.props.selected}
                onChange={this.gotoBookmark.bind(this, searchResults[currentIndex])}
                label="Control the bookmark groups this resource is associated with">
            </input>
		);

        return (
        	<span width="100%">{previousResourceBtn}&nbsp;{bookmarkBtn} Select result&nbsp;{nextResourceBtn}</span>
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
					//deze zou video moeten hebben:
					//https://easy.dans.knaw.nl/oai/?verb=GetRecord&identifier=oai:easy.dans.knaw.nl:easy-dataset:60508&uniqueMetadataPrefix=oai_dc
					//in ES: nederlandse-oud-gevangenen-van-kamp-buchenwald
				}

				return (
					<div key={'media__' + index} className={IDUtil.cssClassName('media-player', this.CLASS_PREFIX)}>
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
                        <div className="col-md-12">{this.renderResultListPagingButtons()}</div><br></br>
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
