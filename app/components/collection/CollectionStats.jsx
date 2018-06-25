import IDUtil from '../../util/IDUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';

class CollectionStats extends React.Component {

	constructor(props) {
		super(props);
	}

	getFieldTypeLabel(fieldType) {
		let l = null;
		switch(fieldType) {
			case 'string' : l = 'TEXT: Metadata fields that can be used for full-text search';break;
			case 'text' : l = 'TEXT: Metadata fields that can be used for full-text search';break;
			case 'not_analyzed' : l = 'KEYWORDS: Metadata fields that are optimized for facet search and filtering';break;
			case 'keyword' : l = 'KEYWORD: Metadata fields that are optimized for facet search and filtering';break;
			case 'date' : l = 'DATE: Metadata fields that specify dates, which can be used for range filters and timelines';break;
			case 'long' : l = 'NUMERIC: Metadata fields that specify numeric values, which could be used for range filters or line charts';break;
			case 'nested' : l = 'NESTED: Metadata fields that are part of a sub document';break;

			default : l = 'UNKNOWN: Metadata fields of an unknown type';break;
		}
		return l;
	}

	render() {
		let docTypeInfo = null;
		let docCount = 0;
		if(this.props.collectionConfig && this.props.collectionConfig.collectionStats) {
			const collectionStats = this.props.collectionConfig.collectionStats;
			if(collectionStats.collection_statistics) {
				let docTypes = collectionStats.collection_statistics.document_types;
				if(docTypes && docTypes.length > 0) {

					let dt = collectionStats.collection_statistics.document_types[0];
					docCount = dt.doc_count;

					if(dt.fields) {
						const fieldTypes = Object.keys(dt.fields).map((fieldType, j) => {
							const fieldNames = dt.fields[fieldType].map((fieldName, k) => {
								return(<li key={'fn__' + k}>{this.props.collectionConfig.toPrettyFieldName(fieldName)}</li>);
							});
							return (
								<li className="component-category" key={'ft__' + j}>
			                        <a href="#" data-toggle="collapse" data-target={'#' + fieldType}
			                        	data-parent="#collection_stats" className="category-header">
			                            <header className="components-header">
											{this.getFieldTypeLabel(fieldType)}
										</header>
			                        </a>
			                        <div className="collapse" id={fieldType}>
			                            <ul className="component-list">
			                                {fieldNames}
			                            </ul>
			                        </div>
			                    </li>
							);
						});

						docTypeInfo = (
							<div>
								<ul id="component-list">
									{fieldTypes}
								</ul>
							</div>
						)
					}

				}
			}

		}
		return (
			<div className={IDUtil.cssClassName('collection-stats')}>
				<h4>Documents in collection: {docCount}</h4>
				<p>
				All available metadata fields grouped by data type:
				</p>
				{docTypeInfo}
			</div>
		);
	}
}

export default CollectionStats;