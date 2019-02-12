const RegexUtil = {

    highlightText(text, searchTerm) {
        if(text === null || !searchTerm) {
            return text;
        }
        return text.replace(
            RegexUtil.generateRegexForSearchTerm(searchTerm), (term) => "<span class='highLightText'>" + term + "</span>"
        )
    },

    // maxWords is not always honored. When a searchterm with quotes is longer than maxWords the whole quoted match will be returned.
    // maxWords is used as a "number of words to the left and right" of the matched term
    // FIXME if there are multiple matches, but all in a single phrase, this should only return one snippet per phrase!
    generateHighlightedText(text, searchTerm, maxWords=4) {
        const snippets = [];
        let regex = null;
        let matches = null;
        text = text.toString().replace(/\r?\n|\r/g, " "); //dit haalt enters eruit neem ik aan?
        if(searchTerm && text) {
            regex = RegexUtil.generateRegexForSearchTerm(searchTerm);
            matches = text.match(regex);
        }
        if(matches) {
            let startIndex = 0;
            matches.forEach(match => {
                const foundIndex = text.indexOf(match, startIndex);
                if (foundIndex !== -1) {
                    //Determine snippet
                    let begin = RegexUtil.nthIndexRight(text, " ", maxWords + 1, foundIndex); // Searches for the maxWords' space before the match
                    let end = RegexUtil.nthIndex(text, " ", maxWords, foundIndex + match.length); // Searches for the maxWords' space after the match
                    let snippet = "";

                    if(begin === -1) {
                        begin = 0;
                    }
                    if(end === -1) {
                        end = text.length;
                    }
                    if(begin > 0) {
                        snippet += "(...)";
                    }
                    snippet += text.substring(begin, end);
                    if(end < text.length) {
                        snippet += " (...)";
                    }

                    snippets.push(RegexUtil.highlightText(snippet, searchTerm));

                    // We can continue searching from here instead of taking the whole array again...
                    startIndex = foundIndex + 1;
                }
            })
        }
        return snippets;
    },

    // When updating this please also update _isSmartQuery() in LayeredSearchHandler.py! To exclude these from highlighting!
    generateRegexForSearchTerm(term) {
        let searchTerm = term;
        // Remove boolean operators from the highlighting
        searchTerm = searchTerm.replace("AND ", "");
        searchTerm = searchTerm.replace("OR ", "");
        searchTerm = searchTerm.replace("NOT ", "");
        // Escape reserved characters in Regex
        searchTerm = RegexUtil.escapeRegExp(searchTerm);

        // Split the terms into an array (words withing quotes are together one term)
        let splitTerms = searchTerm.match(/\w+[\\?\w+]*[\\*\w+]*|\"([^\"]+)\"/gi);
        for (let i = 0; i < splitTerms.length; i++) {
            // Remove quotes and wildcards from the term and replace with correct regex equivalent
            splitTerms[i] = splitTerms[i].replace(/\"/g, "");
            splitTerms[i] = splitTerms[i].replace("?", ".?");
            let indexOfStar = splitTerms[i].indexOf("*");
            if(indexOfStar >= 0){
                if(splitTerms[i].indexOf("* ") >= 0 || splitTerms[i].indexOf("*") == splitTerms[i].length-1) { //In case of space after the *, remove it (otherwise the space will be included in the regex)
                    //var part = splitTerms[i].substring(indexOfStar+2, splitTerms[i].length);
                    splitTerms[i] = splitTerms[i].replace(" ", ""); //remove space if it is there
                    splitTerms[i] = splitTerms[i].replace("*", "[^\\s]*");
                } else { //The case that the star is immediately followed by a character other than space (the case above)
                    const part = splitTerms[i].substring(indexOfStar+1, splitTerms[i].length);
                    splitTerms[i] = splitTerms[i].replace("*", "[^\\s]*?(?="+part+")");
                }
            }
        }
        // Join the terms together in an OR, so each term gets highlighted when appearing
        return new RegExp(splitTerms.join("|"), 'gi');
    },

    //for pruning long descriptions; makes sure to return the snippet that contains the search term
    //FIXME this function should be merged or removed
    findFirstHighlightInText(text, searchTerm=null, maxWords=35) {
        if(!text) {
            return null;
        }
        if(Array.isArray(text)) {
            text = text.join('\n');
        }
        let index = 0;
        if(searchTerm) {
            index = text.toLowerCase().search(
                RegexUtil.generateRegexForSearchTerm(searchTerm)
            );
        }
        index = index > 50 ? index - 50 : 0;
        text = text.substring(index);
        let words = text.split(' ');
        if(words.length > maxWords) {
            words = words.slice(index == 0 ? 0 : 1, maxWords);
        } else if(index != 0) {
            words.splice(0,1);
        }
        return words.join(' ')
    },

    escapeRegExp(text) {
        //return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return text.replace(/[.+^${}()|[\]\\]/g, "");
    },

    // Searches for the n'th pattern in str, starting from start
    nthIndex(str, pat, n, start){
        let i = -1
        if(start > str.length) {
            return -1;
        } else {
            i = start;
        }
        while(n-- && i++ < str.length) {
            i = str.indexOf(pat, i);
            if (i < 0) break;
        }
        return i;
    },

    // Searches for the n'th last pattern in str, starting from start (count from left)
    nthIndexRight(str, pat, n, start){
        let i = -1;
        if(start > str.length){
            return -1;
        } else {
            i = start;
        }

        while(n-- && i-- <= str.length){
            i= str.lastIndexOf(pat, i);
            if (i < 0) break;
        }
        return i;
    }
}
export default RegexUtil;
