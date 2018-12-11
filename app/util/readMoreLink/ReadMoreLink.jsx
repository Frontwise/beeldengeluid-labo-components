import PropTypes from "prop-types";

class ReadMoreLink extends React.Component {
    constructor(props) {
        super(props);
    }

    static svgImg(fillColor = '000') {
        const defaultSvg = '<?xml version="1.0" encoding="iso-8859-1"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="511.626px" height="511.627px" viewBox="0 0 511.626 511.627" style="enable-background:new 0 0 511.626 511.627;" xml:space="preserve"><g><g><path fill="#'+ fillColor + '" class="fillColor" d="M392.857,292.354h-18.274c-2.669,0-4.859,0.855-6.563,2.573c-1.718,1.708-2.573,3.897-2.573,6.563v91.361c0,12.563-4.47,23.315-13.415,32.262c-8.945,8.945-19.701,13.414-32.264,13.414H82.224c-12.562,0-23.317-4.469-32.264-13.414c-8.945-8.946-13.417-19.698-13.417-32.262V155.31c0-12.562,4.471-23.313,13.417-32.259c8.947-8.947,19.702-13.418,32.264-13.418h200.994c2.669,0,4.859-0.859,6.57-2.57c1.711-1.713,2.566-3.9,2.566-6.567V82.221c0-2.662-0.855-4.853-2.566-6.563c-1.711-1.713-3.901-2.568-6.57-2.568H82.224c-22.648,0-42.016,8.042-58.102,24.125C8.042,113.297,0,132.665,0,155.313v237.542c0,22.647,8.042,42.018,24.123,58.095c16.086,16.084,35.454,24.13,58.102,24.13h237.543c22.647,0,42.017-8.046,58.101-24.13c16.085-16.077,24.127-35.447,24.127-58.095v-91.358c0-2.669-0.856-4.859-2.574-6.57C397.709,293.209,395.519,292.354,392.857,292.354z"/><path fill="#'+ fillColor + '" d="M506.199,41.971c-3.617-3.617-7.905-5.424-12.85-5.424H347.171c-4.948,0-9.233,1.807-12.847,5.424c-3.617,3.615-5.428,7.898-5.428,12.847s1.811,9.233,5.428,12.85l50.247,50.248L198.424,304.067c-1.906,1.903-2.856,4.093-2.856,6.563c0,2.479,0.953,4.668,2.856,6.571l32.548,32.544c1.903,1.903,4.093,2.852,6.567,2.852s4.665-0.948,6.567-2.852l186.148-186.148l50.251,50.248c3.614,3.617,7.898,5.426,12.847,5.426s9.233-1.809,12.851-5.426c3.617-3.616,5.424-7.898,5.424-12.847V54.818C511.626,49.866,509.813,45.586,506.199,41.971z"/></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>';
        const defaultEncoded = window.btoa(defaultSvg);
        return  "data:image/svg+xml;base64,"+defaultEncoded;
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
    linkIcon : ReadMoreLink.svgImg(),
    readMoreAlt : 'Read more',
    targetLink : '_blank',
    widthImg : '16px'
};

export default ReadMoreLink;
