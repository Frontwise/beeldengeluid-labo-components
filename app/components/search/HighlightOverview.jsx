import IDUtil from '../../util/IDUtil';
import PropTypes from 'prop-types';

class HighlightOverview extends React.Component {

    constructor(props) {
		super(props);
	}

	createMarkup(text) {
		return {__html: text};
    }

    renderHighlightTable = data => {
    	if(!(data && typeof data === 'object' && Object.keys(data).length > 0)) {
    		return null;
    	}

		const rows = Object.keys(data).map((fieldName) => {
        	return data[fieldName].map(highlight => {
        		return (
        			<tr>
						<td><label>{fieldName}</label></td>
						<td><span dangerouslySetInnerHTML={this.createMarkup(highlight)}></span></td>
					</tr>
				)
        	})
        }).reduce((acc, cur) => acc.concat(cur))

        if(rows.length > 0){
     	   return (<table><tbody>{rows}</tbody></table>);
		}
		return null;
    };

	render() {
		const table = this.renderHighlightTable(this.props.data);
		const headerText = this.props.collectionConfig.getMatchingTermsMsg(table ? 1 : 0, false);

	    return (
			<div className={IDUtil.cssClassName('highlight-overview')}>
				<h4>{headerText}</h4>
				{table}
			</div>
        );
	}
}

HighlightOverview.PropTypes = {
	data : PropTypes.object.isRequired, //An object where key = field name & value = array of strings (representing snippets with highlighted text)
	collectionConfig : PropTypes.object //A collection config object (see CollectionConfig.jsx)
}

export default HighlightOverview;