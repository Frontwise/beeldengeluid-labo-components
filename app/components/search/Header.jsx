import IDUtil from "../../util/IDUtil";
import classNames from "classnames";
import PropTypes from "prop-types";

class Header extends React.PureComponent {
	constructor(props) {
		super(props);
		this.CLASS_PREFIX = "ssh";
	}

	render() {
		const activeProject = this.props.activeProject;

		const title = (<h1 className={IDUtil.cssClassName("title", this.CLASS_PREFIX)}>{this.props.name}</h1>);

		const projectBtn = (
			<div
				className={classNames(
					IDUtil.cssClassName("project", this.CLASS_PREFIX),
					{ active: activeProject }
				)}
				onClick={this.props.selectProject}
			>
				{activeProject ? (
					<span>{activeProject.name}</span>
				) : (
					<button className="btn btn-secondary">Set project</button>
				)}
			</div>
		);

		return (
			<div className={IDUtil.cssClassName("single-search-header")}>
				{title}

				{projectBtn}
			</div>
		);
	}
}

Header.propTypes = {
	name: PropTypes.string.isRequired, // recipe name
	activeProject: PropTypes.shape({
		// optional: active project
		name: PropTypes.string.isRequired
	}),
	selectProject: PropTypes.func.isRequired // show modal to select the project
};

export default Header;
