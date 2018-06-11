import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';

import ProjectViewWrapper from '../ProjectViewWrapper';

import AnnotationTable from './AnnotationTable';


import PropTypes from 'prop-types';

/**
* Main page for a project's bookmarks and annotations. This page mainly handles
* the view selection: Bookmark- or Annotation centric.
*/
class ProjectAnnotationView extends React.PureComponent {

    constructor(props) {
        super(props);

        // unique keys used for storage
        this.keys = {
            view: 'bg__project-annotation-view'
        };

        // get view from session storage (bookmark-centric OR annotation-centric)
        const view = window.sessionStorage.getItem(this.keys.view) || 'classification-centric';
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
        document.body.style.background = 'linear-gradient(180deg, white, white 393px, #faf6f6 393px, #faf6f6)';
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
            case 'classification-centric': 
                viewComponent = (
                    <AnnotationTable {...defaultOptions}
                        key="classification" 
                        type="classification" 
                        title="Codes" 
                        filters={["search","vocabulary","bookmarkGroup"]}
                        sort={["created","a-z-label","z-a-label","vocabulary"]}
                    />
                );
                break;

            case 'comment-centric': 
                viewComponent = (
                    <AnnotationTable {...defaultOptions}
                        key="comments" 
                        type="comment" 
                        title="Comments" 
                        filters={["search","classification","bookmarkGroup"]}
                        sort={["created","a-z-text","z-a-text"]}
                    />
                );
                break;

            case 'link-centric': 
                viewComponent = (
                    <AnnotationTable {...defaultOptions}
                        key="links" 
                        type="link" 
                        title="Links"  
                        filters={["search","classification","bookmarkGroup"]}
                        sort={["created","a-z-label","z-a-label"]}
                    />
                );
                break;

            case 'metadata-centric': 
                viewComponent = (
                    <AnnotationTable {...defaultOptions}
                        key="metadata" 
                        type="metadata" 
                        title="Metadata cards" 
                        filters={["search","classification","bookmarkGroup"]}
                        sort={["created","template"]}
                    />
                );
                break;
        }
        
    return (
        <div className={IDUtil.cssClassName('project-data-view')}>
            <div className="tools">
                <div className="view">
                    <h3>Type</h3>
                    <div className="radiogroup">

                        <input
                            type="radio"
                            name="view"
                            value="classification-centric"
                            id="view-classification"
                            checked={this.state.view === 'classification-centric'}
                            onChange={this.viewChange}/>

                        <label htmlFor="view-classification">Codes</label>

                         <input
                            type="radio"
                            name="view"
                            value="comment-centric"
                            id="view-comment"
                            checked={this.state.view === 'comment-centric'}
                            onChange={this.viewChange}/>

                        <label htmlFor="view-comment">Comments</label>

                         <input
                            type="radio"
                            name="view"
                            value="link-centric"
                            id="view-link"
                            checked={this.state.view === 'link-centric'}
                            onChange={this.viewChange}/>

                        <label htmlFor="view-link">Links</label>

                         <input
                            type="radio"
                            name="view"
                            value="metadata-centric"
                            id="view-metadata"
                            checked={this.state.view === 'metadata-centric'}
                            onChange={this.viewChange}/>

                        <label htmlFor="view-metadata">Metadata cards</label>
                    </div>
                </div>
            </div>
            {viewComponent}
        </div>
        );
    }
}

ProjectAnnotationView.propTypes = {
    user: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    loadBookmarkCount: PropTypes.func,
};

class WrappedProjectAnnotationView extends React.PureComponent {
    render() {
        return (
            <ProjectViewWrapper renderComponent={ProjectAnnotationView} {...this.props} />
        );
    }
}

WrappedProjectAnnotationView.propTypes = ProjectAnnotationView.propTypes;

export default WrappedProjectAnnotationView;
