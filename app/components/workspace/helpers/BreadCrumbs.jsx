/**
 * Set breadcrumbs in non react context
 *
 * @param {array} path List of path urls
 * @param {object} rewrites Object with titles for path values, optional
 */
export const setBreadCrumbs = (path, titles = {}) => {
  if (path && path.length) {
    let result = '<li><a href="/" class="home"> </a> /</li>';
    let url = '';
    let title = '';
    path.forEach(p => {
      url += '/' + p;
      title = p;
      if (p in titles) {
        title = titles[p];
      }
      result +=
        '<li><a href="' +
        url +
        '">' +
        title.charAt(0).toUpperCase() +
        title.slice(1) +
        '</a> /</li>';
    });
    const elem = document.getElementById('breadcrumbs');
    if (elem) {
      elem.innerHTML = result;
      elem.className = elem.className.replace('hidden', '');
    }
  }
};

/**
 * Set breadcrumbs in non react context
 *
 * @param {object} data Data to export
 */
export const setBreadCrumbsFromMatch = (match, titles = {}) => {
  setBreadCrumbs(match.url.split('/').slice(1), titles);
};
