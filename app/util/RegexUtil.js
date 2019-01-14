const RegexUtil = {

    // When updating this please also update _isSmartQuery() in LayeredSearchHandler.py! To exclude these from highlighting!
    generateRegexForSearchTerm(searchTerm) {

        // Remove boolean operators from the highlighting
        var searchTerm = searchTerm.replace("AND", "");
        searchTerm = searchTerm.replace("OR", "");
        searchTerm = searchTerm.replace("NOT", "");
        // Escape reserved characters in Regex
        searchTerm = RegexUtil.escapeRegExp(searchTerm);

        // Split the terms into an array (words withing quotes are together one term)
        var splitTerms = searchTerm.match(/\w+[\\?\w+]*[\\*\w+]*|\"([^\"]+)\"/gi);
        for (var i = 0; i < splitTerms.length; i++) {
            // Remove quotes and wildcards from the term and replace with correct regex equivalent
            splitTerms[i] = splitTerms[i].replace(/\"/g, "");
            splitTerms[i] = splitTerms[i].replace("\\?", ".?");
            splitTerms[i] = splitTerms[i].replace("\\*", ".*?\\b");
        }

        // Join the terms together in an OR, so each term gets highlighted when appearing
        let regex = new RegExp(splitTerms.join("|"), 'gi');
        return regex;
    },

    escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
export default RegexUtil;
