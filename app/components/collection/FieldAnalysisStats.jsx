import IDUtil from '../../util/IDUtil';
import ReactTooltip from 'react-tooltip';
import ComponentUtil from '../../util/ComponentUtil';

class FieldAnalysisStats extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		const stats = [];

		let tip1 = 'Selected date field:<br/><br/>';
		tip1 += this.props.collectionConfig.toPrettyFieldName(this.props.data.date_field);

		let tip2 = 'Selected analysis field:<br/><br/>';
		tip2 += this.props.collectionConfig.toPrettyFieldName(this.props.data.analysis_field)

		if(this.props.data && this.props.data.doc_stats) {
			stats.push(
				<tr>
					<td>Total number of records in the collection</td>
					<td className="align-right"><strong>{ComponentUtil.formatNumber(this.props.data.doc_stats.total)}</strong></td>
				</tr>
			);
            stats.push(
				<tr>
					<td>&nbsp;&nbsp;records that contain the selected date field&nbsp;
						<span data-for={'__ci_tooltip'}
							data-tip={tip1}
							data-html={true}>
							<i className="fa fa-info-circle"></i>
						</span>
					</td>
					<td className="align-right">{ComponentUtil.formatNumber(this.props.data.doc_stats.date_field)}</td>
				</tr>
            );
            stats.push(
				<tr>
					<td>&nbsp;&nbsp;&nbsp;&nbsp;records that contain both the selected date &amp; analysis field&nbsp;
						<span data-for={'__ci_tooltip'}
							data-tip={tip2}
							data-html={true}>
							<i className="fa fa-info-circle"></i>
						</span>
					</td>
					<td className="align-right">{ComponentUtil.formatNumber(this.props.data.field_stats.analysis_field_count)}</td>
				</tr>
			);
			stats.push(
				<tr>
					<td>&nbsp;&nbsp;records that do <strong>not</strong> contain the analysis field&nbsp;
						<span data-for={'__ci_tooltip'}
							data-tip={tip2}
							data-html={true}>
							<i className="fa fa-info-circle"></i>
						</span>
					</td>
					<td className="align-right">{ComponentUtil.formatNumber(this.props.data.doc_stats.no_analysis_field)}</td>
				</tr>
			);
			stats.push(
				<tr>
					<td>Expected date range (in {this.props.data.field_stats.date_field_scope.unit}s) based on selected date field</td>
					<td className="align-right">{this.props.data.field_stats.date_field_scope.start} - {this.props.data.field_stats.date_field_scope.end}</td>
				</tr>
			)
			stats.push(
				<tr>
					<td>Actual date range (in {this.props.data.field_stats.date_field_scope.unit}s) based on selected date field</td>
					<td className="align-right">{this.props.data.doc_stats.min_year} - {this.props.data.doc_stats.max_year}</td>
				</tr>
			);
			stats.push(
				<tr>
					<td>
						Dates outside of expected range</td>
					<td className="align-right">{this.props.data.field_stats.date_field_out_of_scope}</td>
				</tr>
			);
		}

		return (
			<div className={IDUtil.cssClassName('field-analysis-stats')}>
				<table className="table table-condensed">
					<tbody>
						{stats}
					</tbody>
				</table>
				<ReactTooltip id={'__ci_tooltip'}/>
			</div>
		);
	}
}

export default FieldAnalysisStats;
