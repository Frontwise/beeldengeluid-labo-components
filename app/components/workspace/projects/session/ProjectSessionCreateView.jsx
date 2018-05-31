import IDUtil from '../../../../util/IDUtil';
import ProjectAPI from '../../../../api/ProjectAPI';
import ComponentUtil from '../../../../util/ComponentUtil';

import SessionSaver from './SessionSaver';

import { setBreadCrumbsFromMatch } from '../../helpers/BreadCrumbs';

import PropTypes from 'prop-types';


/**
* Create a new project, using the ProjectForm component
*/
class ProjectSessionCreateView extends React.PureComponent {

    constructor(props) {
        super(props);

        // Add dummy data
        const exampleUrl = '/tool/exploratory-search?path=/browser/session%3Fid=an-1acf4520-f414-4198-a61f-a91a44fd7408';
        
        /*if (!props.project.sessions) {
            props.project.sessions = [{
                id: 'abcd12349',
                name: 'Session example: Wereldreis',
                tool: 'MS: DIVE+',
                data: { url: exampleUrl },
                created: '2017-12-08T18:31:47Z'
            }];
        }*/
        

        const activeProject = ComponentUtil.getJSONFromLocalStorage('activeProject');
        
        this.state = {
            loading: true,
            projectList: [],
            defaultProject: activeProject ? activeProject.id : '',            
            tool: props.match.params.tool,
            annotationId: props.params.annotationId,

            targetProject: null, // project the session is saved to
        };
    }

    componentDidMount() {
        setBreadCrumbsFromMatch(this.props.match);

        // Prevent running the page without proper data
        if (!this.state.tool){
            alert('Error: No tool specified');
            return;
        }

        if (!this.state.annotationId){
            alert('Error: No annotationId specified');
            return;
        }

        // Data seems to be complete:

        // Load user projects
        ProjectAPI.list(this.props.user.id, null, projects => {
            this.setState({ 
                projectList: projects || [],
                loading: false,
            }, ()=>{
                // focus name input after focusing
                this.name.focus();
            });
        });
    }

    handleSubmit(e){
        // don't submit the form
        e.preventDefault();

        const projectId = this.project.value;

        // get project for projectId
        let project = this.state.projectList.filter((p)=>(p.id == projectId));
        if (!project.length){
            alert("An error occured while requesting the project");
            return;
        }
        project = project[0];

        // create session
        const session = {
            name: this.name.value,
            id: 'sess-' + IDUtil.guid(), // unique id
            tool: this.state.tool,
            created: (new Date()).toISOString(),
            data: {
                annotationId: this.state.annotationId
            },
        }

        // populate project
        project.sessions.push(session);

        this.saveProject(project, (projectId)=>{
            // saving succesful
            this.setState({
                targetProject:project
            });
        });
    }

    saveProject(project, callback) {
        this.props.api.save(this.props.user.id, project, msg => {
            if (msg && msg.success) {
                let projectId = project.id;
                callback(projectId);
            } else {
                alert('An error occured while saving the session');
            }
        })
    }


    renderForm(){
        return(<form onSubmit={this.handleSubmit.bind(this)}>
            <label className="label">Session name</label>
            <input 
                name="name"
                type="text"
                defaultValue={this.props.params.name} 
                ref={elem => (this.name = elem)}
                />
            <label className="label">Project</label>

            <select 
                defaultValue={this.state.defaultProject}
                ref={elem => (this.project = elem)}
                >
                {this.state.projectList.map((p,index)=>(<option key={index} value={p.id}>{p.name}</option>))}
            </select>

            <br/>

            <input
                type="submit"
                className="btn primary add"
                value="Save"
                />
        </form>);
    }

    renderSuccess(){
        return(<div>
                <h3>Session has been saved to project {this.state.targetProject.name}</h3>
            </div>)
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('project-session-create')}>
                <div className="info-bar">
                    <h2>Save tool session to a project</h2>
                    <p>
                        The tool session will be stored in your project so you can continue your search
                    </p>
                </div>

                {this.state.targetProject ? 
                        this.renderSuccess()
                    :
                        this.state.loading ? 
                            <h2>Loading...</h2>
                        :
                            this.renderForm()
                } 
            </div>
        )
    }
}

ProjectSessionCreateView.propTypes = {
    api: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired
};

export default ProjectSessionCreateView;


/*    constructor(props) {
        super(props);

        // Add dummy data
        const exampleUrl = '/tool/exploratory-search?path=/browser/session%3Fid=an-1acf4520-f414-4198-a61f-a91a44fd7408';
        if (!props.project.sessions) {
            props.project.sessions = [{
                id: 'abcd12349',
                name: 'Session example: Wereldreis',
                tool: 'MS: DIVE+',
                data: { url: exampleUrl },
                created: '2017-12-08T18:31:47Z'
            }];
        }
        
        this.state = {
            
        };
    }

    

    render() {
        const sessions = this.state.sessions;
        const currentUser = this.props.user;
        const currentUserId = currentUser.id;

        return (
            <div className={IDUtil.cssClassName('project-session-create-view')}>
                Create Session


                {this.state.projectList ? 
                    <ul>   
                        {this.state.projectList.map((p)=>(<li>{console.log(p) || p.id}</li>))}
                    </ul>
                : null}
                
                <SessionSaver user={this.props.user} project={this.props.project} />
            </div>
        )
    }
}
*/