import PropTypes from 'prop-types';
import IDUtil from '../util/IDUtil';

//TODO the header sucks a bit, make it better
class FlexBox extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			visible: props.isVisible !== undefined ? props.isVisible : true
		};
	}

	toggle() {
		this.setState({
			visible: !this.state.visible
		});
	}

	render() {
        const header = (
			<div className={this.state.visible ? 'box-toggle open' : 'box-toggle closed'} onClick={this.toggle.bind(this)}>
				<label>{this.props.title}&nbsp;</label>
			</div>
		);

		return (
			<div className={IDUtil.cssClassName('flex-box')}>
				{header}
				<div style={{display : this.state.visible ? 'block' : 'none'}}>
					{this.props.children}
				</div>
			</div>
		)
	}
}

FlexBox.propTypes = {
	title : PropTypes.string,
	isVisible : PropTypes.bool
}

export default FlexBox;
