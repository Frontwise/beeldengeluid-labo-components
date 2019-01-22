import IDUtil from '../../util/IDUtil';
import AnnotationUtil from '../../util/AnnotationUtil';
import ExternalAPI from '../../api/ExternalAPI';

/*
Input:
	- list of links (props.data)
	- a annotation config (props.config)
	- onOutput (what to do after adding/removing a link) --> should be changed to Flux?

Output/emits:
	- a list of links

HTML markup & CSS attributes:
	- regular div => .bg__link-form
*/

class LinkingForm extends React.Component {

	constructor(props) {
		super(props);
		const api = this.props.config.apis ? this.props.config.apis[0].name : null;
		this.state = {
			data: this.props.data ? this.props.data : [],
			api : api,
			results : []
		};
		this.CLASS_PREFIX = 'lf';
	}

	/* ------------------- CRUD / loading of links ------------------- */

	setAPI(event) {
		this.setState({api : event.target.value});
	}

	//TODO make sure that at least one common property is present in the linkData (when hooking up different APIs)
	addLink(linkData) {
		const links = this.state.data;
		if(links && linkData) {
			links.push(linkData);
			this.setState({data : links}, this.onOutput.bind(this));
		}
	}

	removeLink(index) {
		const links = this.state.data;
		if(links) {
			links.splice(index, 1);
			this.setState({data : links}, this.onOutput.bind(this));
		}
	}

	onOutput() {
		if(this.props.onOutput) {
			this.props.onOutput('link', this.state.data);
		}
	}

	submit(event) {
		event.preventDefault();
		if(this.state.api !== 'custom') {
			ExternalAPI.search(this.state.api, this.searchTermRef.value, this.onSubmit.bind(this));
		} else {
			if(AnnotationUtil.isValidURL(this.link_url.value)) {
				const links = this.state.data;
				links.push({
					url : this.link_url.value,
					label : this.link_label.value
				});
				this.setState({data : links}, this.onOutput.bind(this));
			} else {
				alert('Please enter a valid URL');
			}
		}
	}

	onSubmit(data) {
		this.setState({results : data});
	}

	render() {
		let inputForm = null;
		let resultList = null;
		let linkList = null;
		let links = null;

		//draw the list of links
		if(this.state.data) {
			links = this.state.data.map((link, index) => {
				return (
					<li key={'com__' + index} className="list-group-item" title={link.url}>
						<i className="fa fa-close interactive" onClick={this.removeLink.bind(this, index)}/>
						&nbsp;
						<a href={link.url} target="_new">{link.label}</a>
					</li>
				)
			}, this);
			if(links.length > 0) {
				linkList = (
					<div>
						<h4>Saved links</h4>
						<ul className="list-group">
							{links}
						</ul>
					</div>
				)
			}
		}

		//generate the options from the config and add a default one
		const apiOptions = this.props.config.apis.map((api, index) => {
			return (
				<div className="radio-inline" key={'api__' + index}>
					<label>
						<input
							type="radio"
							name="apiOptions"
							id={api.name}
							value={api.name}
							checked={api.name === this.state.api}
							onChange={this.setAPI.bind(this)}/>
							{api.name}
					</label>
				</div>
			);
		}, this);

		//draw a URL and link label field (custom mode) OR draw a search field (if an API is selected)
		let formFields = null;
		if(this.state.api === 'custom') {
			formFields = [
				<div key="input_url" className="form-group">
					<label htmlFor="link_url" className="col-sm-2 control-label">URL</label>
					<div className="col-sm-10">
						<input type="text" id="link_url" ref={input => (this.link_url = input)} className="form-control"/>
					</div>
				</div>,
				<div key="input_label" className="form-group">
					<label htmlFor="link_label" className="col-sm-2 control-label">Link label</label>
					<div className="col-sm-10">
						<input type="text" id="link_label" ref={input => (this.link_label = input)} className="form-control"/>
					</div>
				</div>
			]
		} else {
			formFields = (
				<div className="form-group">
					<label htmlFor="search" className="col-sm-2 control-label">Search API</label>
					<div className="col-sm-10">
						<input type="text" id="search" ref={input => (this.searchTermRef = input)} className="form-control"/>
					</div>
				</div>
			);
		}

		//draw the input form
		inputForm = (
			<form className="form-horizontal">
				<div className="form-group">
					<div className="col-sm-offset-2 col-sm-10">
						{apiOptions}
					</div>
				</div>
				{formFields}
				<div className="form-group">
    				<div className="col-sm-offset-2 col-sm-10">
						<button className="btn btn-primary" onClick={this.submit.bind(this)}>
							{this.state.api === 'custom' ? 'Add' : 'Search'}
						</button>
					</div>
				</div>
			</form>
		);

		//draw the search results (non-custom API only)
		if(this.state.results.length > 0) {
			const results = this.state.results.map((res, index) => {
				let poster = null;
				if(res.poster) {
					poster = (<td><img src={res.poster} style={{maxWidth:'100px'}}/></td>);
				}
				return(
					<tr key={'result__' + index} onDoubleClick={this.addLink.bind(this, res)}>
						{poster}
						<td><label className="media-heading">{res.label ? res.label : res.title}</label></td>
						<td>{res.description}</td>
					</tr>
				)
			}, this);
			resultList = (<div>
				<h4>Gevonden resultaten <small>Dubbelklik een gevonden resultaat om deze toe te voegen</small></h4>
				<div className={IDUtil.cssClassName('result-list', this.CLASS_PREFIX)}>
					<table className="table table-bordered">
						<tbody>
							{results}
						</tbody>
					</table>
				</div>
			</div>);
		}

		return (
			<div className={IDUtil.cssClassName('link-form')}>
				<br/>
				<div className="row">
					<div className="col-md-12">
						{linkList}
					</div>
				</div>
				<div className="row">
					<div className="col-md-12">
						{inputForm}
						{resultList}
					</div>
				</div>
			</div>
		);
	}

}

export default LinkingForm;
