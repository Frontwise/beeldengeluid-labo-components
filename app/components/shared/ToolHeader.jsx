import IDUtil from "../../util/IDUtil";
import classNames from "classnames";
import PropTypes from "prop-types";

class ToolHeader extends React.PureComponent {
	constructor(props) {
		super(props);
		this.CLASS_PREFIX = "th";
	}

	render() {
		const activeProject = this.props.activeProject;

		const title = (
			<h1 className={IDUtil.cssClassName("title", this.CLASS_PREFIX)}>
				{this.props.name}
			</h1>
		);

		const projectBtn = this.props.selectProject ? (
			<div
				className={classNames(
					IDUtil.cssClassName("project", this.CLASS_PREFIX),
					{ active: activeProject }
				)}
				onClick={this.props.selectProject}
				title={activeProject ? "Current user project. Click to change." : ""}
			>
				{activeProject ? (
					<span>{activeProject.name}</span>
				) : (
					<button className="btn btn-secondary">Set active user project</button>
				)}
			</div>
		) : null;

		const projectLink =
			this.props.selectProject && this.props.activeProject ? (
				<a
					href={"/workspace/projects/" + activeProject.id}
					className={IDUtil.cssClassName(
						"project-link",
						this.CLASS_PREFIX
					)}
					title="Open project in new window"
					target="_blank"
				/>
			) : null;

		return (
			<div className={IDUtil.cssClassName("tool-header")}>
				{title}

				{projectLink}
				{projectBtn}
			</div>
		);
	}
}

ToolHeader.propTypes = {
	name: PropTypes.string.isRequired, // recipe name
	selectProject: PropTypes.func, // optional: callback to select another project
	activeProject: PropTypes.shape({
		// optional: active project
		name: PropTypes.string.isRequired
	}) // requires the selectProject function to be defined
};

export default ToolHeader;
