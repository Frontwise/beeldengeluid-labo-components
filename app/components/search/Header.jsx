import IDUtil from '../../util/IDUtil';
import classNames from 'classnames';
import PropTypes from 'prop-types';

class Header extends React.PureComponent {

	render() {
		const activeProject = this.props.activeProject;
		const projectBtn = (
			<div className={classNames("project",{active: activeProject})} onClick={this.props.selectProject}>
				{activeProject ?
					<span>{activeProject.name}</span>:
				<button className="btn btn-secondary" >
					Set project
				</button>
			}
			</div>
		);

		return (
			<div className={IDUtil.cssClassName('single-search-header')}>
				<h1>{this.props.name}</h1>

				{projectBtn}
			</div>
		)
	}
}

Header.propTypes = {
	name : PropTypes.string.isRequired, // recipe name
	activeProject: PropTypes.shape({ // optional: active project
		name : PropTypes.string.isRequired,
	}),
	selectProject: PropTypes.func.isRequired, // show modal to select the project
};

export default Header;
