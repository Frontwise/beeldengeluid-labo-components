import CollectionAPI from '../../api/CollectionAPI';
import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import Autosuggest from 'react-autosuggest';

//this component relies on the collection statistics as input
class CollectionAnalyser extends React.Component {

	constructor(props) {
		super(props);

        this.prefix = 'ms_ca_';

        // default values
        const defaultValue = window.sessionStorage.getItem(this.prefix + 'defaultValue' + this.props.collectionConfig.collectionId) || '';
        const defaultDateField = window.sessionStorage.getItem(this.prefix + 'defaultDateField' + this.props.collectionConfig.collectionId) || this.props.collectionConfig.getPreferredDateField();
        console.log(defaultDateField, defaultValue);
		this.state = {
            value : defaultValue,
            dateField: defaultDateField,
            suggestions : [], //current list of suggestions shown
            completeness: {}, //store completeness of the fields
		}
	}

    componentDidMount(){
        console.log(this.props.collectionConfig);

        // auto load the analyse if there are default values
        if (this.state.value){
          this.analyseField(this.state.value);
        }

        if (this.state.dateField){
          this.analyseField(this.state.dateField);
        }

        this.previewCompleteness();
    }


    onDateFieldChange(e){        
        window.sessionStorage.setItem(this.prefix + 'defaultDateField' + this.props.collectionConfig.collectionId, e.target.value);
        this.analyseField(this.state.value);
    }

