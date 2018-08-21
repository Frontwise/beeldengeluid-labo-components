import ProjectAPI from '../../api/ProjectAPI';
import IDUtil from '../../util/IDUtil';

import ProjectQueriesTable from '../workspace/projects/query/ProjectQueriesTable';

import PropTypes from 'prop-types';

class QueryEditor extends React.PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			project : null
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
		if(this.state.project && this.props.query) {
			const project = this.state.project;
			project.queries.push({
				name : this.queryName.value,
				query : this.props.query
			});

			 // store project
            ProjectAPI.save(this.props.user.id, project, resp => {
                if (resp) {
                	this.onOutput(project);
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
		if(this.state.project) {
			formOrMessage = (
				<div className="row">
                    <div className="col-md-12">
                        <form className="form-horizontal" onSubmit={this.save.bind(this)}>
                            <div class="form-group">
    							<label htmlFor="queryName">Name</label>
    							<input
    								type="text"
    								className="form-control"
    								id="queryName"
                                    ref={input => (this.queryName = input)}
    								placeholder="Name your query"/>
  							</div>
  							<button type="submit" className="btn btn-default">Save</button>
                        </form>
                    </div>
                </div>
			);
			queryTable = (
				<div className="row">
	                <div className={[
	                	IDUtil.cssClassName('no-bootstrap-custom-styling'),
						IDUtil.cssClassName('table', this.CLASS_PREFIX)].join(' ')}>
	                    <ProjectQueriesTable project={this.state.project} user={this.props.user}/>
					</div>
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
