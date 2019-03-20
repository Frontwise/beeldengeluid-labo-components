import IDUtil from "../../util/IDUtil";
import classNames from "classnames";
import PropTypes from "prop-types";
import ComponentUtil from "../../util/ComponentUtil";

class CollectionBar extends React.PureComponent {
	getCollectionHits(config) {
		let collectionHits = -1;
		if (config && config.collectionStats) {
			const stats = config.collectionStats;
			const docType = config.getDocumentType();
			if (
				stats &&
				stats.collection_statistics &&
				stats.collection_statistics.document_types
			) {
				const docTypes = stats.collection_statistics.document_types;
				if (docTypes.length > 0) {
					for (let i = 0; i < docTypes.length; i++) {
						if (docTypes[i].doc_type === docType) {
							collectionHits = docTypes[i].doc_count;
						}
					}
				}
			}
		}
		return collectionHits;
	}

	render() {
		const collectionConfig = this.props.collectionConfig;

		const collectionButton = (
			<button
				className={classNames("btn",{"btn-primary": !collectionConfig})}
				onClick={this.props.selectCollection}
			>
				{collectionConfig ? "Change collection" : "Select collection"}
			</button>
		);

		const ckanUrl =
			collectionConfig && collectionConfig.collectionInfo.ckanUrl ? (
				<a
					title="Collection info"
					href={collectionConfig.collectionInfo.ckanUrl}
					target="_blank"
				/>
			) : null;

		const hits = collectionConfig ? (
			<span class="count" title="Records in this collection">
				{ComponentUtil.formatNumber(
					this.getCollectionHits(collectionConfig)
				)}
			</span>
		) : null;

		return (
			<div
				className={IDUtil.cssClassName("single-search-collection-bar")}
			>
				{collectionConfig === null ? (
					/* Select a collection first */
					<div>
						{/* <h2 onClick={this.props.selectCollection}>Start by selecting a collection</h2> */}
						{collectionButton}
					</div>
				) : (
					/* Collection info + change */
					<div className="active">
						<h2>{collectionConfig.getCollectionTitle()}</h2>
						{hits}
						{ckanUrl}
						{collectionButton}
					</div>
				)}
			</div>
		);
	}
}

CollectionBar.propTypes = {
	collectionConfig: PropTypes.shape({
		// optional: collection config of active project
		getCollectionTitle: PropTypes.func.isRequired
	}),
	selectCollection: PropTypes.func.isRequired // show modal to select collection
};

export default CollectionBar;
