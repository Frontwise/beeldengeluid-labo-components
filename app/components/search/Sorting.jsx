import IDUtil from '../../util/IDUtil';

//stateless, this component is updated (via props) after the parent receives new search results
class Sorting extends React.Component {

	constructor(props) {
		super(props);
	}

	sortResults(sortField, order) {
		if(order) {
			order = order == 'asc' ? 'desc' : 'asc';
		} else {
			order = 'desc';
		}
		const sortParams = {
			field : sortField,
			order : order
		}
		if(this.props.sortResults) {
			this.props.sortResults(this.props.queryId, sortParams);
		}
	}

	render() {
		let dateSortBtn = null;
		let dateClass = null;
		let dateOrderIcon = null;
		let dateOrder = null;

		let relClass = null;
		let relOrderIcon = null;
		let relOrder = null;

		//first see what order icon (asc, desc) to draw
		let tempOrderIcon = null;
		if(this.props.sortParams.order == 'asc') {
			tempOrderIcon = <i className="fa fa-sort-up"></i>

		} else if(this.props.sortParams.order == 'desc') {
			tempOrderIcon = <i className="fa fa-sort-desc"></i>
		}

		//when the field is _source it means ES sorting by relevance
		//TODO later abstract this, so this component is not dependant on ES like data!!!
		if(this.props.sortParams.field == '_score') {
			relClass = 'btn btn-default active';
			dateClass = 'btn btn-default';
			relOrder = this.props.sortParams.order;
			relOrderIcon = tempOrderIcon;
		} else {
			relClass = 'btn btn-default';
			dateClass = 'btn btn-default active';
			dateOrder = this.props.sortParams.order;
			dateOrderIcon = tempOrderIcon;
		}

		//define css class names
		const classNames = ['btn-group', IDUtil.cssClassName('sorting')]


		const relSortBtn = (
			<button
				className={relClass}
				title="Sort by relevance"
				onClick={this.sortResults.bind(this, '_score', relOrder)}>
				<i className="fa fa-cogs"></i>
				&nbsp;
				{relOrderIcon}
			</button>
		)

		if(this.props.dateField) {
			dateSortBtn = (
				<button
					className={dateClass}
					title={'Sort by: ' + this.props.collectionConfig.toPrettyFieldName(this.props.dateField)}
					onClick={this.sortResults.bind(this, this.props.dateField, dateOrder)}>
					<i className="fa fa-calendar"></i>
					&nbsp;
					{dateOrderIcon}
				</button>
			);
		}

		return (
			<div className={classNames.join(' ')} role="group" aria-label="...">
				{relSortBtn}
				{dateSortBtn}
			</div>
		)
	}
}

export default Sorting;