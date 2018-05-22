import IDUtil from '../../../util/IDUtil';

import PropTypes from 'prop-types';

/**
 * Pagination element that shows page numbers around the current page
 * and Previous and Next buttons
 *
 * This component was forked from DIVE+
 */

class Pagination extends React.PureComponent {
  /**
   * Pagination onClick handler
   *
   * @param  {int} page Page number
   */
  onClick(page) {
    this.props.onClick(page);
  }

  /**
   * Get pagination boundaries
   *
   * @param  {int} currentPage Current page
   * @param  {int} pageCount   Page count or total number of pages
   * @param  {int} maxOffset   Maximum offset
   * @return {object}  Object containing start and end
   */
  getBoundaries(currentPage, pageCount, maxOffset) {
    let start = currentPage - maxOffset;
    let end = currentPage + maxOffset;

    // calculate boundaries
    if (start < 1) {
      end += 1 - start;
      start = 0;
    }

    if (end > pageCount - 1) {
      start += pageCount - 1 - end;
      end = pageCount - 1;
      if (start < 1) {
        start = 0;
      }
    }

    // prevent dots for a single number
    if (start === 2) {
      start--;
      end--;
    }

    // compensate for missing dots
    if (start <= 1) {
      end++;
    }

    // prevent dots for a single number
    if (end === pageCount - 3) {
      end++;
      start++;
    }

    // compensate for missing dots
    if (end >= pageCount - 2) {
      start -= end - (pageCount - maxOffset + (maxOffset - 3));
    }

    return { start, end };
  }

  /**
   * Get pagination buttons, prev, pages, next
   *
   * @return {array} Array of pagination buttons (Elements)
   */
  getPaginationButtons() {
    // result
    const result = [];

    const boundaries = this.getBoundaries(
      this.props.currentPage,
      this.props.pageCount,
      this.props.maxOffset
    );
    let prevVisible = false;

    // Previous
    result.push(
      <li
        className="prev"
        key="prev"
        onClick={
          this.props.currentPage > 0
            ? this.onClick.bind(this, this.props.currentPage - 1)
            : () => {}
        }
      >
        &lt;
      </li>
    );

    // Numbers
    for (let i = 0; i < this.props.pageCount; i++) {
      if (
        i === 0 ||
        i === this.props.pageCount - 1 ||
        (i >= boundaries.start && i <= boundaries.end)
      ) {
        prevVisible = true;
        result.push(
          <li
            key={i}
            className={this.props.currentPage === i ? 'active' : null}
            onClick={this.onClick.bind(this, i)}
          >
            {i + 1}
          </li>
        );
      } else {
        if (prevVisible) {
          result.push(<li key={i}>…</li>);
        }
        prevVisible = false;
      }
    }

    // Next
    result.push(
      <li
        className="next"
        key="next"
        onClick={
          this.props.currentPage < this.props.pageCount - 1
            ? this.onClick.bind(this, this.props.currentPage + 1)
            : () => {}
        }
      >
        &gt;
      </li>
    );

    return result;
  }

  /**
   * React render function
   *
   * @return {Element}
   */
  render() {
    return (
      <ul className={IDUtil.cssClassName('pagination')}>
        {this.getPaginationButtons()}
      </ul>
    );
  }
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  maxOffset: PropTypes.number,
  onClick: PropTypes.func.isRequired
};

Pagination.defaultProps = {
  // when there are many pages, keep this pagination offset
  // before/after the current page
  maxOffset: 4
};

export default Pagination;
