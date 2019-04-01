import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import ProjectViewWrapper from '../ProjectViewWrapper';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { initHelp } from '../../helpers/helpDoc';

/**
* Show the details of the given project.
*/
class ProjectDetailsView extends React.PureComponent {

    componentDidMount() {
        // store tab to sessionStorage
        window.sessionStorage.setItem("bg__project-tab", "details");

        initHelp('Details','/feature-doc/howtos/user-projects/details');
     }

    render() {
        const project = this.props.project;
        return (
            <div className={IDUtil.cssClassName('project-details-view')}>
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
                        <h5 className="label">Created</h5>
                        <p>{project.created.substring(0, 10)}</p>
                    </li>
                </ul>
            </div>
        );
    }
}

ProjectDetailsView.propTypes = {
    project: PropTypes.shape({
        id : PropTypes.string.isRequired,
        name : PropTypes.string.isRequired,
        description : PropTypes.string,
        created : PropTypes.string,
        user : PropTypes.string,
        queries : PropTypes.array,
        sessions : PropTypes.array,
    }).isRequired,

    //the following props are available, but not used
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
    loadBookmarkCount : PropTypes.func,
    renderComponent : PropTypes.func,

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
    location : PropTypes.object,
    staticContext : PropTypes.object
};

class WrappedProjectDetailsView extends React.PureComponent {
    render() {
        return <ProjectViewWrapper {...this.props} renderComponent={ProjectDetailsView} />;
    }
}

export default WrappedProjectDetailsView;
