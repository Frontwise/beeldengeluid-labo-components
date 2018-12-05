import AnnotationUtil from '../../util/AnnotationUtil';
import IDUtil from '../../util/IDUtil';
import AnnotationAPI from '../../api/AnnotationAPI';


class BookmarkSelector extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			bookmarkGroups : []
		}
	}

	componentDidMount() {
		let filter = {
			'user.keyword' : this.props.user.id,
			'project' : this.props.project.id,
			'motivation' : 'bookmarking'
		}
		AnnotationAPI.getFilteredAnnotations(
			this.props.user.id,
			filter,
			null, //not_filters
			this.onLoadBookmarkAnnotations.bind(this)
		);
	}

	onLoadBookmarkAnnotations(allGroups) {
		if(this.props.resourceId) {
			this.updateGroupMembership(this.props.resourceId, allGroups);
		} else {
			this.setState({bookmarkGroups : allGroups || []});
		}
	}

	updateGroupMembership(resourceId, bookmarkGroups) {		
		const filter = {			
			'target.selector.value.id' : resourceId,
			'user.keyword' : this.props.user.id,
			'motivation' : 'bookmarking'
		}
		if(this.props.project && this.props.project.id) {
			filter['project'] = this.props.project.id
		}
		AnnotationAPI.getFilteredAnnotations(
			this.props.user.id, 
			filter, 
			null, 
			this.onUpdateGroupMembership.bind(this, bookmarkGroups),
			0, //offset 
			250, //size
			null, //sort direction
			null //date range
		);
	}

	onUpdateGroupMembership(allGroups, resourceGroups) {		
		allGroups.forEach(group => {
			group.isMember = resourceGroups.findIndex(resourceGroup => resourceGroup.id === group.id) != -1;
		})
		this.setState({bookmarkGroups : allGroups});
	}

	submitNewBookmark(e) {
		e.preventDefault();
		let annotation = AnnotationUtil.generateEmptyW3CMultiTargetAnnotation(
			this.props.user,
			this.props.project,
			this.props.collectionId,
			[] //empty target
		)
		annotation.body = [{
			"annotationType": "classification",
			"vocabulary": "clariahwp5-bookmark-group",
			"label": this.setSearchTerm.value,
			"user": this.props.user.id
		}]
		this.onOutput(annotation);
	}

	//communicate back a multi-target annotation with a classification body
	onOutput(bookmarkGroup) {
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, bookmarkGroup);
		}
	}

	render() {
		let bookmarkList = null;
		if(this.state.bookmarkGroups.length > 0) {
			//TODO which part of the body is the name of the bookmark group?
		 	const options = this.state.bookmarkGroups.sort((a, b) => {
				const nameA = a.body[0].label.toUpperCase(); // ignore upper and lowercase
				const nameB = b.body[0].label.toUpperCase(); // ignore upper and lowercase
				if (nameA < nameB) {
					return -1;
				}
				if (nameA > nameB) {
					return 1;
				}

				// names must be equal
				return 0;
		 	}).map((group, index) => {
		 		return (
		 			<a className="list-group-item" href="#" key={'an__' + index} onClick={this.onOutput.bind(this, group)}>
		 				<i className="fa fa-bookmark" style={ group.isMember ? {color: '#468dcb'} : {color: 'white'} }/>
		 				&nbsp;
		 				{group.body[0].label}		 						 				
		 			</a>
		 		)
		 	});
		 	bookmarkList = (
		 		<div className="list-group">
		 			{options}
		 		</div>
		 	)
		}
		return (
			<div className={IDUtil.cssClassName('bookmark-selector')}>
				<br/>
				<div className="row">
					<div className="col-md-12">
						{bookmarkList}
					</div>
				</div>
				<div className="row">
					<div className="col-md-12">
						<form>
							<div className="form-group">
								<h4>Bookmark group</h4>
								<input
                                    ref={input => (this.setSearchTerm = input)}
									type="text"
									className="form-control"
								/>
								<br/>
								<button className="btn btn-primary" onClick={this.submitNewBookmark.bind(this)}>Use</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		)
	}
}

export default BookmarkSelector;
