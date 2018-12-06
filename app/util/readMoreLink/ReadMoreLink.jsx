import PropTypes from "prop-types";

class ReadMoreLink extends React.Component {
    constructor(props) {
        super(props);
    }



    render() {
        if(this.props.linkUrl) {
            return (
                <span className={ this.props.containerClass }>
                        <a className={this.props.bg__url_ckan}
                           target={this.props.targetLink}
                           href={this.props.linkUrl}>
                            {this.props.linkText}
                            <img src={this.props.linkIcon}
                                 width={this.props.widthImg}
                                 height={this.props.heightImg}
                                 alt={this.props.readMoreAlt}/>
                        </a>
                </span>
            );
        } else {
            return null;
        }
    }
}

ReadMoreLink.propTypes = {
    linkUrl : PropTypes.string
};

ReadMoreLink.defaultProps = {
    bg__url_ckan: 'bg__link-tag',
    containerClass : 'bg__read-more-link',
    heightImg : '16px',
    linkText : 'Read more',
    linkIcon : 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNTExLjYyNnB4IiBoZWlnaHQ9IjUxMS42MjdweCIgdmlld0JveD0iMCAwIDUxMS42MjYgNTExLjYyNyIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTExLjYyNiA1MTEuNjI3OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGc+PGc+PHBhdGggZD0iTTM5Mi44NTcsMjkyLjM1NGgtMTguMjc0Yy0yLjY2OSwwLTQuODU5LDAuODU1LTYuNTYzLDIuNTczYy0xLjcxOCwxLjcwOC0yLjU3MywzLjg5Ny0yLjU3Myw2LjU2M3Y5MS4zNjFjMCwxMi41NjMtNC40NywyMy4zMTUtMTMuNDE1LDMyLjI2MmMtOC45NDUsOC45NDUtMTkuNzAxLDEzLjQxNC0zMi4yNjQsMTMuNDE0SDgyLjIyNGMtMTIuNTYyLDAtMjMuMzE3LTQuNDY5LTMyLjI2NC0xMy40MTRjLTguOTQ1LTguOTQ2LTEzLjQxNy0xOS42OTgtMTMuNDE3LTMyLjI2MlYxNTUuMzFjMC0xMi41NjIsNC40NzEtMjMuMzEzLDEzLjQxNy0zMi4yNTljOC45NDctOC45NDcsMTkuNzAyLTEzLjQxOCwzMi4yNjQtMTMuNDE4aDIwMC45OTRjMi42NjksMCw0Ljg1OS0wLjg1OSw2LjU3LTIuNTdjMS43MTEtMS43MTMsMi41NjYtMy45LDIuNTY2LTYuNTY3VjgyLjIyMWMwLTIuNjYyLTAuODU1LTQuODUzLTIuNTY2LTYuNTYzYy0xLjcxMS0xLjcxMy0zLjkwMS0yLjU2OC02LjU3LTIuNTY4SDgyLjIyNGMtMjIuNjQ4LDAtNDIuMDE2LDguMDQyLTU4LjEwMiwyNC4xMjVDOC4wNDIsMTEzLjI5NywwLDEzMi42NjUsMCwxNTUuMzEzdjIzNy41NDJjMCwyMi42NDcsOC4wNDIsNDIuMDE4LDI0LjEyMyw1OC4wOTVjMTYuMDg2LDE2LjA4NCwzNS40NTQsMjQuMTMsNTguMTAyLDI0LjEzaDIzNy41NDNjMjIuNjQ3LDAsNDIuMDE3LTguMDQ2LDU4LjEwMS0yNC4xM2MxNi4wODUtMTYuMDc3LDI0LjEyNy0zNS40NDcsMjQuMTI3LTU4LjA5NXYtOTEuMzU4YzAtMi42NjktMC44NTYtNC44NTktMi41NzQtNi41N0MzOTcuNzA5LDI5My4yMDksMzk1LjUxOSwyOTIuMzU0LDM5Mi44NTcsMjkyLjM1NHoiLz48cGF0aCBkPSJNNTA2LjE5OSw0MS45NzFjLTMuNjE3LTMuNjE3LTcuOTA1LTUuNDI0LTEyLjg1LTUuNDI0SDM0Ny4xNzFjLTQuOTQ4LDAtOS4yMzMsMS44MDctMTIuODQ3LDUuNDI0Yy0zLjYxNywzLjYxNS01LjQyOCw3Ljg5OC01LjQyOCwxMi44NDdzMS44MTEsOS4yMzMsNS40MjgsMTIuODVsNTAuMjQ3LDUwLjI0OEwxOTguNDI0LDMwNC4wNjdjLTEuOTA2LDEuOTAzLTIuODU2LDQuMDkzLTIuODU2LDYuNTYzYzAsMi40NzksMC45NTMsNC42NjgsMi44NTYsNi41NzFsMzIuNTQ4LDMyLjU0NGMxLjkwMywxLjkwMyw0LjA5MywyLjg1Miw2LjU2NywyLjg1MnM0LjY2NS0wLjk0OCw2LjU2Ny0yLjg1MmwxODYuMTQ4LTE4Ni4xNDhsNTAuMjUxLDUwLjI0OGMzLjYxNCwzLjYxNyw3Ljg5OCw1LjQyNiwxMi44NDcsNS40MjZzOS4yMzMtMS44MDksMTIuODUxLTUuNDI2YzMuNjE3LTMuNjE2LDUuNDI0LTcuODk4LDUuNDI0LTEyLjg0N1Y1NC44MThDNTExLjYyNiw0OS44NjYsNTA5LjgxMyw0NS41ODYsNTA2LjE5OSw0MS45NzF6Ii8+PC9nPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48Zz48L2c+PGc+PC9nPjxnPjwvZz48L3N2Zz4=',
    readMoreAlt : 'Read more',
    targetLink : '_blank',
    widthImg : '16px'
};

export default ReadMoreLink;
