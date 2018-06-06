import ProjectAPI from '../../../api/ProjectAPI';

import AnnotationUtil from '../../../util/AnnotationUtil';
import ComponentUtil from '../../../util/ComponentUtil';
import IDUtil from '../../../util/IDUtil';

import AnnotationStore from '../../../flux/AnnotationStore';

import ItemDetailsRecipe from '../../../ItemDetailsRecipe';

import PropTypes from 'prop-types';

/**
* Display a bookmark/annotation result list and handle the filtering and sorting
*/
class NestedTable extends React.PureComponent {

    constructor(props) {
        super(props);

        // retrieve persistent filters from localstorage
        this.filterKey = props.uid + '-filter';
        let filter = ComponentUtil.getJSONFromLocalStorage(this.filterKey);
        filter = filter ? filter : {keywords:''};

        this.state = {
            filteredItems: [],
            visibleItems: [],
            loading: true,
            order: 'created',
            filter,
        };
    }

    //load and filter data
    reloadData() {
        // filter
        const filtered = this.props.filterItems(
            this.props.items,
            this.state.filter
        );

        // sort
        const sorted = this.props.sortItems(filtered, this.state.order);

        // update state
        this.setState({
            filteredItems: filtered,
            visibleItems: sorted
        });
    }

    setSort(field) {
        this.setState({
            order: field,
            // filter list from original items to keep sort list consistent
            visibleItems: this.props.sortItems(this.state.filteredItems, field)
        });
    }

    //Listen for update, request new data if filter has been changed
    componentDidUpdate(prevProps, prevState) {
        //listen for items change
        if (prevProps.items != this.props.items) {
            this.reloadData();
            return;
        }

        // listen for filter change
        if (this.lastFilter !== this.state.filter) {
            this.lastFilter = this.state.filter;

            // throttle data requests
            if (this.requestDataTimeout) {
                clearTimeout(this.requestDataTimeout);
                this.requestDataTimeout = setTimeout(this.reloadData.bind(this), 300);
            } else {
                // firstrun
                this.reloadData();
            }
        }
    }

    // user changes a filter
    filterChange(key, e) {
        let filter = {};
        filter[key] = e.target.value;

        // create filter
        filter = Object.assign({}, this.state.filter, filter);

        // persistent filters: Store to localstorage
        ComponentUtil.storeJSONInLocalStorage(this.filterKey, filter);

        // update state
        this.setState({
            filter
        });
    }

    //when the sort type changes
    sortChange(e) {
        this.setSort(e.target.value);
    }

    // render filters
    renderFilters(filters){
        return filters.map((filter, index)=>{
            switch(filter.type){
                case 'search':
                    return(<input
                        key={index}
                        className="search"
                        type="text"
                        placeholder={filter.placeholder || "Search"}
                        value={this.state.filter[filter.key]}
                        onChange={this.filterChange.bind(this, filter.key)}
                        />)

                break;
                case 'select':
                    return (<span key={index}>
                        <label className="type-label" title={filter.titleAttr ? filter.titleAttr : null}>{filter.title}</label>

                        <select
                            disabled={filter.options.length == 0}
                            className="type-select"
                            value={this.state.filter[filter.key]}
                            onChange={this.filterChange.bind(this, filter.key)}>
                                <option />
                                {filter.options.map((option, index) => (
                                    <option key={index} value={option.value} disabled={option.disabled}>
                                        {option.name}
                                    </option>
                                ))}
                        </select>
                    </span>)
                break;
                default: 
                    console.error("Unknown filter type", filter);

            }
            return null
        });
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('nested-table')}>
                <div className="tools">
                    <div className="export-button btn primary"
                        onClick={this.props.onExport.bind(this, this.state.visibleItems)}>
                        Export all
                    </div>

                    <div className="filters">
                        <div className="left">
                            <h3>Filters</h3>
                            {this.renderFilters(this.props.filters)}
                        </div>

                        <div className="right">
                            <h3>Order</h3>

                            <select
                            value={this.state.order}
                            onChange={this.sortChange.bind(this)}>
                                {this.props.orders.map((type, index) => (
                                    <option key={index} value={type.value}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="results">{this.props.renderResults(this.state)}</div>
            </div>
        )
    }
}

NestedTable.propTypes = {
    filterItems: PropTypes.func.isRequired,
    filters: PropTypes.object,
    items: PropTypes.array.isRequired,
    onExport: PropTypes.func.isRequired,
    orders: PropTypes.array.isRequired,
    renderResults: PropTypes.func.isRequired,
    selection: PropTypes.array,
    sortItems: PropTypes.func.isRequired
};

NestedTable.defaultProps = {
    filters: {}
};

export default NestedTable;
