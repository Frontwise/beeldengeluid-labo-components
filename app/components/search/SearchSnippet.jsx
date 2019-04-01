import IconUtil from "../../util/IconUtil";
import trunc from "../../util/Trunc";
import IDUtil from "../../util/IDUtil";
import RegexUtil from "../../util/RegexUtil";
import Classification from "../annotation/Classification";

import PropTypes from "prop-types";

class SearchSnippet extends React.Component {
	constructor(props) {
		super(props);
		this.CLASS_PREFIX = "ss";
	}

	static createMarkup(text) {
		return { __html: text };
	}

	renderPosterImage = posterURL => {
		if (!posterURL) return null;

		return (
			<div className={IDUtil.cssClassName("poster", this.CLASS_PREFIX)}>
				<img
					className="media-object"
					src="/static/images/placeholder.2b77091b.svg"
					data-src={posterURL}
					alt="Could not find image"
				/>
			</div>
		);
	};

	renderMediaIcons = mediaTypes => {
		if (!mediaTypes) return null;

		return mediaTypes.map(mt => {
			if (mt === "video") {
				return (
					<span
						className={IconUtil.getMimeTypeIcon(
							"video",
							true,
							true,
							false
						)}
						title="Video content"
					/>
				);
			} else if (mt === "audio") {
				return (
					<span
						className={IconUtil.getMimeTypeIcon(
							"audio",
							true,
							true,
							false
						)}
						title="Audio content"
					/>
				);
			} else if (mt === "image") {
				return (
					<span
						className={IconUtil.getMimeTypeIcon(
							"image",
							true,
							true,
							false
						)}
						title="Image content"
					/>
				);
			} else if (mt === "text") {
				return (
					<span
						className={IconUtil.getMimeTypeIcon(
							"text",
							true,
							true,
							false
						)}
						title="Textual content"
					/>
				);
			}
		});
	};

	renderAccessabilityIcon = isPlayable => {
		//Note: assigning a media type (to the result data) automatically means it's accessible in the media suite!
		if (isPlayable) {
			// Data  should be visible by default, so prevent any clutter
			// by showing for all items they are visible.
			return null;
		} else {
			return (
				<span
					className={IconUtil.getMediaObjectAccessIcon(
						false,
						false,
						true,
						true,
						false
					)}
					title="Media object(s) not accessible"
				/>
			);
		}
	};

	renderTags = tags => {
		if (!tags) return null;

		return tags.map(t => {
			return <Classification classification={{ label: t }} />;
		});
	};

	renderFragmentIcon = () => {
		return (
			<span
				className={IconUtil.getMimeTypeIcon("fragment", true, true)}
				title="Media fragment"
			/>
		);
	};

	renderFragmentSnippet = fragment => {
		if (!fragment) return null;

		return (
			<div className={IDUtil.cssClassName("fragment", this.CLASS_PREFIX)}>
				{fragment.snippet}
			</div>
		);
	};

	fixMsg = (s)=>{
		// remove " |" from string end
		return s.replace(new RegExp(/\ \|$/,"g"), "");
	}

	//possible default fields: posterURL, title, description, tags
	render() {
		const poster = this.renderPosterImage(this.props.data.posterURL);
		const mediaTypes = this.renderMediaIcons(this.props.data.mediaTypes);
		const accessIcon = this.renderAccessabilityIcon(
			this.props.data.playable
		);
		const tags = this.renderTags(this.props.data.tags);

		let fragmentIcon,
			fragmentSnippet = null;
		if (this.props.data.type === "media_fragment") {
			fragmentIcon = this.renderFragmentIcon();
			fragmentSnippet = this.renderFragmentSnippet(
				this.props.data.mediaFragment
			);
		}

		const classNames = [IDUtil.cssClassName("search-snippet")];
		const title = this.props.data.title ? this.props.data.title + " " : "";
		const date = this.props.data.date ? this.props.data.date : "";
		const subHeading = (
			<div>
				{date && <i>{date}</i>}
				<span>{this.fixMsg(this.props.data.highlightMsg)}</span>
			</div>
		);

		return (
			<div className={classNames.join(" ")} onClick={this.props.onClick}>
				{poster}

				<div
					className={IDUtil.cssClassName(
						"media-body",
						this.CLASS_PREFIX
					)}
				>
					{/* Title */}
					<h3
						className={IDUtil.cssClassName(
							"title",
							this.CLASS_PREFIX
						)}
						title={this.props.data.id}
					>
						<span
							dangerouslySetInnerHTML={SearchSnippet.createMarkup(
								RegexUtil.highlightText(
									title ? trunc(title, 200) : "",
									this.props.searchTerm
								)
							)}
						/>
						{/* Icons access */}
						<span className={IDUtil.cssClassName(
							"icon-access",
							this.CLASS_PREFIX
						)}>
							{accessIcon}
						</span>
					</h3>

					{/* Text Snippet */}
					<div
						className={IDUtil.cssClassName(
							"snippet-description",
							this.CLASS_PREFIX
						)}
						dangerouslySetInnerHTML={SearchSnippet.createMarkup(
							RegexUtil.highlightText(
								RegexUtil.findFirstHighlightInText(
									this.props.data.description,
									this.props.searchTerm,
									35
								),
								this.props.searchTerm
							)
						)}
					/>

					{fragmentSnippet}

					{/* Info heading/icons */}
					<div
						className={IDUtil.cssClassName(
							"info",
							this.CLASS_PREFIX
						)}
					>
						{/* Icons type */}
						<div className={IDUtil.cssClassName(
							"icon-type",
							this.CLASS_PREFIX
						)}>
							{mediaTypes}{fragmentIcon}
						</div>
						{subHeading}

						
					</div>

					{tags}
				</div>
			</div>
		);
	}
}

SearchSnippet.PropTypes = {
	onClick: PropTypes.func.isRequired, // click callback
	searchTerm: PropTypes.string.isRequired, //the search term that was used to find this hit
	data: PropTypes.shape({
		//all the data required to draw the information of this result snippet (see getResultSnippetData() in CollectionConfig)
		id: PropTypes.string.isRequired,
		title: PropTypes.string.isRequired,
		description: PropTypes.string,
		date: PropTypes.string,
		posterURL: PropTypes.string, //for loading a poster image
		playable: PropTypes.bool, //for drawing the accessability icon
		mediaTypes: PropTypes.arrayOf(PropTypes.string), //for drawing media type icons
		highlightMsg: PropTypes.string.isRequired,
		tags: PropTypes.string, //for drawing any type of annotations (e.g. based on a the current user)

		//this is only available when the search is configured to return media fragments (inner_hits)
		mediaFragment: PropTypes.shape({
			assetId: PropTypes.string,
			url: PropTypes.string,
			start: PropTypes.number,
			end: PropTypes.number,
			snippet: PropTypes.string,
			layer: PropTypes.string
		})
	}).isRequired
};

export default SearchSnippet;
