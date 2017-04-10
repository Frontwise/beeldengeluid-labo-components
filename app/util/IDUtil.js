const IDUtil = {

	//used to generate a more compact form for unique strings (e.g. collection names) to be used as guid
	hashCode : function(s) {
	  var hash = 0, i, chr, len;
	  if (s.length === 0) return hash;
	  for (i = 0, len = s.length; i < len; i++) {
	    chr   = s.charCodeAt(i);
	    hash  = ((hash << 5) - hash) + chr;
	    hash |= 0; // Convert to 32bit integer
	  }
	  return hash;
	},

	//generates a guid from nothing
	guid : function() {
		return IDUtil.__s4() + IDUtil.__s4() + '-' + IDUtil.__s4() + '-' +
		IDUtil.__s4() + '-' + IDUtil.__s4() + '-' + IDUtil.__s4() +
		IDUtil.__s4() + IDUtil.__s4();
	},

	//only used by the guid function
	__s4 : function() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
}

export default IDUtil;