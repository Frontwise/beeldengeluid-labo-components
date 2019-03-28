import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../../helpers/BreadCrumbs';

import ProjectForm from './ProjectForm';

import PropTypes from 'prop-types';
import { initHelp } from '../../helpers/helpDoc';

/**
* Edit the project as specified by the router, using the ProjectForm component
*/
class ProjectEditView extends React.PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            project: null
        };
    }

    componentDidMount() {
        // get project id from url
        const projectId = this.props.match.params.id;

        // load project data, and set state
        ProjectAPI.get(this.props.user.id, projectId, project => {
            // inject project name to breadcrumbs
            const titles = {};
            titles[project.id] = project.name;

            // update breadcrumbs
            setBreadCrumbsFromMatch(this.props.match, titles);

            this.setState({
                loading: false,
                project
            });
        });
        initHelp('User Project Create','/feature-doc/howtos/user-projects/edit');

    }

    render() {
        let contents = null;
        if(this.state.loading) {
            contents = <h3 className="loading">Loading...</h3>
        } else {
            if(this.state.project) {
                contents = (
                    <ProjectForm
                        submitButton="save"
                        cancelLink={
                            '/workspace/projects/' +
                            encodeURIComponent(this.state.project.id) +
                            '/details'
                        }
                        project={this.state.project}
                        projectDidSave={projectId => {
                            // navigate to new project page
                            this.props.history.push(
                                '/workspace/projects/' +
                                encodeURIComponent(projectId) +
                                '/details'
                            );
                        }}
                        user={this.props.user}
                        api={this.props.api}/>
                )
            } else {
                contents = <h3 className="error">Project could not be found</h3>
            }
        }

        return (
            <div className={IDUtil.cssClassName('project-edit')}>
                <div className="info-bar">
                    <h2>Edit User Project</h2>
                    <p>
                        A user project contains Bookmarks & Annotations and Tool Sessions
                    </p>
                </div>
                {contents}
            </div>
        )
    }
}

ProjectEditView.propTypes = {
    api: PropTypes.object.isRequired,
    user: PropTypes.shape({
        id : PropTypes.string.isRequired,
        name : PropTypes.string.isRequired,
    }).isRequired,
    clientId : PropTypes.string,
    params : PropTypes.object,
    recipe : PropTypes.shape({
        id : PropTypes.string.isRequired,
        ingredients : PropTypes.object.isRequired
    }),

    //React Router props
    history : PropTypes.object.isRequired,
    match : PropTypes.shape({
        isExact : PropTypes.bool,
        path : PropTypes.string.isRequired,
        params : PropTypes.shape({
            id : PropTypes.string.isRequired
        }).isRequired,
        url : PropTypes.string
    }).isRequired,
    location : PropTypes.object, //not used, but available
    staticContext : PropTypes.object //not used, but available
};

export default ProjectEditView;
