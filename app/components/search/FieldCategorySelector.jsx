import IDUtil from '../../util/IDUtil';
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
		};
		this.CLASS_PREFIX = 'fcs';
	}

	onComponentOutput(componentClass, data) {
		if(componentClass === 'FieldCategoryCreator') {
			this.onFieldsSelected(data);
		}
	}

    // shouldComponentUpdate(nextProps, nextState) {
    //     if (nextProps.fieldCategory && this.props.fieldCategory) {
    //         return (nextProps.fieldCategory.length !== this.props.fieldCategory.length) || nextState.showModal;
    //     }
    //     return true
    // }

	onOutput(data) {
		if(this.props.onOutput) {
			if(data !== null) {
                this.props.onOutput(this.constructor.name, data);
			} else {
                this.props.onOutput(this.constructor.name, null);
            }
		}
	}

    handleChange ({ options }) {
    	let found = false;
    	const tmp = {};
    	for(let i=0;i<options.length;i++) {
    		const fc = options[i];
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
    		if(selectedFields[i].id === selection.id){
    			selected = true;
    			break;
    		}
    	}
    	return selected;
    }

    onFieldsSelected(data) {
    	ComponentUtil.hideModal(this, 'showBookmarkModal', 'fields__modal', true, () => {
    		const fields = this.props.fieldCategory || [];
    		if(data) { //when nothing was selected, it is no use to update the owner
	    		fields.push(data);
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

    getGroupedOptions(fieldCategories, selectedFields) {
        const optsMetadata = [];
        const optsEnrichment = [];
        const optionsToSelect = fieldCategories.filter((fc) => {
            return !this.isSelected(fc, selectedFields);
        });

        optionsToSelect.forEach(fc => {
            if (fc.enrichment) {
                optsEnrichment.push(fc)
            } else {
                optsMetadata.push(fc)
            }
        });
        if (optsEnrichment.length && optsMetadata.length) {
            return [{"label": "── Archive's metadata ──", "options": optsMetadata},
                {"label": "── Enrichments ──", "options": optsEnrichment}]
        } else if (optsMetadata.length) {
            return [{"label": "── Archive's metadata ──", "options": optsMetadata}]
        } else if (optsEnrichment.length) {
            return [{"label": "── Enrichments ──", "options": optsEnrichment}]
        } else {
            return [];
        }
    }

	render() {
		let fieldCategorySelector = null;
        let fieldSelectionModal = null;
        const selectedFields = this.props.fieldCategory || [];
        const fieldCategories = this.props.collectionConfig
            ? this.props.collectionConfig.getMetadataFieldCategories()
            : null;

        if (this.state.showModal) {
            const data = this.props.collectionConfig.getCollectionStats().collection_statistics.document_types[0].fields.text;
            const dataFormatted = data.map(field => (
                {'value': field, 'prettyName': this.props.collectionConfig.toPrettyFieldName(field)})
            );
			fieldSelectionModal = (
				<FlexModal
                    size="large"
					elementId="fields__modal"
					stateVariable="showModal"
					owner={this}
					title="Create a new cluster of metadata fields to narrow down search">
					<FieldCategoryCreator data={dataFormatted} onOutput={this.onComponentOutput.bind(this)}/>
				</FlexModal>
			)
		}

		if(fieldCategories && selectedFields) {
            const groupedOptions = this.getGroupedOptions(fieldCategories, selectedFields);

			fieldCategorySelector = (
				<div className={IDUtil.cssClassName('field-category-selector')}>
					<PowerSelectMultiple
						key={'__pwsm__' + this.props.queryId}
						options={groupedOptions}
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
						placeholder="All metadata fields"
						afterOptionsComponent={({ select }) => (
							<div className={IDUtil.cssClassName('option-create', this.CLASS_PREFIX)}>
					            <button className="btn btn-sm btn-primary"
									onClick={() => {
										this.addCustomFields(select);
									}}>
					              + Custom field cluster
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
		{option.label}
	</div>
);

export const SelectedOption = ({option, queryId, collectionConfig}) => (
    <ul className="bg__ul-selectedOption">
        <li className="PowerSelectMultiple__SelectedOption">
		<span className="PowerSelectMultiple__SelectedOption__Label"
              title={option.fields.map((f) => collectionConfig.toPrettyFieldName(f)).join('\n')}>
			{option.label}
		</span>
        </li>
    </ul>
);
