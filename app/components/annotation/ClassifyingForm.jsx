import Autosuggest from 'react-autosuggest'; //See: https://github.com/moroshko/react-autosuggest
import Classification from './Classification';
import IDUtil from '../../util/IDUtil';
import ExternalAPI from '../../api/ExternalAPI';

/*
Input:
	- list of classifications (props.data)
	- a annotation config (props.config)
	- onOutput (what to do after adding/removing a classification) --> should be changed to Flux?

Output/emits:
	- a list of classifications

HTML markup & CSS attributes:
	- regular div => .bg__classify-form
*/

class ClassifyingForm extends React.Component {

	constructor(props) {
		super(props);
		const vocabulary = this.props.config.vocabularies ? this.props.config.vocabularies[0] : null;
		this.state = {
			data: this.props.data ? this.props.data : [],
			value : '', //the label of the selected classification (autocomplete)
			suggestionId : null, //stores the id/uri of the selected classification (e.g. GTAA URI)
			suggestions : [], //current list of suggestions shown
			isLoading : false, //loading the suggestions from the server
			vocabulary : vocabulary
		}
		this.xhrs = [];
	}

	/* ------------------- CRUD / loading of classifications ------------------- */

	addClassification(e) {
		e.preventDefault();
		if(this.state.value != '') {
			const cs = this.state.data;
			let suggestionId = this.state.suggestionId;
			if(this.state.vocabulary && this.state.vocabulary == 'custom') {
				suggestionId =  IDUtil.guid();
			}
			if(cs) {
				cs.push({
					id : suggestionId,
					label: this.state.value,
					vocabulary : this.state.vocabulary
				});
				this.setState({
					value : '',
					data : cs,
					suggestionId : suggestionId
				}, this.onOutput.bind(this));
			}
		}
	}

	removeClassification(index) {
		const cs = this.state.data;
		if(cs) {
			cs.splice(index, 1);
			this.setState({data : cs}, this.onOutput.bind(this));
		}
	}

	onOutput() {
		if(this.props.onOutput) {
			this.props.onOutput('classification', this.state.data);
		}
	}

	setVocabulary(event) {
		this.setState({vocabulary : event.target.value});
	}

	getSuggestions(value, callback) {
		//cancel all previous outgoing requests
		for(let x=this.xhrs.length;x>0;x--) {
			this.xhrs[x-1].abort();
			this.xhrs.pop();
		}
	    const xhr = ExternalAPI.autocomplete(this.state.vocabulary, value, callback);
	    this.xhrs.push(xhr);
	}

	/* ------------------- functions specifically needed for react-autosuggest ------------------- */

	loadSuggestions(value) {
		this.setState({
			isLoading: true,
			suggestions: []
		});
		if(value.value === this.state.chosenValue) {
			this.setState({
				isLoading: false
			});
		} else {
			this.getSuggestions(value.value, (data) => {
				if(!data || data.error) {
					this.setState({
						isLoading: false,
						suggestions: []
					});
				} else {
					this.setState({
						isLoading: false,
						suggestions: data
					});
				}
			});
		}
	}

	getSuggestionValue(suggestion) {
		this.setState({suggestionId : suggestion.value});
  		return suggestion.label.split('|')[0];
	}

