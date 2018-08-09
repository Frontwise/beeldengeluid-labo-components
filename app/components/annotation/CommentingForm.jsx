import IDUtil from '../../util/IDUtil';

/*
Goal:
	-

Input:
	- list of comments (props.data)
		- annotation ID
		- the comment (string value)
	- a annotation config (props.config)
	- onOutput (what to do after adding/removing a comment) --> should be changed to Flux?

Output/emits:
	- 'on change' (whenever adding/removing a comment)
		- data:
			- event type ('add', 'delete')
			- the item that was added/deleted (ID + value)
			- the list of comments ({text : 'some comment'})

HTML markup & CSS attributes:
	- regular div => .bg__comment-form

*/

class CommentingForm extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			data: this.props.data ? this.props.data : []
		}
	}

	addComment(e) {
		e.preventDefault();
		const cs = this.state.data;
		if(cs) {
			cs.push({text : this.comment.value});
			this.setState({data : cs}, this.onOutput.bind(this));
            this.comment.value = '';
		}
	}

	removeComment(index) {
		const cs = this.state.data;
		if(cs) {
			cs.splice(index, 1);
			this.setState({data : cs}, this.onOutput.bind(this));
		}
	}

	onOutput() {
		if(this.props.onOutput) {
			this.props.onOutput('comment', this.state.data);
		}
	}

	render() {
		let commentList = null;
		const comments = this.state.data.map((c, index) => {
			return (
				<li key={'com__' + index} className="list-group-item">
					<i className="fa fa-close interactive" onClick={this.removeComment.bind(this, index)}/>
					&nbsp;
					{c.text}
				</li>
			)
		}, this);
		if(comments.length > 0) {
			commentList = (
				<div>
					<h4>Saved comments</h4>
					<ul className="list-group">
						{comments}
					</ul>
				</div>
			)
		}

		return (
			<div className={IDUtil.cssClassName('comment-form')}>
				<br/>
				<div className="row">
					<div className="col-md-12">
						{commentList}
					</div>
				</div>
				<div className="row">
					<div className="col-md-12">
						<form>
							<div className="form-group">
								<h4>Comment</h4>
								<input
									ref={input => (this.comment = input)}
									type="text"
									className="form-control"
									placeholder="Add one or more comments or notes"
								/>
								<br/>
								<button className="btn btn-primary" onClick={this.addComment.bind(this)}>Add</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		)
	}
}

export default CommentingForm;
