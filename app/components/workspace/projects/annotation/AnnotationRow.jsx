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
                    <ul className="info annotation-classification">
                        <li className="primary">
                            <h4 className="label">Code</h4>
                            <p>{annotation.label}</p>
                        </li>
                        <li className="vocabulary">
                            <h4 className="label">Vocabulary</h4>
                            <p>{annotation.vocabulary}</p>
                        </li>
                       
                        <li className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </li>
                    </ul>
                );
            case 'comment':
                return (
                    <ul className="info annotation-comment">
                        <li className="primary">
                            <h4 className="label">Comment</h4>
                            <p>{annotation.text}</p>
                        </li>
                        <li className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </li>
                    </ul>
                );
            case 'link':
                return (
                    <ul className="info annotation-link">
                        <li className="primary">
                            <h4 className="label">Label</h4>
                            <p>{annotation.label}</p>
                        </li>
                        <li className="link">
                            <h4 className="label">Link</h4>
                            <p><a rel="noopener noreferrer" target="_blank" href={'https:'+annotation.url}>{annotation.url ? annotation.url.replace(/^\/\//i,"") : ""}</a></p>
                        </li>
                        <li className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </li>
                    </ul>
                );
            case 'metadata':
                return (
                    <ul className="info annotation-metadata">
                        <li className="template" className="primary">
                            <h4 className="label">Template</h4>
                            <p>{annotation.annotationTemplate}</p>
                        </li>

                        {annotation.properties ? annotation.properties.map((property, index) => (
                            <li key={index}>
                                <h4 className="label">{property.key}</h4>
                                <p>{property.value}</p>
                            </li>
                            )) : '-'
                        }

                        <li className="created">
                            <h4 className="label">Created</h4>
                            <p>{annotation.created ? annotation.created.substring(0, 10) : '-'}</p>
                        </li>
                    </ul>
                );
            default:
                return (
                <ul>
                    <li>Unknown annotation type: {annotation.annotationType}</li>
                </ul>
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
                        <div className="delete" onClick={this.onDelete} title="Delete annotation" />
                    </div>

                    {this.getInfoRow(annotation)}
                    
                    <div className="actions">
                        
                        <div
                        className={
                            classNames('sublevel-button', {active: this.state.showBookmarks, zero: !hasBookmarks})
                        }
                        onClick={this.toggleAnnotations.bind(this)}>

                        <span className="icon bookmark" /> <span className="count">{bookmarks.length}</span>
                    </div>
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
