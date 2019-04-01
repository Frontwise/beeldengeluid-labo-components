import PropTypes from 'prop-types';

import TimeUtil from '../../../util/TimeUtil';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';
import IDUtil from '../../../util/IDUtil';

import MediaObject from '../../../model/MediaObject';

//TODO now that the playlist is in this nice separate component, let's make it less like a pile of shit
//TODO implement shouldComponentUpdate. Now it's rendered every time update!
export default class PlayList extends React.PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			currentIndex : 0
		}
	}

	selectSegment = (mediaObject, segment, e) => {
		if(this.props.onSelect && typeof this.props.onSelect === 'function') {
			//before notifying the parent, make sure to add the start & end time, so the player will skip to the right time
			this.props.onSelect(mediaObject, segment);
		}
		this.setState({currentItem : e.target.id});
	}

	renderNumberOfMatches = (transcriptMatches, mediaObject) => {
		const numMatches = transcriptMatches && transcriptMatches[mediaObject.assetId] ? '# matches: ' + transcriptMatches[mediaObject.assetId] : null;
		return numMatches ? <span className={IDUtil.cssClassName('playlist-item-num-matches')}>{numMatches}</span> : null;
	};

	renderItems = (mediaObject, index) => {
		let segments = mediaObject.segments;
		if(!segments) {
			segments = [{
				programSegment : true,
				start : mediaObject.resourceStart ? mediaObject.resourceStart : 0,
				end : mediaObject.resourceEnd ? mediaObject.resourceEnd : -1 //-1 means the video will be played to the end
			}]
		}
		const segmentList = segments.map((s, i) => {
			const className = s.programSegment ? IDUtil.cssClassName('segment main') : IDUtil.cssClassName('segment');
			const timeInfo = !s.programSegment ? (
				<span className={IDUtil.cssClassName('segment-duration')}>{
					TimeUtil.formatTime(FlexPlayerUtil.timeRelativeToOnAir(s.start, mediaObject)) + ' - ' + TimeUtil.formatTime(FlexPlayerUtil.timeRelativeToOnAir(s.end, mediaObject))
				}</span>
			) : null;
			return (
				<div
					id={'__seg__' + index + '_' + i}
					className={className}
					onClick={this.selectSegment.bind(this, mediaObject, s)}
				>
					{timeInfo}&nbsp;
					<span className={IDUtil.cssClassName('segment-title')}>
						{s.title ? s.title : 'Carrier: ' + mediaObject.assetId}&nbsp;{
							s.programSegment ? this.renderNumberOfMatches(this.props.transcriptMatches, mediaObject) : null
						}
					</span>
				</div>
			)
		})

		return (
			<div className={IDUtil.cssClassName('playlist-item')} title={'Carrier ID: ' + mediaObject.assetId}>
				{segmentList}
			</div>
		)
	}

	renderRawItems = (mediaObjects) => {
		if(!mediaObjects) return null;

		const items = mediaObjects.filter(mo => mo.isRawContent).map(mediaObject => {
			return (
				<div className={IDUtil.cssClassName('playlist-item-raw')} title={'Carrier ID: ' + mediaObject.assetId}>
					Carrier ID:&nbsp;{mediaObject.assetId}&nbsp;{
						this.renderNumberOfMatches(this.props.transcriptMatches, mediaObject)
					}
				</div>
			)
		});

		if(items.length === 0) return null;

		return (
			<div className={IDUtil.cssClassName('playlist-items-raw')}>
				<label>Raw materials</label>
				{items}
			</div>
		)
	}

	render() {
		const items = this.props.mediaObjects ? this.props.mediaObjects.filter(mo => !mo.isRawContent).map(this.renderItems) : null;
		const rawItems =this.renderRawItems(this.props.mediaObjects)

		return (
			<div className={IDUtil.cssClassName('playlist')}>
				<div className={IDUtil.cssClassName('playlist-items')}>
					{items}
				</div>
				{rawItems}
			</div>
		)
	}
}

PlayList.propTypes = {

	mediaObjects: PropTypes.arrayOf(
		MediaObject.getPropTypes()
	).isRequired,

	transcriptMatches : PropTypes.object, //contains number of transcript matches (with the initial search term) per media object

	onSelect: PropTypes.func.isRequired,

}