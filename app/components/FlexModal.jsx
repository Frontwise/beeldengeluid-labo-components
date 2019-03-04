import ComponentUtil from '../util/ComponentUtil';
import IDUtil from '../util/IDUtil';

class FlexModal extends React.Component {

	constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'fm';
	}

	handleKey = event => {
	    if(event.keyCode === 27) {
	        this.close(true);
	    }

        if(this.props.onKeyPressed){
            this.props.onKeyPressed(event.keyCode);
        }
	}

	componentDidMount() {
		const instance = $('#' + this.props.elementId).modal({
			keyboard : true,
			backdrop : true,
			show : true
		})
		.on('hidden.bs.modal', this.close.bind(this, false))
		document.addEventListener("keydown", this.handleKey, false);
	}

	componentWillUnmount(){
	    document.removeEventListener("keydown", this.handleKey, false);
	}

	close(manualCloseRequired, e) {
		if(e) {
			e.stopPropagation();
		}
		if(this.props.owner) {
			//let the owner hide the modal
			ComponentUtil.hideModal(this.props.owner, this.props.stateVariable, this.props.elementId, manualCloseRequired);
		} else if(manualCloseRequired) { //otherwise hide it here
			$('#' + this.props.elementId).modal('hide');
		}
	}

	render() {
		const classNames = ['modal-dialog'];
		if(this.props.size == 'large') {
			classNames.push('modal-lg');
		} else if(this.props.size == 'small') {
			classNames.push('modal-sm');
		} else { // the default is a custom class, which is actually only used in combination with float 'right'
			classNames.push(IDUtil.cssClassName('custom', this.CLASS_PREFIX));
		}

		return (
			<div id={this.props.elementId} className={['modal', 'fade', IDUtil.cssClassName('flex-modal')].join(' ')}>
				<div className={classNames.join(' ')} style={{'float' : this.props.float ? this.props.float : 'none'}}>
					<div className="modal-content">
						<div className="modal-header">
							<button type="button" className="close" onClick={this.close.bind(this, true)}>x</button>
							<h4 className="modal-title">{this.props.title}</h4>
						</div>
						<div className="modal-body">
							{this.props.children}
						</div>
					</div>
				</div>
			</div>
		)
	}
}

export default FlexModal;
