import ProjectAPI from '../../../api/ProjectAPI';
import AnnotationAPI from '../../../api/AnnotationAPI';

import IDUtil from '../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../helpers/BreadCrumbs';

//import AnnotationStore from '../../../flux/AnnotationStore';

import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

/**
* Wrapper for pages within a single project. It provides a submenu that gives
* access to all the subpages (Bookmarks/Sessions/Details)
* It also provides the project data to the subviews.
*/
class ProjectViewWrapper extends React.PureComponent {

    constructor(props) {
        super(props);

        // unique keys used for storage
        this.keys = {
            bookmarkCount: 'bg__project-bookmarks-count',
            annotationCount: 'bg__project-annotation-count',
        };

        const bookmarkCount = window.sessionStorage.getItem(this.keys.bookmarkCount) || 0;
        const annotationCount = window.sessionStorage.getItem(this.keys.annotationCount) || 0;

        this.state = {
            loading: true,
            project: null,
            bookmarkCount: bookmarkCount,
            annotationCount: annotationCount,
        };

        this.loadBookmarkCount = this.loadBookmarkCount.bind(this);
    }

    componentDidMount() {
        this.loadProject();
    }

    //Load project from url id and load it to the state
    loadProject() {
        const projectId = this.props.match.params.id;

        // load project data, and set state
        ProjectAPI.get(this.props.user.id, projectId, project => {
            if(project) {
                // inject project name to breadcrumbs
                const titles = {};
                titles[project.id] = project.name;
                // update breadcrumbs
                setBreadCrumbsFromMatch(this.props.match, titles);

                // set to state
                this.setState({
                    loading: false,
                    project
                });
                this.loadBookmarkCount(project);
            } else {
                this.setState({
                    loading: false
                })
            }
        });
    }

    // Load bookmark count from annotation store
    loadBookmarkCount(project) {
        if (!project){
            project = this.state.project;
        }
        AnnotationAPI.getAnnotationCounts(
            this.props.user.id,
            project.id,
            (counts) => {
                if(counts) {
                    window.sessionStorage.setItem(this.keys.bookmarkCount, counts.bookmarkCount);
                    window.sessionStorage.setItem(this.keys.annotationCount, counts.annotationCount);
                    this.setState(counts);
                } else {
                    window.sessionStorage.setItem(this.keys.bookmarkCount, 0);
                    window.sessionStorage.setItem(this.keys.annotationCount, 0);
                    this.setState({
                        bookmarkCount : 0,
                        annotationCount : 0
                    });
                }
            }
        )
    }

    render() {
        const RenderComponent = this.props.renderComponent;
        const project = this.state.project;
        let contents = null;
        if(this.state.loading) {
            contents = <h3 className="loading">Loading...</h3>
        } else {
            if(project) {
                contents = (
                    <div>
                        <div className="project-header">
                            <div className="info-bar">
                                <h2>{project.name || 'Unnamed project'}</h2>
                                <p>{project.description}</p>
                            </div>

                            <div className="submenu">
                                <NavLink activeClassName="active" to={
                                    '/workspace/projects/' +
                                    encodeURIComponent(project.id) +
                                    '/details'}>
                                    Details
                                </NavLink>
                                <NavLink activeClassName="active" to={
                                    '/workspace/projects/' +
                                    encodeURIComponent(project.id) +
                                    '/bookmarks'}>
                                    Bookmarks<span className="count">{this.state.bookmarkCount}</span>
                                </NavLink>
                                <NavLink activeClassName="active" to={
                                    '/workspace/projects/' +
                                    encodeURIComponent(project.id) +
                                    '/annotations'}>
                                    Annotations<span className="count">{this.state.annotationCount}</span>
                                </NavLink>
                                <NavLink activeClassName="active" to={
                                    '/workspace/projects/' +
                                    encodeURIComponent(project.id) +
                                    '/sessions'}>
                                    Tool sessions<span className="count">{project.sessions ? project.sessions.length : 0}</span>
                                </NavLink>
                                <NavLink activeClassName="active" to={
                                    '/workspace/projects/' +
                                    encodeURIComponent(project.id) +
                                    '/queries'}>
                                    Queries<span className="count">{project.queries ? project.queries.length : 0}</span>
                                </NavLink>

                            </div>
                        </div>

                        <div className="component">
                            <RenderComponent {...this.props}
                                project={this.state.project}
                                loadBookmarkCount={this.loadBookmarkCount}
                            />
                        </div>
                    </div>
                )
            } else {
                contents = <h3 className="error">Project could not be found</h3>
            }
        }

        return (
            <div className={IDUtil.cssClassName('project-view-wrapper')}>
                {contents}
            </div>
        );
    }
}
ProjectViewWrapper.propTypes = {
    RenderComponent: PropTypes.func.isRequired
};
export default ProjectViewWrapper;
