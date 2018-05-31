import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import classNames from 'classnames';
import PropTypes from 'prop-types';

/**
* A row with annotation information and sub level bookmarks
*/
class AnnotationRow extends React.PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            showBookmarks: this.props.annotation.bookmarks && this.props.annotation.bookmarks.length > 0
        };

        // bind functions
        this.onDelete = this.onDelete.bind(this);
        this.onView = this.onView.bind(this);
    }

    onDelete() {
        this.props.onDelete([this.props.annotation.annotationId]);
    }

    onView(bookmark) {
        this.props.onView(bookmark);
    }

    onSelectChange(e) {
        this.props.onSelect(this.props.annotation, e.target.checked);
    }

    toggleAnnotations() {
        this.setState({
            showBookmarks: !this.state.showBookmarks
        });
    }

    //Get a table row of info/metatdata for the given annotation
    //It renders different fields based on the annotationType
    getInfoRow(annotation) {
        switch (annotation.annotationType) {
            case 'classification':
                return (
                    <tr className="classification">
                        <td className="vocabulary">
                            <h4 className="label">Vocabulary</h4>
                            <p>{annotation.vocabulary}</p>
                        </td>
                        <td>
                            <h4 className="label">Classification</h4>
                            <p>{annotation.label}</p>
                        </td>
                        <td className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </td>
                    </tr>
                );
            case 'comment':
                return (
                    <tr className="comment">
                        <td>
                            <h4 className="label">Comment</h4>
                            <p>{annotation.text}</p>
                        </td>
                        <td className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </td>
                    </tr>
                );
            case 'link':
                return (
                    <tr className="link">
                        <td>
                            <h4 className="label">Id</h4>
                            <p>{annotation.annotationId}</p>
                        </td>
                        <td>
                            <h4 className="label">?</h4>
                            <p>Todo: Implemement Link fields (unknown now)</p>
                        </td>
                        <td className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </td>
                    </tr>
                );
            case 'metadata':
                return (
                    <tr className="metadata">
                        <td className="template">
                            <h4 className="label">Template</h4>
                            <p>{annotation.annotationTemplate}</p>
                        </td>

                        {annotation.properties ? annotation.properties.map((property, index) => (
                            <td key={index}>
                                <h4 className="label">{property.key}</h4>
                                <p>{property.value}</p>
                            </td>
                            )) : '-'
                        }

                        <td className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </td>
                    </tr>
                );
            default:
                return (
                <tr>
                    <td>Unknown annotation type: {annotation.annotationType}</td>
                </tr>
            );
        }
    }

    render() {
        const annotation = this.props.annotation;
        const bookmarks = annotation.bookmarks || [];
        const hasBookmarks = bookmarks.length > 0;

        //populate the foldable block (containing a list of bookmarks)
        let foldableBlock = null;
        if(this.state.showBookmarks) {
            let blockContents = null;
            if(!hasBookmarks) {
                blockContents = (
                    <p>
                        This {annotation.annotationType.toLowerCase() || 'annotation'}{' '} has no bookmarks
                    </p>
                )
            } else {
                blockContents = (
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Resource ID</th>
                                <th>Dataset</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookmarks.map(bookmark => (
                                <tr>
                                    <td>{bookmark.type}</td>
                                    <td>{bookmark.title}</td>
                                    <td>{bookmark.collectionId}</td>
                                    <td className="actions">
                                        <div className="btn primary" onClick={this.onView.bind(this, bookmark)}>
                                            View
                                        </div>
                                    </td>
                                </tr>
                                ))
                            }
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

        return (
            <div className={classNames(IDUtil.cssClassName('annotation-row'), 'item-row')}>
                <div className="item">
                    <div className="selector">
                        <input
                            type="checkbox"
                            checked={this.props.selected}
                            onChange={this.onSelectChange.bind(this)}
                            title={
                                'Select this annotation with id:\n' + annotation.annotationId
                            }/>
                    </div>

                    <div className="info">
                        <table>
                            <tbody>{this.getInfoRow(annotation)}</tbody>
                        </table>
                    </div>

                    <div className="actions">
                        <div className="btn blank warning" onClick={this.onDelete}>
                            Delete
                        </div>
                        {/*<div className="btn"
                        onClick={this.onView}>View</div> */}
                    </div>

                    <div
                        className={
                            classNames('sublevel-button', {active: this.state.showBookmarks, zero: !hasBookmarks})
                        }
                        onClick={this.toggleAnnotations.bind(this)}>

                        Bookmarks <span className="count">{bookmarks.length}</span>
                    </div>
                </div>

                {foldableBlock}
            </div>
        )
    }
}

AnnotationRow.propTypes = {
    annotation: PropTypes.object.isRequired,
    onDelete: PropTypes.func.isRequired,
    onView: PropTypes.func.isRequired,
    selected: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired
};

export default AnnotationRow;
