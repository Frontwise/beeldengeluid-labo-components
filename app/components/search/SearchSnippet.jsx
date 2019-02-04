//Check the collection config getResultSnippetData() function to inspect this.props.data

import IconUtil from '../../util/IconUtil';
import IDUtil from '../../util/IDUtil';
import RegexUtil from '../../util/RegexUtil';
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
		 	return text;
		}
		if(this.props.searchTerm){
            let regex = RegexUtil.generateRegexForSearchTerm(this.props.searchTerm);
            return text.replace(regex, (term) => "<span class='highLightText'>" + term + "</span>");
		} else {
		    return text;
		}
	}

//    stripQuotes(str) {
//    	if(str.startsWith('"') && str.endsWith('"') && str.length > 2) {
//			return str.substring(1, str.length -1)
//		}
//		return str
//    }

    static createMarkup(text){
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
						<img className="media-object"
							src="/static/images/placeholder.2b77091b.svg"
							data-src={this.props.data.posterURL}
							style={{width:'100%'}}
							alt="Could not find image"/>
					</a>
				</div>
			)
		}

		//see if there are any tags added to this search result
		if(this.props.data.tags) {
			tags = this.props.data.tags.map(t => {
				return (<Classification classification={{label : t}}/>);
			})
		}

		//show the user what content can be expected
		if(this.props.data.mediaTypes) {
			mediaTypes = this.getMediaTypes().map((mt) => {
				if(mt === 'video') {
					return (<span className={IconUtil.getMimeTypeIcon('video', true, true, false)} title="Video content"/>);
				} else if(mt === 'audio') {
					return (<span className={IconUtil.getMimeTypeIcon('audio', true, true, false)} title="Audio content"/>);
				} else if(mt === 'image') {
					return (<span className={IconUtil.getMimeTypeIcon('image', true, true, false)} title="Image content"/>);
				} else if(mt === 'text') {
					return (<span className={IconUtil.getMimeTypeIcon('text', true, true, false)} title="Textual content"/>);
 				}
			});

			//Note: assigning a media type (to the result data) automatically means it's accessible in the media suite!
			if(this.props.data.playable) {
				accessIcon = (
					<span
						className={IconUtil.getMediaObjectAccessIcon(true, true, true, true, false)}
						title="Media object(s) can be viewed">
					</span>
				);
			}
		}

		//if this hit represents a media fragment, show an extra icon (TODO make sure this is not ugly later on)
		if(this.props.data.type === 'media_fragment') {
			fragmentIcon = (
				<span className={IconUtil.getMimeTypeIcon('fragment', true, true)} title="Media fragment"/>
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
        const highlights = this.props.data.highlights;

        var subHeading = date;
        if(date !== ""){
            subHeading += " | ";
        }
        subHeading += highlights + " match(es) in metadata |";

        return (
			<div className={classNames.join(' ')}>
				<div className="media-left">
					{poster}
				</div>
				<div  className="media-body">
					<h4 className="media-heading custom-pointer" title={this.props.data.id}>
						<span dangerouslySetInnerHTML={SearchSnippet.createMarkup(this.highlightSearchedTerm(title))}/>
					</h4>
                    <span className="icons-snippet">{subHeading}
                        &nbsp;{mediaTypes}&nbsp;{accessIcon}&nbsp;{fragmentIcon}</span>
                    <br />
					<span className="snippet_description" dangerouslySetInnerHTML={SearchSnippet.createMarkup(
                        this.highlightSearchedTerm(CollectionUtil.highlightSearchTermInDescription(
                            this.props.data.description, this.props.searchTerm, 35))
					)} />
					{fragmentInfo}
					{tags}
				</div>
			</div>
		)
	}
}

export default SearchSnippet;
