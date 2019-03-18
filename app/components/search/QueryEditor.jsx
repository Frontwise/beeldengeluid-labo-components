import ProjectAPI from '../../api/ProjectAPI';
import IDUtil from '../../util/IDUtil';
import MessageHelper from "../helpers/MessageHelper";
import FlexBox from '../FlexBox';
import ProjectQueriesTable from '../workspace/projects/query/ProjectQueriesTable';

import PropTypes from 'prop-types';

class QueryEditor extends React.PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			project : null,
            errorMessage: false
		};
		this.CLASS_PREFIX = 'qed'
	}

	componentDidMount() {
		this.loadData();
	}

	loadData() {
		ProjectAPI.get(this.props.user.id, this.props.project.id, (p) => {
			this.setState({
				project : p
			})
		})
	}

	save(e) {
		e.preventDefault();

		// require query name value
        if(!this.queryName.value){
            this.setState({
                errorMessage: true
            });
            return;
        }

		if(this.state.project && this.props.query) {
			const project = this.state.project;
			let query = this.props.query;
			query.id = IDUtil.guid(); //always assign a new ID, since this component only supports saving new queries
			project.queries.push({
				name : this.queryName.value,
				query : query
			});

			 // store project
            ProjectAPI.save(this.props.user.id, project, resp => {
                if (resp) {
                    project.lastQuerySaved = this.queryName.value ? this.queryName.value : null;
                	this.onOutput({project, queryName: this.queryName.value});
                } else {
                    alert('An error occured while saving this project');
                    this.onOutput(null);
                }
            });
		} else { //this should never happen though
			this.onOutput(null);
		}
	}

	//communicate the result back to the owning component
	onOutput(data) {
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, data);
		}
	}

	render() {
		let formOrMessage = null;
		let queryTable = null;
		const classNames = ['bg__err-msg'];
		if (!this.state.errorMessage) {
            classNames.push('hide');
        }

		if(this.state.project) {
			formOrMessage = (
				<div className="row">
                    <div className="col-md-12">
                        <form className="form-horizontal" onSubmit={this.save.bind(this)}>
                            <div className="form-group">
                                <div className="tab-content">
                                    <div className="bg__query-parameters">
                                        <div className="bg__query-header">
                                            Query Details
                                        </div>
                                        <div className="bg__query-details">
                                            {MessageHelper.__renderQuery(this.props.query)}
                                        </div>
                                    </div>
                                </div>
                                <hr/>
    							<label className="bg__query-header" htmlFor="queryName">Name</label>
    							<input
    								type="text"
    								className="form-control"
    								id="queryName"
                                    ref={input => (this.queryName = input)}
    								placeholder="Name your query"/>
  							</div>
                            <div className={classNames.join(' ')}>
                                Name field is required. <br/> Please add a name to the query to be saved.
                            </div>
  							<button type="submit" className="btn btn-default">Save</button>
                        </form>
                    </div>
                </div>
			);
			queryTable = (
                <div className="row">
                    <FlexBox isVisible={false} title="Saved queries in current project">
                        <div className={[
                            IDUtil.cssClassName('no-bootstrap-custom-styling'),
                            IDUtil.cssClassName('table', this.CLASS_PREFIX)].join(' ')}>
                            <div className="bg__query-header">Project: {this.props.project.name}</div>
                            <ProjectQueriesTable project={this.state.project} user={this.props.user}/>
                        </div>
                    </FlexBox>
                </div>
			)
		} else {
			formOrMessage = <h4>Loading project queries...</h4>
		}
		return (
			<div className={IDUtil.cssClassName('query-editor')}>
				{formOrMessage}
				{queryTable}
			</div>
		)
	}

}

QueryEditor.propTypes = {
    // current user object used for defining access roles per project
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }).isRequired,

    project: PropTypes.shape({
        id: PropTypes.string.isRequired
    }).isRequired,

    query: PropTypes.object.isRequired
};

export default QueryEditor;
