import CollectionAPI from '../../api/CollectionAPI';
import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import Autosuggest from 'react-autosuggest';

//this component relies on the collection statistics as input
class CollectionAnalyser extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
            value : '', //the label of the selected classification (autocomplete)
            suggestions : [], //current list of suggestions shown
		}
	}

    componentDidMount(){
        // auto load the analyse if there is a preferred DateField
        if (this.props.collectionConfig.getPreferredDateField()){
          this.analyseField(this.props.collectionConfig.getPreferredDateField());
        }
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
            	beautifiedValue: this.props.collectionConfig.toPrettyFieldName(el)
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
        this.analyseField(suggestion.value);
    }

    getSuggestionValue(suggestion) {
        return suggestion.value;
    }

    //TODO the rendering should be adapted for different vocabularies
    renderSuggestion(suggestion) {
        return (
            <span key={suggestion.value} value={suggestion.value}>{suggestion.beautifiedValue}</span>
        );
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
						<option key={dateField.value} value={dateField.value}>{dateField.beautifiedValue}</option>
					)
				});

				dateFieldOptions.splice(0,0,<option key='null__option' value='null__option'>-- Select --</option>);

				dateFieldSelect = (
					<div className="form-group">
						<label htmlFor="datefield_select">Metadata field for date (X-axis)</label>
						<select className="form-control" 
                    id="datefield_select" 
                    defaultValue={this.props.collectionConfig.getPreferredDateField()} 
                    onChange={
        							this.analyseField.bind(this, this.state.value)
        						}>
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
                        suggestions={this.state.suggestions}
                        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested.bind(this)}
                        onSuggestionsClearRequested={this.onSuggestionsClearRequested.bind(this)}
                        onSuggestionSelected={this.onSuggestionSelected.bind(this)}
                        getSuggestionValue={this.getSuggestionValue.bind(this)}
                        renderSuggestion={this.renderSuggestion.bind(this)}
						shouldRenderSuggestions={this.shouldRenderSuggestions.bind(this)}
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