import ProjectAPI from '../../../api/ProjectAPI';

import IDUtil from '../../../util/IDUtil';
import ComponentUtil from '../../../util/ComponentUtil';
import PropTypes from 'prop-types';
import { PowerSelect } from 'react-power-select';
import ProjectForm from './crud/ProjectForm'
/**
* Select a project from a list and send it to the output callback
*/
class ProjectSelector extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            activeProject: '',
            projectList: [],
            showModal: false
        };
        this.CLASS_PREFIX = 'prjs';
    }

    componentDidMount() {
        ProjectAPI.list(this.props.user.id, null, projects => {
            this.setState({ projectList: projects || [] });
        });
    }

    selectProject(event) {
        if (event && event.option && event.option.index) {
            this.onOutput(this.getProjectFromList(event.option.index));
        }
    }

    getProjectFromList(projectId) {
        const filtered = this.state.projectList.filter(p => p.id == projectId);
        return filtered.length > 0 ? filtered[0] : null;
    }

    onOutput(project) {
        if (this.props.onOutput) {
            if (project) {
                setTimeout(
                    () => {
                        this.props.onOutput(this.constructor.name, project);
                    },
                    120 //ugly as sh*t, but the powerselect tries to call one more function after this
                );
            } else {
                console.debug('No project selected...');
            }
        }
    }
    addCustomFields(selectComponent) {
        selectComponent.actions.close();
        this.setState({
            showModal : true
        })
    }

    render() {
        let projectSelector = null,
            newProject = null;

        //Add new project modal modal
        if (this.state.showModal) {
            newProject = (
                <ProjectForm
                    id="bg__project-selector"
                    submitButton="save"
                    cancelLink={
                        ''
                    }
                    project={{
                        name: '',
                        description: '',
                        isPrivate: false,
                        user: this.props.user.id
                    }}
                    projectDidSave={projectId => {
                        ProjectAPI.get(this.props.user.id, projectId, project => {
                                if (project && project.id) {
                                    this.onOutput(project)
                                }
                            }
                        );
                        ComponentUtil.hideModal(this, 'showProjectModal', 'project__modal', true);
                    }}
                    user={this.props.user}
                    api={ProjectAPI}/>
            );
        }
        if (this.state.projectList.length > 0) {
            //the project selection part
            const options = this.state.projectList.map((project, index) => {
                return {
                    key: project.id,
                    title: project.name,
                    index: project.id, //what is this for again?
                    numQueries : project.queries ? project.queries.length : 0
                }
            }).sort((a,b) => {
                let at = a.title ? a.title.toLowerCase() : '';
                let bt = b.title ? b.title.toLowerCase() : '';
                return at < bt ? -1 : 1;
            });

        if (options.length > 0) {
            projectSelector = (
                <div className="row bg__select-project">
                    <div className="col-md-12">
                        <form className="form-horizontal">
                            <label className="col-sm-2">Project</label>
                            <div className="col-sm-10">
                                <PowerSelect
                                    key="project_powerselect"
                                    options={options}
                                    selected={this.state.activeProject.id}
                                    searchIndices={['title']}
                                    onChange={this.selectProject.bind(this)}
                                    optionLabelPath="title"
                                    optionComponent={<ProjectOption />}
                                    placeholder="-- Select a project -- "
                                    afterOptionsComponent={({ select }) => (
                                        <div style={{margin:'15px'}}>
                                            <button className="btn btn-sm btn-primary"
                                                onClick={() => {
                                                    this.addCustomFields(select);
                                                }}>
                                                + New Project
                                            </button>
                                        </div>
                                    )}
                                />
                            </div>
                        </form>
                    </div>
                </div>
            );
        } else {
            projectSelector = <h3>You have not created any projects so far</h3>;
        }
        } else {
            projectSelector = <h3>Loading project list...</h3>;
        }

        //always return everything wrapped in an identifyable div
        return (
            <div className={IDUtil.cssClassName('project-selector')}>
                {projectSelector}
                {newProject}
            </div>
        )
    }
}

const ProjectOption = ({ option }) => (
  <div>
    {option.title}
    <span style={{float : 'right'}}>
        ({option.numQueries}&nbsp;{option.numQueries > 1 ? 'queries' : 'query'})
    </span>
  </div>
);

ProjectSelector.propTypes = {
    user: PropTypes.object.isRequired,
    onOutput: PropTypes.func.isRequired
};

export default ProjectSelector;
