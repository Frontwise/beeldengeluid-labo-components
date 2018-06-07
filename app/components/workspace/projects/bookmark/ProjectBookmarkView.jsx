import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import ProjectViewWrapper from '../ProjectViewWrapper';

import BookmarkTable from './BookmarkTable';


import PropTypes from 'prop-types';

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
    user: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    loadBookmarkCount: PropTypes.func,
};

class WrappedProjectBookmarkView extends React.PureComponent {
    render() {
        return (
            <ProjectViewWrapper renderComponent={ProjectBookmarkView} {...this.props} />
        );
    }
}

WrappedProjectBookmarkView.propTypes = ProjectBookmarkView.propTypes;

export default WrappedProjectBookmarkView;
