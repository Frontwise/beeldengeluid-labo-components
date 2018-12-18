import AnnotationUtil from '../../util/AnnotationUtil';
import IDUtil from '../../util/IDUtil';
import AnnotationAPI from '../../api/AnnotationAPI';


class BookmarkSelector extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			allBookmarkGroups : [],
			selectedGroups : {}
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
			this.setState({allBookmarkGroups : allGroups || []});
		}
	}

	updateGroupMembership(resourceId, allGroups) {		
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
			this.onUpdateGroupMembership.bind(this, allGroups),
			0, //offset 
			250, //size
			null, //sort direction
			null //date range
		);
	}

	onUpdateGroupMembership(allGroups, resourceGroups) {
		const selectedGroups = {}		
		allGroups.forEach(group => {
			if(resourceGroups.findIndex(resourceGroup => resourceGroup.id === group.id) != -1) {
				selectedGroups[group.id] = true;
			}
		})
		this.setState({
			allBookmarkGroups : allGroups, 
			selectedGroups : selectedGroups
		});
	}

	addNewBookmarkGroup(e) {
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
		//assign a guid, so the multi-select mechanism does not break in this component (context: normally the annotation ID is generated on the server)
		annotation.id = IDUtil.guid();
		const allBookmarkGroups = this.state.allBookmarkGroups;
		allBookmarkGroups.push(annotation);

		//update the state and reset the text field to ''
		this.setState({
			allBookmarkGroups : allBookmarkGroups
		}, () => {this.setSearchTerm.value = ''})
	}

	//selects or deselects a bunch of groups
	toggleBookmarkGroup(group) {
		const selectedGroups = this.state.selectedGroups;
		if(selectedGroups[group.id] === true) {
			delete selectedGroups[group.id]
		} else {
			selectedGroups[group.id] = true;
		}
		this.setState({selectedGroups : selectedGroups});
	}

	//communicate back a multi-target annotation with a classification body
	onOutput() {
		if(this.props.onOutput) {
			//returns all bookmark groups (multi-target annotations) + which have been selected
			this.props.onOutput(
				this.constructor.name, 
				{
					allGroups : this.state.allBookmarkGroups,
					selectedGroups : this.state.selectedGroups
				}
			);
		}
	}

	//TODO implement deleting groups from here
	deleteGroup() {
		console.debug('TO BE IMPLEMENTED');
	}

	render() {
		let bookmarkList = null;
		if(this.state.allBookmarkGroups.length > 0) {
			//TODO which part of the body is the name of the bookmark group?
		 	const options = this.state.allBookmarkGroups.sort((a, b) => {
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
		 			<a className="list-group-item" href="#" key={'an__' + index} onClick={this.toggleBookmarkGroup.bind(this, group)}>
		 				<i className="fa fa-bookmark" style={ this.state.selectedGroups[group.id] === true ? {color: '#468dcb'} : {color: 'white'} }/>
		 				&nbsp;
		 				{group.body[0].label}
		 				<span className="member-count">Bookmarks: {group.target.length}</span> 						 				
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
								<div className="input-group">
									<div className="input-group-btn">    
										<button className="btn btn-default" onClick={this.addNewBookmarkGroup.bind(this)}>New</button>
									</div>
									<input
	                                    ref={input => (this.setSearchTerm = input)}
										type="text"
										className="form-control"
										aria-label="Create new bookmark group"
									/>									
								</div>
							</div>
						</form>
					</div>
				</div>
				<div className="row">
					<button className="btn btn-primary btn-save" onClick={this.onOutput.bind(this)}>Save</button>
				</div>
			</div>
		)
	}
}

export default BookmarkSelector;