	//TODO the rendering should be adapted for different vocabularies
	renderSuggestion(suggestion) {
		const arr = suggestion.label.split('|');
		let label = arr[1];
		const scopeNote = arr[2] ? '(' + arr[2] + ')' : ''
		if(this.state.vocabulary == 'GTAA') {
			switch(arr[1]) {
				case 'Persoon' : label = (<span className="label label-warning">Persoon</span>);break;
				case 'Maker' : label = (<span className="label label-warning">Maker</span>);break;
				case 'Geografisch' : label = (<span className="label label-success">Locatie</span>);break;
				case 'Naam' : label = (<span className="label label-info">Naam</span>);break;
				case 'Onderwerp' : label = (<span className="label label-primary">Onderwerp</span>);break;
				case 'Genre' : label = (<span className="label label-default">Genre</span>);break;
				case 'B&G Onderwerp' : label = (<span className="label label-danger">B&G Onderwerp</span>);break;
				default : label = (<span className="label label-default">Concept</span>);break;
			}
		} else if(this.state.vocabulary == 'DBpedia') {
			label = (<span className="label label-default">Concept</span>);
		} else if(this.state.vocabulary == 'UNESCO') {
			switch(arr[1]) {
				case 'Education' : label = (<span className="label label-warning">{arr[1]}</span>);break;
				case 'Science' : label = (<span className="label label-warning">{arr[1]}</span>);break;
				case 'Social and human sciences' : label = (<span className="label label-success">{arr[1]}</span>);break;
				case 'Information and communication' : label = (<span className="label label-info">{arr[1]}</span>);break;
				case 'Politics, law and economics' : label = (<span className="label label-primary">{arr[1]}</span>);break;
				case 'Countries and country groupings' : label = (<span className="label label-default">{arr[1]}</span>);break;
				default : label = (<span className="label label-default">{arr[1]}</span>);break;
			}
		}
		return (
			<span>{arr[0]}&nbsp;{label}&nbsp;{scopeNote}</span>
		);
	}

	onSuggestionsFetchRequested(value) {
		this.loadSuggestions(value);
	}

	onSuggestionsClearRequested() {
		this.setState({
			suggestions : []
		});
	}

	onChange(event, { newValue }) {
		this.setState({
			chosenValue: newValue,
			value: newValue
		});
	} /* ------------------- end of specific react-autosuggest functions ------------------- */

	render() {
		let classificationList = null;
		const classifications = this.state.data.map((c, index) => {
			return (
				<Classification key={'cl__' + index} classification={c}>
					<i className="fa fa-close interactive"
						onClick={this.removeClassification.bind(this, index)}>
					</i>
				</Classification>
			)
		}, this);
		if(classifications.length > 0) {
			classificationList = (
				<div>
					<h4>Saved classifications</h4>
					<div className="well">
						{classifications}
					</div>
				</div>
			)
		}

		const inputProps = {
			placeholder: 'Zoek een term',
			value: this.state.value,
			onChange: this.onChange.bind(this)
		};

		//generate the options from the config and add a default one
		const vocabularyOptions = this.props.config.vocabularies.map((v, index) => {
			return (
				<label className="radio-inline" key={index}>
					<input
						type="radio"
						name="vocabularyOptions"
						id={v}
						value={v}
						checked={v == this.state.vocabulary}
						onChange={this.setVocabulary.bind(this)}/>
						{v}
				</label>
			);
		}, this);
		vocabularyOptions.push(
			<label className="radio-inline" key={vocabularyOptions.length}>
				<input
					type="radio"
					name="vocabularyOptions"
					id="custom"
					value="custom"
					checked={'custom' == this.state.vocabulary}
					onChange={this.setVocabulary.bind(this)}/>
					Custom (no external lookup)
			</label>
		);

		return (
			<div className={IDUtil.cssClassName('classify-form')}>
				<br/>
				<div className="row">
					<div className="col-md-12">
						{classificationList}
					</div>
				</div>
				<div className="row">
					<div className="col-md-12">
						<form>
							<div className="form-group">
								<h4>Add classifications</h4>
								<br/>
								<div className="text-left">
									<label>Vocabulary:&nbsp;</label>
									{vocabularyOptions}
								</div>
								<br/>
								<Autosuggest
									ref="classifications"
									suggestions={this.state.suggestions}
									onSuggestionsFetchRequested={this.onSuggestionsFetchRequested.bind(this)}
									onSuggestionsClearRequested={this.onSuggestionsClearRequested.bind(this)}
									getSuggestionValue={this.getSuggestionValue.bind(this)}
									renderSuggestion={this.renderSuggestion.bind(this)}
									inputProps={inputProps}
								/>
							</div>
							<button className="btn btn-primary" onClick={this.addClassification.bind(this)}>Add</button>
						</form>
					</div>
				</div>
			</div>
		);
	}

}

export default ClassifyingForm;