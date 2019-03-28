import IDUtil from '../../util/IDUtil';
import PropTypes from 'prop-types';

class FieldCategoryCreator extends React.PureComponent {

	constructor(props) {
		super(props);
        this.state = {
            dataNormalized: this.props.data,
            filteredCategories: this.props.data,
            selectedItems: [],
            validationError: false
        };
        this.clusterName = React.createRef();
        this.CLASS_PREFIX = 'fcc';
    }

    onClickHandler = (e) => {
        let dataNormalized = this.state.dataNormalized;
        let filteredCategories = this.state.filteredCategories;
        let selectedItems = this.state.selectedItems;

        if (e.target.parentNode.id === 'source-opts') {
            dataNormalized = this.removeFromObj(dataNormalized, e.target.text);
            filteredCategories = this.removeFromObj(filteredCategories, e.target.text);
            selectedItems.push({'value': e.target.value, 'prettyName': e.target.text});

            this.setState({
                dataNormalized,
                filteredCategories,
                selectedItems,
                validationError: false
            })
        } else if (e.target.parentNode.id === 'selected-opts') {
            dataNormalized.push({'value': e.target.value, 'prettyName': e.target.text});
            filteredCategories.push({'value': e.target.value, 'prettyName': e.target.text});
            selectedItems = this.removeFromObj(selectedItems, e.target.text);

            this.setState({
                dataNormalized,
                filteredCategories,
                selectedItems,
                validationError: false
            })
        }
    };

    removeFromObj = (arr, str) => arr.filter(obj => obj.prettyName !== str);

    filterFields = (arr, str) => arr.filter(item => item.prettyName.toLowerCase().includes(str.toLowerCase()));

    onKeywordFilter = (e) => {
        const newCategorySet = this.filterFields(this.state.dataNormalized, e.target.value);
        this.setState({
            filteredCategories: newCategorySet,
            validationError: false
        });
    };

    submitForm = () => {
        if (this.clusterName.current.value.length === 0 || this.state.selectedItems.length === 0) {
            this.setState({
                validationError: true
            })
        } else {
            const selectedValues = this.state.selectedItems.map(item => item.value);
            return this.props.onOutput(this.constructor.name, {
                fields: selectedValues,
                label: this.clusterName.current.value,
                id: this.clusterName.current.value
            });
        }
        return false;
    };

    errorMsg = (msg) => {
        return <div className={IDUtil.cssClassName('validation-error', this.CLASS_PREFIX)}>{msg}</div>
    };


    render() {
        let errMsgName = null;
        let errMsgFields = null;
        if (this.state.validationError) {
            errMsgName = this.clusterName.current.value.length === 0 ? this.errorMsg('Please provide a name') : null;
            errMsgFields = this.state.selectedItems.length === 0 ? this.errorMsg('Please select a number of fields') : null;
        }

        let selected = null;
        if (this.state.selectedItems.length > 0) {
            selected = this.state.selectedItems.map((item, index) => {
                return (
                    <option
                        key={index}
                        id={index}
                        className={IDUtil.cssClassName('right', this.CLASS_PREFIX)}
                        onClick={this.onClickHandler}
                        value={item.value}>
                        {item.prettyName}
                    </option>
                );
            });
        }

        let options = this.state.filteredCategories.length > 0 ? this.state.filteredCategories : [];
        if (options.length > 0) {
            options.sort((a, b) => (a.prettyName > b.prettyName) ? 1 : -1);
            options = this.state.filteredCategories.map((field, index) => {
                return (
                    <option
                        key={index}
                        className={IDUtil.cssClassName('left', this.CLASS_PREFIX)}
                        onClick={this.onClickHandler}
                        value={field.value}>
                        {field.prettyName}
                    </option>
                );
            });
        }

        return (
            <div className={IDUtil.cssClassName('field-category-creator')}>
                <h5>Select one or more fields to include</h5>
                <input
                    className={IDUtil.cssClassName('search-box', this.CLASS_PREFIX)}
                    type="text"
                    placeholder="Search.."
                    name="search"
                    onChange={this.onKeywordFilter}
                />
                <div className={IDUtil.cssClassName('selection-wrapper', this.CLASS_PREFIX)}>
                    <select id="source-opts" multiple>
                        {options}
                    </select>
                    <select id="selected-opts" multiple>
                        {selected}
                    </select>
                </div>
                <h5>Cluster name</h5>
                <input
                    className={IDUtil.cssClassName('name', this.CLASS_PREFIX)}
                    type="text"
                    placeholder="cluster name"
                    name="name"
                    ref={this.clusterName}
                />
                <button onClick={this.submitForm} type="button">Choose</button>
                {errMsgName}
                {errMsgFields}
            </div>
        );
    }
}

FieldCategoryCreator.propTypes = {
    data: PropTypes.array.isRequired
};

export default FieldCategoryCreator;
