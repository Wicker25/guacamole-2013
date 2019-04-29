/*
    Title --- dom.js

    Copyright (C) 2013 Giacomo Trudu - wicker25[at]gmail[dot]com

    This file is part of Guacamole.

    Guacamole is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation version 3 of the License.

    Guacamole is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with Guacamole. If not, see <http://www.gnu.org/licenses/>.
*/


/** Modulo per la gestione del DOM **/
$.define( 'dom', function ( $ ) {

	// Espressioni regolari
	var re_tag = /<(\/?)(\w+)([^>]*)>/igm,
		re_attr = /(\w+)=\"([^\"]*)\"/igm;

	// Lista dei tag singoli (senza chiusura)
	var empty_tags = ( 'area base basefont br col frame hr img input isindex link meta param' ).split(' ');


	/** Distrugge tutti i figli di un nodo **/
	var deleteChilds = function ( node ) {

		while ( node.firstChild )
			node.removeChild( node.firstChild );
	};

	/** Costruisce un tag e i suoi attributi a partire da un riscontro
		Usata dalla fuzione `htmlToDom` **/
	var buildTag = function ( match ) {

		var data = {

			name:	match[2],
			type:	match[1] == '/',
			attr:	match[3],
			index:	match.index,
			length:	match[0].length
		};

		// Se si tratta di un tag di apertura, costruisco il nodo
		// e i suoi attributi
		if ( data.type == 0 ) {

			data.node = document.createElement( data.name );

			if ( data.attr ) {

				var m;

				while ( m = re_attr.exec( data.attr ) )
					data.node.setAttribute( m[1], $.entitiesToChars( m[2] ) );
			}
		}

		return data;
	};

	/** Costruisce il DOM a partire da un sorgente HTML **/
	var htmlToDom = function ( code, main ) {

		// Creo uno stack per tenere traccia dell'annidamento dei tag
		var stack = [];
			stack.last = function () { return this[ this.length - 1 ]; };

		// Le altre strutture di lavoro
		var	child, inner_text, start, len, tag, found, last = 0;

		// Se non è stato specificato, trovo e costruisco il nodo principale
		if ( !$.isDefined( main ) || !$.isDomNode( main ) ) {

			while ( ( found = re_tag.exec( code ) ) && found[1] == '/' );

			tag = buildTag( found );
			main = tag.node;

			// Aggiorno la posizione dell'ultimo tag trovato
			last = tag.index + tag.length;
		}

		// Interpreto l'HTML e costruisco il relativo DOM
		while ( found = re_tag.exec( code ) ) {

			tag = buildTag( found );

			// Costruisco i `TextNode` contenenti il testo fuori dai tag,
			// convertendo le entità HTML nei rispettivi caratteri
			if ( len = tag.index - last ) {

				inner_text = $.entitiesToChars( code.substr( last, len ) );
				main.appendChild( document.createTextNode( inner_text ) );
			}

			// Aggiorno la posizione dell'ultimo tag trovato
			last = tag.index + tag.length;

			// Se si tratta di un tag di apertura o di un tag singolo,
			// creo la nuova istanza del DOM e aggiungo l'elemento allo stack
			if ( tag.type == 0 ) {

				main.appendChild( tag.node );

				// Se il tag ha bisogno di essere chiuso lo aggiungo allo stack
				// e aggiorno il nodo corrente
				if ( !$.inArray( tag.name, empty_tags ) ) {

					stack.push( tag );
					main = tag.node;
				}

			// Se ho trovato il tag di chiusura dell'ultimo nodo, lo rimuovo dallo stack
			} else if ( stack.length && stack.last().name == tag.name ) {

				stack.pop();
				main = main.parentNode;
			}
		}

		// Aggiungo l'ultimo frammento di testo rimasto fuori dai tag
		if ( last < code.length ) {

			inner_text = $.entitiesToChars( code.substr( last ) );
			main.appendChild( document.createTextNode( inner_text ) );
		}

		return main;
	};

	/** Ricava o costruisce le istanze del DOM usando il selettore specificato */
	var findNodes = function ( selector, context ) {

		// Se il selettore è un nodo del DOM, lo restituisco semplicemente
		if ( $.isDomNode( selector ) )
			return selector;


		/** Nodi del contenitore **/
		var founds = [];

		// Gestisco $([ node, node, ... ])
		if ( $.isArray( selector ) ) {

			founds = $.fmap( selector, function ( i, node ) {

				if ( $.isDomNode( node ) )
					return node;

				if ( $.isDomContainer( node ) )
					return node.nodeList;
			} );

		// Gestisco $('string')
		} else if ( $.isString( selector ) ) {

			// Gestisco $('<tag>...</tag>')
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 )
				return htmlToDom( selector, context );

			// Funzione e chiave di ricerca
			var finder, key;

			switch ( selector.charAt(0) ) {

				// Gestisco $('#id')
				case '#': {

					finder	= $.getElemById;
					key		= selector.slice(1);
					break;
				}

				// Gestisco $('.class')
				case '.': {

					finder	= $.getElemsByClassName;
					key		= selector.slice(1);
					break;
				}

				// Gestisco $('tag')
				default: {

					finder	= $.getElemsByTagName;
					key		= selector;
					break;
				}
			}

			if ( $.isDefined( context ) ) {

				founds = $.fmap( context, function ( i, c ) {
					return finder( key, c );
				} );

			} else founds = finder( key );

		// Gestisco $(function ( index, node ) {...})
		} else if ( $.isFunction( selector ) ) {

			var nodes;

			if ( $.isDefined( context ) ) {

				nodes = $.fmap( context, function () {
					 return $.getElemsByTagName( '*', this );
				} );

			} else nodes = $.getElemsByTagName( '*' );

			founds = $.map( nodes, selector, true );
		}


		if ( $.isArray( founds ) )
			founds = $.unique( founds );

		else if ( !founds )
			return [];

		return founds.length == 1 ? founds[0] : founds;
	};


	/* =================== CLASSE CONTENITORE =================== */

	var Dom = function ( selector, context ) {

		// Se è stata passata un'altra istanza, evito di ricrearla un'altra volta
		if ( $.isDomContainer( selector ) )
			return selector;

		// Ricavo le istanze del DOM a cui il contenitore fa riferimento
		this.nodeList = findNodes( selector, context );
	};

	/** Scorciatoia per i metodi pubblici della classe **/
	Dom.fn = Dom.prototype;


	/* =================== METODI PUBBLICI =================== */

	// Costruisco i metodi pubblici della classe
	$.extend( Dom.fn, {

		/** Applica una funzione ad ogni nodo del contenitore **/
		each:	function ( callback ) { $.each( this.nodeList, callback ); },
		map:	function ( callback ) { return $.map( this.nodeList, callback ); },

		/** Sostituisce un elemento del contenitore **/
		replaceNode: function ( node, other ) {

			this.nodeList = $.replace( this.nodeList, node, other );
		},

		/** Ritorna il nome del nodo **/
		tag: function () {

			return this.map( function () {
				if ( $.isDefined( this.tagName ) )
					return this.tagName.toLowerCase();
			} );
		},

		/** Ritorna il tipo del nodo **/
		type: function () { return this.map( function () { return this.nodeType; } ); },

		/** Imposta/ritorna un attributo dell'elemento **/
		attr: function ( name, value ) {

			// Impostazione tramite dizionario
			if ( $.isPlainObject( name ) ) {

				var self = this;

				$.each( name, function ( key, value ) {
					self.each( function () { return $.setAttribute( this, key, value ); } );
				} );

				return this;

			} else if ( !$.isDefined( value ) ) {

				// Selezione tramite array
				if ( $.isArray( name ) ) {

					var self = this;

					return $.map( name, function ( i, n ) {
						return self.map( function () {
							return $.getAttribute( this, n );
						} );
					} );

				// Selezione tramite stringa
				} else {

					return this.map( function () {
						return $.getAttribute( this, name );
					} );
				}
			}

			// Impostazione tramite stringa
			this.each( function () {
				$.setAttribute( this, name, value );
			} );

			return this;
		},

		/** Rimuove un attributo dell'elemento **/
		removeAttr: function ( name ) {

			this.each( function () {
				this.removeAttribute( name );
			} );

			return this;
		},

		/** Controlla se l'elemento possiete un attributo **/
		hasAttr: function ( name ) {

			return this.map( function () {
				return this.hasAttribute( name );
			} );
		},

		/** Imposta/ritorna il valore dell'elemento HTML (input, textarea, select, etc) **/
		val: function ( value ) {

			if ( !$.isDefined( value ) ) {

				return this.map( function () {
					return $.getValue( this );
				} );
			}

			this.each( function () {
				$.setValue( this, value );
			} );

			return this;
		},

		/** Imposta il contenuto dell'elemento (testuale) **/
		text: function ( text ) {

			this.each( function () {

				deleteChilds( this );
				this.appendChild( document.createTextNode( text ) );
			} );

			return this;
		},

		/** Imposta il contenuto dell'elemento (HTML) **/
		html: function ( code ) {

			this.each( function () {

				deleteChilds( this );
				htmlToDom( code, this );
			} );

			return this;
		},

		/** Aggiunge dei contenuti all'elemento (HTML) **/
		addHtml: function ( code ) {

			this.each( function () {
				htmlToDom( code, this );
			} );

			return this;
		},

		/** Svuota il contenuto di un elemento **/
		clean: function () {

			this.each( function () { deleteChilds( this ); } );
			return this;
		},

		/** Imposta/ritorna una proprietà dello stile dell'elemento **/
		css: function ( name, value ) {

			// Impostazione tramite dizionario
			if ( $.isPlainObject( name ) ) {

				var self = this;

				$.each( name, function ( key, value ) {
					self.each( function () { return $.setStyle( this, key, value ); } );
				} );

				return this;

			} else if ( !$.isDefined( value ) ) {

				// Selezione tramite array
				if ( $.isArray( name ) ) {

					var self = this;

					return $.map( name, function ( i, n ) {
						return self.map( function () {
							return $.getStyle( this, n );
						} );
					} );

				// Selezione tramite stringa
				} else {

					return this.map( function () {
						return $.getStyle( this, name );
					} );
				}
			}

			// Impostazione tramite stringa
			this.each( function () {
				$.setStyle( this, name, value );
			} );

			return this;
		},

		/** Imposta/ritorna la posizione (assoluta) dell'elemento **/
		position: function ( x, y ) {

			if ( $.isDefined( x ) && $.isDefined( y ) )
				return this.css( { left: x, top: y, position: 'absolute' } );
			else
				return this.css( [ 'left', 'top' ] );
		},

		/** Imposta/ritorna un membro dell'elemento **/
		data: function ( name, value ) {

			if ( !$.isDefined( value ) ) {

				return this.map( function () {
					return $.getData( this, name );
				} );
			}

			this.each( function () {
				$.setData( this, name, value );
			} );

			return this;
		},

		/** Aggiunge una nuova classe all'elemento **/
		addClass: function ( name ) {

			this.each( function () { $.addClass( this, name ); } );
			return this;
		},

		/** Rimuove una classe dall'elemento **/
		removeClass: function ( name ) {

			this.each( function () { $.removeClass( this, name ); } );
			return this;
		},

		/** Controlla se l'elemento possiede una determinata classe **/
		hasClass: function ( name ) {

			return this.map( function () { return $.hasClass( this, name ); } );
		},

		/** Nasconde/mostra l'elemento **/
		hide:	function () { return this.css( 'display', 'none' ); },
		show:	function () { return this.css( 'display', 'block' ); },

		/** Connette un evento dell'elemento ad una funzione **/
		bind: function ( type, handler ) {

			this.each( function () { $.bindEvent( this, type, handler ); } );
			return this;
		},

		/** Disconnette una funzione da un evento dell'elemento **/
		unbind: function ( type, handler ) {

			this.each( function () { $.unbindEvent( this, type, handler ); } );
			return this;
		},

		/** Innesca un evento dell'elemento **/
		trigger: function ( type, handler ) {

			this.each( function () { $.triggerEvent( this, type, handler ); } );
			return this;
		}
	} );


	/* --------------------------------------------------------------------- */

	// Aggiungo i metodi per l'accesso al DOM
	$.extend( Dom.fn, {

		/** Metodi di accesso ai nodi contenuti nell'istanza **/
		first:	function () { return (
			this.nodeList.length ? $( this.nodeList[0] ) : this );
		},

		last:	function () {
			return ( this.nodeList.length ? $( this.nodeList[ this.nodeList.length - 1 ] ) : this );
		},

		node: function ( i ) {
			return ( this.nodeList.length ? $( this.nodeList[i] ) : this );
		},

		/** Metodi per la navigazione del DOM **/
		parent:		function ()			{ return $( this.map( function () { return this.parentNode;			} ) ); },
		child:		function ( sel )	{ return $( this.map( function () { return $( sel, this );			} ) ); },
		firstChild:	function ()			{ return $( this.map( function () { return this.firstChild;			} ) ); },
		lastChild:	function ()			{ return $( this.map( function () { return this.lastChild;			} ) ); },
		next:		function ()			{ return $( this.map( function () { return this.nextSibling;		} ) ); },
		prev:		function ()			{ return $( this.map( function () { return this.previousSibling;	} ) ); },

		/** Clona il nodo **/
		clone: function () { return $( this.map( function () { return this.cloneNode( true ); } ) ); },

		/** Cancella i nodi del contenitore **/
		destroy: function () {
			this.each( function () { this.parentNode.removeChild( this ); } );
		},

		/** Aggiunge un figlio al nodo corrente **/
		append: function ( other ) {

			return $(

				this.map( function ( i, node ) {

					if ( !$.inArray( node.tagName.toLowerCase(), empty_tags ) ) {

						var o = $( other );

						$.each( o.nodeList, function () {
							node.appendChild( this );
						} );

						return o;
					}
				} )
			);
		},

		/** Aggiunge un figlio al nodo corrente (alla prima posizione) **/
		prepend: function ( other ) {

			return $(

				this.map( function ( i, node ) {

					if ( !$.inArray( node.tagName.toLowerCase(), empty_tags ) ) {

						var o = $( other );

						$.each( o.nodeList, function () {
							node.insertBefore( this, node.childNodes[0] )
						} );

						return o;
					}
				} )
			);
		},

		/** Aggiunge il nodo corrente ad un altro **/
		appendTo: function ( other ) {

			other = $( other );
			other.append( this );
			return this;
		},

		/** Aggiunge il nodo corrente ad un altro (alla prima posizione) **/
		prependTo: function ( other ) {

			other = $( other );
			other.prepend( this );
			return this;
		},
	} );


	/* --------------------------------------------------------------------- */

	/** Metodi di accesso agli eventi **/
	$.each( ( 'focus blur reset select submit click' ).split(' '), function ( i, event ) {

		Dom.fn[ event ] = function ( handler ) {

			if ( $.isDefined( handler ) )
				this.bind( event, handler );
			else
				this.each( function () { this[ event ](); } );

			return this;
		};
	} );

	$.each( ( 'dblclick mousedown mouseup ' +
			  'mouseover mouseout mousemove ' +
			  'keydown keypress keyup change' ).split(' '), function ( i, event ) {

		Dom.fn[ event ] = function ( handler ) {

			if ( $.isDefined( handler ) )
				this.bind( event, handler );
			else
				this.trigger( event );

			return this;
		};
	} );

	/** Metodi di accesso rapido ad alcune proprietà dell'elemento **/
	$.each( ( 'href src id scrollTop scrollLeft scrollHeight scrollWidth' ).split(' '), function ( i, name ) {

		Dom.fn[ name ] = function ( value ) {

			if ( !$.isDefined( value ) )
				return this.map( function () {
					return this[ name ];
				} );

			this.each( function () {
				this[ name ] = value;
			} );

			return this;
		};
	} );

	$.each( ( 'disabled checked selected readonly' ).split(' '), function ( i, name ) {

		Dom.fn[ name ] = function ( value ) {

			if ( !$.isDefined( value ) ) {

				var self = this;

				return this.map( function () {
					return self.attr( name );
				} );
			}

			if ( value )
				this.attr( name, name );
			else
				this.removeAttr( name );

			return this;
		};
	} );

	/** Metodi di accesso rapido ad alcune proprietà dello stile **/
	$.each( ( 'width height left top right bottom display' ).split(' '), function ( i, name ) {

		Dom.fn[ name ] = function ( value ) { return this.css( name, value ); };
	} );


	// Ritorno la classe contenitrice in modo che sia collegata
	// alla libreria
	return Dom;
} );

