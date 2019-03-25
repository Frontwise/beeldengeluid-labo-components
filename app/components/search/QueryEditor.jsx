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
            errorMessage: false
		};
		this.CLASS_PREFIX = 'qed';
	}

    //communicate the result back to the owning component
    onOutput(data) {
        if(this.props.onOutput) {
            this.props.onOutput(this.constructor.name, data);
        }
    }

	save = e => {
		e.preventDefault();

		// require query name value
        if(!this.queryName.value){
            this.setState({
                errorMessage: true
            });
            return;
        }

		if(this.props.query) {
            const project = this.props.project;
			let query = this.props.query;
			query.id = IDUtil.guid(); //always assign a new ID, since this component only supports saving new queries
			project.queries.push({
				name : this.queryName.value,
				query : query
			});

			 // store project
            ProjectAPI.save(this.props.user.id, project, resp => {
                if (resp) {
                	this.onOutput({project, queryName: this.queryName.value});
                } else {
                    alert('An error occured while saving this project');
                    this.onOutput(null);
                }
            });
		} else { //this should never happen though
			this.onOutput(null);
		}
	};

    renderValidationFailed = () => {
        return (
            <div className={IDUtil.cssClassName('validation-failed')}>
               * Name field is required. <br/> Please name the query before saving it.
            </div>
        );
    };

    renderForm = errorMessage => {
        const validationFailed = errorMessage ? this.renderValidationFailed() : null;
        return (
            <form className="form-horizontal" onSubmit={this.save}>
                <div className="form-group">
                    <div className="tab-content">
                        <div>
                            <h4>
                                Query Details
                            </h4>
                            <div className={IDUtil.cssClassName('query-params', this.CLASS_PREFIX)}>
                                {MessageHelper.__renderQuery(this.props.query)}
                            </div>
                        </div>
                    </div>
                    <hr/>
                    <h4>Name</h4>
                    <input
                        type="text"
                        className="form-control"
                        id="queryName"
                        ref={input => (this.queryName = input)}
                        placeholder="Name your query"/>
                    </div>
                    {validationFailed}
                    <button type="submit" className="btn btn-default">Save</button>
            </form>
        );
    };

    renderQueryTable = (project, user) => {
        if(project.queries.length === 0) return null;

        return (
            <FlexBox isVisible={false} title={'Other queries saved in: ' + project.name}>
                <div className={[
                    IDUtil.cssClassName('no-bootstrap-custom-styling'),
                    IDUtil.cssClassName('table', this.CLASS_PREFIX)].join(' ')
                }>
                    <ProjectQueriesTable project={project} user={user}/>
                </div>
            </FlexBox>
        );
    };

	render() {
		const form = this.renderForm(this.state.errorMessage);
		const queryTable = this.renderQueryTable(this.props.project, this.props.user);

		return (
			<div className={IDUtil.cssClassName('query-editor')}>
				{form}
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
