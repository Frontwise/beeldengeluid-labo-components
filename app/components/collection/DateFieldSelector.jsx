import CollectionAPI from '../../api/CollectionAPI';
import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import Autosuggest from 'react-autosuggest';
import FieldSelector from './FieldSelector';

//this component relies on the collection statistics as input
class DateFieldSelector extends React.Component {

    constructor(props) {
        super(props);

        this.prefix = 'ms__ca_';

        // default values
        const defaultDateField = window.sessionStorage.getItem(this.prefix + 'defaultDateField' + this.props.collectionConfig.collectionId) || this.props.collectionConfig.getPreferredDateField();
        this.state = {
            dateField: defaultDateField,
            fields : [], //current list of fields
            completeness: {}, //store completeness of the fields
        }
    }

    componentDidMount(){
        // load fields
        this.setState({
            fields: this.getFields()
        });

        if (this.state.dateField){
          this.props.onChange(this.state.dateField);
        }

        this.previewCompleteness();
    }

    getFields() {
        let fields = [];

        // Collect all date field names        
        fields = this.props.collectionConfig.getDateFields().map((field)=>(
            {
                id: field, 
                title: this.props.collectionConfig.toPrettyFieldName(field),
                type: 'Date',
            }
        ));
        return fields;
    }

    onDateFieldChange(e){        
        window.sessionStorage.setItem(this.prefix + 'defaultDateField' + this.props.collectionConfig.collectionId, e.target.value);
        this.props.onChange(e.target.value);
    }

    previewCompleteness(){
        let fieldNames = this.props.collectionConfig.getDateFields();

        // For each fieldname request the completeness and store it to the state and sessionstorage
        fieldNames.forEach((field)=>{
                // retrieve from local storage
                let completeness = window.sessionStorage.getItem(this.prefix + this.props.collectionConfig.collectionId + field);
                if (completeness !== null){
                    completeness = JSON.parse(completeness);
                    this.setState((state, props)=>{
                            const fieldData = {};
                            fieldData[field] = completeness;
                            return {
                                completeness: Object.assign({},state.completeness,fieldData),                                
                            }
                        });
                } else{ 
                    this.previewAnalysis(field, (data)=>{
                        const completeness = {
                            value: data.doc_stats.total > 0 ? (((data.doc_stats.total - data.doc_stats.no_analysis_field)/data.doc_stats.total) * 100).toFixed(2) : 0,
                            total: data.doc_stats.total,
                            withValue: (data.doc_stats.total - data.doc_stats.no_analysis_field),
                        }
                        
                        // store to sessionStorage
                        window.sessionStorage.setItem(this.prefix + this.props.collectionConfig.collectionId + data.analysis_field, JSON.stringify(completeness));

                        // update state
                        this.setState((state, props)=>{
                            const fieldData = {};
                            fieldData[data.analysis_field] = completeness;
                            return {
                                completeness: Object.assign({},state.completeness,fieldData),                                
                            }
                        });
                });
            }
        });
    }

    previewAnalysis(analysisField, callback){
        CollectionAPI.analyseField(
            this.props.collectionConfig.collectionId,
            this.props.collectionConfig.getDocumentType(),
            'null__option',
            analysisField ? analysisField : 'null__option',
            [], //facets are not yet supported
            this.props.collectionConfig.getMinimunYear(),
            (data) => {
                callback(data);
            }
        );
    }

    /* --------------------------------- ON OUTPUT -------------------------------- */

   

   
    render() {
        let dateFieldSelect = null;

        if(this.props.collectionConfig) {
            // create objects
            let dateFields = this.props.collectionConfig.getDateFields().map((field)=>({
                value: field,
                title: this.props.collectionConfig.toPrettyFieldName(field),
            }));
                
            // sort by title
            dateFields = dateFields.sort((a,b)=>(a.title > b.title ? 1 : -1));

            let analysisFieldSelect = null;

            if(dateFields) { //only if there are date fields available
                const sortedDateFields=dateFields;
                let dateFieldOptions = sortedDateFields.map((dateField) => {
                    return (
                        <option key={dateField.value} value={dateField.value}>
                            {dateField.title}
                            {dateField.value in this.state.completeness ? ' [' + this.state.completeness[dateField.value].value + '%]' : null}
                        </option>
                    )
                });

                dateFieldOptions.splice(0,0,<option key='null__option' value='null__option'>-- Select --</option>);

                dateFieldSelect = (
                    <div className="form-group">
                        <label htmlFor="datefield_select">Metadata field for date (X-axis)</label>
                        <select className="form-control" 
                            id="datefield_select" 
                            defaultValue={this.state.dateField} 
                            onChange={this.onDateFieldChange.bind(this)}>
                            {dateFieldOptions}
                        </select>
                    </div>
                );
            }
        } 

        return (
            <div className={IDUtil.cssClassName('datefield-selector')}>
                {dateFieldSelect}                
            </div>
        )
    }
};

export default DateFieldSelector;