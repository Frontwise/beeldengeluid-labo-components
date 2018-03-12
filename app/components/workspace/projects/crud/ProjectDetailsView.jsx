import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import ProjectViewWrapper from '../ProjectViewWrapper';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
* Show the details of the given project.
*/
class ProjectDetailsView extends React.PureComponent {

    render() {
        const project = this.props.project;
        return (
            <div className={IDUtil.cssClassName('project-details')}>
                <h2>Project Details</h2>
                <Link to={'/workspace/projects/' + encodeURIComponent(project.id) + '/edit'} className="btn">
                    Edit details
                </Link>
                <ul className="details">
                    <li>
                        <h5 className="label">Name</h5>
                        <p>{project.name}</p>
                    </li>
                    <li>
                        <h5 className="label">Description</h5>
                        <p>{project.description}</p>
                    </li>
                    <li>
                        <h5 className="label">Visibility</h5>
                        <p>{project.isPrivate ? 'Private' : 'Public'}</p>
                    </li>
                    <li>
                        <h5 className="label">Created</h5>
                        <p>{project.created.substring(0, 10)}</p>
                    </li>
                </ul>

                <h2>Collaborators</h2>

                <Link to={'/workspace/projects/' + encodeURIComponent(project.id) + '/edit'} className="btn plus">
                    Add Collaborator
                </Link>

                <p>This feature has not yet been implemented</p>
            </div>
        );
    }
}

ProjectDetailsView.propTypes = {
    project: PropTypes.object.isRequired
};

class WrappedProjectDetailsView extends React.PureComponent {
    render() {
        return <ProjectViewWrapper {...this.props} renderComponent={ProjectDetailsView} />;
    }
}

WrappedProjectDetailsView.propTypes = ProjectDetailsView.propTypes;

export default WrappedProjectDetailsView;
