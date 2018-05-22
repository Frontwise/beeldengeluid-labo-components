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
    this.state = {
      bulkAction: null
    };
  }

  /**
   * Set bulk action
   *
   * @param  {SyntheticEvent} e    Event
   */
  setBulkAction(e) {
    this.setState({ bulkAction: this.bulkActionSelect.value });
  }

  /**
   * Apply bulk action
   *
   * @param  {SyntheticEvent} e    Event
   */
  applyCurrentBulkAction(e) {
    this.state.bulkAction;
    this.props.bulkActions.every(action => {
      if (action.title == this.state.bulkAction) {
        action.onApply(this.props.selection);
        // stop
        return false;
      }
      // continue
      return true;
    });
  }

  /**
   * React render function
   *
   * @return {Element}
   */
  render() {
    return (
      <div className={IDUtil.cssClassName('bulk-actions')}>
        <span>With {this.props.selection.length} selected:</span>

        <select
          value={this.state.bulkAction}
          onChange={this.setBulkAction.bind(this)}
          ref={c => {
            this.bulkActionSelect = c;
          }}
        >
          <option key="empty" value="" />
          {this.props.bulkActions.map((action, index) => (
            <option key={index} value={action.title}>
              {action.title}
            </option>
          ))}
        </select>

        {this.state.bulkAction && this.props.selection.length ? (
          <div
            onClick={this.applyCurrentBulkAction.bind(this)}
            className="btn primary"
          >
            Apply
          </div>
        ) : null}
      </div>
    );
  }
}

BulkActions.propTypes = {
  bulkActions: PropTypes.object.isRequired,
  selection: PropTypes.array.isRequired
};

export default BulkActions;
