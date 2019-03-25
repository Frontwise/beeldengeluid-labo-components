import IDUtil from '../../util/IDUtil';

class Paging extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			MAX_BUTTONS : 10
		}
	}

	gotoPage(pageNumber) {
		if(this.props.gotoPage) {
			this.props.gotoPage(this.props.queryId, pageNumber);
		}
	}

	render () {
		const pagingButtons = []
		let start = 1
		let end = this.props.numPages;
		let showPrevious = false;
		let showFirst = false;
		let showNext = false;
		let showLast = false;
		if(this.props.numPages > 1) { //only show buttons if there is more than one page
			if(this.props.numPages > this.state.MAX_BUTTONS) {
				if(this.props.currentPage > 5) {
					start = this.props.currentPage - 3;
					showFirst = true;
					if(start > this.state.MAX_BUTTONS) {
						showPrevious = true;
					}
				}
				if(start + this.state.MAX_BUTTONS > this.props.numPages) {
					end = this.props.numPages;
				} else {
					end = start + this.state.MAX_BUTTONS;
				}
				if(end < this.props.numPages) {
					showLast = true;
				}
				if(end + this.state.MAX_BUTTONS < this.props.numPages) {
					showNext = true;
				}
			}
			if(showFirst) {
				pagingButtons.push(
					<button key="__first_page" type="button" className="btn btn-default"
						onClick={this.gotoPage.bind(this, 1)}>
						First
					</button>);
			}
			if(showPrevious) {
				pagingButtons.push(
					<button key="__previous_pages" type="button" className="btn btn-default"
						onClick={this.gotoPage.bind(this, start - this.state.MAX_BUTTONS)}>
						Previous
					</button>);
			}
			for(let i=start;i<=end;i++) {
				let className = 'btn btn-default';
				if(this.props.currentPage == i) {
					className += ' active';
				}
				pagingButtons.push(
					<button key={i} type="button" className={className}
						onClick={this.gotoPage.bind(this, i)}>
						{i}
					</button>
				);
			}
			if(showNext) {
				pagingButtons.push(
					<button key="__next_pages" type="button" className="btn btn-default next-last-page"
						onClick={this.gotoPage.bind(this, this.props.currentPage + 1)}>
						Next
					</button>);
			}
			if(showLast) {
				pagingButtons.push(
					<button key="__last_page" type="button" className="btn btn-default next-last-page"
						onClick={this.gotoPage.bind(this, this.props.numPages)}>
						Last
					</button>);
			}
		}
		//define css class names
		const classNames = ['btn-group', IDUtil.cssClassName('paging')]
		return (
			<div className={classNames.join(' ')} role="group" aria-label="...">
				{pagingButtons}
			</div>
		);
	}

}

export default Paging;
