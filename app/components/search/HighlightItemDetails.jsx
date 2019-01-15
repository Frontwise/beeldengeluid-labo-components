import IDUtil from '../../util/IDUtil';

class HighlightItemDetails extends React.Component {

    constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'hitd';
	}

	createMarkup(text) {
      return {__html: text};
    }

	render() {
	    var table = (<p>No highlights</p>);
	    var rows = [];
	    if(this.props.data){
            for (var field in this.props.data) {
                for (var i = 0; i < this.props.data[field].length; i++){
                  rows.push(
                      <tr>
                        <td><label>{field}</label></td>
                        <td><span dangerouslySetInnerHTML={this.createMarkup(this.props.data[field][i])}></span></td>
                      </tr>
                  );
                }
            }
	    }
	    if(rows.length > 0){
	        table = (<table className={IDUtil.cssClassName('metadata-table')}><tbody>{rows}</tbody></table>)
	    }

	    return (
				<div className={IDUtil.cssClassName('item-details')}>
					<h4>Highlighted term(s)</h4>
					{table}
				</div>
        );
	}
}

export default HighlightItemDetails;
