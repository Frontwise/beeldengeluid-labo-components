import PropTypes from "prop-types";

class CopyToClipboard extends React.Component {
    constructor(props) {
        super(props);
        this.randomId = 'bg__saveToClipboard-' + Math.floor(Math.random() * 10000);
    }
    copyToClipboard() {
        const textField = document.createElement('textarea');
        textField.innerHTML = this.props.textToSave;

        const parentElement = document.getElementById(this.randomId);
        parentElement.appendChild(textField);

        textField.select();
        document.execCommand('copy');

        parentElement.removeChild(textField);
    }

    render() {
        return (
            <button id={this.randomId} type="button" title={this.props.textToSave} onClick={this.copyToClipboard.bind(this)} className="btn btn-primary bg__copy-to-clipboard">
                <i className="fa fa-info-query"/>
            </button>
        )
    }
}

CopyToClipboard.propTypes = {
    textToSave: PropTypes.string.isRequired
};

export default CopyToClipboard;
