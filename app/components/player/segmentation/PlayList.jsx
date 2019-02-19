import PropTypes from 'prop-types';

import IDUtil from '../../../util/IDUtil';

//TODO now that the playlist is in this nice separate component, let's make it less like a pile of shit
export default class PlayList extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			currentIndex : 0
		}
	}

	selectItem = (index) => {
		if(this.props.onSelect && typeof this.props.onSelect === 'function') {
			this.props.onSelect(this.props.mediaObjects[index]);
		}
		this.setState({currentItem : index});
	}

	renderItems = (item, index) => {
		return (
			<div className="item" onClick={this.selectItem.bind(this, index)} title={'Carrier ID: ' + item.assetId}>
				{'Track ' + (index+1)}
			</div>
		)
	}

	render() {
		const items = this.props.mediaObjects ? this.props.mediaObjects.map(this.renderItems) : null;

		return (
			<div className={IDUtil.cssClassName('playlist')}>
				{items}
			</div>
		)
	}
}

PlayList.propTypes = {

	mediaObjects: PropTypes.arrayOf(
		PropTypes.shape({
	    	url: PropTypes.string.isRequired,
	    	mimeType: PropTypes.string.isRequired,
	    	assetId: PropTypes.string.isRequired, //this should be a persistent ID
	    	contentId: PropTypes.string, //encoded asset ID for the content proxy
	    	contentServerId: PropTypes.string, //ID for the content proxy to decide which server to proxy
	    	resourceStart: PropTypes.number, //start (sec) of on-air content or related segment
	    	resourceEnd: PropTypes.number //end (sec) of on-air content or related segment
		})
	).isRequired

}