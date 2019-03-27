import IDUtil from '../../util/IDUtil';
import PropTypes from 'prop-types';

class FieldCategoryCreator extends React.PureComponent {
	constructor(props) {
		super(props);
        this.state = {
            dataNormalized: this.props.data,
            filteredCategories: this.props.data,
            selectedItems: [],
            errMsg: null
        };
        this.clusterName = React.createRef();
    }

    onClickHandler = (e) => {
        let dataNormalized = this.state.dataNormalized;
        let filteredCategories = this.state.filteredCategories;
        let selectedItems = this.state.selectedItems;

        if (e.target.parentNode.id === 'sourceOpts') {
            dataNormalized = this.removeFromObj(dataNormalized, e.target.text);
            filteredCategories = this.removeFromObj(filteredCategories, e.target.text);
            selectedItems.push({'value': e.target.value, 'prettyName': e.target.text});

            this.setState({
                dataNormalized,
                filteredCategories,
                selectedItems,
                errMsg: false
            })
        } else if (e.target.parentNode.id === 'selectedOpts') {
            dataNormalized.push({'value': e.target.value, 'prettyName': e.target.text});
            filteredCategories.push({'value': e.target.value, 'prettyName': e.target.text});
            selectedItems = this.removeFromObj(selectedItems, e.target.text);

            this.setState({
                dataNormalized,
                filteredCategories,
                selectedItems,
                errMsg: false
            })
        }
    };

    removeFromObj = (arr, str) => arr.filter(obj => obj.prettyName !== str);

    filterFields = (arr, str) => arr.filter(item => item.prettyName.toLowerCase().includes(str.toLowerCase()));


    onKeywordFilter = (e) => {
        const newCategorySet = this.filterFields(this.state.dataNormalized, e.target.value);
        this.setState({
            filteredCategories: newCategorySet,
            errMsg: false
        })
    };

    submitForm = () => {
        if (this.clusterName.current.value.length === 0 || this.state.selectedItems.length === 0) {
            this.setState({
                errMsg: true
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
        return <div className="errMsg">{msg}</div>
    };


    render() {
        let errMsgName = null;
        let errMsgFields = null;
        if (this.state.errMsg) {
            errMsgName = this.clusterName.current.value.length === 0 ? this.errorMsg('Cluster name is required!') : null;
            errMsgFields = this.state.selectedItems.length === 0 ? this.errorMsg('No fields selected!') : null;
        }

        let selected = null;
        if (this.state.selectedItems.length > 0) {
            selected = this.state.selectedItems.map(
                (item, index) => <option className="move-backward" onClick={this.onClickHandler}
                                         onDoubleClick={this.onDoubleClickHandler} key={index} id={index}
                                         value={item.value}>
                    {item.prettyName}</option>
            );
        }

        let options = this.state.filteredCategories.length > 0 ? this.state.filteredCategories : [];
        if (options.length > 0) {
            options.sort((a, b) => (a.prettyName > b.prettyName) ? 1 : -1);
            options = this.state.filteredCategories.map((field, index) =>
                <option className="move-forward" onClick={this.onClickHandler} onDoubleClick={this.onDoubleClickHandler}
                        key={index}  value={field.value}>{field.prettyName}</option>
            );
        }

        return (
            <div className={IDUtil.cssClassName('field-category-creator')}>
                <div className="bg__container">
                    <div className="field-selection">
                        <p>Select one or more fields to include</p>
                        <input
                            className="search-box fa fa-search"
                            type="text"
                            placeholder="Search.."
                            name="search"
                            onChange={this.onKeywordFilter}
                        />
                        <div className="selection-lists">
                            <select name="sourceOpts" onChange={this.sel} id="sourceOpts" multiple>
                                {options}
                            </select>
                            <select name="selectedOpts" multiple id="selectedOpts">
                                {selected}
                            </select>
                        </div>
                        <p className="cluster-name">Cluster name</p>
                        <input
                            type="text"
                            placeholder="cluster name"
                            name="name"
                            className="selection-group-name"
                            ref={this.clusterName}
                        />
                        <button className="submit-btn" onClick={this.submitForm} type="button">Choose</button>
                        {errMsgName}
                        {errMsgFields}
                    </div>
                </div>
            </div>
        );
    }
}

FieldCategoryCreator.propTypes = {
    data: PropTypes.array.isRequired
};

export default FieldCategoryCreator;
