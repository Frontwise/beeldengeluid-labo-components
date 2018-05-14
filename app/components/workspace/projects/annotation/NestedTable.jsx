import ProjectAPI from '../../../../api/ProjectAPI';

import AnnotationUtil from '../../../../util/AnnotationUtil';
import IDUtil from '../../../../util/IDUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import ItemDetailsRecipe from '../../../../ItemDetailsRecipe';

import PropTypes from 'prop-types';

/**
* Display a bookmark/annotation result list and handle the filtering and sorting
*/
class NestedTable extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            filteredItems: [],
            visibleItems: [],
            loading: true,
            filter: {
                keywords: '',                
            },
            order: 'created'
        };
    }


    componentWillMount() {
        // instead of breaking out of the container, change the background color to a white and gray region
        document.body.style.background = 'linear-gradient(180deg, white, white 393px, #faf6f6 393px, #faf6f6)';
    }

    componentWillUnmount() {
        //reset background color of body
        document.body.style.background = 'white';
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

    //when the user types in the filter field
    keywordsChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                keywords: e.target.value
            })
        });
    }

    //when the type pull down value changes
    typeChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                type: e.target.value
            })
        });
    }

    //when the sort type changes
    sortChange(e) {
        this.setSort(e.target.value);
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

                            <input
                                className="search"
                                type="text"
                                placeholder="Search"
                                value={this.state.filter.keywords}
                                onChange={this.keywordsChange.bind(this)}/>

                            <label className="type-label">Type</label>

                            <select
                                className="type-select"
                                value={this.state.type}
                                onChange={this.typeChange.bind(this)}>
                                    <option />
                                    {this.props.filters.map((filter, index) => (
                                        <option key={index} value={filter.value}>
                                            {filter.name}
                                        </option>
                                    ))}
                            </select>
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
    filters: PropTypes.array.isRequired,
    items: PropTypes.array.isRequired,
    onExport: PropTypes.func.isRequired,
    orders: PropTypes.array.isRequired,
    renderResults: PropTypes.func.isRequired,
    selection: PropTypes.array,
    sortItems: PropTypes.func.isRequired
};

export default NestedTable;
