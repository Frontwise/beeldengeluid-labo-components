const RegexUtil = {

    generateRegexForSearchTerm(searchTerm) {
        var searchTerm = RegexUtil.escapeRegExp(searchTerm);
        var splitTerms = searchTerm.match(/\w+|\"([^\"]+)\"/gi);
        for (var i = 0; i < splitTerms.length; i++) {
            splitTerms[i] = splitTerms[i].replace(/\"/g, "");
        }
        let regex = new RegExp(splitTerms.join("|"), 'gi');
        return regex;
    },

    escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
export default RegexUtil;