    previewCompleteness(){
        let fieldNames = [];

        // Collect all field names
        // Sort to get the DateFields on top
        Object.keys(this.props.collectionConfig).sort().forEach((key)=>{
            if (key.endsWith('Fields')){
                fieldNames = fieldNames.concat(this.props.collectionConfig[key]);                
            }
        });

        // For each fieldname request the completeness and store it to the state and sessionstorage
        fieldNames.forEach((field)=>{
                // retrieve from local storage
                const completeness = window.sessionStorage.getItem(this.prefix + this.props.collectionConfig.collectionId + field);
                if (completeness !== null){
                    this.setState((state, props)=>{
                            const fieldData = {};
                            fieldData[field] = completeness;
                            return {
                                completeness: Object.assign({},state.completeness,fieldData),                                
                            }
                        });
                } else{ 
                    this.previewAnalysis(field, (data)=>{
                        const completeness = data.doc_stats.total > 0 ? (((data.doc_stats.total - data.doc_stats.no_analysis_field)/data.doc_stats.total) * 100).toFixed(2) : 0;
                        
                        // store to sessionStorage
                        window.sessionStorage.setItem(this.prefix + this.props.collectionConfig.collectionId + data.analysis_field, completeness);

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


	analyseField(analysisField) {
		this.loadAnalysis(analysisField, (data, timelineData) => {
			this.onOutput({
				fieldAnalysisStats : data,
				fieldAnalysisTimeline : timelineData
			})
		});
	}

    loadAnalysis(analysisField, callback) {      
    	const dateSelect = document.getElementById("datefield_select");
    	if(dateSelect) {
            CollectionAPI.analyseField(
                this.props.collectionConfig.collectionId,
                this.props.collectionConfig.getDocumentType(),
                dateSelect.options[dateSelect.selectedIndex].value,
                analysisField ? analysisField : 'null__option',
                [], //facets are not yet supported
                this.props.collectionConfig.getMinimunYear(),
                (data) => {
                    const timelineData = this.toTimelineData(data);
                    callback(data, timelineData);
                }
            );
        }
    }

    //TODO optimize this.
	toTimelineData(data) {
		const timelineData = {};
		if(data) {
			let totalChart = [];
			let missingChart = [];
			let presentChart = [];
			for (const item in data.timeline) {
				totalChart.push({
					year: data.timeline[item].year, //y-axis
                    total: data.timeline[item].background_count, //different line on graph
				})
				presentChart.push({
					year : data.timeline[item].year, //y-axis
					present: data.timeline[item].field_count, //different line on graph
				})
				missingChart.push({
					year : data.timeline[item].year, //y-axis
					missing:data.timeline[item].background_count - data.timeline[item].field_count //different line on graph
				})
			}

			timelineData['total'] = {
				label : 'Total',
			 	dateField : null, //what to do here?
			 	prettyQuery : null, //what to do here?
			 	data : totalChart,
			 	queryId : 'total_chart'
			}

			timelineData['missing'] = {
				label : 'Missing',
			 	dateField : null, //what to do here?
			 	prettyQuery : null, //what to do here?
			 	data : missingChart,
			 	queryId : 'missing_chart'
			}

			timelineData['present'] = {
				label : 'Present',
			 	dateField : null,
			 	prettyQuery : null, //what to do here?
			 	data : presentChart,
			 	queryId : 'present_chart'
			}
		}
		return timelineData;
	}

	/* --------------------------------- ON OUTPUT -------------------------------- */

	onOutput(data) {
		if(this.props.onOutput) {
			this.props.onOutput(this.constructor.name, data);
		}
	}

    /* ------------------- functions specifically needed for react-autosuggest ------------------- */

    sortAndBeautifyArray(arrayToSort) {
        let temp = arrayToSort.map(function(el) {
            return {
            	value: el,
            	beautifiedValue: this.props.collectionConfig.toPrettyFieldName(el),
                completeness: this.state.completeness[el]
			};
        }, this);
        // sorting the mapped array containing the reduced values
        return temp.sort(function (a, b) {
            return a.beautifiedValue > b.beautifiedValue ? 1 : a.beautifiedValue < b.beautifiedValue ? -1 : 0;
        });
	}

    onChange(event, { newValue }) {
        this.setState({
            chosenValue: newValue,
            value: newValue
        });
    }

    onSuggestionsFetchRequested({value}) {
        this.setState({
            suggestions: this.getSuggestions(value)
        });
    };

    getSuggestions(value, callback) {
    	const allFields = this.props.collectionConfig.getNonDateFields();
        if(allFields) {
	        const inputValue = value.trim();
	        const filteredFields = inputValue.length == 0 ? allFields : allFields.filter(analysisFieldName =>
	        	analysisFieldName.includes(inputValue)
	        );
	        return this.sortAndBeautifyArray(filteredFields)
	    }
	    return []
    }

    onSuggestionSelected(event, {suggestion, suggestionValue, suggestionIndex, sectionIndex}) {

        // store value to session storage
        window.sessionStorage.setItem(this.prefix + 'defaultValue' + this.props.collectionConfig.collectionId, suggestion.value);

        this.setState({
            value: suggestion.value
        });
        this.analyseField(suggestion.value);
    }

    getSuggestionValue(suggestion) {
        return suggestion.value;
    }

    //TODO the rendering should be adapted for different vocabularies
    renderSuggestion(suggestion) {
        const completeness = suggestion.completeness + '%';
        return (
            <div key={suggestion.value} value={suggestion.value}>
                <span className="title">{suggestion.beautifiedValue}</span>
                {
                    suggestion.completeness !== undefined ?
                    <span className="completeness" title={"Completeness: " + completeness}>{completeness}</span>
                    : null
                }
            </div>
        );
    }

    renderInputComponent(inputProps){
        const completeness = this.state.completeness[inputProps.value] + '%';
        return(
            <div>
                <input  {...inputProps} />
                {/*<span className="completeness" title={"Completeness: " + completeness}>{completeness}</span>*/}
            </div>
        )
    }

    onSuggestionsClearRequested() {
        this.analyseField(this.state.value);
        this.setState({
            suggestions : []
        });
    }

    // Necessary "return true" to enable autosuggestion on input field so the user gets the
	// complete list of options without having to start typing.
    shouldRenderSuggestions() {
        return true;
    }

    submitForm(e) {
    	e.preventDefault();
    	return false;
    }
    /* ------------------- end of specific react-autosuggest functions ------------------- */

	render() {
		let analysisBlock = null;
		//only draw the rest when a collection is selected (either using the selector or via the props)
		if(this.props.collectionConfig) {
			let dateFields = this.props.collectionConfig.getDateFields();

			let dateFieldSelect = null;
			let analysisFieldSelect = null;

			if(dateFields) { //only if there are date fields available
				const sortedDateFields = this.sortAndBeautifyArray(dateFields);
				let dateFieldOptions = sortedDateFields.map((dateField) => {
					return (
						<option key={dateField.value} value={dateField.value}>
                            {dateField.beautifiedValue}
                            {dateField.value in this.state.completeness ? ' [' + this.state.completeness[dateField.value] + '%]' : null}
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


            analysisFieldSelect = (
				<div className="form-group">
					<label htmlFor="analysisfield_select">Metadata field to inspect (Y-axis)</label>
                    <Autosuggest
                        ref="classifications"
                        suggestions={this.state.suggestions.map((suggestion)=>(                            
                                    // add completeness                            
                                    Object.assign({},suggestion,{
                                        completeness: this.state.completeness[suggestion.value] 
                                    })
                                ))}
                        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested.bind(this)}
                        onSuggestionsClearRequested={this.onSuggestionsClearRequested.bind(this)}
                        onSuggestionSelected={this.onSuggestionSelected.bind(this)}
                        getSuggestionValue={this.getSuggestionValue.bind(this)}
                        renderSuggestion={this.renderSuggestion.bind(this)}
						shouldRenderSuggestions={this.shouldRenderSuggestions.bind(this)}
                        renderInputComponent={this.renderInputComponent.bind(this)}
                        inputProps={{
				            placeholder: 'Search a field',
				            value: this.state.value,
				            onChange: this.onChange.bind(this)
				        }}
                    />
				</div>
			);

			analysisBlock = (
				<form onSubmit={this.submitForm.bind(this)}>
					{dateFieldSelect}
					{analysisFieldSelect}
				</form>
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
			</div>
		)
	}
};

export default CollectionAnalyser;