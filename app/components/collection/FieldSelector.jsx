import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import Autosuggest from 'react-autosuggest';
import classNames from 'classnames';

//this component relies on the collection statistics as input
class FieldSelector extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            sortField: 'title',
            sortOrder: 'desc',
            filters: {
                keyword: '',
            }
        }
    }

    onSort(sortField){
        this.setState({
            sortField,
            sortOrder: this.state.sortField === sortField ? (this.state.sortOrder === 'asc' ? 'desc' : 'asc') : this.state.sortOrder,
        })
    }

    sortFields(fields){
        // default to id first; to prevent unwanted shuffling
        fields = fields.sort((a,b)=>(a.id > b.id ? -1 : 1));

        switch(this.state.sortField){
            case 'title':
                fields = fields.sort((a,b)=>(a.title > b.title ? -1 : 1));
            break;
            case 'description':
                const getStringDescriptionOrEmpty = (v)=> (v ? v.description || '~' : '~'); // '~'' --> high ASCII, on end of sorting
                fields = fields.sort((a,b)=>(getStringDescriptionOrEmpty(this.props.descriptions[a.id]) > getStringDescriptionOrEmpty(this.props.descriptions[b.id]) ? -1 : 1));
            break;
            case 'type':
                fields = fields.sort((a,b)=>(a.type > b.type ? -1 : 1));
            break;
            case 'level':
                fields = fields.sort((a,b)=>(a.level > b.level ? -1 : 1));
            break;
            case 'completeness':
                const getFloatValueOrZero = (v)=> (v ? parseFloat(v.value) : 0);
                fields = fields.sort((a,b)=>(getFloatValueOrZero(this.props.completeness[a.id]) < getFloatValueOrZero(this.props.completeness[b.id]) ? -1 : 1));
            break;
        }

        switch(this.state.sortOrder){
            case 'desc':
                return fields.reverse();
            default:
                return fields;
        }
    }

    filterFields(fields){

        if (this.state.filters.keyword){
            const keywords = this.state.filters.keyword.toLowerCase().split(' ');
            keywords.forEach((keyword)=>{
                fields = fields.filter((field)=>(
                    field.title.toLowerCase().includes(keyword) ||
                    (field.level && field.level.toLowerCase().includes(keyword)) ||
                    (field.id in this.props.descriptions && this.props.descriptions[field.id].description && this.props.descriptions[field.id].description.toLowerCase().includes(keyword)) ||
                    (field.type && field.type.toLowerCase().includes(keyword))
                ));
            });
        }
        return fields;
    }


    onKeywordFilter(e){
        this.setState({
            filters: Object.assign({},this.state.filters, {
                keyword: e.target.value
            })
        })
    }

    onSelect(field){
        this.props.onSelect(field);
    }

    onClose(){
        this.props.onClose();
    }

    render() {
        const fields = this.sortFields(this.filterFields(this.props.fields));

        const sortArrow = <i className={"fa fa-sort-"+this.state.sortOrder}/>;

        let levelTableHead = null;

        if(this.props.showLevelColumn) {
            levelTableHead = (
                <th onClick={()=>{this.onSort('level')}}
                    className={classNames('level',{active:this.state.sortField === 'level'})}>
                    Level
                    {this.state.sortField === 'level' ? sortArrow : null}
                </th>
            )
        }

        return (
            <div className={IDUtil.cssClassName('field-selector')}>

                <div className="container">
                    <div className="close" onClick={this.onClose.bind(this)}>Close ❌</div>
                    <div className="row">
                        <div className="col-md-12">
                            <form>
                                <div className="input-group">
                                    <input type="text"
                                           className="form-control"
                                           placeholder="Search fields"
                                           onChange={this.onKeywordFilter.bind(this)}
                                           value={this.state.filters.keywords}
                                       />
                                    <span className="input-group-addon btn-effect"><i className="fa fa-search"/></span>
                                </div>
                            </form>
                            <table>
                                <thead>
                                <tr>
                                    <th onClick={()=>{this.onSort('title')}}
                                        className={classNames('title', { active:this.state.sortField === 'title'})}>
                                        Field
                                        {this.state.sortField === 'title' ? sortArrow : null}
                                        </th>

                                    {levelTableHead}

                                    <th onClick={()=>{this.onSort('description')}}
                                        className={classNames('description',{active:this.state.sortField === 'description'})}>
                                        Description
                                        {this.state.sortField === 'description' ? sortArrow : null}
                                        </th>

                                     <th onClick={()=>{this.onSort('type')}}
                                        className={classNames('type',{active:this.state.sortField === 'type'})}>
                                        Type
                                        {this.state.sortField === 'type' ? sortArrow : null}
                                        </th>

                                    <th onClick={()=>{this.onSort('completeness')}}
                                        className={classNames('completeness', {active:this.state.sortField === 'completeness'})}>
                                        Completeness
                                        {this.state.sortField === 'completeness' ? sortArrow : null}
                                        </th>

                                    <th className="select"/>
                                </tr>
                                </thead>
                                <tbody>

                                    {fields.map((field)=>(
                                        <tr className={classNames({current: this.props.current === field.id})}>
                                            <td className="title" title={field.id}>
                                                {field.title}
                                            </td>
                                            {this.props.showLevelColumn ? <td className="level" title={field.level}>
                                                {field.level}
                                            </td> : null }
                                            <td className="description">
                                                {this.props.descriptions !== null ?
                                                    (this.props.descriptions[field.id] !== undefined ?
                                                        <span>{this.props.descriptions[field.id].description || '-'}</span>
                                                    : '-')
                                                    : <i className="fa fa-circle-o-notch fa-spin"/>
                                                }
                                            </td>
                                            <td className="type">
                                                {field.type || '?'}
                                            </td>
                                            <td className="completeness">
                                                {this.props.completeness[field.id] !== undefined ?
                                                    <div>
                                                        <span>{this.props.completeness[field.id].value}%</span><br/>
                                                        <span className="total">{this.props.completeness[field.id].withValue} / {this.props.completeness[field.id].total}</span>
                                                    </div>
                                                    : <i className="fa fa-circle-o-notch fa-spin"/>
                                                }
                                            </td>
                                            <td className="select">
                                                <button className="btn btn-primary"
                                                        onClick={this.onSelect.bind(this,field)}>
                                                    Select
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
};

export default FieldSelector;
