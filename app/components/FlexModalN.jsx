import IDUtil from '../util/IDUtil';

import classNames from 'classnames';
import PropTypes from 'prop-types';

/**
* Non-bootstrap modal using frontwise styling
*/
class FlexModalN extends React.PureComponent {

    render() {
        return (
            <div className="modal">
                <div className="container">
                    <div className="close" onClick={this.props.onClose}>
                        Close
                    </div>
                    {this.props.children}
                </div>
            </div>
        )
    }
}

FlexModalN.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default FlexModalN;
