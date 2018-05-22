import IDUtil from '../../util/IDUtil';

import BulkActions from './helpers/BulkActions';
import Pagination from './helpers/Pagination';

import classNames from 'classnames';
import PropTypes from 'prop-types';

/**
* A Table component with headers and rows that handles row selection and pagination.
* Its contents are provided by the props
* TODO move this component to a higher package, since it might be reusable in other places as well
*/

class SortTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            currentPage: this.props.currentPage,
            bulkAction: null,
            items: props.items,
            selection: [],
            sort: this.props.defaultSort
        };
    }

    //update the state when receiving new props
    componentWillReceiveProps(nextProps) {
        if (nextProps.items !== this.state.items) {
            this.setState({
                items: this.props.onSort(nextProps.items, this.state.sort),
                selection: []
            });
        }
    }

    //sort data based on the given field
    sort(field) {
        const sort = {
            field: field,
            order: this.state.sort.field === field && this.state.sort.order === 'asc' ? 'desc' : 'asc'
        };

        this.setState({
            sort,
            items: this.props.onSort(this.props.items, sort)
        });
    }

    selectAll(e) {
        this.setState({
            selection: e.target.checked ? this.state.items.slice() : []
        });
    }

    selectItem(item, e) {
        //rewrite the hard to read ?/: stuff
        this.setState({
            selection: e.target.checked ? // add if not in the array yet
                this.state.selection.includes(item) ? this.state.selection
                    : [...this.state.selection, item]
                : // remove
                this.state.selection.filter(selected => selected !== item)
        });
    }

    //go to a different page in the table
    setPage(currentPage) {
        this.setState({ currentPage });
    }

    /*********************************************************************
    ***************************** RENDERING FUNCTIONS ********************
    *********************************************************************/

    //get a header <th> element
    getHeader(index, field, content, sortable) {
        const active = sortable && this.state.sort.field === field;
        const sortFunc = sortable ? { onClick: this.sort.bind(this, field) } : {};
        return (
            <th
                key={index}
                className={classNames({sortable, active, desc: active && this.state.sort.order === 'desc'})}
                {...sortFunc}
            >
                {content}
            </th>
        );
    }

    render() {
        // pagination vars
        const pageCount = Math.ceil(this.state.items.length / this.props.perPage);
        const currentPage = Math.min(this.state.currentPage, pageCount - 1);
        const currentIndex = currentPage * this.props.perPage;
        const itemsOnPage = this.state.items.slice(
            currentIndex,
            currentIndex + this.props.perPage
        );

        //populate the header using the provided header function
        const header = this.props.head.map((head, index) =>
            this.getHeader(index, head.field, head.content, head.sortable)
        )

        //populate the table body using the provided row function
        const tableBody = itemsOnPage.map((item, index) => (
            <tr key={index}>
                <td>
                    <input
                        type="checkbox"
                        checked={this.state.selection.includes(item)}
                        onChange={this.selectItem.bind(this, item)}/>
                </td>
                {this.props.row(item).map((td, index) => (
                    <td key={index} {...td.props}>
                        {td.content}
                    </td>
                ))}
            </tr>
        ))

        //show the correct message when there are no items
        let message = null;
        if(this.state.items.length == 0) {
            if(this.state.loading) {
                message = <h3 className="error">Loading...</h3>
            } else {
                message = <h3 className="error">No results</h3>
            }
        }

        return (
            <div className={IDUtil.cssClassName('sort-table')}>
                <table>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    title="Select all"
                                    checked={
                                        this.state.items.length > 0 &&
                                        this.state.selection.length === this.state.items.length
                                    }
                                    onChange={this.selectAll.bind(this)}/>
                            </th>
                            {header}
                        </tr>
                    </thead>
                    <tbody className={this.props.loading ? 'loading' : ''}>
                        {tableBody}
                    </tbody>
                </table>

                {message}

                <Pagination
                    currentPage={currentPage}
                    perPage={this.props.perPage}
                    pageCount={pageCount}
                    onClick={this.setPage.bind(this)}/>

                <BulkActions
                    bulkActions={this.props.bulkActions}
                    selection={this.state.selection}/>
            </div>
        )
    }
}

SortTable.propTypes = {
    items: PropTypes.array.isRequired,
    bulkActions: PropTypes.array.isRequired,
    head: PropTypes.array.isRequired, //function for generating a header row
    row: PropTypes.func.isRequired, //function for generating a row of data
    onSort: PropTypes.func.isRequired,
    perPage: PropTypes.number,
    currentPage: PropTypes.number,
    defaultSort: PropTypes.object.isRequired,
};

SortTable.defaultProps = {
    perPage: 20,
    currentPage: 0,
    defaultSort: { field: null, order: 'asc' },
};

export default SortTable;
