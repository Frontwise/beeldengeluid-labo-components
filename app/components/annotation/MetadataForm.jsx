import IDUtil from '../../util/IDUtil';
import IconUtil from '../../util/IconUtil';

/*
Goal:

This component is the way for any crowd to add metadata in the form of key value pairs (and later also entities?)
It is based on the idea of 'information cards' from editortool.linkedtv.eu

TODO:
	- validate the config that is passed, see the metadata block in e.g. arttube-item-details.json
	- gracefully deal with the fact that the template is not stored in the annotation (which makes it impossible to fill
	the dropdown box with the template that was used to create the annotation)

Input:
	- TODO

Output:
	- TODO

HTML markup & CSS attributes:
	- regular div => .bg__information-card-form
*/

class MetadataForm extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			cards: this.props.data ? this.props.data : [], //list of cards
			activeCard : null,
			activeCardIndex : -1,
			activeTemplate : null,
			templates : this.determinePossibleTemplates(), //list of templates
			singleCardMode : this.determineSingleCardMode()
		}
		this.CLASS_PREFIX = 'icf';
	}

	componentDidMount() {
		//first determine which card should be shown (either the activeSubAnnotation or the first one in the list of saved cards)
		let activeCard = null;
		let activeCardIndex = -1;
		if(this.props.activeSubAnnotation && this.props.activeSubAnnotation.annotationType == 'metadata') {
			activeCard = this.props.activeSubAnnotation;
			for(let i=0;i<this.props.data.length;i++) {
				if(this.props.data[i].annotationId == activeCard.annotationId) {
					activeCardIndex = i;
					break;
				}
			}
		} else {//show the first one in the list of saved cards
			activeCard = this.props.data && this.props.data.length > 0 ? this.props.data[0] : {properties : [{key : '', value : ''}]};
			activeCardIndex = 0;
		}
		let cards = this.state.cards;
		let activeTemplate = null;
		//(if in single card mode) if there is no card in the data show by default an empty card based on the first template
		if(this.state.singleCardMode && !activeCard) {
			activeTemplate = this.getActiveTemplate();
			if(activeTemplate) {
				const properties = this.state.activeTemplate.properties.map((prop) => {
					return {key : prop.key, value : ''}
				});
				activeCard = {properties : properties};
				cards = [activeCard];
			}
		}

		if(activeCard && activeCard.annotationTemplate) {
			activeTemplate = this.getTemplateById(activeCard.annotationTemplate);
		}

		this.setState({
			cards : cards,
			activeCard : activeCard,
			activeCardIndex : activeCardIndex,
			activeTemplate : activeTemplate
		});
	}

	/* --------------- RELATED TO (ACTIVE) TEMPLATES --------------*/

	determinePossibleTemplates() {
		let templates = null;
		if(this.props.annotationTarget) {
			if(this.props.annotationTarget.selector.refinedBy && this.props.config.mediaSegment) {
				//return the first template defined for media segments
				if(this.props.config.mediaSegment.templates) {
					templates = this.props.config.mediaSegment.templates.map((key) => {
						return this.props.config.templates[key];
					});
				}
			} else if(!this.props.annotationTarget.selector.refinedBy && this.props.config.mediaObject) {
				//return the first template defined for media objects
				if(this.props.config.mediaObject.templates) {
					templates = this.props.config.mediaObject.templates.map((key) => {
						return this.props.config.templates[key];
					});
				}
			}
		}
		return templates;
	}

	getActiveTemplate() {
		if(this.props.annotationTarget) {
			if(this.props.annotationTarget.selector.refinedBy && this.props.config.mediaSegment) {
				//return the first template defined for media segments
				if(this.props.config.mediaSegment.templates) {
					return this.props.config.templates[this.props.config.mediaSegment.templates[0]];
				}
			} else if(!this.props.annotationTarget.selector.refinedBy && this.props.config.mediaObject) {
				//return the first template defined for media objects
				if(this.props.config.mediaObject.templates) {
					return this.props.config.templates[this.props.config.mediaObject.templates[0]];
				}
			}
		}
		return null;
	}

	setActiveTemplate(event) {
		const templateId = event.target.value;
		if(templateId && this.state.templates) {
			if(templateId == 'NO_TEMPLATE') {
				this.setState({
					activeTemplate : null,
					activeCard : {properties : []}
				});
			} else {
				const activeTemplate = this.getTemplateById(templateId);
				if(activeTemplate) {
					const properties = activeTemplate.properties.map((prop) => {
						return {key : prop.key, value : ''}
					});
					const activeCard = {
						annotationTemplate : templateId,
						properties : properties
					};
					this.setState({
						activeTemplate : activeTemplate,
						activeCard : activeCard
					});
				}
			}
		}
	}

	//this is for determining whether the user only able to edit a single card. If so the card list won't be dispalyed
	determineSingleCardMode() {
		if(this.props.annotationTarget) {
			//if there is more than one template, always return false, otherwise check whether cardsPerUser is set to 1
			if(this.props.annotationTarget.selector.refinedBy && this.props.config.mediaSegment) {
				//do this check for the media segment config
				if(this.props.config.mediaSegment.templates) {
					return this.props.config.mediaSegment.cardsPerUser === 1;
				}
			} else if(!this.props.annotationTarget.selector.refinedBy && this.props.config.mediaObject) {
				//do this check for the media object config
				if(this.props.config.mediaObject.templates) {
					return this.props.config.mediaObject.cardsPerUser === 1;
				}
			}
		}
		return false;
	}

	getTemplateById(templateId) {
		if(this.state.templates) {
			const temp = this.state.templates.filter((t) => {
				return t.id == templateId;
			});
			if(temp.length > 0) {
				return temp[0];
			}
		}
		return null;
	}

	//if the card is based on a template (and has the annotationTemplate property), check if there is a
	//type configured for the kind of input field
	getInputFieldType(card, property) {
		let fieldType = 'string';
		if(card && card.annotationTemplate) {
			const t = this.props.config.templates[card.annotationTemplate];
			if(t && t.properties) {
				const tmp = t.properties.filter((p) => {
					return p.key == property;
				})
				if(tmp.length == 1 && tmp[0].type) {
					fieldType = tmp[0].type;
				}
			}
		}
		return fieldType;
	}

	isTemplateLocked(template) {
		return template && template.locked;
	}

	/* --------------- CRUD ON CARDS -------------------- */

	addEmptyCard(e) {
		let properties = []
		//add the properties from the active template (if any)
		if(this.state.activeTemplate) {
			properties = this.state.activeTemplate.properties.map((prop) => {
				return {key : prop.key, value : ''}
			});
		}
		const ac = {properties : properties}
		this.setState({
			activeCard : ac,
			activeCardIndex : -1
		});
	}

	setActiveCard(index, e) {
		if(this.state.cards.length > 0 && index < this.state.cards.length) {
			const activeCard = JSON.parse(JSON.stringify(this.state.cards[index]));
			const activeTemplate = this.getTemplateById(activeCard.annotationTemplate);
			this.setState({
				activeCard : activeCard,
				activeCardIndex : index,
				activeTemplate : activeTemplate
			});
		}
	}

	saveCard(e) {
		if(e) {
			e.preventDefault();
		}
		if(this.state.activeCard) {
			const cards = this.state.cards;
			const ac = JSON.parse(JSON.stringify(this.state.activeCard));

			//(if there is an active template) attach the selected template ID to the annotation/card (otherwise remove it)
			if(this.state.activeTemplate) {
				ac.annotationTemplate = this.state.activeTemplate.id;
			} else if (ac.hasOwnProperty('annotationTemplate')) {
				delete ac['annotationTemplate'];
			}

			//is it a new card or is it updating an existing one
			if(this.state.activeCardIndex == -1) {
				cards.push(ac);
			} else {
				cards[this.state.activeCardIndex] = ac;
			}

			//finally update the state and output the data to the AnnotationBox
			this.setState(
				{cards : cards},
				this.onOutput.bind(this)
			);
		}

	}

	removeCard(index) {
		const cards = this.state.cards;
		cards.splice(index, 1);
		this.setState(
			{cards : cards},
			this.onOutput.bind(this)
		);
		if(cards.length == 0) {
			this.addEmptyCard();
		}
	}


	/* --------------- CRUD ON PROPERTIES -------------------- */


	addProperty(e) {
		e.preventDefault();
		if(this.state.activeCard) {
			const ac = this.state.activeCard;
			ac.properties.push({key : '', value : ''})
			this.setState({activeCard : ac});
		}
	}

	updateProperty(index, isKey, e) {
		const ac = this.state.activeCard;
		if(isKey) {
			ac.properties[index].key = e.target.value;
		} else {
			ac.properties[index].value = e.target.value;
		}
		this.setState(
			{activeCard : ac}, this.onUpdateProperty()
		);
	}

	onUpdateProperty() {
		if(this.state.singleCardMode) {
			this.saveCard();
		}
	}

	removeProperty(index) {
		let resetPoster = false;
		const ac = this.state.activeCard;
		if(ac.properties[index] && ac.properties[index].key == 'poster') {
			resetPoster = true;
		}
		ac.properties.splice(index, 1);
		this.setState({
			activeCard : ac,
			poster : resetPoster ? null : this.state.poster
		})
	}

	/* --------------- OUTPUT & RENDERING -------------------- */

	onOutput() {
		if(this.props.onOutput) {
			this.props.onOutput(
				'metadata',
				this.state.cards,
				this.state.activeTemplate ? this.state.activeTemplate.id : null
			);
		}
	}

	render() {
		let cardList = null;
		let cardForm = null;
		let cardListControls = null;


		if(!this.state.singleCardMode) {
			//draw the list of cards at the top (use the first property as label/title)
			if(this.state.cards.length > 0) {
				const cards = this.state.cards.map((card, index) => {
					const iconClass = IconUtil.getAnnotationTemplateIcon(card.annotationTemplate);
					return (
						<li key={'com__' + index}
							className={this.state.activeCardIndex == index ? 'list-group-item active' : 'list-group-item' }
							onClick={this.setActiveCard.bind(this, index)}>
							<span className={IconUtil.getUserActionIcon('remove', false, false, true)}
								onClick={this.removeCard.bind(this, index)}>
							</span>
							&nbsp;
							{card.properties[0].value}&nbsp;({card.properties.length}&nbsp; properties)
							&nbsp;
							<span className={iconClass}></span>
						</li>
					)
				}, this);
				cardList = (
					<div>
						<h4>Saved cards</h4>
						<ul className="list-group">
							{cards}
						</ul>
					</div>
				)
			}

			//draw the 'new' and 'save' buttons that are show below the card list
			cardListControls = (
				<div className="row">
					<div className="col-md-12">
						<button className="btn btn-default" onClick={this.addEmptyCard.bind(this)}>
							New
							&nbsp;
							<span className={IconUtil.getUserActionIcon('add')}></span>
						</button>
						&nbsp;
						<button className="btn btn-default" onClick={this.saveCard.bind(this)}>
							Save
							&nbsp;
							<span className={IconUtil.getUserActionIcon('save')}></span>
						</button>
					</div>
				</div>
			)
		}

		//draw the form of the active card below
		if(this.state.activeCard) {
			const formRows = this.state.activeCard.properties.map((prop, i) => {
				let inputField = null;
				let delPropBtn = null;
				let propertyField = null;

				//determine what input field to draw
				const fieldType = this.getInputFieldType(this.state.activeCard, prop.key);
				if(fieldType == 'markdown') {
					inputField = (
						<textarea className="form-control" value={prop.value} rows="5"
							onChange={this.updateProperty.bind(this, i, false)}></textarea>
					)
				} else {
					inputField = (
						<input type="text" className="form-control" value={prop.value}
							onChange={this.updateProperty.bind(this, i, false)}/>
					)
				}

				//only add delete buttons and editable property fields when the template is not locked
				if(this.isTemplateLocked(this.state.activeTemplate)) {
					propertyField = (
						<label>{prop.key}</label>
					)
				} else {
					delPropBtn = (
						<td className={IDUtil.cssClassName('icon', this.CLASS_PREFIX)}>
							<span className={IconUtil.getUserActionIcon('remove', false, false, true)}
								onClick={this.removeProperty.bind(this, i)}></span>
						</td>
					)
					propertyField = (
						<input type="text" className="form-control"
								value={prop.key} onChange={this.updateProperty.bind(this, i, true)}/>
					)
				}

				//assemble the elements into the eventual form
				return (
					<tr key={'prop__' + i} className={IDUtil.cssClassName('card-table-row', this.CLASS_PREFIX)}>
						<td className={IDUtil.cssClassName('key', this.CLASS_PREFIX)}>
							{propertyField}
						</td>
						<td className={IDUtil.cssClassName('value', this.CLASS_PREFIX)}>
							{inputField}
						</td>
						{delPropBtn}
					</tr>
				)
			});

			//draw the template selector (if any have been defined)
			let templateSelect = null;
			if(this.state.templates) {
				const templateOptions = Object.keys(this.state.templates).map((key) => {
					const template = this.state.templates[key];
					return (
						<option key={template.id + '__option'} value={template.id}>
							{template.label}
						</option>
					)
				});

				//whenever no template is used/defined
				templateOptions.splice(0, 0, <option key="null__option" value="NO_TEMPLATE">No template</option>);

				templateSelect = (
					<form className="form-horizontal">
						<div className="form-group">
							<label className="col-sm-3">Template</label>
							<div className="col-sm-9">
								<select className="form-control"
									value={this.state.activeTemplate ? this.state.activeTemplate.id : 'NO_TEMPLATE'}
									onChange={this.setActiveTemplate.bind(this)}>
									{templateOptions}
								</select>
							</div>
						</div>
					</form>
				);
			}

			//draw the add property button if the template is not locked
			let addPropBtn = null;
			if(!this.isTemplateLocked(this.state.activeTemplate)) {
				addPropBtn = (<div className="form-group">
					<button className="btn btn-default" onClick={this.addProperty.bind(this)}>
						<span className={IconUtil.getUserActionIcon('add', false, false, true)}></span>
					</button>
				</div>);
			}

			cardForm = (
				<div>
					{templateSelect}
					<form>
						<h4>Edit card</h4>
						<table className={IDUtil.cssClassName('card-table', this.CLASS_PREFIX)}>
							<tbody>
								{formRows}
							</tbody>
						</table>
						{addPropBtn}
					</form>
				</div>
			)
		}

		return (
			<div className={IDUtil.cssClassName('information-card-form')}>
				<br/>
				<div className="row">
					<div className="col-md-12">
						{cardList}
					</div>
				</div>
				{cardListControls}
				<div className="row">
					<div className="col-md-12">
						{cardForm}
					</div>
				</div>
			</div>
		)
	}
}

export default MetadataForm;