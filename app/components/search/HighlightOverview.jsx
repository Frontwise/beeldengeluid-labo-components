import IDUtil from '../../util/IDUtil';

class HighlightOverview extends React.Component {

    constructor(props) {
		super(props);
	}

	createMarkup(text) {
		return {__html: text};
    }

	render() {
		let table = null;
	    if(this.props.data && typeof this.props.data === 'object' && Object.keys(this.props.data).length > 0) {
    		const rows = Object.keys(this.props.data).map((key) => {
            	return this.props.data[key].map(highlight => {
            		return (
            			<tr>
							<td><label>{key}</label></td>
							<td><span dangerouslySetInnerHTML={this.createMarkup(highlight)}></span></td>
						</tr>
					)
            	})
            }).reduce((acc, cur) => acc.concat(cur))


            if(rows.length > 0){
	     	   table = (<table><tbody>{rows}</tbody></table>)
			}
		}

		//determine the header text
		const headerText = this.props.collectionConfig.getMatchingTermsMsg(table ? 1 : 0, false);

	    return (
			<div className={IDUtil.cssClassName('highlight-overview')}>
				<h4>{headerText}</h4>
				{table}
			</div>
        );
	}
}

export default HighlightOverview;
