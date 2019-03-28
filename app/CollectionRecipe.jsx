import IDUtil from './util/IDUtil';
import FlexRouter from './util/FlexRouter';
import ComponentUtil from './util/ComponentUtil';
import CollectionUtil from './util/CollectionUtil';
import ReadMoreLink from './components/helpers/ReadMoreLink';

import CollectionAPI from './api/CollectionAPI';

import FlexBox from './components/FlexBox';
import FlexModal from './components/FlexModal';

import CollectionAnalyser from './components/collection/CollectionAnalyser';
import CollectionSelector from './components/collection/CollectionSelector';
import DateFieldSelector from './components/collection/DateFieldSelector';
import FieldAnalysisStats from './components/collection/FieldAnalysisStats';
import MetadataCompletenessChart from './components/stats/MetadataCompletenessChart';

import PropTypes from 'prop-types';

import { initHelp } from './components/workspace/helpers/helpDoc';

class CollectionRecipe extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			loadedCollections : {},
			activeCollection : null,
			collectionStats : null, //output from the collectionSelector
			fieldAnalysisStats : null, //output from the CollectionAnalyser
			fieldAnalysisTimeline : null, //output from the CollectionAnalyser
            dateField: null, // datefield used for analysis
            field: null, // field to analyse
            showModal : false,
            analysedFields : {}
		}
		this.CLASS_PREFIX = 'rcp__cl'
	}

	componentDidMount() {
		if(this.props.params.cids) {
			CollectionUtil.generateCollectionConfigs(
				this.props.clientId,
				this.props.user,
				this.props.params.cids.split(','),
				this.onConfigsLoaded
			);
		}

        initHelp("Collection Inspector", "/feature-doc/howtos/collection-inspector");
	}

	onConfigsLoaded = configs => {
		const loadedCollections = {}
		configs.forEach((conf) => {
			loadedCollections[conf.collectionId] = conf;
		});
		this.setState({
			loadedCollections : loadedCollections
		});
	};

	//redeives data from child components
	onComponentOutput(componentClass, data) {
		if(componentClass === 'CollectionSelector') {
			if(data) {
				const sc = this.state.loadedCollections;
				sc[data.collectionId] = data;
				this.setState(
					{
						loadedCollections : sc,
						activeCollection : data.collectionId,
						fieldAnalysisStats : null,
						fieldAnalysisTimeline : null
					},
					this.onCollectionAdded
				);

			}
		}
	}

	onCollectionAdded = () => {
		ComponentUtil.hideModal(this, 'showModal', 'collection__modal', true)
		this.updateBrowserHistory();
	};

	removeCollection = collectionId => {
		const collections = this.state.loadedCollections;
		const ac = this.state.activeCollection;
		delete collections[collectionId];

		const newStateObj = {
			loadedCollections : collections
		}
		//if you remove the selected collection also reset the active stats/visuals
		if(ac === collectionId) {
			newStateObj['activeCollection'] = null;
			newStateObj['fieldAnalysisStats'] = null;
			newStateObj['fieldAnalysisTimeline'] = null;
		}
		this.setState(newStateObj, this.updateBrowserHistory)
	};

	setActiveCollection = e => {
		this.setState({
			activeCollection : e.target.id,
			fieldAnalysisStats : null, //reset the field stats
			fieldAnalysisTimeline : null, //reset the analysis timeline
            field: null,
            dateField: null,
		})
	};

	updateBrowserHistory = () => {
		let params = null;
		if(Object.keys(this.state.loadedCollections).length > 0) {
			params = {cids : Object.keys(this.state.loadedCollections).join(',')};
		}
		FlexRouter.setBrowserHistory(
			params,
			this.constructor.name
		);
	};

	getCollectionConfig = collectionId => {
		if(this.state.loadedCollections) {
			return this.state.loadedCollections[collectionId];
		}
		return null;
	};

    //generates the data for the chart TODO optimise this
    toTimelineData = data => {
        const timelineData = {};
        if(data) {
            const totalChart = [];
            const missingChart = [];
            const presentChart = [];
            for (const item in data.timeline) {
                totalChart.push({
                    year: data.timeline[item].year, //y-axis
                    total: data.timeline[item].background_count, //different line on graph
                });
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
            };

            timelineData['missing'] = {
                label : 'Missing',
                dateField : null, //what to do here?
                prettyQuery : null, //what to do here?
                data : missingChart,
                queryId : 'missing_chart'
            };

            timelineData['present'] = {
                label : 'Present',
                dateField : null,
                prettyQuery : null, //what to do here?
                data : presentChart,
                queryId : 'present_chart'
            }
        }
        return timelineData;
    };

    /* --------------------------- WHENEVER A FIELD IS SELECTED OR ANALYSED -------------------- */

    onFieldSelected = field => {
        this.setState({field}, () => {
            this.analyseField(this.state.field);
        });
    };

    onFieldAnalysed = analysedFields => {
    	this.setState({analysedFields : analysedFields});
    };

    onDateFieldSelected = dateField => {
        this.setState({dateField}, () => {
            this.analyseField(this.state.field);
        });
    };

    analyseField = analysisField => {
        this.loadAnalysis(analysisField, (data, timelineData) => {
            this.setState({
                fieldAnalysisStats : data,
                fieldAnalysisTimeline : timelineData
            })
        });
    };

    loadAnalysis = (analysisField, callback) => {
        const collectionConfig = this.getCollectionConfig(this.state.activeCollection);

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
    };


    /* ------------------------------------------ RENDERING FUNCTIONS ---------------------------------- */

    renderCollectionModal = () => {
    	return (
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
    };

    renderCollectionOverview = (loadedCollections, activeCollection) => {
    	const items = Object.keys(loadedCollections).map(collectionId => {
			const c = loadedCollections[collectionId];
			const classNames = ['list-group-item'];
			const collectionTitle = c.collectionInfo ? c.collectionInfo.title : c.collectionId;
			let ckanLink = null;
			let linkIcon = ReadMoreLink.svgImg('000');

			if(collectionId === activeCollection) {
				classNames.push('active');
                linkIcon = ReadMoreLink.svgImg('fff');
			}
            if (c.collectionInfo && c.collectionInfo.ckanUrl) {
                ckanLink = <ReadMoreLink linkIcon={linkIcon} linkUrl={c.collectionInfo.ckanUrl}/>
            }

			return (
				<li key={collectionId} id={collectionId} className={classNames.join(' ')} onClick={this.setActiveCollection}>
					<span className="fa fa-remove" onClick={this.removeCollection.bind(this, collectionId)}/>
					&nbsp;
					{collectionTitle} {ckanLink}
				</li>
			)
		});

		return (
			<FlexBox title="Selected collections">
                <div className="box">
					<div className="text-right">
						<button className="btn btn-primary"	onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
							Add collection&nbsp;<i className="fa fa-plus"/>
						</button>
					</div>
					<br/>
					<ul className="list-group">
						{items}
					</ul>
                </div>
			</FlexBox>
		);
    };

    renderDateFieldSelector = (collectionConfig, analysedFields, onDateFieldSelected) => {
    	return (
            <FlexBox title="Date Field selector">
                <div className={IDUtil.cssClassName('input-area', this.CLASS_PREFIX)}>
                    <DateFieldSelector
                        key={'__dfs__' + collectionConfig.collectionId}
                        collectionConfig={collectionConfig}
                        analysedFields={analysedFields} //pass the analysed date fields to the datefield selector
                        onChange={onDateFieldSelected}
                    />
                </div>
            </FlexBox>
        );
    };

    renderFieldSelector = (collectionConfig, onFieldSelected, onFieldAnalysed) => {
    	const collectionAnalyser = (
			<CollectionAnalyser
				key={'__ca__' + collectionConfig.collectionId}
				collectionConfig={collectionConfig}
                onChange={onFieldSelected}
                onFieldAnalysed={onFieldAnalysed}
			/>
		);
    	return (
			<FlexBox title="Collection analysis">
					<div className="row box">
						<div className="col-md-12">
							{collectionAnalyser}
						</div>
					</div>
			</FlexBox>
		)
    }

    renderCompletenessAnalysisChart = (collectionConfig, dateField, analysisField, chartData) => {
    	if(!(analysisField && dateField)) return null;

    	if(!chartData) {
    		return (
    			<div className={IDUtil.cssClassName('input-area', this.CLASS_PREFIX)}>
					<i className="fa fa-circle-o-notch fa-spin"/> Loading chart...
				</div>
			)
    	}

    	return (
			<MetadataCompletenessChart
				collectionConfig={collectionConfig}
				dateField={dateField}
                analysisField={analysisField}
                data={chartData}
			/>
		);
    };

    renderCompletenessAnalysisOverview = (collectionConfig, stats) => {
    	if(!(collectionConfig && stats)) return null;

    	return (
			<div className="fieldAnalysisStats">
                <FieldAnalysisStats collectionConfig={collectionConfig} data={stats}/>
			</div>
		);
    };

	render() {
		const collectionConfig = this.getCollectionConfig(this.state.activeCollection);
		const collectionModal = this.state.showModal ? this.renderCollectionModal() : null;
		const collectionOverview = this.renderCollectionOverview(this.state.loadedCollections, this.state.activeCollection);

		const fieldSelector = collectionConfig ? this.renderFieldSelector(
			collectionConfig,
			this.onFieldSelected,
			this.onFieldAnalysed
		) : null;

		//only show when an analysis field has been selected
		const dateFieldSelector = this.state.field ? this.renderDateFieldSelector(
        	collectionConfig,
        	this.state.analysedFields,
        	this.onDateFieldSelected
        ) : null;

		//only show the chart & stats when both an analysis field and date field have been selected
		const chart = this.renderCompletenessAnalysisChart(
			collectionConfig,
			this.state.dateField,
			this.state.field,
			this.state.fieldAnalysisTimeline
		);
        const fieldAnalysisStats = this.renderCompletenessAnalysisOverview(collectionConfig, this.state.fieldAnalysisStats);

		return (
			<div className={IDUtil.cssClassName('collection-recipe')}>
				{collectionModal}
				<div className="row">
					<div className="col-md-6">
						{collectionOverview}
					</div>
					<div className="col-md-6">
						{fieldSelector}
					</div>
				</div>
				<div className="row">
					<div className="col-md-12">
						{chart}
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
