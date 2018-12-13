import PropTypes from "prop-types";

class CopyToClipboard extends React.Component {
    constructor(props) {
        super(props);
        this.test = this.props.textToSave;

    }
    copyToClipboard() {
        const textField = document.createElement('textarea');
        textField.innerHTML = this.props.textToSave;

        // Step3: find an id element within the body to append your myFluffyTextarea there temporarily
        const parentElement = document.getElementById('__ci_tooltip');
        parentElement.appendChild(textField);

        // Step 4: Simulate selection of your text from myFluffyTextarea programmatically
        textField.select();

        // Step 5: simulate copy command (ctrl+c)
        // now your string with newlines should be copied to your clipboard
        document.execCommand('copy');

        // Step 6: Now you can get rid of your fluffy textarea element
        parentElement.removeChild(textField);
    }

    render() {
        return (
            <button type="button" title={this.props.textToSave} onClick={this.copyToClipboard.bind(this)} className="btn btn-primary bg__copy-to-clipboard">
                <i className="fa fa-info-query"/>
            </button>
        )
    }
}

CopyToClipboard.propTypes = {
    textToSave: PropTypes.string.isRequired
};

export default CopyToClipboard;
