import IDUtil from "../../util/IDUtil";
import classNames from "classnames";
import PropTypes from "prop-types";
import ComponentUtil from "../../util/ComponentUtil";

class CollectionBar extends React.PureComponent {
	constructor(props) {
		super(props);
		this.CLASS_PREFIX = "scb";
	}

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

	resetSearch = ()=>{
		this.props.resetSearch(this.constructor.name, null);
	}

	render() {
		const collectionConfig = this.props.collectionConfig;

		const collectionButton = (
			<button
				className="btn btn-primary"
				onClick={this.props.selectCollection}
			>
				{collectionConfig ? "Change collection" : "Select collection"}
			</button>
		);

		const ckanUrl =
			collectionConfig && collectionConfig.collectionInfo && collectionConfig.collectionInfo.ckanUrl ? (
				<a
					className={IDUtil.cssClassName("link", this.CLASS_PREFIX)}
					title="View collection info"
					href={collectionConfig.collectionInfo.ckanUrl}
					target="_blank"
				/>
			) : null;

		const hits = collectionConfig ? (
			<span
				className={IDUtil.cssClassName("count", this.CLASS_PREFIX)}
				title="Records in this collection"
			>
				{ComponentUtil.formatNumber(
					this.getCollectionHits(collectionConfig)
				)}
			</span>
		) : null;


		const resetButton = collectionConfig ? (
			<button
				className="btn btn-secondary"
				onClick={this.resetSearch}
			>
				Clear search
			</button>
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
					<div
						className={IDUtil.cssClassName(
							"active",
							this.CLASS_PREFIX
						)}
					>
						<h2
							className={IDUtil.cssClassName(
								"title",
								this.CLASS_PREFIX
							)}
						>
							{collectionConfig.getCollectionTitle()}
						</h2>
						{hits}
						{ckanUrl}
						{collectionButton}
						{resetButton}
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
	selectCollection: PropTypes.func.isRequired, // show modal to select collection
	resetSearch: PropTypes.func.isRequired, // reset search
};

export default CollectionBar;
