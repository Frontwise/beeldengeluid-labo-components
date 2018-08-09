import IDUtil from '../../../../util/IDUtil';
import ComponentUtil from '../../../../util/ComponentUtil';

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
                alert('An error occurred while saving this project');
            }
        })
    }

    render() {
        let linkToCancel = null;
        if(this.props.cancelLink !== '') {
            linkToCancel = (
                <Link to={this.props.cancelLink} className="btn">
                    Cancel
                </Link>
            )
        }else {
            linkToCancel = (
                <button className="btn" type="button"
                        onClick={ComponentUtil.hideModal.bind(this, this, 'showModal', 'project__modal')}>
                    Cancel
                </button>);
        }

        return (
            <form id="bg_new-project" className={IDUtil.cssClassName('project-form')} onSubmit={this.handleSubmit.bind(this)}>
                <div className="new-project-container">
                    <span className="bg__new-project-wrapper">
                        <label className="label project-modal-left">Name</label>
                        <input
                            type="text"
                            name="name"
                            required="true"
                            className="project-modal-right"
                            defaultValue={this.props.project.name}
                            ref={elem => (this.name = elem)}/>
                    </span>
                    <span className="bg__new-project-wrapper">
                    <label className="label project-modal-left">Description</label>
                    <textarea
                        name="description"
                        className="project-modal-right"
                        defaultValue={this.props.project.description}
                        ref={elem => (this.description = elem)}/>
                    </span>
                    <span className="bg__new-project-wrapper">
                    <input
                        type="checkbox"
                        name="private"
                        className="project-modal-left"
                        defaultChecked={this.props.project.isPrivate}
                        id="project-private"
                        ref={elem => (this.isPrivate = elem)}/>

                    <label htmlFor="project-private" className="project-modal-right">
                        This is a private project that is only visible to you and your collaborators
                    </label>
                    </span>
                </div>

                <div className="actions">
                    {linkToCancel}
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
