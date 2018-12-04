import CKANAPI from '../../api/CKANAPI';
import CollectionAPI from '../../api/CollectionAPI';

import CollectionUtil from '../../util/CollectionUtil';
import IDUtil from '../../util/IDUtil';

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
			    // TODO : retrieve from collection api info
                const collectionCkanUrl = {
                    "nisv-catalogue": "http://mediasuitedata.clariah.nl/dataset/nisv-catalogue",
                    "eye-desmet-films": "http://mediasuitedata.clariah.nl/dataset/eye-desmet-films",
                    "eye-desmet-affiches": "http://mediasuitedata.clariah.nl/dataset/eye-desmet-affiches",
                    "desmet-paper-collection": "http://mediasuitedata.clariah.nl/dataset/desmet-paper-collection",
                    "kb-newspapers-test": "http://mediasuitedata.clariah.nl/dataset/kb-newspapers-test",
                    "open-beelden-eye": "http://mediasuitedata.clariah.nl/dataset/open-beelden-eye",
                    "open-beelden-beeldengeluid": "http://mediasuitedata.clariah.nl/dataset/open-beelden-beeldengeluid",
                    "dans-oral-history": "http://mediasuitedata.clariah.nl/dataset/dans-oral-history",
                    "nisv-catalogue-radio": "http://mediasuitedata.clariah.nl/dataset/nisv-catalogue-radio",
                    "soundbites": "http://mediasuitedata.clariah.nl/dataset/soundbites",
                    "nisv-catalogue-tv": "http://mediasuitedata.clariah.nl/dataset/nisv-catalogue-tv"
                };
				//the collections visualized as blocks
				const collectionBlocks = this.state.collectionList.map((collection) => {
					let organisationImage = null;
					let ckanDescriptionUrl = null;
					if(collection.organization.image_url) {
						organisationImage = (<img src={collection.organization.image_url}/>)
					}
                    if (collectionCkanUrl[collection.name]) {
                        ckanDescriptionUrl = collectionCkanUrl[collection.name];
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
                            <div className="bg__collection-info-ckan">
                                <a className="bg__url_ckan" target="_blank" href={ckanDescriptionUrl}>Read more <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNTExLjYyNnB4IiBoZWlnaHQ9IjUxMS42MjdweCIgdmlld0JveD0iMCAwIDUxMS42MjYgNTExLjYyNyIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTExLjYyNiA1MTEuNjI3OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGc+PGc+PHBhdGggZD0iTTM5Mi44NTcsMjkyLjM1NGgtMTguMjc0Yy0yLjY2OSwwLTQuODU5LDAuODU1LTYuNTYzLDIuNTczYy0xLjcxOCwxLjcwOC0yLjU3MywzLjg5Ny0yLjU3Myw2LjU2M3Y5MS4zNjFjMCwxMi41NjMtNC40NywyMy4zMTUtMTMuNDE1LDMyLjI2MmMtOC45NDUsOC45NDUtMTkuNzAxLDEzLjQxNC0zMi4yNjQsMTMuNDE0SDgyLjIyNGMtMTIuNTYyLDAtMjMuMzE3LTQuNDY5LTMyLjI2NC0xMy40MTRjLTguOTQ1LTguOTQ2LTEzLjQxNy0xOS42OTgtMTMuNDE3LTMyLjI2MlYxNTUuMzFjMC0xMi41NjIsNC40NzEtMjMuMzEzLDEzLjQxNy0zMi4yNTljOC45NDctOC45NDcsMTkuNzAyLTEzLjQxOCwzMi4yNjQtMTMuNDE4aDIwMC45OTRjMi42NjksMCw0Ljg1OS0wLjg1OSw2LjU3LTIuNTdjMS43MTEtMS43MTMsMi41NjYtMy45LDIuNTY2LTYuNTY3VjgyLjIyMWMwLTIuNjYyLTAuODU1LTQuODUzLTIuNTY2LTYuNTYzYy0xLjcxMS0xLjcxMy0zLjkwMS0yLjU2OC02LjU3LTIuNTY4SDgyLjIyNGMtMjIuNjQ4LDAtNDIuMDE2LDguMDQyLTU4LjEwMiwyNC4xMjVDOC4wNDIsMTEzLjI5NywwLDEzMi42NjUsMCwxNTUuMzEzdjIzNy41NDJjMCwyMi42NDcsOC4wNDIsNDIuMDE4LDI0LjEyMyw1OC4wOTVjMTYuMDg2LDE2LjA4NCwzNS40NTQsMjQuMTMsNTguMTAyLDI0LjEzaDIzNy41NDNjMjIuNjQ3LDAsNDIuMDE3LTguMDQ2LDU4LjEwMS0yNC4xM2MxNi4wODUtMTYuMDc3LDI0LjEyNy0zNS40NDcsMjQuMTI3LTU4LjA5NXYtOTEuMzU4YzAtMi42NjktMC44NTYtNC44NTktMi41NzQtNi41N0MzOTcuNzA5LDI5My4yMDksMzk1LjUxOSwyOTIuMzU0LDM5Mi44NTcsMjkyLjM1NHoiLz48cGF0aCBkPSJNNTA2LjE5OSw0MS45NzFjLTMuNjE3LTMuNjE3LTcuOTA1LTUuNDI0LTEyLjg1LTUuNDI0SDM0Ny4xNzFjLTQuOTQ4LDAtOS4yMzMsMS44MDctMTIuODQ3LDUuNDI0Yy0zLjYxNywzLjYxNS01LjQyOCw3Ljg5OC01LjQyOCwxMi44NDdzMS44MTEsOS4yMzMsNS40MjgsMTIuODVsNTAuMjQ3LDUwLjI0OEwxOTguNDI0LDMwNC4wNjdjLTEuOTA2LDEuOTAzLTIuODU2LDQuMDkzLTIuODU2LDYuNTYzYzAsMi40NzksMC45NTMsNC42NjgsMi44NTYsNi41NzFsMzIuNTQ4LDMyLjU0NGMxLjkwMywxLjkwMyw0LjA5MywyLjg1Miw2LjU2NywyLjg1MnM0LjY2NS0wLjk0OCw2LjU2Ny0yLjg1MmwxODYuMTQ4LTE4Ni4xNDhsNTAuMjUxLDUwLjI0OGMzLjYxNCwzLjYxNyw3Ljg5OCw1LjQyNiwxMi44NDcsNS40MjZzOS4yMzMtMS44MDksMTIuODUxLTUuNDI2YzMuNjE3LTMuNjE2LDUuNDI0LTcuODk4LDUuNDI0LTEyLjg0N1Y1NC44MThDNTExLjYyNiw0OS44NjYsNTA5LjgxMyw0NS41ODYsNTA2LjE5OSw0MS45NzF6Ii8+PC9nPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48L3N2Zz4=" width='16px' height='16px' alt=""/></a>
                            </div>
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
