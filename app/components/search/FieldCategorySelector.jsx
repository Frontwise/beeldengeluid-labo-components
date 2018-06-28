import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import ComponentUtil from '../../util/ComponentUtil';
import FlexModal from '../FlexModal';

import FieldCategoryCreator from './FieldCategoryCreator';

import ReactTooltip from 'react-tooltip'; //https://www.npmjs.com/package/react-tooltip
import { PowerSelectMultiple } from 'react-power-select';

//TODO this component is not used yet and does not have a proper component ID yet
class FieldCategorySelector extends React.Component {

	constructor(props) {
		super(props);

		this.state = {
			showModal : false
		}
		this.CLASS_PREFIX = 'fcs';
	}

	onComponentOutput(componentClass, data) {
		if(componentClass == 'FieldCategoryCreator') {
			this.onFieldsSelected(data);
		}
	}

	onOutput(data) {
		if(this.props.onOutput) {
			if(data === null) {
				this.props.onOutput(this.constructor.name, null);
			} else {
                this.props.onOutput(this.constructor.name, data);
			}
		}
	}

    handleChange ({ options }) {
    	let found = false;
    	let tmp = {}
    	for(let i=0;i<options.length;i++) {
    		let fc = options[i]
    		if(tmp[fc.id]) {
    			found = true;
    			break;
    		}
    		tmp[fc.id] = true;
    	}
		if(!found) {
			this.onOutput(options);
	    }
    }

    isSelected(selection, selectedFields) {
    	let selected = false;
    	for(let i=0;i<selectedFields.length;i++) {
    		if(selectedFields[i].id == selection.id){
    			selected = true;
    			break;
    		}
    	}
    	return selected;
    }

    onFieldsSelected(data) {
    	ComponentUtil.hideModal(this, 'showBookmarkModal', 'fields__modal', true, () => {
    		const fields = this.props.fieldCategory || []
    		if(data) { //when nothing was selected, it is no use to update the owner
	    		fields.push(data)
	    		this.onOutput(fields)
	    	}
    	});
    }

    addCustomFields(selectComponent) {
    	selectComponent.actions.close();
    	this.setState({
    		showModal : true
    	})
    }

	render() {
		let fieldCategorySelector = null;
		const includedFields = 'All metadata fields (classified as text field) are included in your search';
		const selectedFields = this.props.fieldCategory || [];

		let fieldSelectionModal = null;
		if(this.state.showModal) {
			fieldSelectionModal = (
				<FlexModal
					elementId="fields__modal"
					stateVariable="showModal"
					owner={this}
					title="Create a new cluster of metadata fields to search through">
					<FieldCategoryCreator collectionConfig={this.props.collectionConfig}
						onOutput={this.onComponentOutput.bind(this)}/>
				</FlexModal>
			)
		}

		if(this.props.collectionConfig.getMetadataFieldCategories()) {
			const optionsToSelect = this.props.collectionConfig.getMetadataFieldCategories().filter((fc)=> {
				return !this.isSelected(fc, selectedFields);
			});
			//console.debug(selectedFields);
			fieldCategorySelector = (
				<div className={IDUtil.cssClassName('field-category-selector')}>
					<PowerSelectMultiple
						key={'__pwsm__' + this.props.queryId}
						options={optionsToSelect}
						selected={selectedFields}
						optionLabelPath="label"
          				optionComponent={
          					<ListOption collectionConfig={this.props.collectionConfig}/>
          				}
          				selectedOptionComponent={
          					<SelectedOption
          						queryId={this.props.queryId}
          						collectionConfig={this.props.collectionConfig}/>
          				}
						onChange={this.handleChange.bind(this)}
						placeholder="Search in: all fields"
						afterOptionsComponent={({ select }) => (
							<div className={IDUtil.cssClassName('option-create', this.CLASS_PREFIX)}>
					            <button className="btn btn-sm btn-primary"
									onClick={() => {
										this.addCustomFields(select);
									}}>
					              + Custom category
								</button>
							</div>
						)}
					/>
				<ReactTooltip id={'__fs__tt' + this.props.queryId} />
				{fieldSelectionModal}
			</div>);
		}

		return fieldCategorySelector;
	}
}

export default FieldCategorySelector;


export const ListOption = ({ option, collectionConfig }) => (
	<div title={option.fields.map((f) => collectionConfig.toPrettyFieldName(f)).join('\n')}>
		Search in: {option.label}
	</div>
);

export const SelectedOption = ({option, optionLabelPath, onCloseClick, select, queryId, collectionConfig}) => (
	<li className="PowerSelectMultiple__SelectedOption">
		<span className="PowerSelectMultiple__SelectedOption__Label"
			title={option.fields.map((f) => collectionConfig.toPrettyFieldName(f)).join('\n')}>
			{option[optionLabelPath]}
		</span>
		<span
			className="PowerSelectMultiple__SelectedOption__Close"
			onClick={event => {
				event.stopPropagation();
				onCloseClick({ option, select });
			}}
		>
		×
		</span>
	</li>
);