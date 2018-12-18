import MetadataTable from './MetadataTable';
import MetadataTablePreview from './MetadataTablePreview';
import IDUtil from '../../util/IDUtil';

class ItemDetails extends React.Component {

	constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'itd';
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
