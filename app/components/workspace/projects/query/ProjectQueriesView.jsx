import classNames from 'classnames';
import IDUtil from '../../../../util/IDUtil';
import ProjectQueriesTable from './ProjectQueriesTable';
import ProjectViewWrapper from '../ProjectViewWrapper';
import PropTypes from 'prop-types';
import { initHelp } from '../../helpers/helpDoc';

class ProjectQueriesView extends React.PureComponent {

    constructor(props) {
        super(props);
    }

    componentDidMount(){
        // store tab to sessionStorage
        window.sessionStorage.setItem("bg__project-tab", "queries");

        initHelp('Queries', '/help/pages/workspace/queries.html');
    }

    render() {

        return (
            <div className={IDUtil.cssClassName('project-queries-view')}>
                <ProjectQueriesTable project={this.props.project} user={this.props.user} />
            </div>
        )
    }
}

ProjectQueriesView.propTypes = {
    // project api
    api: PropTypes.shape({
        list: PropTypes.func.isRequired
    }),

    // current user object used for defining access roles per project
    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    }).isRequired
};

class WrappedProjectQueriesView extends React.PureComponent {
    render() {
        return <ProjectViewWrapper {...this.props} renderComponent={ProjectQueriesView} />
    }
}

WrappedProjectQueriesView.propTypes = ProjectQueriesView.propTypes;

export default WrappedProjectQueriesView;
