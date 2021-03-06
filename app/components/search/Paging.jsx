import IDUtil from '../../util/IDUtil';

class Paging extends React.Component {

	constructor(props) {
		super(props);
		this.MAX_BUTTONS = 10;
	}

	gotoPage(pageNumber) {
		if(this.props.gotoPage) {
			this.props.gotoPage(this.props.queryId, pageNumber);
		}
	}

	render () {
		const pagingButtons = []

		let showPrevious = false;
		let showFirst = false;
		let showNext = false;
		let showLast = false;
		if(this.props.numPages > 1) { //only show buttons if there is more than one page

			//only adjust the start & end if there are more than 10 buttons on the page
			let start = 1
			let end = this.props.numPages;
			if(this.props.numPages > this.MAX_BUTTONS) {

				//determine the start

				if(this.props.currentPage > 5) {
					start = this.props.currentPage - 3;
					showFirst = true;
					if(this.props.currentPage > this.MAX_BUTTONS) {
						showPrevious = true;
					}
				}

				//determine the end

				if(start + this.MAX_BUTTONS > this.props.numPages) {
					end = this.props.numPages;
				} else {
					end = start + this.MAX_BUTTONS;
				}


				if(end < this.props.numPages) {
					showLast = true;
				}
				if(end + this.MAX_BUTTONS < this.props.numPages) {
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
					<button key="__previous_pages" type="button" className="btn btn-default" title="Back 10 pages"
						onClick={this.gotoPage.bind(this, this.props.currentPage - this.MAX_BUTTONS)}>
						Previous
					</button>);
			}

			//render the individual page number buttons
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
					<button key="__next_pages" type="button" className="btn btn-default next-last-page" title="Skip 10 pages"
						onClick={this.gotoPage.bind(this, this.props.currentPage + this.MAX_BUTTONS)}>
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
