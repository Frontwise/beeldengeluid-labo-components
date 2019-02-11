import IDUtil from '../../util/IDUtil';

class HighlightOverview extends React.Component {

    constructor(props) {
		super(props);
	}

	createMarkup(text) {
		return {__html: text};
    }

	render() {
	    let table = (<p>No highlights in metadata</p>);
	    if(this.props.data) {
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

	    return (
			<div className={IDUtil.cssClassName('highlight-overview')}>
				<h4>Highlighted term(s) in metadata</h4>
				{table}
			</div>
        );
	}
}

export default HighlightOverview;
