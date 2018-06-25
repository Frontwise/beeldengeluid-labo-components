import CollectionAPI from '../../api/CollectionAPI';
import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import Autosuggest from 'react-autosuggest';
import FieldDescriptionUtil from '../../util/FieldDescriptionUtil';
import FieldSelector from './FieldSelector';

//this component relies on the collection statistics as input
class CollectionAnalyser extends React.Component {

	constructor(props) {
		super(props);

        this.prefix = 'ms__ca_';

        // throttle preview requests
        // needed because to prevent a large amount of pending requests
        // this keeps the UI / timeline respond fast to changes
        this.calls = [];
        this.calling = false;
        this.isMounted = true;

        // default values
        const defaultField= window.sessionStorage.getItem(this.prefix + 'defaultField' + this.props.collectionConfig.collectionId) || '';
		this.state = {
            field : defaultField,
            fields : [], //current list of fields
            completeness: {}, //store completeness of the fields
            showFieldSelector: false,
            descriptions: null, // field descriptions
		}
	}

    componentDidMount(){
        // load fields
        this.setState({
            fields: this.getFields()
        });


        // auto load the analyse if there are default values
        if (this.state.field){
          this.props.onChange(this.state.field);
        }

        this.previewCompleteness();

        this.loadDescriptions(this.props.collectionConfig.collectionId);
    }

    loadDescriptions(collectionId){
        FieldDescriptionUtil.getDescriptions(collectionId, this.setDescriptions.bind(this));
    }

    setDescriptions(descriptions){
        this.setState({
            descriptions
        })
    }

    componentWillUnmount(){
        this.isMounted = false;
    }

    getFields() {
        let fields = [];
        // Collect all field names        
        Object.keys(this.props.collectionConfig).forEach((key)=>{
            if (key.endsWith('Fields') && Array.isArray(this.props.collectionConfig[key])){
                const keyType = key.substring(0,key.length - 6);
                fields = fields.concat(this.props.collectionConfig[key].map((field)=>(
                        {
                            id: field, 
                            title: this.props.collectionConfig.toPrettyFieldName(field),
                            type: keyType,
                        }
                    ))
                );
                }
            }
        );
        return fields;
    }
   
    previewCompleteness(){
        let fieldNames = [];

        // Collect all field names        
        Object.keys(this.props.collectionConfig).forEach((key)=>{
            if (key.endsWith('Fields')){
                fieldNames = fieldNames.concat(this.props.collectionConfig[key]);                
            }
        });

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
        // if there is already a call in progress; 
        // store the call, so we prevent many synchronous requests
        // that block other UI requests, like the timeline data request
        if (this.calling){
            // store call
            this.calls.push(
                this.previewAnalysis.bind(this, analysisField, callback)
            );
            return;
        }

        this.calling = true;

        // perform call
        CollectionAPI.analyseField(
            this.props.collectionConfig.collectionId,
            this.props.collectionConfig.getDocumentType(),
            'null__option',
            analysisField ? analysisField : 'null__option',
            [], //facets are not yet supported
            this.props.collectionConfig.getMinimunYear(),
            (data) => {
                // call is done
                this.calling = false;

                // call next call in throttle buffer
                if (this.calls.length > 0 && this.isMounted){
                     // get and execute first element
                     // use settimeout, to prevent exceeding max call stack
                    setTimeout((this.calls.shift())());
                }

                // callback
                callback(data);
            }
        );
    }
	

    onShowFieldSelector(){
        this.setState({
            showFieldSelector: !this.state.showFieldSelector
        });
    }


    onFieldSelected(field) {

        // store value to session storage
        window.sessionStorage.setItem(this.prefix + 'defaultField' + this.props.collectionConfig.collectionId, field.id);

        this.setState({
            field: field.id,
            showFieldSelector: false, // hide fieldselector
        });

        this.props.onChange(field.id);
    }

    onCloseFieldSelector(){
        this.setState({
            showFieldSelector: false
        })
    }

    getCurrentField(){
        if (!this.state.field){
            return null;
        }

        let field = null;
        this.state.fields.some((f)=>{
            if (f.id == this.state.field){
                field = f;
                return true;
            }
            return false;
        });

        return field;
    }

	render() {
		let analysisBlock = null;

		//only draw the rest when a collection is selected (either using the selector or via the props)
		if(this.props.collectionConfig) {

            // get current field data and completeness
            const field = this.getCurrentField();
            const completeness = field && field.id in this.state.completeness ? this.state.completeness[field.id] : null;
            const description = this.state.descriptions !== null ? (field && field.id in this.state.descriptions ? this.state.descriptions[field.id].description || '-' : '-') : null;

            // render current field information table
            const currentField = field != null ? (
                <div className="current_field">
                    <table>
                        <tbody>
                            <tr>
                                <th>Field</th><td className="title">{field.title}</td>
                            </tr>
                            <tr>
                                <th>Description</th><td>{description !== null ? description : <i className="fa fa-circle-o-notch fa-spin"/>}</td>
                            </tr>
                            <tr>
                                <th>Type</th><td>{field.type}</td>
                            </tr>
                            <tr>
                                <th>Completeness</th>
                                <td className="completeness">
                                    {completeness ? 
                                        <div>
                                            <span>{completeness.value}%</span>
                                            <span className="total">{completeness.withValue} / {completeness.total}</span>
                                        </div>
                                        : <i className="fa fa-circle-o-notch fa-spin"/>
                                    }
                                </td>
                            </tr>
                        </tbody>
                    </table>                                        
                </div>
            ) : null;

            // create final analysis block
			analysisBlock = (
				<div className="analysis_field">
                    <button className="btn btn-primary" onClick={this.onShowFieldSelector.bind(this)}>Select field to analyse</button>
                    {currentField}                    
                </div>
            )

        } else { //if there are no stats available
            analysisBlock = (<h5>This collection is available in the registry, but is absent in the media suite index</h5>)
        }

        return (
            <div className={IDUtil.cssClassName('collection-analyser')}>
                
                <div className="row">
                    <div className="col-md-12">
                        {analysisBlock}
					</div>
				</div>

                {/* only toggle visibility to keep the component state */}
                <div style={{display: this.state.showFieldSelector ? 'block' : 'none'}}>
                    <FieldSelector 
                        onSelect={this.onFieldSelected.bind(this)} 
                        onClose={this.onCloseFieldSelector.bind(this)}
                        current={this.state.field}
                        fields={this.state.fields} 
                        completeness={this.state.completeness} 
                        descriptions={this.state.descriptions}                       
                        />
                </div>

			</div>
		)
	}
};

export default CollectionAnalyser;