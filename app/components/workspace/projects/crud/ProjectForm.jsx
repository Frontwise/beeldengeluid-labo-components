import IDUtil from '../../../../util/IDUtil';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
* Shows the project form and handles saving the project data using the given api.
*/
class ProjectForm extends React.PureComponent {

    handleSubmit(e) {
        e.preventDefault();

        const project = Object.assign({}, this.props.project);
        project.name = this.name.value;
        project.description = this.description.value;
        project.isPrivate = this.isPrivate.checked;
        this.save(project);

        return false;
    }

    save(project, callback) {
        this.props.api.save(this.props.user.id, project, msg => {
            if (msg && msg.success) {
                let projectId = project.id;

                if (!projectId) {
                    // get project id from message in case this is a new project
                    // todo: ask api guys to return the id as a seperate field
                    projectId = msg.success.substring(msg.success.lastIndexOf(' ') + 1);
                }

                this.props.projectDidSave(projectId);
            } else {
                alert('An error occured while saving this project');
            }
        })
    }

    render() {
        return (
            <form className={IDUtil.cssClassName('project-form')} onSubmit={this.handleSubmit.bind(this)}>
                <div>
                    <label className="label">Name</label>
                    <input
                        type="text"
                        name="name"
                        defaultValue={this.props.project.name}
                        ref={elem => (this.name = elem)}/>

                    <label className="label">Description</label>
                    <textarea
                        name="description"
                        defaultValue={this.props.project.description}
                        ref={elem => (this.description = elem)}/>

                    <input
                        type="checkbox"
                        name="private"
                        defaultChecked={this.props.project.isPrivate}
                        id="project-private"
                        ref={elem => (this.isPrivate = elem)}/>

                    <label htmlFor="project-private">
                        This is a private project that is only visible to you and your collaborators
                    </label>
                </div>

                <div className="actions">
                    <Link to={this.props.cancelLink} className="btn">
                        Cancel
                    </Link>
                    <input
                        type="submit"
                        className="btn primary add"
                        value={this.props.submitButton}/>
                </div>
            </form>
        )
    }
}

ProjectForm.PropTypes = {
    submitButton: PropTypes.string.isRequired,
    cancelLink: PropTypes.string.isRequired,
    project: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        private: PropTypes.bool.isRequired
    }).isRequired,
    projectDidSave: PropTypes.func.isRequired,
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }),
    api: PropTypes.shape({
        save: PropTypes.func.isRequired
    })
};

export default ProjectForm;
