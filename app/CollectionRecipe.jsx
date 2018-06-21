import IDUtil from './util/IDUtil';
import FlexRouter from './util/FlexRouter';
import ComponentUtil from './util/ComponentUtil';
import CollectionUtil from './util/CollectionUtil';

import FlexBox from './components/FlexBox';
import FlexModal from './components/FlexModal';

import CollectionAnalyser from './components/collection/CollectionAnalyser';
import CollectionSelector from './components/collection/CollectionSelector';
import CollectionStats from './components/collection/CollectionStats';
import FieldAnalysisStats from './components/collection/FieldAnalysisStats';
import CollectionInspectorLineChart from './components/stats/CollectionInspectorLineChart';
import {ResponsiveContainer, PieChart, Pie, Sector, Cell, Legend, Label, LabelList} from 'recharts';

import PropTypes from 'prop-types';

class CollectionRecipe extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			selectedCollections : {},
			activeCollection : null,
			collectionStats : null, //output from the collectionSelector
			fieldAnalysisStats : null, //output from the CollectionAnalyser
			fieldAnalysisTimeline : null //output from the CollectionAnalyser
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
		} else if(componentClass == 'CollectionAnalyser') {
			this.setState({
				fieldAnalysisStats : data.fieldAnalysisStats,
				fieldAnalysisTimeline : data.fieldAnalysisTimeline
			})
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
			fieldAnalysisTimeline : null //reset the analysis timeline
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

	showCollectionStats(collectionId, e) {
		e.stopPropagation();
		const collectionData = this.getCollectionData(collectionId);
		if(collectionData) {
			this.setState({
				showStatsModal : true,
				activeCollectionStats : collectionData.collectionStats
			});
		}
	}

	getCollectionData(collectionId) {
		if(this.state.selectedCollections) {
			return this.state.selectedCollections[collectionId];
		}
		return null;
	}
    onPieEnter(){
		// console.log('entering pie chart')
	}
	render() {

        let piecharts = null;
        if (this.state.fieldAnalysisStats && this.state.fieldAnalysisStats.doc_stats) {
            const COLORS = ['#468dcb', '#FF7F0E', '#FFBB28', '#FF8042'];
            const RADIAN = Math.PI / 180;
            const data = [
                {name: 'Records that do contain the date field', value: this.state.fieldAnalysisStats.doc_stats.date_field},
                {name: 'Records that do NOT contain the date field', value: (this.state.fieldAnalysisStats.doc_stats.total - this.state.fieldAnalysisStats.doc_stats.date_field)}];
            const dataAnalysis = [
                {name: 'Records that do contain the analysis field', value: this.state.fieldAnalysisStats.field_stats.analysis_field_count},
                {name: 'Records that do NOT contain the analysis field', value: this.state.fieldAnalysisStats.doc_stats.no_analysis_field}];
            const renderDateField = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5,
                    x = cx + radius * Math.cos(-midAngle * RADIAN),
                    y = cy + radius * Math.sin(-midAngle * RADIAN),
                    absDateField 		= this.state.fieldAnalysisStats.doc_stats.date_field,
                    absNonDateField 	= this.state.fieldAnalysisStats.doc_stats.total - this.state.fieldAnalysisStats.doc_stats.date_field;
                return (
                    <text x={x} y={y} fill="#1C435E" textAnchor={x > cx ? 'middle' : 'middle'} 	dominantBaseline="central">
                        <tspan fontSize="12" fontWeight="bold">{index ? absNonDateField :absDateField}</tspan>
                        <tspan fontSize="12" fontWeight="bold"> ({`${(percent * 100).toFixed(0)}%`})</tspan>
                    </text>
                );
            };
            const renderAnalysisField = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5,
                    x = cx + radius * Math.cos(-midAngle * RADIAN),
                    y = cy + radius * Math.sin(-midAngle * RADIAN),
                    analysisField 		= this.state.fieldAnalysisStats.field_stats.analysis_field_count,
                    nonAnalysisField 	= this.state.fieldAnalysisStats.doc_stats.no_analysis_field,
					total = analysisField + nonAnalysisField,
                    nonAnalysisFieldPer = (nonAnalysisField * 100)/total,
                    analysisFieldPer = (analysisField * 100)/total;

                return (
                    <text x={x} y={y} fill="#1C435E" textAnchor={x > cx ? 'middle' : 'middle'} dominantBaseline="left">
                        <tspan fontSize="12" fontWeight="bold">{index ? nonAnalysisField :analysisField} </tspan>
                        <tspan fontSize="12" fontWeight="bold"> {index ? '(' + (Math.round(nonAnalysisFieldPer)) + '%)' : '(' + (Math.round(analysisFieldPer)) + '%)'}</tspan>
                    </text>
                );
            };
            let analysisFieldPieChart = null;
            if (this.state.fieldAnalysisStats.analysis_field !== 'null__option') {
                analysisFieldPieChart = (
                    <ResponsiveContainer width="100%" height="24%">
                        <PieChart className="analisysTypeField" onMouseEnter={this.onPieEnter} >
                            <Pie data={dataAnalysis} cx="55%" cy="55%" labelLine={false}
                                 label={renderAnalysisField} outerRadius={65} fill="#8884d8">
                                {
                                    dataAnalysis.map((entry, index) => <Cell fill={COLORS[index % COLORS.length]}/>)
                                }
                            </Pie>
                            <Legend wrapperStyle={{fontSize: '10px'}} verticalAlign="bottom" align="left"/>
                        </PieChart>
                    </ResponsiveContainer>
                )
            }

            piecharts = (
                <div className={IDUtil.cssClassName('pieChart')}>
                    <ResponsiveContainer width="100%" height="24%">
                        <PieChart className="dateTypeField" onMouseEnter={this.onPieEnter}>
                            <Pie data={data} cx="55%" cy="55%" labelLine={false}
                                 label={renderDateField} outerRadius={65} fill="#8884d8">
                                {
                                    data.map((entry, index) => <Cell fill={COLORS[index % COLORS.length]}/>)
                                }
                            </Pie>
                            <Legend wrapperStyle={{fontSize: '10px'}} verticalAlign="bottom" align="left"/>
                        </PieChart>
                    </ResponsiveContainer>
					{analysisFieldPieChart}
                </div>
            )
        }

		const collectionConfig = this.getCollectionData(this.state.activeCollection);
		let collectionModal = null; //for selecting collections for the list
		let collectionBlock = null; //shows all selected collections

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
						<button className="btn btn-default" style={{float : 'right', marginTop : '-5px'}}
							onClick={this.showCollectionStats.bind(this, key)} title="Inspect collection">
							<span className="fa fa-bar-chart text-muted"></span>
						</button>
					</li>
				)
			});

			const recipes = this.props.recipe.ingredients.recipes.map((r) => {
				return (<option id={r.id} value={r.id}>{r.label}</option>);
			});
			collectionBlock = (
				<FlexBox title="Selected collections">
					<div className={IDUtil.cssClassName('input-area', this.CLASS_PREFIX)}>
						<div className="text-right">
							<button className="btn btn-primary"	onClick={ComponentUtil.showModal.bind(this, this, 'showModal')}>
								Add collection&nbsp;<i className="fa fa-plus"></i>
							</button>
						</div>
						<br/>
						<ul className="list-group">
							{items}
						</ul>
					</div>
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

		//showing the (Elasticsearch) stats of the selected collection
		if(this.state.showStatsModal) {
			statsModal = (
				<FlexModal
					elementId="stats__modal"
					stateVariable="showStatsModal"
					owner={this}
					size="large"
					title="Collection stats">
						<CollectionStats collectionConfig={collectionConfig}/>
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
					onOutput={this.onComponentOutput.bind(this)}
				/>
			);

			if(this.state.fieldAnalysisStats) {
				fieldAnalysisStats = (
					<div className="fieldAnalysisStats">
                        <FieldAnalysisStats data={this.state.fieldAnalysisStats} collectionConfig={collectionConfig}/>
					</div>
				);
			}

			if(this.state.fieldAnalysisTimeline) {
				fieldAnalysisTimeline = (
					<CollectionInspectorLineChart
						data={this.state.fieldAnalysisTimeline}
						comparisonId={IDUtil.guid()}/>
				);
			}

			analysisBlock = (
				<FlexBox title="Collection analysis">
					<div className={IDUtil.cssClassName('input-area', this.CLASS_PREFIX)}>
						<div className="row">
							<div className="col-md-12">
								{collectionAnalyser}
							</div>
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
					<div className="col-md-9">
						{fieldAnalysisTimeline}
					</div>
                    <div className="col-md-3">
                        {piecharts}
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