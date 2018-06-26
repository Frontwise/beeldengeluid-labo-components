import IDUtil from './util/IDUtil';
import FlexRouter from './util/FlexRouter';
import ComponentUtil from './util/ComponentUtil';
import CollectionUtil from './util/CollectionUtil';
import CollectionAPI from './api/CollectionAPI';

import FlexBox from './components/FlexBox';
import FlexModal from './components/FlexModal';

import CollectionAnalyser from './components/collection/CollectionAnalyser';
import CollectionSelector from './components/collection/CollectionSelector';
import DateFieldSelector from './components/collection/DateFieldSelector';
import FieldAnalysisStats from './components/collection/FieldAnalysisStats';
import CollectionInspectorLineChart from './components/stats/CollectionInspectorLineChart';

import PropTypes from 'prop-types';

class CollectionRecipe extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			selectedCollections : {},
			activeCollection : null,
			collectionStats : null, //output from the collectionSelector
			fieldAnalysisStats : null, //output from the CollectionAnalyser
			fieldAnalysisTimeline : null, //output from the CollectionAnalyser
            dateField: null, // datefield used for analysis
            field: null, // field to analyse
		}
		this.CLASS_PREFIX = 'rcp__cl'
	}

	componentDidMount() {
		if(this.props.params.cids) {
			CollectionUtil.generateCollectionConfigs(
				this.props.clientId,
				this.props.user,
				this.props.params.cids.split(','),
				this.onConfigsLoaded.bind(this)
			);
		}
	}

	onConfigsLoaded(configs) {
		const selectedCollections = {}
		configs.forEach((conf) => {
			selectedCollections[conf.collectionId] = conf;
		});
		this.setState({
			selectedCollections : selectedCollections
		});
	}

	//redeives data from child components
	onComponentOutput(componentClass, data) {
		if(componentClass == 'CollectionSelector') {
			if(data) {
				const sc = this.state.selectedCollections;
				sc[data.collectionId] = data;
				this.setState(
					{
						selectedCollections : sc,
						activeCollection : data.collectionId,
						fieldAnalysisStats : null,
						fieldAnalysisTimeline : null
					},
					this.onCollectionAdded.bind(this)
				);

			}
		}
	}

	onCollectionAdded() {
		ComponentUtil.hideModal(this, 'showModal', 'collection__modal', true)
		this.updateBrowserHistory();
	}

	removeCollection(collectionId) {
		const collections = this.state.selectedCollections;
		const ac = this.state.activeCollection;
		delete collections[collectionId];

		const newStateObj = {
			selectedCollections : collections
		}
		//if you remove the selected collection also reset the active stats/visuals
		if(ac == collectionId) {
			newStateObj['activeCollection'] = null;
			newStateObj['fieldAnalysisStats'] = null;
			newStateObj['fieldAnalysisTimeline'] = null;
		}
		this.setState(newStateObj, this.updateBrowserHistory.bind(this))
	}

	setActiveCollection(e) {
		const collectionId = e.target.id;
		this.setState({
			activeCollection : collectionId,
			fieldAnalysisStats : null, //reset the field stats
			fieldAnalysisTimeline : null, //reset the analysis timeline
            field: null,
            dateField: null,
		})
	}

	updateBrowserHistory() {
		let params = null;
		if(Object.keys(this.state.selectedCollections).length > 0) {
			params = {cids : Object.keys(this.state.selectedCollections).join(',')};
		}
		FlexRouter.setBrowserHistory(
			params,
			this.constructor.name
		);
	}

	getCollectionData(collectionId) {
		if(this.state.selectedCollections) {
			return this.state.selectedCollections[collectionId];
		}
		return null;
	}

    /**
     * Data  Analysis
     */
    analyseField(analysisField) {
        this.loadAnalysis(analysisField, (data, timelineData) => {
            this.setState({
                fieldAnalysisStats : data,
                fieldAnalysisTimeline : timelineData
            })
        });
    }

    loadAnalysis(analysisField, callback) {
        const collectionConfig = this.getCollectionData(this.state.activeCollection);

        CollectionAPI.analyseField(
            collectionConfig.collectionId,
            collectionConfig.getDocumentType(),
            this.state.dateField ? this.state.dateField : 'null__option',
            analysisField ? analysisField : 'null__option',
            [], //facets are not yet supported
            collectionConfig.getMinimunYear(),
            false, //TODO determine nested
            (data) => {
                const timelineData = this.toTimelineData(data);
                callback(data, timelineData);
            }
        );
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

    /** End of data analysis */

    onDateField(dateField){
        this.setState({dateField}, ()=>{
            this.analyseField(this.state.field);
        });
    }

    onField(field){
        this.setState({field}, ()=>{
            this.analyseField(this.state.field);
        });
    }

	render() {
		const collectionConfig = this.getCollectionData(this.state.activeCollection);
		let collectionModal = null; //for selecting collections for the list
		let collectionBlock = null; //shows all selected collections

        let dateFieldSelector = null; // shows date field selector
		let statsModal = null; //for selecting collections for the list

		let analysisBlock = null; //only shown after a collection has been selected

		let fieldAnalysisTimeline = null; //show the timeline at the bottom
        let fieldAnalysisStats = null; // Shows the analysis stats as a table
		if(this.state.selectedCollections) {
			const items = Object.keys(this.state.selectedCollections).map((key) => {
				const c = this.state.selectedCollections[key];
				const classNames = ['list-group-item'];
				const collectionTitle = c.collectionInfo ? c.collectionInfo.title : c.collectionId;
				if(key == this.state.activeCollection) {
					classNames.push('active');
				}
				return (
					<li key={key} id={key} className={classNames.join(' ')} onClick={this.setActiveCollection.bind(this)}>
						<span className="fa fa-remove" onClick={this.removeCollection.bind(this, key)}></span>
						&nbsp;
						{collectionTitle}
					</li>
				)
			});

			const recipes = this.props.recipe.ingredients.recipes.map((r) => {
				return (<option id={r.id} value={r.id}>{r.label}</option>);
			});
			collectionBlock = (
				<FlexBox title="Selected collections">
						<div className="text-right">
							<button className="btn btn-primary"	onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
								Add collection&nbsp;<i className="fa fa-plus"></i>
							</button>
						</div>
						<br/>
						<ul className="list-group">
							{items}
						</ul>
				</FlexBox>
			)
		}

		//collection modal
		if(this.state.showModal) {
			collectionModal = (
				<FlexModal
					elementId="collection__modal"
					stateVariable="showModal"
					owner={this}
					size="large"
					title="Select a collection">
						<CollectionSelector
							onOutput={this.onComponentOutput.bind(this)}
							showSelect={true}
							showBrowser={true}/>
				</FlexModal>
			)
		}

		//TODO make sure that this is only shown when a collection has been selected
		if(collectionConfig) {
			let collectionAnalyser = null;

			//the collection analyser outputs the field analysis & timeline stats in onComponentOutput
			collectionAnalyser = (
				<CollectionAnalyser
					key={'__ca__' + collectionConfig.collectionId}
					collectionConfig={collectionConfig}
                    onChange={this.onField.bind(this)}
				/>
			);

            // only show datefield selector when a field has been chosen
            if(this.state.field) {
                dateFieldSelector = (
                    <FlexBox title="Date Field selector">
                        <div className={IDUtil.cssClassName('input-area', this.CLASS_PREFIX)}>
                            <DateFieldSelector
                                key={'__dfs__' + collectionConfig.collectionId}
                                collectionConfig={collectionConfig}
                                onChange={this.onDateField.bind(this)}
                            />
                        </div>
                    </FlexBox>
                );
            }

			if(this.state.fieldAnalysisStats) {
				fieldAnalysisStats = (
					<div className="fieldAnalysisStats">
                        <FieldAnalysisStats data={this.state.fieldAnalysisStats} collectionConfig={collectionConfig}/>
					</div>
				);
			}

			if(this.state.fieldAnalysisTimeline && this.state.field && this.state.dateField) {
				fieldAnalysisTimeline = (
					<CollectionInspectorLineChart
						data={this.state.fieldAnalysisTimeline}
						comparisonId={IDUtil.guid()}/>
				);
			} else{
                if (this.state.field && this.state.dateField){
                    fieldAnalysisTimeline =
                        <div className={IDUtil.cssClassName('input-area', this.CLASS_PREFIX)}>
                            <i className="fa fa-circle-o-notch fa-spin"/> Loading chart...
                        </div>
                }
            }

			analysisBlock = (
				<FlexBox title="Collection analysis">
						<div className="row">
							<div className="col-md-12">
								{collectionAnalyser}
							</div>
						</div>
				</FlexBox>
			)
		}

		return (
			<div className={IDUtil.cssClassName('collection-recipe')}>
				{collectionModal}
				{statsModal}
				<div className="row">
					<div className="col-md-6">
						{collectionBlock}
					</div>
					<div className="col-md-6">
						{analysisBlock}
					</div>
				</div>
				<div className="row">
					<div className="col-md-12">
						{fieldAnalysisTimeline}
					</div>
				</div>
                <div className="row">
                    <div className="col-md-12">
                        {dateFieldSelector}
                    </div>
                </div>
				<div className="row">
					<div className="col-md-12">
						{fieldAnalysisStats}
					</div>
				</div>
			</div>
		)
	}

}

CollectionRecipe.propTypes = {
	clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    })

};

export default CollectionRecipe;