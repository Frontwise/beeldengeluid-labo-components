import CKANAPI from '../../api/CKANAPI';
import CollectionAPI from '../../api/CollectionAPI';

import CollectionUtil from '../../util/CollectionUtil';
import IDUtil from '../../util/IDUtil';
import ReadMoreLink from '../helpers/ReadMoreLink';

import PropTypes from 'prop-types';
import { PowerSelect } from 'react-power-select';
/*

TODO:
	In general this needs to be made fit for both CKAN and other collection lists (e.g. for MotU and ARTtube)

OUTPUT:
	an instance of CollectionConfig

*/

class CollectionSelector extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			activeCollection: '',
			collectionList : null
		};
		this.CLASS_PREFIX = 'cls';
	}

	componentDidMount() {
		//load the collections from CKAN (TODO build option to choose collection endpoint)
		CKANAPI.listCollections((collections) => {
			this.setState({collectionList :  collections});
		});
		//TODO add collections to the list!!
		CollectionAPI.listCollections('personalcollection__clariah_test', (collections) => {
			//console.debug(collections);
		})
	}

	//only works if a collection has been properly indexed!
	selectCollection(collectionId, event) {
		if(!collectionId) {
			collectionId = event.option.index;
		}
		if(collectionId) {
			this.setState(
				{activeCollection : collectionId},
				CollectionAPI.getCollectionStats(collectionId, (stats) => {
					this.onOutput(collectionId, stats, this.getCollectionInfo(collectionId));
				})
			);
		}
	}

	getCollectionInfo(collectionId) {
		if(this.state.collectionList) {
			const tmp = this.state.collectionList.filter((c) => {
				return c.index === collectionId;
			});
			if(tmp.length === 1) {
				return tmp[0];
			}
		}
		return null;
	}

	/* ------------------------------------------------------------------------------
	------------------------------- COMMUNICATION WITH OWNER/RECIPE -----------------
	------------------------------------------------------------------------------- */

	onOutput(collectionId, collectionStats, collectionInfo) {
		const collectionConfig = CollectionUtil.createCollectionConfig(
			this.props.clientId,
			this.props.user,
			collectionId,
			collectionStats,
			collectionInfo
		);
		if(this.props.onOutput) {
			if(collectionId) {
				this.props.onOutput(this.constructor.name, collectionConfig);
			} else {
				console.debug('No collection selected...');
			}
		}
	}

	render() {
		let markup = null;

		if(this.state.collectionList) {
			let collectionSelect = null;
			let collectionBrowser = null;

			//the collection selection part
			if(this.props.showSelect) {
		        const collectionOptionsArray = this.state.collectionList.map((collection) => {
					return {
						"key": collection.index,
						"title": collection.title,
						"index": collection.index
					}
		        });

		        collectionSelect = (
					<form className="form-horizontal">
						<label className="col-sm-2">Collection</label>
						<div className="col-sm-10">
							<PowerSelect
								options={collectionOptionsArray}
								onChange={this.selectCollection.bind(this, null)}
								optionLabelPath="title"
								placeholder="-- Select a collection -- "
							/>
						</div>
					</form>
		        );
			}

			if(this.props.showBrowser) {
				//the collections visualized as blocks
				const collectionBlocks = this.state.collectionList.map((collection) => {
					let organisationImage = null;
                    let ckanLink = null;

                    if(collection.organization.image_url) {
						organisationImage = (<img src={collection.organization.image_url}/>)
					}
					if (collection.ckanUrl) {
						ckanLink = (<ReadMoreLink linkUrl={collection.ckanUrl}/>)
					}
					return (
					    <div className="bg__collection-wrapper">
                            <div className={IDUtil.cssClassName('collection', this.CLASS_PREFIX)}
                                 onClick={this.selectCollection.bind(this, collection.index)}>
                                <div className={IDUtil.cssClassName('caption', this.CLASS_PREFIX)}>
                                    <h4>{collection.title}</h4>
                                    <p>{collection.organization.title}</p>
                                    {organisationImage}
                                </div>
                            </div>
                            {ckanLink}
                        </div>
					)
				});

				collectionBrowser = (
					<div className="collection-browser">
						{collectionBlocks}
					</div>
				)
			}

			markup =(
				<div className="row">
					<div className="col-md-12">
						{collectionSelect}
						{collectionBrowser}
					</div>
				</div>
			)
		} else {
			markup = (<h3>Loading collection list...</h3>)
		}

		//always return everything wrapped in an identifyable div
		return (
			<div className={IDUtil.cssClassName('collection-selector')}>
				{markup}
			</div>
		)
	}

};

CollectionSelector.propTypes = {
	clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    })

};

export default CollectionSelector;
