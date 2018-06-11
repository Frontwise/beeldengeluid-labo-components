import IDUtil from '../../../../util/IDUtil';

import { exportDataAsJSON } from '../../helpers/Export';

import ProjectViewWrapper from '../ProjectViewWrapper';
import SortTable from '../../SortTable';

import classNames from 'classnames';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
* Tool sessions table for a given project, that handles the loading^ and filtering of
* the sessions list.
*
* ^ Todo: Project sessions are currently stored on the project object
* itself. Alternatively they could be stored in the annotation API
* @Jaap: Decide which approach fits best.
*/

class ProjectSessionView extends React.PureComponent {

    constructor(props) {
        super(props);

        // // Add dummy data
        // const exampleUrl = '/tool/exploratory-search?path=/browser/session%3Fid=an-1acf4520-f414-4198-a61f-a91a44fd7408';
        // if (!props.project.sessions) {
        //     props.project.sessions = [{
        //         id: 'abcd12349',
        //         name: 'Session example: Wereldreis',
        //         tool: 'MS: DIVE+',
        //         data: { url: exampleUrl },
        //         created: '2017-12-08T18:31:47Z'
        //     }];
        // }

        this.defaultSort = {
            field: 'name',
            order: 'asc'
        }

        this.state = {
            sessions: [],
            filter: {
                keywords: '',
                currentUser: false
            }
        };
    }

    componentDidMount() {
        this.loadData();

        // store tab to sessionStorage
        window.sessionStorage.setItem("bg__project-tab", "sessions");
    }

    componentDidUpdate() {
        if (this.lastFilter !== this.state.filter) {
            this.lastFilter = this.state.filter;
            this.loadData();
        }
    }

    //whenever the keywords change
    keywordsChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                keywords: e.target.value
            })
        });
    }

    //whenever the checkbox changes
    currentUserChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                currentUser: e.target.checked
            })
        });
    }

    //load the session data and apply the current filter
    loadData() {
        let result = this.props.project.sessions ? this.props.project.sessions : [];
        const filter = this.state.filter;

        result = this.filterSessions(result, filter);

        // update state
        this.setState({
            sessions: result
        });
    }

    //Filter session list by given filter
    filterSessions(sessions, filter) {
        // filter on keywords in name or tool
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                sessions = sessions.filter(
                    session =>
                    session.name.toLowerCase().includes(k) ||
                    session.tool.toLowerCase().includes(k)
                );
            });
        }

        return sessions;
    }

    deleteSession(session) {
        if (window.confirm('Are you sure you want to delete session ' + session.name)) {
            const project = this.props.project;

            // delete sessions from project
            project.sessions = project.sessions.filter(s => s != session);

            // store project
            this.props.api.save(this.props.user.id, project, msg => {
                if (msg && msg.success) {
                    // update data
                    this.loadData();
                } else {
                    alert('An error occured while saving this project');
                }
            });
        }
    }

    //deletes multiple sessions
    deleteSessions(sessions) {
        if (window.confirm('Are you sure you want to delete ' + sessions.length + ' sessions?')) {
            const project = this.props.project;

            // delete sessions from project
            project.sessions = project.sessions.filter(s => !sessions.includes(s));

            // store project
            this.props.api.save(this.props.user.id, project, msg => {
                if (msg && msg.success) {
                    // update data
                    this.loadData();
                } else {
                    alert('An error occured while saving this project');
                }
            });
        }
    }

    sortSessions(sessions, sort) {
        const sorted = sessions;
        switch (sort.field) {
            case 'name': sorted.sort((a, b) => a.name > b.name); break;
            case 'tool': sorted.sort((a, b) => a.tool > b.tool); break;
            case 'date': sorted.sort((a, b) => a.date > b.date); break;
            default: return sorted;
        }
        return sort.order === 'desc' ? sorted.reverse() : sorted;
    }

    // based on the session, decide which url to generate
    generateSessionUrl(session){
        switch(session.tool){

            // dive-vu via within media suite
            case 'dive-vu':
                return "/tool/exploratory-search?path=/browser/session%3F"+encodeURIComponent(session.data.annotationId);
            break;

            // dive frontwise open beelden
            case 'dive-fw':
                return "http://openbeelden.diveplus.frontwise.com/browser/session?id="+encodeURIComponent(session.data.annotationId);
            break;

            default:
                console.error("Could not generate a Url for ", session);
        }
    }

    render() {
        const sessions = this.state.sessions;
        const currentUser = this.props.user;
        const currentUserId = currentUser.id;

        return (
            <div className={IDUtil.cssClassName('project-session-view')}>
                <div className="tools">
                    <div className="left">
                        <h3>Filters</h3>
                        <input
                            className="search"
                            type="text"
                            placeholder="Search Tool sessions"
                            value={this.state.filter.keywords}
                            onChange={this.keywordsChange.bind(this)}/>
                    </div>
                </div>

            <SortTable
                items={sessions}
                head={[
                    { field: 'name', content: 'Name', sortable: true },
                    { field: 'tool', content: 'Tool', sortable: true },
                    { field: 'date', content: 'Date', sortable: true },
                    { field: '', content: '', sortable: false },
                    { field: '', content: '', sortable: false },
                    { field: '', content: '', sortable: false }
                ]}
                row={session => [
                    {
                        props: { className: 'primary' },
                        content: <Link to={session.id}>{session.name}</Link>
                    },
                    { content: session.tool },
                    { content: session.created ? session.created.substring(0, 10)  : '-'},
                    {
                        content: (
                            <a className="btn blank warning" onClick={this.deleteSession.bind(this, session)}>
                                Delete
                            </a>
                        )
                    },
                    {
                        content: (
                            <a className="btn blank" onClick={exportDataAsJSON.bind(this, session)}>
                                Export
                            </a>
                        )
                    },
                    {
                        content: (
                            <a href={this.generateSessionUrl(session)} className="btn" target="_blank" rel="noopener noreferrer">
                                Open
                            </a>
                        )
                    }
                ]}
                onSort={this.sortSessions.bind(this)}
                loading={this.state.loading}
                bulkActions={[
                    { title: 'Delete', onApply: this.deleteSessions.bind(this) },
                    { title: 'Export', onApply: exportDataAsJSON.bind(this) }
                ]}
                defaultSort={this.defaultSort}/>
            </div>
        )
    }
}

ProjectSessionView.propTypes = {
    // project api
    api: PropTypes.shape({
        list: PropTypes.func.isRequired
    }),

    // current user object used for defining access roles per project
    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    }).isRequired
};

class WrappedProjectSessionView extends React.PureComponent {
    render() {
        return <ProjectViewWrapper {...this.props} renderComponent={ProjectSessionView} />
    }
}

WrappedProjectSessionView.propTypes = ProjectSessionView.propTypes;

export default WrappedProjectSessionView;
