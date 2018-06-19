import ProjectAPI from '../../../api/ProjectAPI';

import IDUtil from '../../../util/IDUtil';

import PropTypes from 'prop-types';

/**
 * A dropdown with actions, that can be applied on multiple items
 */

class BulkActions extends React.PureComponent {
  /**
   * Construct this component
   */

  constructor(props) {
    super(props);
  }


  /**
   * React render function
   *
   * @return {Element}
   */
  render() {
    // don't render if there are no items selected
    if (this.props.selection.length == 0){
      return null;
    }

    return (
      <div className={IDUtil.cssClassName('bulk-actions')}>
        <span>With {this.props.selection.length} selected:</span>

        
          
          {this.props.bulkActions.map((action, index) => (
            <div className="btn primary" key={index} onClick={()=>{ action.onApply(this.props.selection); }}>
              {action.title}
            </div>
          ))}        
        
      </div>
    );
  }
}

BulkActions.propTypes = {
  bulkActions: PropTypes.object.isRequired,
  selection: PropTypes.array.isRequired
};

export default BulkActions;
