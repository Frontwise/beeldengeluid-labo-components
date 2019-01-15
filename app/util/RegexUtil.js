const RegexUtil = {

    // When updating this please also update _isSmartQuery() in LayeredSearchHandler.py! To exclude these from highlighting!
    generateRegexForSearchTerm(searchTerm) {
        // Remove boolean operators from the highlighting
        var searchTerm = searchTerm.replace("AND ", "");
        searchTerm = searchTerm.replace("OR ", "");
        searchTerm = searchTerm.replace("NOT ", "");
        // Escape reserved characters in Regex
        searchTerm = RegexUtil.escapeRegExp(searchTerm);

        // Split the terms into an array (words withing quotes are together one term)
        var splitTerms = searchTerm.match(/\w+[\\?\w+]*[\\*\w+]*|\"([^\"]+)\"/gi);
        for (var i = 0; i < splitTerms.length; i++) {
            // Remove quotes and wildcards from the term and replace with correct regex equivalent
            splitTerms[i] = splitTerms[i].replace(/\"/g, "");
            splitTerms[i] = splitTerms[i].replace("?", ".?");
            var indexOfStar = splitTerms[i].indexOf("*");
            if(indexOfStar >= 0){
                if(splitTerms[i].indexOf("* ") >= 0 || splitTerms[i].indexOf("*") == splitTerms[i].length-1){ //In case of space after the *, remove it (otherwise the space will be included in the regex)
                    var part = splitTerms[i].substring(indexOfStar+2, splitTerms[i].length);
                    splitTerms[i] = splitTerms[i].replace(" ", ""); //remove space if it is there
                    splitTerms[i] = splitTerms[i].replace("*", "[^\\s]*");
                } else { //The case that the star is immediately followed by a character other than space (the case above)
                    var part = splitTerms[i].substring(indexOfStar+1, splitTerms[i].length);
                    splitTerms[i] = splitTerms[i].replace("*", "[^\\s]*?(?="+part+")");
                }
            }
        }

        // Join the terms together in an OR, so each term gets highlighted when appearing
        let regex = new RegExp(splitTerms.join("|"), 'gi');
        return regex;
    },

    escapeRegExp(text) {
        //return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return text.replace(/[.+^${}()|[\]\\]/g, "");
    },

    // Searches for the n'th pattern in str, starting from start
    nthIndex(str, pat, n, start){
        var L= str.length;
        var i = -1
        if(start > str.length){
            return -1;
        } else {
            i = start;
        }

        while(n-- && i++<L){
            i= str.indexOf(pat, i);
            if (i < 0) break;
        }
        return i;
    },

    // Searches for the n'th last pattern in str, starting from start (count from left)
    nthIndexRight(str, pat, n, start){
        var L = str.length;
        var i = -1;
        if(start > L){
            return -1;
        } else {
            i = start;
        }

        while(n-- && i--<=L){
            i= str.lastIndexOf(pat, i);
            if (i < 0) break;
        }
        return i;
    }
}
export default RegexUtil;
