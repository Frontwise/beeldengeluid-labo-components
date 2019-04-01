import BookmarkTable from './BookmarkTable';
import IDUtil from '../../../../util/IDUtil';
import ProjectAPI from '../../../../api/ProjectAPI';
import ProjectViewWrapper from '../ProjectViewWrapper';
import PropTypes from 'prop-types';
import { initHelp } from '../../helpers/helpDoc';

/**
* Main page for a project's bookmarks and annotations. This page mainly handles
* the view selection: Bookmark- or Annotation centric.
*/
class ProjectBookmarkView extends React.PureComponent {

    constructor(props) {
        super(props);

        // unique keys used for storage
        this.keys = {
            view: 'bg__project-bookmarks-view'
        };

        // In case you want to get the view from session storage, use:
        // window.sessionStorage.getItem(this.keys.view) ||
        const view = 'bookmark-centric';
        this.state = {
            annotations: [],
            loading: true,
            view: view
        };

        this.viewChange = this.viewChange.bind(this);
        this.setView = this.setView.bind(this);
    }

    componentDidMount() {
        // instead of breaking out of the container, change the background color to a white and grey region
        document.body.style.background = 'linear-gradient(180deg, white, white 343px, #faf6f6 343px, #faf6f6)';

        // store tab to sessionStorage
        window.sessionStorage.setItem("bg__project-tab", "bookmarks");

        initHelp('Bookmarks', '/feature-doc/howtos/user-projects/bookmarks');
    }

    componentWillUnmount() {
        //reset background color of body
        document.body.style.background = 'white';
    }

    viewChange(e) {
        this.setView(e.target.value);
    }

    setView(view){
          // store view to session storage
        window.sessionStorage.setItem(this.keys.view, view);

        this.setState({
            view
        });
    }

    render() {
        let viewComponent = null;
        const defaultOptions = {
            user: this.props.user,
            project: this.props.project,
            setView: this.setView,
            loadBookmarkCount: this.props.loadBookmarkCount,
        }
        // set viewComponent, based on the current state.view
        // key is required to force the component to update on changes
        switch (this.state.view) {
            case 'bookmark-centric':
                viewComponent = (
                    <BookmarkTable
                       {...defaultOptions}
                    />
                );
            break;
        }

    return (
        <div className={IDUtil.cssClassName('project-data-view')}>
            <div className="tools"></div>
            {viewComponent}
        </div>
        );
    }
}

ProjectBookmarkView.propTypes = {
    project: PropTypes.shape({
        id : PropTypes.string.isRequired,
        name : PropTypes.string.isRequired,
        description : PropTypes.string,
        created : PropTypes.string,
        user : PropTypes.string,
        queries : PropTypes.array,
        sessions : PropTypes.array,
    }).isRequired,

    user: PropTypes.shape({
        id : PropTypes.string.isRequired,
        name : PropTypes.string.isRequired,
    }).isRequired,
    loadBookmarkCount : PropTypes.func,

    //the following props are available, but not used
    clientId : PropTypes.string,
    params : PropTypes.object,
    recipe : PropTypes.shape({
        id : PropTypes.string.isRequired,
        ingredients : PropTypes.object.isRequired
    }),
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

class WrappedProjectBookmarkView extends React.PureComponent {
    render() {
        return (
            <ProjectViewWrapper renderComponent={ProjectBookmarkView} {...this.props} />
        );
    }
}

WrappedProjectBookmarkView.propTypes =  {
    user: PropTypes.object.isRequired,
    loadBookmarkCount: PropTypes.func
}

export default WrappedProjectBookmarkView;
