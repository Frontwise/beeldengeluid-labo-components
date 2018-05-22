//Check the collection config getResultSnippetData() function to inspect this.props.data

import IconUtil from '../../util/IconUtil';
import IDUtil from '../../util/IDUtil';
import CollectionUtil from '../../util/CollectionUtil';
import Classification from '../annotation/Classification';

class SearchSnippet extends React.Component {

	constructor(props) {
		super(props);
		this.CLASS_PREFIX = 'ss'
	}

	getMediaTypes() {
		let mediaTypes = this.props.collectionMediaTypes;
		if(this.props.data.mediaTypes) {
			mediaTypes = mediaTypes.concat(
				this.props.data.mediaTypes.filter(mt => !mediaTypes.includes(mt))
			);
		}
		return mediaTypes
	}

    highlightSearchedTerm(text) {
		if(text === null) {
		 	return text
		}
        let regex = new RegExp(this.stripQuotes(this.props.searchTerm), 'gi');
        return text.replace(regex, (term) => "<span class='highLightText'>" + term + "</span>");
    }

    stripQuotes(str) {
    	if(str.startsWith('"') && str.endsWith('"') && str.length > 2) {
			return str.substring(1, str.length -1)
		}
		return str
    }

    createMarkup(text){
		return {__html: text}
	}
	//possible default fields: posterURL, title, description, tags
	render() {
		let poster = null;
		let mediaTypes = null;
		let tags = [];
		let fragmentIcon = null;
		let fragmentInfo = null;

		//by default no access
		let accessIcon = (
			<span
				className={IconUtil.getMediaObjectAccessIcon(false, false, true, true, false)}
				title="Media object(s) not accessible">
			</span>
		);

		//get the poster of the media object
		if(this.props.data.posterURL) {
			poster = (
				<div style={{width : '200px'}}>
					<a href="#">
						<img className="media-object" src={this.props.data.posterURL}
							style={{width:'100%'}}
							alt="Could not find image"/>
					</a>
				</div>
			)
		}

		//see if there are any tags added to this search result
		if(this.props.data.tags) {
			tags = this.props.data.tags.map((t, index) => {
				return (<Classification classification={{label : t}}/>);
			})
		}

		//show the user what content can be expected
		if(this.props.data.mediaTypes) {
			mediaTypes = this.getMediaTypes().map((mt) => {
				if(mt == 'video') {
					return (<span className={IconUtil.getMimeTypeIcon('video', true, true, false)} title="Video content"></span>);
				} else if(mt == 'audio') {
					return (<span className={IconUtil.getMimeTypeIcon('audio', true, true, false)} title="Audio content"></span>);
				} else if(mt == 'image') {
					return (<span className={IconUtil.getMimeTypeIcon('image', true, true, false)} title="Image content"></span>);
				}
				return (<span className={IconUtil.getMimeTypeIcon(null, true, true, false)} title="Unknown content type"></span>);
			});

			if(mediaTypes.length == 0) {
				mediaTypes.push(
					<span className={IconUtil.getMimeTypeIcon(null, true, true, false)} title="Unknown content type"></span>
				)
			}

			if(this.props.data.mediaTypes.length > 0) {
				accessIcon = (
					<span
						className={IconUtil.getMediaObjectAccessIcon(true, true, true, true, false)}
						title="Media object(s) can be viewed">
					</span>
				);
			}
		}

		//if this hit represents a media fragment, show an extra icon (TODO make sure this is not ugly later on)
		if(this.props.data.type == 'media_fragment') {
			fragmentIcon = (
				<span className={IconUtil.getMimeTypeIcon('fragment', true, true)} title="Media fragment"></span>
			);

			if(this.props.data.mediaFragment) {
				fragmentInfo = (<div className={IDUtil.cssClassName('fragment', this.CLASS_PREFIX)}>
					{this.props.data.mediaFragment.snippet}
				</div>)
			}
		}

		//generate main classes
        const classNames = ['media', IDUtil.cssClassName('search-snippet')];
        const title = this.props.data.title ? this.props.data.title + ' ' : '';
        const date = this.props.data.date ? '(' + this.props.data.date + ')' : '';

        return (
			<div className={classNames.join(' ')}>
				<div className="media-left">
					{poster}
				</div>
				<div  className="media-body">
					<h4 className="media-heading custom-pointer" title={this.props.data.id}>
						<span dangerouslySetInnerHTML={this.createMarkup(this.highlightSearchedTerm(title))}></span>
						{date}
						&nbsp;{mediaTypes}&nbsp;{accessIcon}&nbsp;{fragmentIcon}
					</h4>
					<span className="snippet_description" dangerouslySetInnerHTML={this.createMarkup(
                        this.highlightSearchedTerm(CollectionUtil.highlightSearchTermInDescription(
                            this.props.data.description,
                            this.stripQuotes(this.props.searchTerm),
                            35
                        ))
					)} />
					{fragmentInfo}
					{tags}
				</div>
			</div>
		)
	}
}

export default SearchSnippet;