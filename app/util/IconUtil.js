const IconUtil = {

	//TODO somehow also allow recipes to override icons?
	getAnnotationTemplateIcon(template, border, muted, interactive) {
		let iconClass = 'fa fa-question';
		if(template == 'av' || template == 'video') {
			iconClass = 'fa fa-film';
		} else if(template == 'audio') {
			iconClass = 'fa fa-signal';
		} else if(template == 'artwork') {
			iconClass = 'fa fa-paint-brush';
		} else if(template == 'link') {
			iconClass = 'fa fa-link';
		} else if(template == 'image') {
			iconClass = 'fa fa-picture-o';
		} else if(template == 'article' || template == 'text') {
			iconClass = 'fa fa-file-text-o';
		} else if(template == 'person') {
			iconClass = 'fa fa-user-circle';
		}
		return IconUtil.__addExtraStyling(iconClass, border, muted, interactive);
	},

	getMimeTypeIcon(mimeType, border, muted, interactive) {
		let iconClass = '';
		if(mimeType) {
			if(mimeType.indexOf('video') != -1) {
				iconClass = 'fa fa-film';
			} else if(mimeType.indexOf('audio') != -1) {
				iconClass = 'fa fa-headphones';
			} else if(mimeType.indexOf('image') != -1) {
				iconClass = 'fa fa-photo';
			} else if(mimeType.indexOf('fragment') != -1) {
				iconClass = 'fa fa-puzzle-piece';
			} else if(mimeType.indexOf('text') != -1) {
				iconClass = 'fa fa-file-text-o';
 			}
		}
		return IconUtil.__addExtraStyling(iconClass, border, muted, interactive);
	},

	getUserActionIcon(action, border, muted, interactive) {
		let iconClass = 'fa fa-question';
		if(action.indexOf('save') != -1) {
			iconClass = 'fa fa-save';
		} else if(action.indexOf('remove') != -1) {
			iconClass = 'fa fa-remove';
		} else if(action.indexOf('add') != -1) {
			iconClass = 'fa fa-plus';
		} else if(action.indexOf('annotate') != -1) {
			iconClass = 'fa fa-sticky-note'
		} else if(action.indexOf('next') != -1) {
			iconClass = 'fa fa-caret-right'
		} else if(action.indexOf('previous') != -1) {
			iconClass = 'fa fa-caret-left'
		} else if(action.indexOf('play') != -1) {
			iconClass = 'fa fa-play'
		} else if(action.indexOf('comment') != -1) {
			iconClass = 'fa fa-comment'
		} else if(action.indexOf('link') != -1) {
			iconClass = 'fa fa-link'
		}
		return IconUtil.__addExtraStyling(iconClass, border, muted, interactive);
	},

	getMediaObjectAccessIcon(present, interalAccess, border, muted, interactive) {
		let iconClass = ''
		if(present) {
			iconClass = interalAccess ? 'fa fa-eye' : 'fa fa-link';
		} else {
			iconClass = 'fa fa-eye-slash'
		}
		return IconUtil.__addExtraStyling(iconClass, border, muted, interactive);
	},

	__addExtraStyling(iconClass, border, muted, interactive) {
		if(border) {
			iconClass += ' fa-border';
		}
		if(muted) {
			iconClass += ' text-muted';
		}
		if(interactive) {
			iconClass += ' interactive';
		}
		return iconClass;
	}
}

export default IconUtil;
