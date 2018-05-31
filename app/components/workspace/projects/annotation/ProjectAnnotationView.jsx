import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import ProjectViewWrapper from '../ProjectViewWrapper';

import AnnotationTable from './AnnotationTable';
import BookmarkTable from './BookmarkTable';


import PropTypes from 'prop-types';

/**
* Main page for a project's bookmarks and annotations. This page mainly handles
* the view selection: Bookmark- or Annotation centric.
*/
class ProjectAnnotationView extends React.PureComponent {

    constructor(props) {
        super(props);

        // unique keys used for storage
        this.keys = {
            view: 'bg__project-bookmarks-view'
        };

        // get view from session storage (bookmark-centric OR annotation-centric)
        const view = window.sessionStorage.getItem(this.keys.view) || 'bookmark-centric';
        this.state = {
            annotations: [],
            loading: true,
            view: view
        };

        this.viewChange = this.viewChange.bind(this);
    }

    viewChange(e) {
        const view = e.target.value;

        // store view to session storage
        window.sessionStorage.setItem(this.keys.view, view);

        this.setState({
            view
        });
    }

    render() {
        let viewComponent = null;

        // set viewComponent, based on the current state.view

        switch (this.state.view) {
            case 'bookmark-centric': viewComponent = (
                    <BookmarkTable user={this.props.user} project={this.props.project} />
                );
                break;
            case 'annotation-centric': viewComponent = (
                <AnnotationTable user={this.props.user} project={this.props.project} />
                );
                break;
        }

    return (
        <div className={IDUtil.cssClassName('project-annotation-view')}>
            <div className="tools">
                <div className="view">
                    <h3>View</h3>
                    <div className="radiogroup">
                        <input
                            type="radio"
                            name="view"
                            value="bookmark-centric"
                            id="view-bookmark"
                            checked={this.state.view === 'bookmark-centric'}
                            onChange={this.viewChange}/>

                        <label htmlFor="view-bookmark">Bookmark-centric</label>

                        <input
                            type="radio"
                            name="view"
                            value="annotation-centric"
                            id="view-annotation"
                            checked={this.state.view === 'annotation-centric'}
                            onChange={this.viewChange}/>

                        <label htmlFor="view-annotation">Annotation-centric</label>
                    </div>
                </div>
            </div>
            {viewComponent}
        </div>
        );
    }
}

ProjectAnnotationView.propTypes = {
    user: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired
};

class WrappedProjectAnnotationView extends React.PureComponent {
    render() {
        return (
            <ProjectViewWrapper renderComponent={ProjectAnnotationView} {...this.props} />
            );
    }
}

WrappedProjectAnnotationView.propTypes = ProjectAnnotationView.propTypes;

export default WrappedProjectAnnotationView;
