import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import ProjectAPI from '../../api/ProjectAPI';
import IDUtil from '../../util/IDUtil';
import SortTable from './SortTable';
import { Link } from 'react-router-dom';

class ProjectTable extends Component {

  constructor(props){
    super(props);

    this.state={
      projects: [],
      loading: true,
      filter:{
        keywords: '',
        currentUser: false,
      }
    }
  }

  /**
   * Call filter callback
   */
  loadData(){

    this.setState({
      loading: true
    });

    this.props.api.list(this.props.user.id, this.state.filter, this.setProjects.bind(this));
  }

  /**
   * Set new list of projects to state
   * @param {array} projects List of projects
   */
  setProjects(projects){
    this.setState({
      projects: this.toDummyData(projects || []).reverse(),
      loading: false,
    });
  }

  /**
   * Decorate projects data with helper functions
   * (currently placeholders) 
   */
  toDummyData(projects){
    return projects.map((p) => {
      p.getBookmarkCount = function(){return 0;}
      p.getAccess = function(){return 'Admin'}
      p.getCollaboratorCount = function(){return 0;}
      p.canDelete = function(){return true;}
      p.canExport = function(){return true;}
      p.canOpen = function(){return true;}
      p.owner = {
        id : this.props.user.id,
        name : this.props.user.name
      }
      return p
    })
  }

  /**
   * Keywords filter changes
   * @param {SyntheticEvent} e Event
   */
  keywordsChange(e){
    this.setState({
      filter: Object.assign({}, this.state.filter, {
        keywords: e.target.value
      })
    });
  }

  /**
   * Keywords filter changes
   * @param {SyntheticEvent} e Event
   */
  currentUserChange(e){
    this.setState({
      filter: Object.assign({}, this.state.filter, {
        currentUser: e.target.checked
      })
    });
  }

  /**
   * After mounting, retrieve project data
   */
  componentDidMount(){
    this.loadData();
  }

  /**
   * Listen for update, request new data if filter has been changed
   */
  componentDidUpdate(){
    if (this.lastFilter !== this.state.filter){
      this.lastFilter = this.state.filter;
      this.loadData();
    }
  }

  /**
   * Delete project if confirmed
   * @param {object} project Project to delete
   */
  deleteProject(project){
    if (window.confirm('Are you sure you want to delete project ' + project.name)){
      this.props.api.delete(this.props.user.id, project.id, (status) => {
        if (status && status.success){

          // just retrieve the latest data
          this.loadData();
        }
      });
    }
  }

  /**
   * Export project
   * @param {object} project Project to export
   */
  exportData(data){    
    let exportWindow = window.open("", "Export", "width=800,height=800");
    exportWindow.document.write("<pre>"+JSON.stringify(project, null, 4)+"</pre>");
  }


  /**
  * Sort projects based on sort
  */
  sortProjects(projects, sort){
   let sorted = projects;
   switch(sort.field){
    case 'name':
      sorted.sort((a,b) => (a.name > b.name));
    break;
    case 'bookmarks':
      sorted.sort((a,b) => (a.bookmarks.length - b.bookmarks.length));
    break;
    case 'owner':
      sorted.sort((a,b) => (a.owner.name > b.owner.name));
    break;
    case 'access':
      sorted.sort((a,b) => (a.getAccess(this.props.user.id) > b.getAccess(this.props.user.id)));
    break;
    default:
      // no sorting,just return
      return sorted;
   }

   return sort.order === 'desc' ? sorted.reverse() : sorted;

  }



  render() {
    let projects = this.state.projects;
    let currentUser = this.props.user;
    let currentUserId = currentUser.id;

    return (
      <div className={IDUtil.cssClassName('project-table')}>
        <div className="filters">
          <div className="left">
            <h3>Filters</h3>
            <input className="search"
                   type="text"
                   placeholder="Search"
                   value={this.state.filter.keywords}
                   onChange={this.keywordsChange.bind(this)}
                   />
            <input type="checkbox"
                   id="current-user"
                   checked={this.state.filter.currentUser}
                   onChange={this.currentUserChange.bind(this)}
                   />
            <label htmlFor="current-user">Show only my projects</label>
          </div>
        </div>

        <SortTable
            items={projects}
            head={[
                {field: 'name', content: 'Name', sortable: true},
                {field: 'bookmarks', content: <i className="bookmark-icon"/>, sortable: true},
                {field: 'owner', content: 'Owner', sortable: true},
                {field: 'access', content: 'Access', sortable: true},
                {field: '', content: '', sortable: false},
                {field: '', content: '', sortable: false},
                {field: '', content: '', sortable: false},
              ]}
            row={(project) =>([
                { props:{className:"primary"}, content: <Link to={"/workspace/projects/" + project.id}>{project.name}</Link> },
                { props:{className:"number"}, content: project.getBookmarkCount()},
                { content: <span>{project.owner.name} {project.getCollaboratorCount() ? <span className="collaborators">{project.getCollaboratorCount()} Collaborator{project.getCollaboratorCount() !== 1 ? 's' : ''}</span> : ''}</span> },
                { props: { className: "access"}, content: project.getAccess(currentUserId) },
                { content: project.canDelete(currentUserId) ? <a className="btn blank warning" onClick={this.deleteProject.bind(this,project)}>Delete</a> : ''},
                { content: project.canExport(currentUserId) ? <a className="btn blank" onClick={this.exportData.bind(this,project)}>Export</a> : ''},
                { content: project.canOpen(currentUserId) ? <Link to={"/workspace/projects/" + project.id} className="btn">Open</Link> : ''}
              ])}           

            sort={this.sortProjects.bind(this)}
            loading={this.state.loading}
           />
      </div>
    );
  }
}

ProjectTable.propTypes = {

  // project api
  api: PropTypes.shape({
    list: PropTypes.func.isRequired
  }),

  // current user object used for defining access roles per project
  user: PropTypes.shape({
    id: PropTypes.number.isRequired
  }).isRequired,
}

export default ProjectTable;
