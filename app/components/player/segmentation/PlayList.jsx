import PropTypes from 'prop-types';

import TimeUtil from '../../../util/TimeUtil';
import IDUtil from '../../../util/IDUtil';

import MediaObject from '../../../model/MediaObject';

//TODO now that the playlist is in this nice separate component, let's make it less like a pile of shit
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

	renderItems = (mediaObject, index) => {
		let segments = mediaObject.segments;
		if(!segments) {
			segments = [{
				start : mediaObject.resourceStart ? mediaObject.resourceStart : 0,
				end : mediaObject.resourceEnd ? mediaObject.resourceEnd : -1 //-1 means the video will be played to the end
			}]
		}
		const segmentList = segments.map((s, i) => {
			const className = s.programSegment ? 'segment main' : 'segment';
			return (
				<div
					id={'__seg__' + index + '_' + i}
					className={className}
					onClick={this.selectSegment.bind(this, mediaObject, s)}
				>
					<label>{s.title ? s.title : 'Carrier: ' + mediaObject.assetId}</label>
					&nbsp;{TimeUtil.formatTime(s.start) + ' - ' + TimeUtil.formatTime(s.end)}
				</div>
			)
		})

		return (
			<div className="item" title={'Carrier ID: ' + mediaObject.assetId}>
				{segmentList}
			</div>
		)
	}

	renderRawItems = (mediaObjects) => {
		if(!mediaObjects) return null;

		const items = mediaObjects.filter(mo => mo.isRawContent).map(mediaObject => {
			return (
				<div className="raw-item" title={'Carrier ID: ' + mediaObject.assetId}>
					Carrier ID:&nbsp;{mediaObject.assetId}
				</div>
			)
		});

		if(items.length === 0) return null;

		return (
			<div className="raw-items">
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
				<div className="items">
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
	).isRequired

}