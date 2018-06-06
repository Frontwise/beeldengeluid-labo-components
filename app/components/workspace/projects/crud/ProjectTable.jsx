import IDUtil from '../../../../util/IDUtil';
import ComponentUtil from '../../../../util/ComponentUtil';
import AnnotationUtil from '../../../../util/AnnotationUtil';

import { exportDataAsJSON } from '../../helpers/Export';

import AnnotationStore from '../../../../flux/AnnotationStore';

import SortTable from '../../SortTable';

import classNames from 'classnames';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
* Table that shows all the projects. It handles the loading and filtering of the projects data.
*/
class ProjectTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.head = [
            { field: 'name', content: 'Name', sortable: true },
            { field: 'description', content: 'Description', sortable: true },
            {
                field: 'bookmarks',
                content: <i className="bookmark-icon" title="Number of bookmarks"/>,
                sortable: true
            },
            { field: 'owner', content: 'Owner', sortable: true },
            { field: 'access', content: 'Access', sortable: true },
            { field: 'created', content: 'Created', sortable: true },
            { field: '', content: '', sortable: false }
        ];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteProjects.bind(this) },
            { title: 'Export', onApply: exportDataAsJSON.bind(this) }
        ];

        this.defaultSort = {
            field: 'name',
            order: 'asc'
        }

        this.state = {
            projects: [],
            loading: true,
            filter: {
                keywords: '',
                currentUser: false
            },
            bookmarkCount: {}
        };

        this.requestedBookmark = {};

        this.requestDataTimeout = -1;

        this.sortProjects = this.sortProjects.bind(this);
        this.getProjectRow = this.getProjectRow.bind(this);
    }


    componentDidMount() {
        this.loadData();
    }


    componentDidUpdate() {
        if (this.lastFilter !== this.state.filter) {
            this.lastFilter = this.state.filter;

            // throttle data requests
            clearTimeout(this.requestDataTimeout);
            this.requestDataTimeout = setTimeout(this.loadData.bind(this), 500);
        }
    }

    //load the projects from the Workspace API
    loadData() {
        this.setState({
            loading: true
        });

        this.props.api.list(
            this.props.user.id,
            this.state.filter,
            this.setProjects.bind(this)
        );
    }


    setProjects(projects) {
        // decorate the projects
        this.toDummyData(projects || []);

        // we filter the results now on client side
        projects = this.filterProjects(projects || []);

        //TODO this is for now the only place where this is set. Probably not good enough
        ComponentUtil.storeJSONInLocalStorage('myProjects', projects);

        this.setState({
            projects: projects,
            loading: false
        });

        // check for bookmark count
        // Future: This can be optimized by only requesting the count
        // for visible projects
        this.getAllBookmarkCount(projects);
    }

    //for each project, load all the bookmark counts async
    getAllBookmarkCount(projects) {
        projects.forEach(project => {
            if (!(project.id in this.requestedBookmark)) {
                // mark as requested
                this.requestedBookmark[project.id] = true;

                // load bookmarks
                this.loadBookmarkCount(project);
            }
        });
    }

    //Load bookmark count from annotation store (TODO: This can be optimized by storing the counts in the SessionStorage)
    loadBookmarkCount(project) {
        AnnotationStore.getUserProjectAnnotations(
            this.props.user,
            project,
            this.setBookmarkCount.bind(this, project)
        );
    }

    //set bookmark count to state
    setBookmarkCount(project, annotationData) {
        const bookmarks = AnnotationUtil.generateBookmarkCentricList(
            annotationData.annotations || []
        );
        const bookmarkCount = bookmarks ? bookmarks.length : 0;
        const newCount = {};
        newCount[project.id] = bookmarkCount;
        this.setState({
            bookmarkCount: Object.assign({}, this.state.bookmarkCount, newCount)
        });
    }

    //filter projects (client side) TODO: server side filtering
    filterProjects(projects) {
        const userId = this.props.user.id;
        let result = projects.filter(project => project.getAccess(userId));
        const filter = this.state.filter;

        // filter on keywords
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                result = result.filter(
                    project =>
                    (project.name && project.name.toLowerCase().includes(k)) ||
                    (project.description && project.description.toLowerCase().includes(k))
                );
            });
        }

        // filter on current user
        if (filter.currentUser) {
            result = result.filter(project => project.owner.id === userId);
        }

        return result;
    }

    //convert the api data to client side data; TODO change the function name!
    toDummyData(projects) {
        return projects.map(p => {
            p.getBookmarkCount = function() {
                return this.bookmarks.length;
            };
            p.getAccess = function() {
                return 'Admin';
            };
            p.getCollaboratorCount = function() {
                return this.collaborators.length;
            };
            p.canDelete = function() {
                return true;
            };
            p.canExport = function() {
                return true;
            };
            p.canOpen = function() {
                return true;
            };
            p.bookmarks = [];
            p.collaborators = [];
            p.owner = {
                id: this.props.user.id,
                name: this.props.user.name
            };
            return p;
        });
    }

    //triggered upon using the filter field
    keywordsChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                keywords: e.target.value
            })
        });
    }

    //triggered upon using the "show only my collections" checkbox
    currentUserChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                currentUser: e.target.checked
            })
        });
    }

    deleteProject(project) {
        if (window.confirm('Are you sure you want to delete project ' + project.name)) {
            this.props.api.delete(this.props.user.id, project.id, status => {
                if (status && status.success) {
                    // just retrieve the latest data
                    this.loadData();
                }
            });
        }
    }

    deleteProjects(projects) {
        if (window.confirm('Are you sure you want to delete ' + projects.length + ' projects?')) {
            let calls = projects.length;

            // after each return calls is decreased
            // when calls is 0, data is reloaded
            // this is async safe
            projects.forEach((project, index) => {
                this.props.api.delete(this.props.user.id, project.id, status => {
                    calls--;
                    if (calls == 0) {
                        // after the last delete just retrieve the latest data
                        this.loadData();
                    }
                });
            });
        }
    }

    sortProjects(projects, sort) {
        const getLowerSafe = (s)=>(s ? s.toLowerCase() : '');

        const sorted = projects;
        switch (sort.field) {
            case 'name': sorted.sort((a, b) => getLowerSafe(a.name) > getLowerSafe(b.name) ? 1 : -1); break;
            case 'description': sorted.sort((a, b) => getLowerSafe(a.description) > getLowerSafe(b.description) ? -1 : 1); break;
            case 'bookmarks': sorted.sort((a, b) => this.getBookmarkCount(b.id) - this.getBookmarkCount(a.id)); break;
            case 'owner': sorted.sort((a, b) => getLowerSafe(a.owner.name) > getLowerSafe(b.owner.name)  ? 1 : -1); break;
            case 'access': sorted.sort((a, b) => a.getAccess(this.props.user.id) > b.getAccess(this.props.user.id)  ? 1 : -1); break;
            case 'created': sorted.sort((a, b) => a.created > b.created  ? 1 : -1) ; break;
            default: return sorted;
        }
        return sort.order === 'desc' ? sorted.reverse() : sorted;
    }

    getBookmarkCount(projectId) {
        if (projectId in this.state.bookmarkCount) {
            return this.state.bookmarkCount[projectId];
        }
        return '...';
    }

    trunc(s, n){
        console.log(s ? s.length : '');
        return s ? s.substr(0,n-1)+(s.length>n?'…':'') : '';
    }

    //Transforms a project to a row needed for the sort table
    //don't like this is passed as a function to the sort table... but let's see first
    getProjectRow(project) {
        const currentUserId = this.props.user.id;

        return [
        {
            props: { className: 'primary' },
            content: (<Link to={'/workspace/projects/' + project.id}>{project.name}</Link>)
        },
        {
            props: { className: 'description' },
            content: (<p>{this.trunc(project.description, 140)}</p>)
        },
        {
            props: { className: 'number' },
            content: this.getBookmarkCount(project.id)
        },
        {
            content: (
                <span>
                    {project.owner.name}{' '}
                    {project.getCollaboratorCount() ? (
                        <span className="collaborators">
                        {project.getCollaboratorCount()} Collaborator{project.getCollaboratorCount() !== 1 ? 's' : ''}
                        </span>
                        ) : ('')
                    }
                </span>
            )
        },
        {
            props: { className: 'access' },
            content: project.getAccess(currentUserId)
        },
        {
            props: { className: 'smaller' },
            content: project.created.substring(0, 10)
        },
        // {
        // content: project.canDelete(currentUserId) ? (
        //     <a className="btn blank warning" onClick={this.deleteProject.bind(this, project)}>
        //         Delete
        //     </a>
        //     ) : ('')
        // },
        // {
        // content: project.canExport(currentUserId) ? (
        //     <a className="btn blank" onClick={exportDataAsJSON.bind(this, project)}>
        //         Export
        //     </a>
        //     ) : ('')
        // },
        {
        content: project.canOpen(currentUserId) ? (
            <Link to={'/workspace/projects/' + project.id} className="btn">
                Open
            </Link>
            ) : ('')
        }];
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('project-table')}>
                <div className="tools">
                    <div className="left">
                        <h3>Filters</h3>
                        <input
                            className="search"
                            type="text"
                            placeholder="Search User Projects"
                            value={this.state.filter.keywords}
                            onChange={this.keywordsChange.bind(this)}/>
                        <input
                            type="checkbox"
                            id="current-user"
                            checked={this.state.filter.currentUser}
                            onChange={this.currentUserChange.bind(this)}/>
                        <label htmlFor="current-user">Show only my projects</label>
                    </div>
                </div>

                <SortTable
                    items={this.state.projects}
                    head={this.head}
                    row={this.getProjectRow}
                    onSort={this.sortProjects}
                    loading={this.state.loading}
                    bulkActions={this.bulkActions}
                    defaultSort={this.defaultSort}
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
    }).isRequired
};

export default ProjectTable;
