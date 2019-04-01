import IDUtil from '../../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../../helpers/BreadCrumbs';

import ProjectForm from './ProjectForm';

import PropTypes from 'prop-types';
import { initHelp } from '../../helpers/helpDoc';

/**
* Create a new project, using the ProjectForm component
*/
class ProjectCreateView extends React.PureComponent {

    componentDidMount() {
        setBreadCrumbsFromMatch(this.props.match);
        initHelp('User Project Create','/feature-doc/howtos/user-projects/create');
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('project-create')}>
                <div className="info-bar">
                    <h2>Create User Project</h2>
                    <p>
                        A user project contains Bookmarks & Annotations and Tool Sessions
                    </p>
                </div>

                <ProjectForm
                    submitButton="create"
                    cancelLink="/workspace/projects"
                    project={{
                        name: '',
                        description: '',
                        isPrivate: false,
                        user: this.props.user.id
                    }}
                    projectDidSave={projectId => {
                        // navigate to new project page
                        this.props.history.push(
                            '/workspace/projects/' + encodeURIComponent(projectId)
                        );
                    }}
                    user={this.props.user}
                    api={this.props.api}/>
            </div>
        )
    }
}

ProjectCreateView.propTypes = {
    api: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired
};

export default ProjectCreateView;
