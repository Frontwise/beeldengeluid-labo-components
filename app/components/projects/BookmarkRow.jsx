import AnnotationStore from '../../flux/AnnotationStore';
import classNames from 'classnames';
import IDUtil from '../../util/IDUtil';
import ProjectAPI from '../../api/ProjectAPI';
import ProjectWrapper from './ProjectWrapper';
import PropTypes from 'prop-types';

/**
 * A row with bookmark information, and actions, and sub level annotations
 */
class BookmarkRow extends React.PureComponent {
  /**
   * Construct this component
   */
  constructor(props) {
    super(props);

    this.state = {
      showAnnotations:
        this.props.bookmark.annotations &&
        this.props.bookmark.annotations.length > 0
    };

    // bind functions
    this.onDelete = this.onDelete.bind(this);
    this.onView = this.onView.bind(this);
  }

  /**
   * Delete action
   */
  onDelete() {
    this.props.onDelete([this.props.bookmark.id]);
  }

  /**
   * View action
   */
  onView() {
    if(this.props.bookmark.object) {
      this.props.onView({
        resourceId : this.props.bookmark.object.id,
        collectionId : this.props.bookmark.object.dataset,
        type : this.props.bookmark.object.type,
        title : this.props.bookmark.object.title
      });
    }
  }

  /**
   * Select Change
   *
   * @param  {SyntheticEvent} e    Event
   */
  onSelectChange(e) {
    this.props.onSelect(this.props.bookmark, e.target.checked);
  }

  /**
   * Toggle Annotations
   */
  toggleAnnotations() {
    this.setState({
      showAnnotations: !this.state.showAnnotations
    });
  }

  /**
   * React render function
   *
   * @return {Element}
   */
  render() {
    const bookmark = this.props.bookmark;
    const annotations = bookmark.annotations || [];
    const hasAnnotations = annotations.length > 0;

    return (
      <div
        className={classNames(IDUtil.cssClassName('bookmark-row'), 'item-row')}
      >
        <div className="item">
          {/* PROPERTIES  */}

          <div className="selector">
            <input
              type="checkbox"
              checked={this.props.selected}
              onChange={this.onSelectChange.bind(this)}
              title={'Select this bookmark with id:\n' + bookmark.id}
            />
          </div>

          <div
            className="image"
            style={{
              backgroundImage: 'url(' + bookmark.object.placeholderImage + ')'
            }}
          />

          <div className="info">
            <table>
              <tbody>
                <tr>
                  <td>
                    <h4 className="label">Title</h4>
                    <p className="bold">{bookmark.object.title}</p>
                  </td>
                  <td>
                    <h4 className="label">Date</h4>
                    <p>
                      {bookmark.object.date
                        ? bookmark.object.date.match(/^\d/)
                          ? bookmark.object.date.substring(0, 10)
                          : bookmark.object.date
                        : ''}
                    </p>
                  </td>
                </tr>
                <tr className="subcol">
                  <td>
                    <h4 className="label">Type</h4>
                    <p>{bookmark.object.type}</p>
                  </td>
                  <td>
                    <h4 className="label">Dataset</h4>
                    <p>{bookmark.object.dataset}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="actions">
            <div className="btn blank warning" onClick={this.onDelete}>
              Delete
            </div>
            <div className="btn primary" onClick={this.onView}>
              View
            </div>
          </div>

          <div
            className={classNames('sublevel-button', {
              active: this.state.showAnnotations,
              zero: !hasAnnotations
            })}
            onClick={this.toggleAnnotations.bind(this)}
          >
            Annotations <span className="count">{annotations.length}</span>
          </div>
        </div>

        {/* SUB LEVEL PROPERTIES : ANNOTATIONS  */}

        {this.state.showAnnotations ? (
          <div className="sublevel">
            {!hasAnnotations ? (
              <p>
                This {bookmark.object.type.toLowerCase() || 'object'} has no
                annotations yet
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Content</th>
                  </tr>
                </thead>
                <tbody>
                  {annotations.map(annotation => (
                    <tr>
                      <td>{annotation.annotationType}</td>
                      <td>
                        {annotation.vocabulary ? annotation.vocabulary : ''}
                        {annotation.annotationType === 'comment'
                          ? annotation.created
                          : ''}
                      </td>
                      <td>
                        {annotation.text
                          ? annotation.text.substring(0, 200)
                          : ''}
                        {annotation.label ? annotation.label : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>
    );
  }
}

BookmarkRow.propTypes = {
  bookmark: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onView: PropTypes.func.isRequired,
  selected: PropTypes.bool
};

export default BookmarkRow;
