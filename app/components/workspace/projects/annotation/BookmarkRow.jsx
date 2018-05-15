import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import classNames from 'classnames';
import PropTypes from 'prop-types';

/**
* A row with bookmark information, and actions, and sub level annotations
*/
class BookmarkRow extends React.PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            showAnnotations: false // this.props.bookmark.annotations && this.props.bookmark.annotations.length > 0
        };

        // bind functions
        this.onDelete = this.onDelete.bind(this);
        this.onView = this.onView.bind(this);
    }

    onDelete() {
        this.props.onDelete([this.props.bookmark.id]);
    }

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

    onSelectChange(e) {
        this.props.onSelect(this.props.bookmark, e.target.checked);
    }

    toggleAnnotations() {
        this.setState({
            showAnnotations: !this.state.showAnnotations
        });
    }

    render() {
        const bookmark = this.props.bookmark;
        const annotations = bookmark.annotations || [];
        const hasAnnotations = annotations.length > 0;

        //populate the foldable annotation block
        let foldableBlock = null;

        if(this.state.showAnnotations) {
            let blockContents = null;
            if(!hasAnnotations) {
                blockContents = (
                    <p>
                        This {bookmark.object.type.toLowerCase() || 'object'} has no annotations yet
                    </p>
                )
            } else {
                blockContents = (
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
                                        {annotation.annotationType === 'comment' ? annotation.created : ''}
                                    </td>
                                    <td>
                                        {annotation.text ? annotation.text.substring(0, 200) : ''}
                                        {annotation.label ? annotation.label : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            }
            foldableBlock = (
                <div className="sublevel">
                    {blockContents}
                </div>
            )
        }

        //format the date of the resource/target (i.e. bookmark.object)
        let resourceDate = null;
        if(bookmark.object.date) {
            if(bookmark.object.date.match(/^\d/)) {
                resourceDate = bookmark.object.date.substring(0, 10);
            } else {
                resourceDate = bookmark.object.date
            }
        }

        return (
            <div className={classNames(IDUtil.cssClassName('bookmark-row'), 'item-row')}>
                <div className="item">
                    <div className="selector">
                        <input
                            type="checkbox"
                            checked={this.props.selected}
                            onChange={this.onSelectChange.bind(this)}
                            title={'Select this bookmark with id:\n' + bookmark.id}/>
                        <div className="delete" onClick={this.onDelete} title="Delete bookmark" />
                    </div>

                    <div className="image" style={{backgroundImage: 'url(' + bookmark.object.placeholderImage + ')'}}/>

                    <ul className="info">
                        <li className="primary">
                            <h4 className="label">Title</h4>
                            <p>{bookmark.object.title}</p>
                        </li>
                        <li>
                            <h4 className="label">Date</h4>
                            <p>{resourceDate}</p>
                        </li>
                        <li>
                            <h4 className="label">Type</h4>
                            <p>{bookmark.object.type}</p>
                        </li>
                        <li>
                            <h4 className="label">Dataset</h4>
                            <p>{bookmark.object.dataset}</p>
                        </li>
                    </ul>

                    <div className="actions">
                        <div className="btn primary" onClick={this.onView}>
                            View
                        </div>

                        <div title="Annotations" className={classNames('sublevel-button', {
                                active: this.state.showAnnotations,
                                zero: !hasAnnotations
                            })} onClick={this.toggleAnnotations.bind(this)}>
                            <span className="icon annotation"/>
                            <span className="count">{annotations.length}</span>
                        </div>
                    </div>
                </div>
                {foldableBlock}
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
