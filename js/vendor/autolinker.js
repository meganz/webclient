;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Autolinker = factory();
  }
}(this, function() {
var Autolinker = function( cfg ) {
	cfg = cfg || {};

	this.version = Autolinker.version;

	this.urls = this.normalizeUrlsCfg( cfg.urls );
	this.email = typeof cfg.email === 'boolean' ? cfg.email : true;
	this.phone = typeof cfg.phone === 'boolean' ? cfg.phone : true;
	this.hashtag = cfg.hashtag || false;
	this.mention = cfg.mention || false;
	this.newWindow = typeof cfg.newWindow === 'boolean' ? cfg.newWindow : true;
	this.stripPrefix = this.normalizeStripPrefixCfg( cfg.stripPrefix );
	this.stripTrailingSlash = typeof cfg.stripTrailingSlash === 'boolean' ? cfg.stripTrailingSlash : true;

	var mention = this.mention;
	if( mention !== false && mention !== 'twitter' && mention !== 'instagram' ) {
		throw new Error( "invalid `mention` cfg - see docs" );
	}

	var hashtag = this.hashtag;
	if( hashtag !== false && hashtag !== 'twitter' && hashtag !== 'facebook' && hashtag !== 'instagram' ) {
		throw new Error( "invalid `hashtag` cfg - see docs" );
	}

	this.truncate = this.normalizeTruncateCfg( cfg.truncate );
	this.className = cfg.className || '';
	this.replaceFn = cfg.replaceFn || null;
	this.context = cfg.context || this;

	this.htmlParser = null;
	this.matchers = null;
	this.tagBuilder = null;
};



Autolinker.link = function( textOrHtml, options ) {
	var autolinker = new Autolinker( options );
	return autolinker.link( textOrHtml );
};



Autolinker.parse = function( textOrHtml, options ) {
	var autolinker = new Autolinker( options );
	return autolinker.parse( textOrHtml );
};


Autolinker.version = '1.4.3';


Autolinker.prototype = {
	constructor : Autolinker,  

	normalizeUrlsCfg : function( urls ) {
		if( urls == null ) urls = true;  

		if( typeof urls === 'boolean' ) {
			return { schemeMatches: urls, wwwMatches: urls, tldMatches: urls };

		} else {  
			return {
				schemeMatches : typeof urls.schemeMatches === 'boolean' ? urls.schemeMatches : true,
				wwwMatches    : typeof urls.wwwMatches === 'boolean'    ? urls.wwwMatches    : true,
				tldMatches    : typeof urls.tldMatches === 'boolean'    ? urls.tldMatches    : true
			};
		}
	},


	normalizeStripPrefixCfg : function( stripPrefix ) {
		if( stripPrefix == null ) stripPrefix = true;  

		if( typeof stripPrefix === 'boolean' ) {
			return { scheme: stripPrefix, www: stripPrefix };

		} else {  
			return {
				scheme : typeof stripPrefix.scheme === 'boolean' ? stripPrefix.scheme : true,
				www    : typeof stripPrefix.www === 'boolean'    ? stripPrefix.www    : true
			};
		}
	},


	normalizeTruncateCfg : function( truncate ) {
		if( typeof truncate === 'number' ) {
			return { length: truncate, location: 'end' };

		} else {  
			return Autolinker.Util.defaults( truncate || {}, {
				length   : Number.POSITIVE_INFINITY,
				location : 'end'
			} );
		}
	},


	parse : function( textOrHtml ) {
		var htmlParser = this.getHtmlParser(),
		    htmlNodes = htmlParser.parse( textOrHtml ),
		    anchorTagStackCount = 0,  
		    matches = [];

		for( var i = 0, len = htmlNodes.length; i < len; i++ ) {
			var node = htmlNodes[ i ],
			    nodeType = node.getType();

			if( nodeType === 'element' && node.getTagName() === 'a' ) {  
				if( !node.isClosing() ) {  
					anchorTagStackCount++;
				} else {  
					anchorTagStackCount = Math.max( anchorTagStackCount - 1, 0 );  
				}

			} else if( nodeType === 'text' && anchorTagStackCount === 0 ) {  
				var textNodeMatches = this.parseText( node.getText(), node.getOffset() );

				matches.push.apply( matches, textNodeMatches );
			}
		}


		matches = this.compactMatches( matches );

		matches = this.removeUnwantedMatches( matches );

		return matches;
	},


	compactMatches : function( matches ) {
		matches.sort( function( a, b ) { return a.getOffset() - b.getOffset(); } );

		for( var i = 0; i < matches.length - 1; i++ ) {
			var match = matches[ i ],
					offset = match.getOffset(),
					matchedTextLength = match.getMatchedText().length,
			    endIdx = offset + matchedTextLength;

			if( i + 1 < matches.length ) {
				if( matches[ i + 1 ].getOffset() === offset ) {
					var removeIdx = matches[ i + 1 ].getMatchedText().length > matchedTextLength ? i : i + 1;
					matches.splice( removeIdx, 1 );
					continue;
				}

				if( matches[ i + 1 ].getOffset() <= endIdx ) {
					matches.splice( i + 1, 1 );
				}
			}
		}

		return matches;
	},


	removeUnwantedMatches : function( matches ) {
		var remove = Autolinker.Util.remove;

		if( !this.hashtag ) remove( matches, function( match ) { return match.getType() === 'hashtag'; } );
		if( !this.email )   remove( matches, function( match ) { return match.getType() === 'email'; } );
		if( !this.phone )   remove( matches, function( match ) { return match.getType() === 'phone'; } );
		if( !this.mention ) remove( matches, function( match ) { return match.getType() === 'mention'; } );
		if( !this.urls.schemeMatches ) {
			remove( matches, function( m ) { return m.getType() === 'url' && m.getUrlMatchType() === 'scheme'; } );
		}
		if( !this.urls.wwwMatches ) {
			remove( matches, function( m ) { return m.getType() === 'url' && m.getUrlMatchType() === 'www'; } );
		}
		if( !this.urls.tldMatches ) {
			remove( matches, function( m ) { return m.getType() === 'url' && m.getUrlMatchType() === 'tld'; } );
		}

		return matches;
	},


	parseText : function( text, offset ) {
		offset = offset || 0;
		var matchers = this.getMatchers(),
		    matches = [];

		for( var i = 0, numMatchers = matchers.length; i < numMatchers; i++ ) {
			var textMatches = matchers[ i ].parseMatches( text );

			for( var j = 0, numTextMatches = textMatches.length; j < numTextMatches; j++ ) {
				textMatches[ j ].setOffset( offset + textMatches[ j ].getOffset() );
			}

			matches.push.apply( matches, textMatches );
		}
		return matches;
	},


	link : function( textOrHtml ) {
		if( !textOrHtml ) { return ""; }  

		var matches = this.parse( textOrHtml ),
			newHtml = [],
			lastIndex = 0;

		for( var i = 0, len = matches.length; i < len; i++ ) {
			var match = matches[ i ];

			newHtml.push( textOrHtml.substring( lastIndex, match.getOffset() ) );
			newHtml.push( this.createMatchReturnVal( match ) );

			lastIndex = match.getOffset() + match.getMatchedText().length;
		}
		newHtml.push( textOrHtml.substring( lastIndex ) );  

		return newHtml.join( '' );
	},


	createMatchReturnVal : function( match ) {
		var replaceFnResult;
		if( this.replaceFn ) {
			replaceFnResult = this.replaceFn.call( this.context, match );  
		}

		if( typeof replaceFnResult === 'string' ) {
			return replaceFnResult;  

		} else if( replaceFnResult === false ) {
			return match.getMatchedText();  

		} else if( replaceFnResult instanceof Autolinker.HtmlTag ) {
			return replaceFnResult.toAnchorString();

		} else {  
			var anchorTag = match.buildTag();  

			return anchorTag.toAnchorString();
		}
	},


	getHtmlParser : function() {
		var htmlParser = this.htmlParser;

		if( !htmlParser ) {
			htmlParser = this.htmlParser = new Autolinker.htmlParser.HtmlParser();
		}

		return htmlParser;
	},


	getMatchers : function() {
		if( !this.matchers ) {
			var matchersNs = Autolinker.matcher,
			    tagBuilder = this.getTagBuilder();

			var matchers = [
				new matchersNs.Hashtag( { tagBuilder: tagBuilder, serviceName: this.hashtag } ),
				new matchersNs.Email( { tagBuilder: tagBuilder } ),
				new matchersNs.Phone( { tagBuilder: tagBuilder } ),
				new matchersNs.Mention( { tagBuilder: tagBuilder, serviceName: this.mention } ),
				new matchersNs.Url( { tagBuilder: tagBuilder, stripPrefix: this.stripPrefix, stripTrailingSlash: this.stripTrailingSlash } )
			];

			return ( this.matchers = matchers );

		} else {
			return this.matchers;
		}
	},


	getTagBuilder : function() {
		var tagBuilder = this.tagBuilder;

		if( !tagBuilder ) {
			tagBuilder = this.tagBuilder = new Autolinker.AnchorTagBuilder( {
				newWindow   : this.newWindow,
				truncate    : this.truncate,
				className   : this.className
			} );
		}

		return tagBuilder;
	}

};


Autolinker.match = {};
Autolinker.matcher = {};
Autolinker.htmlParser = {};
Autolinker.truncate = {};

Autolinker.Util = {

	abstractMethod : function() { throw "abstract"; },


	trimRegex : /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,


	assign : function( dest, src ) {
		for( var prop in src ) {
			if( src.hasOwnProperty( prop ) ) {
				dest[ prop ] = src[ prop ];
			}
		}

		return dest;
	},


	defaults : function( dest, src ) {
		for( var prop in src ) {
			if( src.hasOwnProperty( prop ) && dest[ prop ] === undefined ) {
				dest[ prop ] = src[ prop ];
			}
		}

		return dest;
	},


	extend : function( superclass, protoProps ) {
		var superclassProto = superclass.prototype;

		var F = function() {};
		F.prototype = superclassProto;

		var subclass;
		if( protoProps.hasOwnProperty( 'constructor' ) ) {
			subclass = protoProps.constructor;
		} else {
			subclass = function() { superclassProto.constructor.apply( this, arguments ); };
		}

		var subclassProto = subclass.prototype = new F();  
		subclassProto.constructor = subclass;  
		subclassProto.superclass = superclassProto;

		delete protoProps.constructor;  
		Autolinker.Util.assign( subclassProto, protoProps );

		return subclass;
	},


	ellipsis : function( str, truncateLen, ellipsisChars ) {
		var ellipsisLength;

		if( str.length > truncateLen ) {
			if(ellipsisChars == null) {
			  ellipsisChars = '&hellip;';
			  ellipsisLength = 3;
			} else {
			  ellipsisLength = ellipsisChars.length;
			}

			str = str.substring( 0, truncateLen - ellipsisLength ) + ellipsisChars;
		}
		return str;
	},


	indexOf : function( arr, element ) {
		if( Array.prototype.indexOf ) {
			return arr.indexOf( element );

		} else {
			for( var i = 0, len = arr.length; i < len; i++ ) {
				if( arr[ i ] === element ) return i;
			}
			return -1;
		}
	},


	remove : function( arr, fn ) {
		for( var i = arr.length - 1; i >= 0; i-- ) {
			if( fn( arr[ i ] ) === true ) {
				arr.splice( i, 1 );
			}
		}
	},


	splitAndCapture : function( str, splitRegex ) {

		var result = [],
		    lastIdx = 0,
		    match;

		while( match = splitRegex.exec( str ) ) {
			result.push( str.substring( lastIdx, match.index ) );
			result.push( match[ 0 ] );  

			lastIdx = match.index + match[ 0 ].length;
		}
		result.push( str.substring( lastIdx ) );

		return result;
	},


	trim : function( str ) {
		return str.replace( this.trimRegex, '' );
	}

};

Autolinker.HtmlTag = Autolinker.Util.extend( Object, {

	whitespaceRegex : /\s+/,


	constructor : function( cfg ) {
		Autolinker.Util.assign( this, cfg );

		this.innerHtml = this.innerHtml || this.innerHTML;  
	},


	setTagName : function( tagName ) {
		this.tagName = tagName;
		return this;
	},


	getTagName : function() {
		return this.tagName || "";
	},


	setAttr : function( attrName, attrValue ) {
		var tagAttrs = this.getAttrs();
		tagAttrs[ attrName ] = attrValue;

		return this;
	},


	getAttr : function( attrName ) {
		return this.getAttrs()[ attrName ];
	},


	setAttrs : function( attrs ) {
		var tagAttrs = this.getAttrs();
		Autolinker.Util.assign( tagAttrs, attrs );

		return this;
	},


	getAttrs : function() {
		return this.attrs || ( this.attrs = {} );
	},


	setClass : function( cssClass ) {
		return this.setAttr( 'class', cssClass );
	},


	addClass : function( cssClass ) {
		var classAttr = this.getClass(),
		    whitespaceRegex = this.whitespaceRegex,
		    indexOf = Autolinker.Util.indexOf,  
		    classes = ( !classAttr ) ? [] : classAttr.split( whitespaceRegex ),
		    newClasses = cssClass.split( whitespaceRegex ),
		    newClass;

		while( newClass = newClasses.shift() ) {
			if( indexOf( classes, newClass ) === -1 ) {
				classes.push( newClass );
			}
		}

		this.getAttrs()[ 'class' ] = classes.join( " " );
		return this;
	},


	removeClass : function( cssClass ) {
		var classAttr = this.getClass(),
		    whitespaceRegex = this.whitespaceRegex,
		    indexOf = Autolinker.Util.indexOf,  
		    classes = ( !classAttr ) ? [] : classAttr.split( whitespaceRegex ),
		    removeClasses = cssClass.split( whitespaceRegex ),
		    removeClass;

		while( classes.length && ( removeClass = removeClasses.shift() ) ) {
			var idx = indexOf( classes, removeClass );
			if( idx !== -1 ) {
				classes.splice( idx, 1 );
			}
		}

		this.getAttrs()[ 'class' ] = classes.join( " " );
		return this;
	},


	getClass : function() {
		return this.getAttrs()[ 'class' ] || "";
	},


	hasClass : function( cssClass ) {
		return ( ' ' + this.getClass() + ' ' ).indexOf( ' ' + cssClass + ' ' ) !== -1;
	},


	setInnerHtml : function( html ) {
		this.innerHtml = html;

		return this;
	},


	getInnerHtml : function() {
		return this.innerHtml || "";
	},


	toAnchorString : function() {
		var tagName = this.getTagName(),
		    attrsStr = this.buildAttrsStr();

		attrsStr = ( attrsStr ) ? ' ' + attrsStr : '';  

		return [ '<', tagName, attrsStr, '>', this.getInnerHtml(), '</', tagName, '>' ].join( "" );
	},


	buildAttrsStr : function() {
		if( !this.attrs ) return "";  

		var attrs = this.getAttrs(),
		    attrsArr = [];

		for( var prop in attrs ) {
			if( attrs.hasOwnProperty( prop ) ) {
				attrsArr.push( prop + '="' + attrs[ prop ] + '"' );
			}
		}
		return attrsArr.join( " " );
	}

} );

Autolinker.RegexLib = (function() {

	var alphaCharsStr = 'A-Za-z\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC';

	var decimalNumbersStr = '0-9\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19';


	var alphaNumericCharsStr = alphaCharsStr + decimalNumbersStr;


	var domainNameRegex = new RegExp( '[' + alphaNumericCharsStr + '.\\-]*[' + alphaNumericCharsStr + '\\-]' );

	return {

		alphaNumericCharsStr : alphaNumericCharsStr,

		alphaCharsStr : alphaCharsStr,

		domainNameRegex : domainNameRegex,

	};


}() );

Autolinker.AnchorTagBuilder = Autolinker.Util.extend( Object, {

	constructor : function( cfg ) {
		cfg = cfg || {};

		this.newWindow = cfg.newWindow;
		this.truncate = cfg.truncate;
		this.className = cfg.className;
	},


	build : function( match ) {
		return new Autolinker.HtmlTag( {
			tagName   : 'a',
			attrs     : this.createAttrs( match ),
			innerHtml : this.processAnchorText( match.getAnchorText() )
		} );
	},


	createAttrs : function( match ) {
		var attrs = {
			'href' : match.getAnchorHref()  
		};

		var cssClass = this.createCssClass( match );
		if( cssClass ) {
			attrs[ 'class' ] = cssClass;
		}
		if( this.newWindow ) {
			attrs[ 'target' ] = "_blank";
			attrs[ 'rel' ] = "noopener noreferrer";
		}

		if( this.truncate ) {
			if( this.truncate.length && this.truncate.length < match.getAnchorText().length ) {
				attrs[ 'title' ] = match.getAnchorHref();
			}
		}

		return attrs;
	},


	createCssClass : function( match ) {
		var className = this.className;

		if( !className ) {
			return "";

		} else {
			var returnClasses = [ className ],
				cssClassSuffixes = match.getCssClassSuffixes();

			for( var i = 0, len = cssClassSuffixes.length; i < len; i++ ) {
				returnClasses.push( className + '-' + cssClassSuffixes[ i ] );
			}
			return returnClasses.join( ' ' );
		}
	},


	processAnchorText : function( anchorText ) {
		anchorText = this.doTruncate( anchorText );

		return anchorText;
	},


	doTruncate : function( anchorText ) {
		var truncate = this.truncate;
		if( !truncate || !truncate.length ) return anchorText;

		var truncateLength = truncate.length,
			truncateLocation = truncate.location;

		if( truncateLocation === 'smart' ) {
			return Autolinker.truncate.TruncateSmart( anchorText, truncateLength );

		} else if( truncateLocation === 'middle' ) {
			return Autolinker.truncate.TruncateMiddle( anchorText, truncateLength );

		} else {
			return Autolinker.truncate.TruncateEnd( anchorText, truncateLength );
		}
	}

} );

Autolinker.htmlParser.HtmlParser = Autolinker.Util.extend( Object, {

	htmlRegex : (function() {
		var commentTagRegex = /!--([\s\S]+?)--/,
		    tagNameRegex = /[0-9a-zA-Z][0-9a-zA-Z:]*/,
		    attrNameRegex = /[^\s"'>\/=\x00-\x1F\x7F]+/,   
		    attrValueRegex = /(?:"[^"]*?"|'[^']*?'|[^'"=<>`\s]+)/, 
		    nameEqualsValueRegex = attrNameRegex.source + '(?:\\s*=\\s*' + attrValueRegex.source + ')?';  

		return new RegExp( [
			'(?:',
				'<(!DOCTYPE)',  

					'(?:',
						'\\s+',  

						'(?:', nameEqualsValueRegex, '|', attrValueRegex.source + ')',
					')*',
				'>',
			')',

			'|',

			'(?:',
				'<(/)?',  
					'(?:',
						commentTagRegex.source,  

						'|',

						'(?:',
							'(' + tagNameRegex.source + ')',

							'\\s*/?',  
						')',

						'|',

						'(?:',
							'(' + tagNameRegex.source + ')',

							'\\s+',  

							'(?:',
								'(?:\\s+|\\b)',        
								nameEqualsValueRegex,  
							')*',

							'\\s*/?',  
						')',
					')',
				'>',
			')'
		].join( "" ), 'gi' );
	} )(),

	htmlCharacterEntitiesRegex: /(&nbsp;|&#160;|&lt;|&#60;|&gt;|&#62;|&quot;|&#34;|&#39;)/gi,


	parse : function( html ) {
		var htmlRegex = this.htmlRegex,
		    currentResult,
		    lastIndex = 0,
		    textAndEntityNodes,
		    nodes = [];  

		while( ( currentResult = htmlRegex.exec( html ) ) !== null ) {
			var tagText = currentResult[ 0 ],
			    commentText = currentResult[ 3 ], 
			    tagName = currentResult[ 1 ] || currentResult[ 4 ] || currentResult[ 5 ],  
			    isClosingTag = !!currentResult[ 2 ],
			    offset = currentResult.index,
			    inBetweenTagsText = html.substring( lastIndex, offset );

			if( inBetweenTagsText ) {
				textAndEntityNodes = this.parseTextAndEntityNodes( lastIndex, inBetweenTagsText );
				nodes.push.apply( nodes, textAndEntityNodes );
			}

			if( commentText ) {
				nodes.push( this.createCommentNode( offset, tagText, commentText ) );
			} else {
				nodes.push( this.createElementNode( offset, tagText, tagName, isClosingTag ) );
			}

			lastIndex = offset + tagText.length;
		}

		if( lastIndex < html.length ) {
			var text = html.substring( lastIndex );

			if( text ) {
				textAndEntityNodes = this.parseTextAndEntityNodes( lastIndex, text );

				textAndEntityNodes.forEach( function( node ) {
					nodes.push( node );
				} );
			}
		}

		return nodes;
	},


	parseTextAndEntityNodes : function( offset, text ) {
		var nodes = [],
		    textAndEntityTokens = Autolinker.Util.splitAndCapture( text, this.htmlCharacterEntitiesRegex );  

		for( var i = 0, len = textAndEntityTokens.length; i < len; i += 2 ) {
			var textToken = textAndEntityTokens[ i ],
			    entityToken = textAndEntityTokens[ i + 1 ];

			if( textToken ) {
				nodes.push( this.createTextNode( offset, textToken ) );
				offset += textToken.length;
			}
			if( entityToken ) {
				nodes.push( this.createEntityNode( offset, entityToken ) );
				offset += entityToken.length;
			}
		}
		return nodes;
	},


	createCommentNode : function( offset, tagText, commentText ) {
		return new Autolinker.htmlParser.CommentNode( {
			offset : offset,
			text   : tagText,
			comment: Autolinker.Util.trim( commentText )
		} );
	},


	createElementNode : function( offset, tagText, tagName, isClosingTag ) {
		return new Autolinker.htmlParser.ElementNode( {
			offset  : offset,
			text    : tagText,
			tagName : tagName.toLowerCase(),
			closing : isClosingTag
		} );
	},


	createEntityNode : function( offset, text ) {
		return new Autolinker.htmlParser.EntityNode( { offset: offset, text: text } );
	},


	createTextNode : function( offset, text ) {
		return new Autolinker.htmlParser.TextNode( { offset: offset, text: text } );
	}

} );

Autolinker.htmlParser.HtmlNode = Autolinker.Util.extend( Object, {

	offset : undefined,

	text : undefined,


	constructor : function( cfg ) {
		Autolinker.Util.assign( this, cfg );

	},


	getType : Autolinker.Util.abstractMethod,


	getOffset : function() {
		return this.offset;
	},


	getText : function() {
		return this.text;
	}

} );
Autolinker.htmlParser.CommentNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {

	comment : '',


	getType : function() {
		return 'comment';
	},


	getComment : function() {
		return this.comment;
	}

} );
Autolinker.htmlParser.ElementNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {

	tagName : '',

	closing : false,


	getType : function() {
		return 'element';
	},


	getTagName : function() {
		return this.tagName;
	},


	isClosing : function() {
		return this.closing;
	}

} );
Autolinker.htmlParser.EntityNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {

	getType : function() {
		return 'entity';
	}

} );
Autolinker.htmlParser.TextNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {

	getType : function() {
		return 'text';
	}

} );
Autolinker.match.Match = Autolinker.Util.extend( Object, {

	constructor : function( cfg ) {

		this.tagBuilder = cfg.tagBuilder;
		this.matchedText = cfg.matchedText;
		this.offset = cfg.offset;
	},


	getType : Autolinker.Util.abstractMethod,


	getMatchedText : function() {
		return this.matchedText;
	},


	setOffset : function( offset ) {
		this.offset = offset;
	},


	getOffset : function() {
		return this.offset;
	},


	getAnchorHref : Autolinker.Util.abstractMethod,


	getAnchorText : Autolinker.Util.abstractMethod,


	getCssClassSuffixes : function() {
		return [ this.getType() ];
	},


	buildTag : function() {
		return this.tagBuilder.build( this );
	}

} );

Autolinker.match.Email = Autolinker.Util.extend( Autolinker.match.Match, {

	constructor : function( cfg ) {
		Autolinker.match.Match.prototype.constructor.call( this, cfg );


		this.email = cfg.email;
	},


	getType : function() {
		return 'email';
	},


	getEmail : function() {
		return this.email;
	},


	getAnchorHref : function() {
		return 'mailto:' + this.email;
	},


	getAnchorText : function() {
		return this.email;
	}

} );
Autolinker.match.Hashtag = Autolinker.Util.extend( Autolinker.match.Match, {

	constructor : function( cfg ) {
		Autolinker.match.Match.prototype.constructor.call( this, cfg );


		this.serviceName = cfg.serviceName;
		this.hashtag = cfg.hashtag;
	},


	getType : function() {
		return 'hashtag';
	},


	getServiceName : function() {
		return this.serviceName;
	},


	getHashtag : function() {
		return this.hashtag;
	},


	getAnchorHref : function() {
		var serviceName = this.serviceName,
		    hashtag = this.hashtag;

		switch( serviceName ) {
			case 'twitter' :
				return 'https://twitter.com/hashtag/' + hashtag;
			case 'facebook' :
				return 'https://www.facebook.com/hashtag/' + hashtag;
			case 'instagram' :
				return 'https://instagram.com/explore/tags/' + hashtag;

			default :  
				throw new Error( 'Unknown service name to point hashtag to: ', serviceName );
		}
	},


	getAnchorText : function() {
		return '#' + this.hashtag;
	}

} );

Autolinker.match.Phone = Autolinker.Util.extend( Autolinker.match.Match, {

	constructor : function( cfg ) {
		Autolinker.match.Match.prototype.constructor.call( this, cfg );


		this.number = cfg.number;
		this.plusSign = cfg.plusSign;
	},


	getType : function() {
		return 'phone';
	},


	getNumber: function() {
		return this.number;
	},


	getAnchorHref : function() {
		return 'tel:' + ( this.plusSign ? '+' : '' ) + this.number;
	},


	getAnchorText : function() {
		return this.matchedText;
	}

} );

Autolinker.match.Mention = Autolinker.Util.extend( Autolinker.match.Match, {

	constructor : function( cfg ) {
		Autolinker.match.Match.prototype.constructor.call( this, cfg );


		this.mention = cfg.mention;
		this.serviceName = cfg.serviceName;
	},


	getType : function() {
		return 'mention';
	},


	getMention : function() {
		return this.mention;
	},


	getServiceName : function() {
		return this.serviceName;
	},


	getAnchorHref : function() {
		switch( this.serviceName ) {
			case 'twitter' :
				return 'https://twitter.com/' + this.mention;
			case 'instagram' :
				return 'https://instagram.com/' + this.mention;

			default :  
				throw new Error( 'Unknown service name to point mention to: ', this.serviceName );
		}
	},


	getAnchorText : function() {
		return '@' + this.mention;
	},


	getCssClassSuffixes : function() {
		var cssClassSuffixes = Autolinker.match.Match.prototype.getCssClassSuffixes.call( this ),
		    serviceName = this.getServiceName();

		if( serviceName ) {
			cssClassSuffixes.push( serviceName );
		}
		return cssClassSuffixes;
	}

} );

Autolinker.match.Url = Autolinker.Util.extend( Autolinker.match.Match, {

	constructor : function( cfg ) {
		Autolinker.match.Match.prototype.constructor.call( this, cfg );


		this.urlMatchType = cfg.urlMatchType;
		this.url = cfg.url;
		this.protocolUrlMatch = cfg.protocolUrlMatch;
		this.protocolRelativeMatch = cfg.protocolRelativeMatch;
		this.stripPrefix = cfg.stripPrefix;
		this.stripTrailingSlash = cfg.stripTrailingSlash;
	},


	schemePrefixRegex: /^(https?:\/\/)?/i,

	wwwPrefixRegex: /^(https?:\/\/)?(www\.)?/i,

	protocolRelativeRegex : /^\/\//,

	protocolPrepended : false,


	getType : function() {
		return 'url';
	},


	getUrlMatchType : function() {
		return this.urlMatchType;
	},


	getUrl : function() {
		var url = this.url;

		if( !this.protocolRelativeMatch && !this.protocolUrlMatch && !this.protocolPrepended ) {
			url = this.url = 'http://' + url;

			this.protocolPrepended = true;
		}

		return url;
	},


	getAnchorHref : function() {
		var url = this.getUrl();

		return url.replace( /&amp;/g, '&' );  
	},


	getAnchorText : function() {
		var anchorText = this.getMatchedText();

		if( this.protocolRelativeMatch ) {
			anchorText = this.stripProtocolRelativePrefix( anchorText );
		}
		if( this.stripPrefix.scheme ) {
			anchorText = this.stripSchemePrefix( anchorText );
		}
		if( this.stripPrefix.www ) {
			anchorText = this.stripWwwPrefix( anchorText );
		}
		if( this.stripTrailingSlash ) {
			anchorText = this.removeTrailingSlash( anchorText );  
		}

		return anchorText;
	},


	stripSchemePrefix : function( url ) {
		return url.replace( this.schemePrefixRegex, '' );
	},


	stripWwwPrefix : function( url ) {
		return url.replace( this.wwwPrefixRegex, '$1' );  
	},


	stripProtocolRelativePrefix : function( text ) {
		return text.replace( this.protocolRelativeRegex, '' );
	},


	removeTrailingSlash : function( anchorText ) {
		if( anchorText.charAt( anchorText.length - 1 ) === '/' ) {
			anchorText = anchorText.slice( 0, -1 );
		}
		return anchorText;
	}

} );
Autolinker.tldRegex = /(?:\u0b9a\u0bbf\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd|\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629|\u043a\u0430\u0442\u043e\u043b\u0438\u043a|\u0627\u0644\u062c\u0632\u0627\u0626\u0631|\u0627\u0644\u0639\u0644\u064a\u0627\u0646|\u0643\u0627\u062b\u0648\u0644\u064a\u0643|\u0645\u0648\u0628\u0627\u064a\u0644\u064a|\u067e\u0627\u06a9\u0633\u062a\u0627\u0646|\u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf\u0bbe|\u043c\u043e\u0441\u043a\u0432\u0430|\u043e\u043d\u043b\u0430\u0439\u043d|\u0627\u0628\u0648\u0638\u0628\u064a|\u0627\u0631\u0627\u0645\u0643\u0648|\u0627\u0644\u0627\u0631\u062f\u0646|\u0627\u0644\u0645\u063a\u0631\u0628|\u0627\u0645\u0627\u0631\u0627\u062a|\u0641\u0644\u0633\u0637\u064a\u0646|\u0645\u0644\u064a\u0633\u064a\u0627|\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8|\u30d5\u30a1\u30c3\u30b7\u30e7\u30f3|\u0627\u06cc\u0631\u0627\u0646|\u0628\u0627\u0632\u0627\u0631|\u0628\u06be\u0627\u0631\u062a|\u0633\u0648\u062f\u0627\u0646|\u0633\u0648\u0631\u064a\u0629|\u0647\u0645\u0631\u0627\u0647|\u0938\u0902\u0917\u0920\u0928|\u09ac\u09be\u0982\u09b2\u09be|\u0c2d\u0c3e\u0c30\u0c24\u0c4d|\u5609\u91cc\u5927\u9152\u5e97|\u0434\u0435\u0442\u0438|\u0441\u0430\u0439\u0442|\u0628\u064a\u062a\u0643|\u062a\u0648\u0646\u0633|\u0634\u0628\u0643\u0629|\u0639\u0631\u0627\u0642|\u0639\u0645\u0627\u0646|\u0645\u0648\u0642\u0639|\u092d\u093e\u0930\u0924|\u09ad\u09be\u09b0\u09a4|\u0a2d\u0a3e\u0a30\u0a24|\u0aad\u0abe\u0ab0\u0aa4|\u0dbd\u0d82\u0d9a\u0dcf|\u30af\u30e9\u30a6\u30c9|\u30b0\u30fc\u30b0\u30eb|\u30dd\u30a4\u30f3\u30c8|\u5927\u4f17\u6c7d\u8f66|\u7ec4\u7ec7\u673a\u6784|\u96fb\u8a0a\u76c8\u79d1|\u9999\u683c\u91cc\u62c9|xn--vermgensberatung-pwb|xn--vermgensberater-ctb|verm\u00f6gensberatung|xn--clchc0ea0b2g2a9gcd|verm\u00f6gensberater|xn--w4r85el8fhu5dnra|\u0431\u0435\u043b|\u043a\u043e\u043c|\u043c\u043a\u0434|\u043c\u043e\u043d|\u043e\u0440\u0433|\u0440\u0443\u0441|\u0441\u0440\u0431|\u0443\u043a\u0440|\u049b\u0430\u0437|\u0570\u0561\u0575|\u05e7\u05d5\u05dd|\u0642\u0637\u0631|\u0643\u0648\u0645|\u0645\u0635\u0631|\u0915\u0949\u092e|\u0928\u0947\u091f|\u0e04\u0e2d\u0e21|\u0e44\u0e17\u0e22|\u307f\u3093\u306a|\u30b9\u30c8\u30a2|\u30bb\u30fc\u30eb|\u4e2d\u6587\u7f51|\u5929\u4e3b\u6559|\u6211\u7231\u4f60|\u65b0\u52a0\u5761|\u6de1\u9a6c\u9521|\u8bfa\u57fa\u4e9a|\u98de\u5229\u6d66|northwesternmutual|travelersinsurance|xn--3oq18vl8pn36a|xn--5su34j936bgsg|xn--bck1b9a5dre4c|xn--mgbai9azgqp6j|xn--mgberp4a5d4ar|xn--xkc2dl3a5ee0h|xn--fzys8d69uvgm|xn--mgba7c0bbn0a|xn--xkc2al3hye2a|americanexpress|kerryproperties|sandvikcoromant|xn--i1b6b1a6a2e|xn--kcrx77d1x4a|xn--lgbbat1ad8j|xn--mgba3a4f16a|xn--mgbc0a9azcg|xn--nqv7fs00ema|afamilycompany|americanfamily|bananarepublic|cancerresearch|cookingchannel|kerrylogistics|weatherchannel|xn--54b7fta0cc|xn--6qq986b3xl|xn--80aqecdr1a|xn--b4w605ferd|xn--fiq228c5hs|xn--jlq61u9w7b|xn--mgba3a3ejt|xn--mgbaam7a8h|xn--mgbayh7gpa|xn--mgbb9fbpob|xn--mgbbh1a71e|xn--mgbca7dzdo|xn--mgbi4ecexp|xn--mgbx4cd0ab|international|lifeinsurance|spreadbetting|travelchannel|wolterskluwer|xn--eckvdtc9d|xn--fpcrj9c3d|xn--fzc2c9e2c|xn--tiq49xqyj|xn--yfro4i67o|xn--ygbi2ammx|\u03b5\u03bb|\u0431\u0433|\u0435\u044e|\u0440\u0444|\u10d2\u10d4|\u30b3\u30e0|\u4e16\u754c|\u4e2d\u4fe1|\u4e2d\u56fd|\u4e2d\u570b|\u4f01\u4e1a|\u4f5b\u5c71|\u4fe1\u606f|\u5065\u5eb7|\u516b\u5366|\u516c\u53f8|\u516c\u76ca|\u53f0\u6e7e|\u53f0\u7063|\u5546\u57ce|\u5546\u5e97|\u5546\u6807|\u5609\u91cc|\u5728\u7ebf|\u5927\u62ff|\u5a31\u4e50|\u5bb6\u96fb|\u5de5\u884c|\u5e7f\u4e1c|\u5fae\u535a|\u6148\u5584|\u624b\u673a|\u624b\u8868|\u653f\u52a1|\u653f\u5e9c|\u65b0\u95fb|\u65f6\u5c1a|\u66f8\u7c4d|\u673a\u6784|\u6e38\u620f|\u6fb3\u9580|\u70b9\u770b|\u73e0\u5b9d|\u79fb\u52a8|\u7f51\u5740|\u7f51\u5e97|\u7f51\u7ad9|\u7f51\u7edc|\u8054\u901a|\u8c37\u6b4c|\u8d2d\u7269|\u901a\u8ca9|\u96c6\u56e2|\u98df\u54c1|\u9910\u5385|\u9999\u6e2f|\ub2f7\ub137|\ub2f7\ucef4|\uc0bc\uc131|\ud55c\uad6d|construction|lplfinancial|pamperedchef|scholarships|versicherung|xn--3e0b707e|xn--80adxhks|xn--80asehdb|xn--8y0a063a|xn--gckr3f0f|xn--mgb9awbf|xn--mgbab2bd|xn--mgbpl2fh|xn--mgbt3dhd|xn--mk1bu44c|xn--ngbc5azd|xn--ngbe9e0a|xn--ogbpf8fl|xn--qcka1pmc|accountants|barclaycard|blackfriday|blockbuster|bridgestone|calvinklein|contractors|creditunion|engineering|enterprises|foodnetwork|investments|kerryhotels|lamborghini|motorcycles|olayangroup|photography|playstation|productions|progressive|redumbrella|rightathome|williamhill|xn--11b4c3d|xn--1ck2e1b|xn--1qqw23a|xn--3bst00m|xn--3ds443g|xn--42c2d9a|xn--45brj9c|xn--55qw42g|xn--6frz82g|xn--80ao21a|xn--9krt00a|xn--cck2b3b|xn--czr694b|xn--d1acj3b|xn--efvy88h|xn--estv75g|xn--fct429k|xn--fjq720a|xn--flw351e|xn--g2xx48c|xn--gecrj9c|xn--gk3at1e|xn--h2brj9c|xn--hxt814e|xn--imr513n|xn--j6w193g|xn--jvr189m|xn--kprw13d|xn--kpry57d|xn--kpu716f|xn--mgbtx2b|xn--mix891f|xn--nyqy26a|xn--pbt977c|xn--pgbs0dh|xn--q9jyb4c|xn--rhqv96g|xn--rovu88b|xn--s9brj9c|xn--ses554g|xn--t60b56a|xn--vuq861b|xn--w4rs40l|xn--xhq521b|xn--zfr164b|accountant|apartments|associates|basketball|bnpparibas|boehringer|capitalone|consulting|creditcard|cuisinella|eurovision|extraspace|foundation|healthcare|immobilien|industries|management|mitsubishi|nationwide|newholland|nextdirect|onyourside|properties|protection|prudential|realestate|republican|restaurant|schaeffler|swiftcover|tatamotors|technology|telefonica|university|vistaprint|vlaanderen|volkswagen|xn--30rr7y|xn--3pxu8k|xn--45q11c|xn--4gbrim|xn--55qx5d|xn--5tzm5g|xn--80aswg|xn--90a3ac|xn--9dbq2a|xn--9et52u|xn--c2br7g|xn--cg4bki|xn--czrs0t|xn--czru2d|xn--fiq64b|xn--fiqs8s|xn--fiqz9s|xn--io0a7i|xn--kput3i|xn--mxtq1m|xn--o3cw4h|xn--pssy2u|xn--unup4y|xn--wgbh1c|xn--wgbl6a|xn--y9a3aq|accenture|alfaromeo|allfinanz|amsterdam|analytics|aquarelle|barcelona|bloomberg|christmas|community|directory|education|equipment|fairwinds|financial|firestone|fresenius|frontdoor|fujixerox|furniture|goldpoint|goodhands|hisamitsu|homedepot|homegoods|homesense|honeywell|institute|insurance|kuokgroup|ladbrokes|lancaster|landrover|lifestyle|marketing|marshalls|mcdonalds|melbourne|microsoft|montblanc|panasonic|passagens|pramerica|richardli|scjohnson|shangrila|solutions|statebank|statefarm|stockholm|travelers|vacations|xn--90ais|xn--c1avg|xn--d1alf|xn--e1a4c|xn--fhbei|xn--j1aef|xn--j1amh|xn--l1acc|xn--nqv7f|xn--p1acf|xn--tckwe|xn--vhquv|yodobashi|abudhabi|airforce|allstate|attorney|barclays|barefoot|bargains|baseball|boutique|bradesco|broadway|brussels|budapest|builders|business|capetown|catering|catholic|chrysler|cipriani|cityeats|cleaning|clinique|clothing|commbank|computer|delivery|deloitte|democrat|diamonds|discount|discover|download|engineer|ericsson|esurance|everbank|exchange|feedback|fidelity|firmdale|football|frontier|goodyear|grainger|graphics|guardian|hdfcbank|helsinki|holdings|hospital|infiniti|ipiranga|istanbul|jpmorgan|lighting|lundbeck|marriott|maserati|mckinsey|memorial|mortgage|movistar|observer|partners|pharmacy|pictures|plumbing|property|redstone|reliance|saarland|samsclub|security|services|shopping|showtime|softbank|software|stcgroup|supplies|symantec|telecity|training|uconnect|vanguard|ventures|verisign|woodside|xn--90ae|xn--node|xn--p1ai|xn--qxam|yokohama|abogado|academy|agakhan|alibaba|android|athleta|auction|audible|auspost|avianca|banamex|bauhaus|bentley|bestbuy|booking|brother|bugatti|capital|caravan|careers|cartier|channel|chintai|citadel|clubmed|college|cologne|comcast|company|compare|contact|cooking|corsica|country|coupons|courses|cricket|cruises|dentist|digital|domains|exposed|express|farmers|fashion|ferrari|ferrero|finance|fishing|fitness|flights|florist|flowers|forsale|frogans|fujitsu|gallery|genting|godaddy|guitars|hamburg|hangout|hitachi|holiday|hosting|hoteles|hotmail|hyundai|iselect|ismaili|jewelry|juniper|kitchen|komatsu|lacaixa|lancome|lanxess|lasalle|latrobe|leclerc|liaison|limited|lincoln|markets|metlife|monster|netbank|netflix|network|neustar|okinawa|oldnavy|organic|origins|panerai|philips|pioneer|politie|realtor|recipes|rentals|reviews|rexroth|samsung|sandvik|schmidt|schwarz|science|shiksha|shriram|singles|spiegel|staples|starhub|statoil|storage|support|surgery|systems|temasek|theater|theatre|tickets|tiffany|toshiba|trading|walmart|wanggou|watches|weather|website|wedding|whoswho|windows|winners|xfinity|yamaxun|youtube|zuerich|abarth|abbott|abbvie|active|africa|agency|airbus|airtel|alipay|alsace|alstom|anquan|aramco|author|bayern|beauty|berlin|bharti|blanco|bostik|boston|broker|camera|career|caseih|casino|center|chanel|chrome|church|circle|claims|clinic|coffee|comsec|condos|coupon|credit|cruise|dating|datsun|dealer|degree|dental|design|direct|doctor|dunlop|dupont|durban|emerck|energy|estate|events|expert|family|flickr|futbol|gallup|garden|george|giving|global|google|gratis|health|hermes|hiphop|hockey|hotels|hughes|imamat|insure|intuit|jaguar|joburg|juegos|kaufen|kinder|kindle|kosher|lancia|latino|lawyer|lefrak|living|locker|london|luxury|madrid|maison|makeup|market|mattel|mobile|mobily|monash|mormon|moscow|museum|mutual|nagoya|natura|nissan|nissay|norton|nowruz|office|olayan|online|oracle|orange|otsuka|pfizer|photos|physio|piaget|pictet|quebec|racing|realty|reisen|repair|report|review|rocher|rogers|ryukyu|safety|sakura|sanofi|school|schule|secure|select|shouji|soccer|social|stream|studio|supply|suzuki|swatch|sydney|taipei|taobao|target|tattoo|tennis|tienda|tjmaxx|tkmaxx|toyota|travel|unicom|viajes|viking|villas|virgin|vision|voting|voyage|vuelos|walter|warman|webcam|xihuan|xperia|yachts|yandex|zappos|actor|adult|aetna|amfam|amica|apple|archi|audio|autos|azure|baidu|beats|bible|bingo|black|boats|boots|bosch|build|canon|cards|chase|cheap|chloe|cisco|citic|click|cloud|coach|codes|crown|cymru|dabur|dance|deals|delta|dodge|drive|dubai|earth|edeka|email|epost|epson|faith|fedex|final|forex|forum|gallo|games|gifts|gives|glade|glass|globo|gmail|green|gripe|group|gucci|guide|homes|honda|horse|house|hyatt|ikano|intel|irish|iveco|jetzt|koeln|kyoto|lamer|lease|legal|lexus|lilly|linde|lipsy|lixil|loans|locus|lotte|lotto|lupin|macys|mango|media|miami|money|mopar|movie|nadex|nexus|nikon|ninja|nokia|nowtv|omega|osaka|paris|parts|party|phone|photo|pizza|place|poker|praxi|press|prime|promo|quest|radio|rehab|reise|ricoh|rocks|rodeo|rugby|salon|sener|seven|sharp|shell|shoes|skype|sling|smart|smile|solar|space|stada|store|study|style|sucks|swiss|tatar|tires|tirol|tmall|today|tokyo|tools|toray|total|tours|trade|trust|tunes|tushu|ubank|vegas|video|vista|vodka|volvo|wales|watch|weber|weibo|works|world|xerox|yahoo|zippo|aarp|able|adac|aero|aigo|akdn|ally|amex|army|arpa|arte|asda|asia|audi|auto|baby|band|bank|bbva|beer|best|bike|bing|blog|blue|bofa|bond|book|buzz|cafe|call|camp|care|cars|casa|case|cash|cbre|cern|chat|citi|city|club|cool|coop|cyou|data|date|dclk|deal|dell|desi|diet|dish|docs|doha|duck|duns|dvag|erni|fage|fail|fans|farm|fast|fiat|fido|film|fire|fish|flir|food|ford|free|fund|game|gbiz|gent|ggee|gift|gmbh|gold|golf|goog|guge|guru|hair|haus|hdfc|help|here|hgtv|host|hsbc|icbc|ieee|imdb|immo|info|itau|java|jeep|jobs|jprs|kddi|kiwi|kpmg|kred|land|lego|lgbt|lidl|life|like|limo|link|live|loan|loft|love|ltda|luxe|maif|meet|meme|menu|mini|mint|mobi|moda|moto|mtpc|name|navy|news|next|nico|nike|ollo|open|page|pars|pccw|pics|ping|pink|play|plus|pohl|porn|post|prod|prof|qpon|raid|read|reit|rent|rest|rich|rmit|room|rsvp|ruhr|safe|sale|sapo|sarl|save|saxo|scor|scot|seat|seek|sexy|shaw|shia|shop|show|silk|sina|site|skin|sncf|sohu|song|sony|spot|star|surf|talk|taxi|team|tech|teva|tiaa|tips|town|toys|tube|vana|visa|viva|vivo|vote|voto|wang|weir|wien|wiki|wine|work|xbox|yoga|zara|zero|zone|aaa|abb|abc|aco|ads|aeg|afl|aig|anz|aol|app|art|aws|axa|bar|bbc|bbt|bcg|bcn|bet|bid|bio|biz|bms|bmw|bnl|bom|boo|bot|box|buy|bzh|cab|cal|cam|car|cat|cba|cbn|cbs|ceb|ceo|cfa|cfd|com|crs|csc|dad|day|dds|dev|dhl|diy|dnp|dog|dot|dtv|dvr|eat|eco|edu|esq|eus|fan|fit|fly|foo|fox|frl|ftr|fun|fyi|gal|gap|gdn|gea|gle|gmo|gmx|goo|gop|got|gov|hbo|hiv|hkt|hot|how|htc|ibm|ice|icu|ifm|ing|ink|int|ist|itv|iwc|jcb|jcp|jio|jlc|jll|jmp|jnj|jot|joy|kfh|kia|kim|kpn|krd|lat|law|lds|lol|lpl|ltd|man|mba|mcd|med|men|meo|mil|mit|mlb|mls|mma|moe|moi|mom|mov|msd|mtn|mtr|nab|nba|nec|net|new|nfl|ngo|nhk|now|nra|nrw|ntt|nyc|obi|off|one|ong|onl|ooo|org|ott|ovh|pay|pet|pid|pin|pnc|pro|pru|pub|pwc|qvc|red|ren|ril|rio|rip|run|rwe|sap|sas|sbi|sbs|sca|scb|ses|sew|sex|sfr|ski|sky|soy|srl|srt|stc|tab|tax|tci|tdk|tel|thd|tjx|top|trv|tui|tvs|ubs|uno|uol|ups|vet|vig|vin|vip|wed|win|wme|wow|wtc|wtf|xin|xxx|xyz|you|yun|zip|ac|ad|ae|af|ag|ai|al|am|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)/;

Autolinker.matcher.Matcher = Autolinker.Util.extend( Object, {

	constructor : function( cfg ) {

		this.tagBuilder = cfg.tagBuilder;
	},


	parseMatches : Autolinker.Util.abstractMethod

} );
Autolinker.matcher.Email = Autolinker.Util.extend( Autolinker.matcher.Matcher, {

	matcherRegex : (function() {
		var alphaNumericChars = Autolinker.RegexLib.alphaNumericCharsStr,
		    emailRegex = new RegExp( '[' + alphaNumericChars + '\\-_\';:&=+$.,]+@' ),  
			domainNameRegex = Autolinker.RegexLib.domainNameRegex,
			tldRegex = Autolinker.tldRegex;  

		return new RegExp( [
			emailRegex.source,
			domainNameRegex.source,
			'\\.', tldRegex.source   
		].join( "" ), 'gi' );
	} )(),


	parseMatches : function( text ) {
		var matcherRegex = this.matcherRegex,
		    tagBuilder = this.tagBuilder,
		    matches = [],
		    match;

		while( ( match = matcherRegex.exec( text ) ) !== null ) {
			var matchedText = match[ 0 ];

			matches.push( new Autolinker.match.Email( {
				tagBuilder  : tagBuilder,
				matchedText : matchedText,
				offset      : match.index,
				email       : matchedText
			} ) );
		}

		return matches;
	}

} );

Autolinker.matcher.Hashtag = Autolinker.Util.extend( Autolinker.matcher.Matcher, {

	matcherRegex : new RegExp( '#[_' + Autolinker.RegexLib.alphaNumericCharsStr + ']{1,139}', 'g' ),

	nonWordCharRegex : new RegExp( '[^' + Autolinker.RegexLib.alphaNumericCharsStr + ']' ),


	constructor : function( cfg ) {
		Autolinker.matcher.Matcher.prototype.constructor.call( this, cfg );

		this.serviceName = cfg.serviceName;
	},


	parseMatches : function( text ) {
		var matcherRegex = this.matcherRegex,
		    nonWordCharRegex = this.nonWordCharRegex,
		    serviceName = this.serviceName,
		    tagBuilder = this.tagBuilder,
		    matches = [],
		    match;

		while( ( match = matcherRegex.exec( text ) ) !== null ) {
			var offset = match.index,
			    prevChar = text.charAt( offset - 1 );

			if( offset === 0 || nonWordCharRegex.test( prevChar ) ) {
				var matchedText = match[ 0 ],
				    hashtag = match[ 0 ].slice( 1 );  

				matches.push( new Autolinker.match.Hashtag( {
					tagBuilder  : tagBuilder,
					matchedText : matchedText,
					offset      : offset,
					serviceName : serviceName,
					hashtag     : hashtag
				} ) );
			}
		}

		return matches;
	}

} );
Autolinker.matcher.Phone = Autolinker.Util.extend( Autolinker.matcher.Matcher, {

    matcherRegex : /(?:(\+)?\d{1,3}[-\040.]?)?\(?\d{3}\)?[-\040.]?\d{3}[-\040.]?\d{4}([,;]*[0-9]+#?)*/g,    

	parseMatches: function(text) {
		var matcherRegex = this.matcherRegex,
			tagBuilder = this.tagBuilder,
			matches = [],
			match;

		while ((match = matcherRegex.exec(text)) !== null) {
			var matchedText = match[0],
				cleanNumber = matchedText.replace(/[^0-9,;#]/g, ''), 
				plusSign = !!match[1]; 
			if (this.testMatch(match[2]) && this.testMatch(matchedText)) {
    			matches.push(new Autolinker.match.Phone({
    				tagBuilder: tagBuilder,
    				matchedText: matchedText,
    				offset: match.index,
    				number: cleanNumber,
    				plusSign: plusSign
    			}));
            }
		}

		return matches;
	},

	testMatch: function(text) {
		return /\D/.test(text);
	}

} );

Autolinker.matcher.Mention = Autolinker.Util.extend( Autolinker.matcher.Matcher, {

	matcherRegexes : {
		"twitter": new RegExp( '@[_' + Autolinker.RegexLib.alphaNumericCharsStr + ']{1,20}', 'g' ),
		"instagram": new RegExp( '@[_.' + Autolinker.RegexLib.alphaNumericCharsStr + ']{1,50}', 'g' )
	},

	nonWordCharRegex : new RegExp( '[^' + Autolinker.RegexLib.alphaNumericCharsStr + ']' ),


	constructor : function( cfg ) {
		Autolinker.matcher.Matcher.prototype.constructor.call( this, cfg );

		this.serviceName = cfg.serviceName;
	},


	parseMatches : function( text ) {
		var matcherRegex = this.matcherRegexes[this.serviceName],
		    nonWordCharRegex = this.nonWordCharRegex,
		    serviceName = this.serviceName,
		    tagBuilder = this.tagBuilder,
		    matches = [],
		    match;

		if (!matcherRegex) {
			return matches;
		}

		while( ( match = matcherRegex.exec( text ) ) !== null ) {
			var offset = match.index,
			    prevChar = text.charAt( offset - 1 );

			if( offset === 0 || nonWordCharRegex.test( prevChar ) ) {
				var matchedText = match[ 0 ].replace(/\.+$/g, ''), 
				    mention = matchedText.slice( 1 );  

				matches.push( new Autolinker.match.Mention( {
					tagBuilder    : tagBuilder,
					matchedText   : matchedText,
					offset        : offset,
					serviceName   : serviceName,
					mention       : mention
				} ) );
			}
		}

		return matches;
	}

} );

Autolinker.matcher.Url = Autolinker.Util.extend( Autolinker.matcher.Matcher, {

	matcherRegex : (function() {
		var schemeRegex = /(?:[A-Za-z][-.+A-Za-z0-9]*:(?![A-Za-z][-.+A-Za-z0-9]*:\/\/)(?!\d+\/?)(?:\/\/)?)/,  
		    wwwRegex = /(?:www\.)/,                  
		    domainNameRegex = Autolinker.RegexLib.domainNameRegex,
		    tldRegex = Autolinker.tldRegex,  
		    alphaNumericCharsStr = Autolinker.RegexLib.alphaNumericCharsStr,

		    urlSuffixRegex = new RegExp( '[/?#](?:[' + alphaNumericCharsStr + '\\-+&@#/%=~_()|\'$*\\[\\]?!:,.;\u2713]*[' + alphaNumericCharsStr + '\\-+&@#/%=~_()|\'$*\\[\\]\u2713])?' );

		return new RegExp( [
			'(?:', 
				'(',  
					schemeRegex.source,
					domainNameRegex.source,
				')',

				'|',

				'(',  
					'(//)?',  
					wwwRegex.source,
					domainNameRegex.source,
				')',

				'|',

				'(',  
					'(//)?',  
					domainNameRegex.source + '\\.',
					tldRegex.source,
					'(?![-' + alphaNumericCharsStr + '])', 
				')',
			')',

			'(?::[0-9]+)?', 

			'(?:' + urlSuffixRegex.source + ')?'  
		].join( "" ), 'gi' );
	} )(),


	wordCharRegExp : new RegExp( '[' + Autolinker.RegexLib.alphaNumericCharsStr + ']' ),


	openParensRe : /\(/g,

	closeParensRe : /\)/g,


	constructor : function( cfg ) {
		Autolinker.matcher.Matcher.prototype.constructor.call( this, cfg );


		this.stripPrefix = cfg.stripPrefix;
		this.stripTrailingSlash = cfg.stripTrailingSlash;
	},


	parseMatches : function( text ) {
		var matcherRegex = this.matcherRegex,
		    stripPrefix = this.stripPrefix,
		    stripTrailingSlash = this.stripTrailingSlash,
		    tagBuilder = this.tagBuilder,
		    matches = [],
		    match;

		while( ( match = matcherRegex.exec( text ) ) !== null ) {
			var matchStr = match[ 0 ],
			    schemeUrlMatch = match[ 1 ],
			    wwwUrlMatch = match[ 2 ],
			    wwwProtocolRelativeMatch = match[ 3 ],
			    tldProtocolRelativeMatch = match[ 5 ],
			    offset = match.index,
			    protocolRelativeMatch = wwwProtocolRelativeMatch || tldProtocolRelativeMatch,
				prevChar = text.charAt( offset - 1 );

			if( !Autolinker.matcher.UrlMatchValidator.isValid( matchStr, schemeUrlMatch ) ) {
				continue;
			}

			if( offset > 0 && prevChar === '@' ) {
				continue;
			}

			if( offset > 0 && protocolRelativeMatch && this.wordCharRegExp.test( prevChar ) ) {
				continue;
			}

			if( /\?$/.test(matchStr) ) {
				matchStr = matchStr.substr(0, matchStr.length-1);
			}

			if( this.matchHasUnbalancedClosingParen( matchStr ) ) {
				matchStr = matchStr.substr( 0, matchStr.length - 1 );  
			} else {
				var pos = this.matchHasInvalidCharAfterTld( matchStr, schemeUrlMatch );
				if( pos > -1 ) {
					matchStr = matchStr.substr( 0, pos ); 
				}
			}

			var urlMatchType = schemeUrlMatch ? 'scheme' : ( wwwUrlMatch ? 'www' : 'tld' ),
			    protocolUrlMatch = !!schemeUrlMatch;

			matches.push( new Autolinker.match.Url( {
				tagBuilder            : tagBuilder,
				matchedText           : matchStr,
				offset                : offset,
				urlMatchType          : urlMatchType,
				url                   : matchStr,
				protocolUrlMatch      : protocolUrlMatch,
				protocolRelativeMatch : !!protocolRelativeMatch,
				stripPrefix           : stripPrefix,
				stripTrailingSlash    : stripTrailingSlash
			} ) );
		}

		return matches;
	},


	matchHasUnbalancedClosingParen : function( matchStr ) {
		var lastChar = matchStr.charAt( matchStr.length - 1 );

		if( lastChar === ')' ) {
			var openParensMatch = matchStr.match( this.openParensRe ),
			    closeParensMatch = matchStr.match( this.closeParensRe ),
			    numOpenParens = ( openParensMatch && openParensMatch.length ) || 0,
			    numCloseParens = ( closeParensMatch && closeParensMatch.length ) || 0;

			if( numOpenParens < numCloseParens ) {
				return true;
			}
		}

		return false;
	},


	matchHasInvalidCharAfterTld : function( urlMatch, schemeUrlMatch ) {
		if( !urlMatch ) {
			return -1;
		}

		var offset = 0;
		if ( schemeUrlMatch ) {
			offset = urlMatch.indexOf(':');
			urlMatch = urlMatch.slice(offset);
		}

		var alphaNumeric = Autolinker.RegexLib.alphaNumericCharsStr;

		var re = new RegExp("^((.?\/\/)?[-." + alphaNumeric + "]*[-" + alphaNumeric + "]\\.[-" + alphaNumeric + "]+)");
		var res = re.exec( urlMatch );
		if ( res === null ) {
			return -1;
		}

		offset += res[1].length;
		urlMatch = urlMatch.slice(res[1].length);
		if (/^[^-.A-Za-z0-9:\/?#]/.test(urlMatch)) {
			return offset;
		}

		return -1;
	}

} );

Autolinker.matcher.UrlMatchValidator = {

	hasFullProtocolRegex : /^[A-Za-z][-.+A-Za-z0-9]*:\/\//,

	uriSchemeRegex : /^[A-Za-z][-.+A-Za-z0-9]*:/,

	hasWordCharAfterProtocolRegex : new RegExp(":[^\\s]*?[" + Autolinker.RegexLib.alphaCharsStr + "]"),

	ipRegex: /[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?(:[0-9]*)?\/?$/,

	isValid : function( urlMatch, protocolUrlMatch ) {
		if(
			( protocolUrlMatch && !this.isValidUriScheme( protocolUrlMatch ) ) ||
			this.urlMatchDoesNotHaveProtocolOrDot( urlMatch, protocolUrlMatch ) ||    
			(this.urlMatchDoesNotHaveAtLeastOneWordChar( urlMatch, protocolUrlMatch ) && 
			   !this.isValidIpAddress( urlMatch )) || 
			this.containsMultipleDots( urlMatch )
		) {
			return false;
		}

		return true;
	},


	isValidIpAddress : function ( uriSchemeMatch ) {
		var newRegex = new RegExp(this.hasFullProtocolRegex.source + this.ipRegex.source);
		var uriScheme = uriSchemeMatch.match( newRegex );

		return uriScheme !== null;
	},

	containsMultipleDots : function ( urlMatch ) {
		return urlMatch.indexOf("..") > -1;
	},

	isValidUriScheme : function( uriSchemeMatch ) {
		var uriScheme = uriSchemeMatch.match( this.uriSchemeRegex )[ 0 ].toLowerCase();

		return ( uriScheme !== 'javascript:' && uriScheme !== 'vbscript:' );
	},


	urlMatchDoesNotHaveProtocolOrDot : function( urlMatch, protocolUrlMatch ) {
		return ( !!urlMatch && ( !protocolUrlMatch || !this.hasFullProtocolRegex.test( protocolUrlMatch ) ) && urlMatch.indexOf( '.' ) === -1 );
	},


	urlMatchDoesNotHaveAtLeastOneWordChar : function( urlMatch, protocolUrlMatch ) {
		if( urlMatch && protocolUrlMatch ) {
			return !this.hasWordCharAfterProtocolRegex.test( urlMatch );
		} else {
			return false;
		}
	}

};

Autolinker.truncate.TruncateEnd = function(anchorText, truncateLen, ellipsisChars){
	return Autolinker.Util.ellipsis( anchorText, truncateLen, ellipsisChars );
};

Autolinker.truncate.TruncateMiddle = function(url, truncateLen, ellipsisChars){
  if (url.length <= truncateLen) {
    return url;
  }

  var ellipsisLengthBeforeParsing;
  var ellipsisLength;

  if(ellipsisChars == null) {
    ellipsisChars = '&hellip;';
    ellipsisLengthBeforeParsing = 8;
    ellipsisLength = 3;
  } else {
    ellipsisLengthBeforeParsing = ellipsisChars.length;
    ellipsisLength = ellipsisChars.length;
  }

  var availableLength = truncateLen - ellipsisLength;
  var end = "";
  if (availableLength > 0) {
    end = url.substr((-1)*Math.floor(availableLength/2));
  }
  return (url.substr(0, Math.ceil(availableLength/2)) + ellipsisChars + end).substr(0, availableLength + ellipsisLengthBeforeParsing);
};

Autolinker.truncate.TruncateSmart = function(url, truncateLen, ellipsisChars){

	var ellipsisLengthBeforeParsing;
	var ellipsisLength;

	if(ellipsisChars == null) {
		ellipsisChars = '&hellip;';
		ellipsisLength = 3;
		ellipsisLengthBeforeParsing = 8;
	} else {
		ellipsisLength = ellipsisChars.length;
		ellipsisLengthBeforeParsing = ellipsisChars.length;
	}

	var parse_url = function(url){ 
		var urlObj = {};
		var urlSub = url;
		var match = urlSub.match(/^([a-z]+):\/\//i);
		if (match) {
			urlObj.scheme = match[1];
			urlSub = urlSub.substr(match[0].length);
		}
		match = urlSub.match(/^(.*?)(?=(\?|#|\/|$))/i);
		if (match) {
			urlObj.host = match[1];
			urlSub = urlSub.substr(match[0].length);
		}
		match = urlSub.match(/^\/(.*?)(?=(\?|#|$))/i);
		if (match) {
			urlObj.path = match[1];
			urlSub = urlSub.substr(match[0].length);
		}
		match = urlSub.match(/^\?(.*?)(?=(#|$))/i);
		if (match) {
			urlObj.query = match[1];
			urlSub = urlSub.substr(match[0].length);
		}
		match = urlSub.match(/^#(.*?)$/i);
		if (match) {
			urlObj.fragment = match[1];
		}
		return urlObj;
	};

	var buildUrl = function(urlObj){
		var url = "";
		if (urlObj.scheme && urlObj.host) {
			url += urlObj.scheme + "://";
		}
		if (urlObj.host) {
			url += urlObj.host;
		}
		if (urlObj.path) {
			url += "/" + urlObj.path;
		}
		if (urlObj.query) {
			url += "?" + urlObj.query;
		}
		if (urlObj.fragment) {
			url += "#" + urlObj.fragment;
		}
		return url;
	};

	var buildSegment = function(segment, remainingAvailableLength){
		var remainingAvailableLengthHalf = remainingAvailableLength/ 2,
				startOffset = Math.ceil(remainingAvailableLengthHalf),
				endOffset = (-1)*Math.floor(remainingAvailableLengthHalf),
				end = "";
		if (endOffset < 0) {
			end = segment.substr(endOffset);
		}
		return segment.substr(0, startOffset) + ellipsisChars + end;
	};
	if (url.length <= truncateLen) {
		return url;
	}
	var availableLength = truncateLen - ellipsisLength;
	var urlObj = parse_url(url);
	if (urlObj.query) {
		var matchQuery = urlObj.query.match(/^(.*?)(?=(\?|\#))(.*?)$/i);
		if (matchQuery) {
			urlObj.query = urlObj.query.substr(0, matchQuery[1].length);
			url = buildUrl(urlObj);
		}
	}
	if (url.length <= truncateLen) {
		return url;
	}
	if (urlObj.host) {
		urlObj.host = urlObj.host.replace(/^www\./, "");
		url = buildUrl(urlObj);
	}
	if (url.length <= truncateLen) {
		return url;
	}
	var str = "";
	if (urlObj.host) {
		str += urlObj.host;
	}
	if (str.length >= availableLength) {
		if (urlObj.host.length == truncateLen) {
			return (urlObj.host.substr(0, (truncateLen - ellipsisLength)) + ellipsisChars).substr(0, availableLength + ellipsisLengthBeforeParsing);
		}
		return buildSegment(str, availableLength).substr(0, availableLength + ellipsisLengthBeforeParsing);
	}
	var pathAndQuery = "";
	if (urlObj.path) {
		pathAndQuery += "/" + urlObj.path;
	}
	if (urlObj.query) {
		pathAndQuery += "?" + urlObj.query;
	}
	if (pathAndQuery) {
		if ((str+pathAndQuery).length >= availableLength) {
			if ((str+pathAndQuery).length == truncateLen) {
				return (str + pathAndQuery).substr(0, truncateLen);
			}
			var remainingAvailableLength = availableLength - str.length;
			return (str + buildSegment(pathAndQuery, remainingAvailableLength)).substr(0, availableLength + ellipsisLengthBeforeParsing);
		} else {
			str += pathAndQuery;
		}
	}
	if (urlObj.fragment) {
		var fragment = "#"+urlObj.fragment;
		if ((str+fragment).length >= availableLength) {
			if ((str+fragment).length == truncateLen) {
				return (str + fragment).substr(0, truncateLen);
			}
			var remainingAvailableLength2 = availableLength - str.length;
			return (str + buildSegment(fragment, remainingAvailableLength2)).substr(0, availableLength + ellipsisLengthBeforeParsing);
		} else {
			str += fragment;
		}
	}
	if (urlObj.scheme && urlObj.host) {
		var scheme = urlObj.scheme + "://";
		if ((str+scheme).length < availableLength) {
			return (scheme + str).substr(0, truncateLen);
		}
	}
	if (str.length <= truncateLen) {
		return str;
	}
	var end = "";
	if (availableLength > 0) {
		end = str.substr((-1)*Math.floor(availableLength/2));
	}
	return (str.substr(0, Math.ceil(availableLength/2)) + ellipsisChars + end).substr(0, availableLength + ellipsisLengthBeforeParsing);
};

return Autolinker;
}));
