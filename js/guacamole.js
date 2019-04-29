/*
    Title --- guacamole.js

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


/** Modulo principale di Guacamole **/
( function ( BASE, NAME ) {

	/* ============= VARIABILI E METODI PRIVATI ============= */

	var user_agent	= 	window.navigator.userAgent.toLowerCase(),
		browser		=	String( user_agent.match( /msie|opera|chrome|safari|firefox/ ) || 'unknown' ),
		os			=	String( user_agent.match( /win|mac|linux/ ) || 'unknown' );

	// Funzioni collegate all'evento `ready`
	var ready_funcs = [];

	// Espressioni regolari
	var re_classes = /\b(\w+)\b/ig;


	/* ============= GUACAMOLE ============= */

	/** Funzione principale della libreria **/
	Guacamole = $ = function ( selector, context ) {

		return $.isDefined( selector ) ? new $.dom( selector, context ) : Guacamole;
	};

	/** Estende i membri di un oggetto (o della libreria stessa) **/
	Guacamole.extend = function ( dst, src ) {

		// Se è stato specificato un solo dizionario,
		// uso la libreria stessa come destinatario
		if ( arguments.length == 1 ) {
			src = dst; dst = this;
		}

		for ( var key in src )
			dst[ key ] = src[ key ];
	};

	/** Definisce un nuovo modulo della libreria **/
	Guacamole.define = function ( name, constructor ) {

		this[ name ] = constructor( Guacamole );
	};


	// Costruisco i metodi della libreria
	Guacamole.extend( {

		/* ============= INFORMAZIONI SULLA LIBRERIA ============= */

		lib_path:	'',
		version:	'0.1',

		/* ========== INFORMAZIONI E UTILITA' SUL CLIENT ========== */

		user_agent:		user_agent,
		browser:		browser,
		os:				os,

		/** Scrive un messaggio nella console **/
		console: function ( message, mode ) {

			if ( !$.isDefined( mode ) )
				mode = 'info';

			if ( window.console && console[ mode ] )
				console[ mode ]( message );
		},


		/* ============= IDENTIFICAZIONE DEI TIPI ============= */

		isDefined: function ( obj ) { return ( typeof( obj ) !== 'undefined' ); },

		type: function ( obj ) {

			if ( obj == null )
				return 'null';

			var type = Object.prototype.toString.call( obj ),
				m = type.match( /\[object (Boolean|Number|String|Function|Array|Date|RegExp|Object)\]/i );

			return m ? m[1].toLowerCase() : 'object';
		},

		isString:			function ( obj ) { return ( $.type( obj ) === 'string' ); },
		isNumber:			function ( obj ) { return ( $.type( obj ) === 'number' ); },
		isNumeric:			function ( obj ) { return !isNaN( parseFloat( obj ) ) && isFinite( obj ); },
		isFunction:			function ( obj ) { return ( $.type( obj ) === 'function' ); },
		isObject:			function ( obj ) { return ( $.type( obj ) === 'object' ); },
		isPlainObject:		function ( obj ) { return ( $.type( obj ) === 'object' && obj.constructor == Object ); },
		isArray:			function ( obj ) { return ( $.type( obj ) === 'array' ); },
		isDomNode:			function ( obj ) { return $.isDefined( obj.nodeType ); },
		isDomContainer:		function ( obj ) { return ( obj instanceof $.dom || $.isDefined( obj.nodeList ) ); },


		/* ============= UTILITA' ============= */

		/** Ritorna il timestamp corrente (formato UNIX) **/
		timestamp: function ( callback, time ) {

			return parseInt( new Date().getTime() / 1000 );
		},

		/** Richiama una funzione ad intervalli di tempo regolari **/
		recall: function ( callback, time ) {

			var timer = setInterval( function () {

				// Il loop termina quando la funzione di callback
				// restituisce un valore `true`
				if ( callback() )
					clearInterval( timer );

			}, time );

			return timer;
		},

		/** Ferma una funzione richiamata ad intervalli regolari **/
		stopCall: function ( timer ) {

			clearInterval( timer );
		},

		/** Converte una stringa JSON in un oggetto **/
		parseJSON: function( text ) {

			// Se è possibile utilizzo la funzione built-in
			if ( $.isDefined( window.JSON ) && $.isDefined( window.JSON.parse ) )
				return window.JSON.parse( text );

			return ( new Function( "return " + text ) )();
		},


		/* ============= MANIPOLAZIONE DELLE STRUTTURE ============= */

		/** Applica una funzione ad ogni elemento di un array o di un dizionario **/
		each: function ( data, callback ) {

			// Array e altri oggetti iterabili
			if ( $.isArray( data ) || ( $.isObject( data ) && $.isDefined( data.length ) ) ) {

				for ( var i = 0, e = data[i]; i < data.length; e = data[++i] )
					if ( callback.call( e, i, e ) )
						break;

			// Dizionario
			} else if ( $.isPlainObject( data ) ) {

				for ( var key in data )
					if ( callback.call( data[ key ], key, data[ key ] ) )
						break;

			// Singolo
			} else callback.call( data, 0, data );
		},

		/** Applica una funzione ad ogni elemento di un array
			e ne memorizza i risultati in una nuova struttura **/
		map: function ( data, callback ) {

			// Array e altri oggetti iterabili
			if ( $.isArray( data ) || ( $.isObject( data ) && $.isDefined( data.length ) ) ) {

				var ret = [], value, i;

				for ( i = 0, e = data[i]; i < data.length; e = data[++i] )
					if ( $.isDefined( value = callback.call( e, i, e ) ) )
						ret.push( value );

				return ret;

			// Dizionario
			} else if ( $.isPlainObject( data ) ) {

				var ret = {}, value;

				for ( var key in data )
					if ( $.isDefined( value = callback.call( data[ key], key, data[ key ] ) ) )
						ret[ key ] = value;

				return ret;

			// Singolo
			} else return callback.call( data, 0, data );
		},

		/** Analoga ad `map` con la differenza che la funzione di callback
			può restituire più di un elemento (solo array) **/
		fmap: function ( data, callback ) {

			// Array e altri oggetti iterabili
			if ( $.isArray( data ) || ( $.isObject( data ) && $.isDefined( data.length ) ) ) {

				var ret = [], value, i;

				for ( i = 0, e = data[i]; i < data.length; e = data[++i] )
					if ( $.isDefined( value = callback.call( e, i, e ) ) )
						ret = ret.concat( value );	// Il metodo `concat` appiattisce gli array annidati!

				return ret;

			// Singolo
			} else return callback.call( data, 0, data );
		},

		/** Ritorna la prima posizione di un elemento in un array **/
		find: function ( element, data ) {

			for ( var i = 0; i < data.length && data[i] != element; i++ );
			return i < data.length ? i : -1;
		},

		/** Converte un oggetto in un array **/
		toArray: function ( data ) {

			return $.map( data, function () { return this; } );
		},

		/** Controlla se un oggetto è contenuto in un array **/
		inArray: function ( element, data ) {

			return $.find( element, data ) != -1;
		},

		/** Ritorna il primo elemento da un array o di un dizionario **/
		first: function ( data ) {

			for ( var key in data ) { break; }
			return data[ key ];
		},

		/** Rimuove un elemento da un array **/
		remove: function ( value, data ) {

			return $.map( data, function ( i, v ) {
				if ( v != value )
					return v;
			} );
		},

		/** Rimpiazza un elemento di un array con un altro **/
		replace: function ( old, new_, data ) {

			return $.map( data, function ( i, v ) {
				return v != old ? v : new_;
			} );
		},

		/** Elimina gli elementi ripetuti di array **/
		unique: function ( data ) {

			var ret = [], i = 0;

			for ( ; i < data.length; i++ )
				if ( !$.inArray( data[i], ret ) )
					ret.push( data[i] );

			return ret;
		},

		/** Elimina gli spazi alle estremità di una stringa **/
		trim: function ( str ) {

			return str.trim ? str.trim() : str.replace( /^\s*(.*?)\s*$/ , '$1' );
		},

		/** Capitalizza una stringa **/
		capitalize: function ( str ) {

			return str.charAt(0).toUpperCase() + str.slice(1);
		},

		/** Converte una stringa come `background-image` in `backgroundImage` **/
		propertyName: function ( str ) {

			return str.replace( /-([a-z])/g, function( $1, $2 ) { return $2.toUpperCase(); } );
		},


		/* ================ MANIPOLAZIONE DEGLI ELEMENTI ================ */

		/** Ritorna i nodi con un determinato id */
		getElemById: function ( id, context ) {

			if ( !$.isDefined( context ) )
				return document.getElementById( id );

			return $.map( context.childNodes, function () {
				if ( this.nodeType == 1 && this.id == id )
					return this;
			} );
		},

		/** Ritorna i nodi con un determinato nome **/
		getElemsByTagName: function ( name, context ) {

			if ( !$.isDefined( context ) )
				return $.toArray( document.getElementsByTagName( name ) );

			name = name.toUpperCase();

			return $.map( context.childNodes, function () {
				if ( this.nodeType == 1 && ( name == '*' || this.tagName == name ) )
					return this;
			} );
		},

		/** Ritorna i nodi con una determinata classe **/
		getElemsByClassName: function ( name, context ) {

			var collection = ( $.isDefined( context ) ? context.childNodes : document.getElementsByTagName('*') );

			return $.map( collection, function () {
				if ( this.nodeType == 1 && $.hasClass( this, name ) )
					return this;
			} );
		},

		/** Imposta il valore di un elemento **/
		setValue: function ( node, value ) {

			var hook = $.valHooks[ node.tagName ];

			if ( hook )
				hook.set( node, value );
			else
				node.value = value;
		},

		/** Ritorna il valore di un elemento **/
		getValue: function ( node ) {

			var hook = $.valHooks[ node.tagName ];
			return hook ? hook.get( node ) : node.value;
		},

		/** Imposta un attributo di un elemento **/
		setAttribute: function ( node, name, value ) {

			var hook = $.attrHooks[ name ];

			if ( hook )
				hook.set( node, value );

			else {

				if ( value !== '' )
					node.setAttribute( name, value );
				else
					node.removeAttr( name );
			}
		},

		/** Ritorna un attributo di un elemento **/
		getAttribute: function ( node, name ) {

			var hook = $.attrHooks[ name ];

			if ( hook )
				return hook.get( node );
			else
				return node.getAttribute( name );
		},

		/** Imposta una proprietà dello stile di un elemento **/
		setStyle: function ( node, name, value ) {

			name = $.propertyName( name );

			var hook = $.cssHooks[ name ];

			if ( hook )
				hook.set( node, value );
			else
				node.style[ name ] = value;
		},

		/** Ritorna una proprietà dello stile di un elemento **/
		getStyle: function ( node, name ) {

			name = $.propertyName( name );

			var hook = $.cssHooks[ name ];

			if ( hook )
				return hook.get( node );

			else {

				var ret;

				if ( node.currentStyle )
					ret = node.currentStyle[ name ];

				else if ( window.getComputedStyle )
					ret = window.getComputedStyle( node )[ name ];

				return ret ? ret : node.style[ name ];
			}
		},

		/** Imposta un membro di un elemento del DOM **/
		setData: function ( node, name, value ) {

			if ( value )
				node[ name ] = value;

			else if ( name in node )
				delete node[ name ];
		},

		/** Ritorna un membro di un elemento del DOM **/
		getData: function ( node, name ) {

			return node[ name ];
		},

		/** Aggiunge una nuova classe all'elemento **/
		addClass: function ( node, name ) {

			if ( !$.hasClass( node, name ) ) {

				var list = node.className.match( re_classes ) || [];
				node.className = $.unique( list.concat( name ) ).join(' ');
			}
		},

		/** Rimuove una classe dall'elemento **/
		removeClass: function ( node, name ) {

			if ( $.hasClass( node, name ) ) {

				var list = node.className.match( re_classes ) || [];
				node.className = $.unique( $.remove( name, list ) ).join(' ');

				if ( !node.className )
					node.removeAttribute( 'class' );
			}
		},

		/** Controlla se l'elemento possiede una determinata classe **/
		hasClass: function ( node, name ) {

			return $.inArray( name, $.trim( node.className ).split( /\s+/ ) );
		},


		/* ================= GESTIONE DEGLI EVENTI ================= */

		/** Codici della tastiera **/
		keyCode: {

			BACKSPACE:	8,		TAB:		9,
			ENTER:		13,		SHIFT:		16,
			CTRL:		17,		ALT:		18,
			PAUSE:		19,		CAPSLOCK:	20,
			ESCAPE:		27,		PAGEUP:		33,
			PAGEDOWN:	34,		END:		35,
			HOME:		36,		LEFTARROW:	37,
			UPARROW:	38,		RIGHTARROW:	39,
			DOWNARROW:	40,		INSERT:		45,
			DELETE:		46
		},

		/** Connette una funzione ad un evento di un elemento **/
		bindEvent: function ( node, type, handler ) {

			var frame_handler = function ( event ) {
				return handler.call( node, window.event ? window.event : event );
			};

			if ( node.addEventListener )
				node.addEventListener( type, frame_handler, false );

			else if ( node.attachEvent )
				node.attachEvent( 'on' + type, frame_handler );
			else
				node[ 'on' + type ] = handler;;

			return this;
		},

		/** Disconnette una funzione da un evento di un elemento **/
		unbindEvent: function ( node, type, handler ) {

			if ( node.removeEventListener )
				node.removeEventListener( type, handler, false );

			else if ( node.detachEvent )
				node.detachEvent( 'on' + type, handler );

			return this;
		},

		/** Innesca un evento di un elemento **/
		triggerEvent: function ( node, type, handler ) {

			if ( node.dispatchEvent ) {

				var event = document.createEvent( 'HTMLEvents' );
				event.initEvent( type, true, true );
				node.dispatchEvent( event );

			} else if ( node.fireEvent )
				node.fireEvent( 'on' + type );

			return this;
		},

		/** Cancella l'azione predefinita associata ad un evento **/
		preventDefault: function ( event ) {

			if ( event.preventDefault )
				event.preventDefault();
			else
				event.returnValue = false;
		},

		/** Interrompe la propagazione di un evento **/
		stopPropagation: function ( event ) {

			if ( event.stopPropagation )
				event.stopPropagation();
			else
				event.cancelBubble = true;
		},


		/* ============= CARICAMENTO DIMANICO DEI COMPONENTI ============= */

		/** Previene la memorizzazione delle pagine nella memoria cache **/
		preventCache: function ( uri ) {

			// Inserisco un parametro fittizio nell'indirizzo specificato per obbligare il browser
			// a scaricare una nuova versione del file
			return uri + ( uri.indexOf('?') == -1 ? '?' : '&' ) + 'pid=' + Math.random();
		},

		/** Carica dinamicamente un componente della pagina **/
		loadComponent: function ( uri, builder, callback, cache ) {

			// Se si tratta di un singolo componente
			// mi limito a chiamare la funzione costruttrice
			if ( $.isString( uri ) ) {

				if ( $.isDefined( cache ) && !cache )
					uri = $.preventCache( uri ); 

				var component = builder( uri );

				// Collego la funzione di callback all'evento `onload` del componente
				// e lo inserisco nell'intestazione della pagina
				if ( $.isDefined( callback ) ) {

					if ( $.isDefined( component.onreadystatechange ) ) {

						component.onreadystatechange = function () {

							if ( $.inArray( this.readyState, [ 'loaded', 'complete' ] ) )
								callback();
						};

					} else component.onload = callback;
				}

				// Nota: su IE <= 8 non c'è una corretta gestione degli errori
				component.onerror = function () {
					$.console( 'Impossibile caricare il componente: "' + uri + '"', 'error' );
				};

				var head = document.getElementsByTagName( 'head' )[0];
				head.appendChild( component );

			// Se si tratta di più componenti richiamo questa funzione
			// per ognuno di essi
			} else {

				var counter = 0;

				$.each( uri, function () {

					$.loadComponent( this, builder, function () {

						// Quando sono stati caricati tutti gli script richiamo la funzione di callback
						if ( ++counter == uri.length && $.isDefined( callback ) )
							callback();

					}, cache );
				} );
			}
		},

		/** Carica dinamicamente uno javascript **/
		loadJS: function ( uri, callback, cache ) {

			// Definisco la funzione costruttrice
			var builder = function ( src ) {

				var script = document.createElement( 'script' );
				script.type = 'text/javascript';
				script.src = src;

				return script;
			};

			// Chiamo la funzione per il caricamento dei componenti
			$.loadComponent( uri, builder, callback, cache );
		},

		/** Carica dinamicamente un foglio di stile **/
		loadCSS: function ( uri, callback, cache ) {

			// Definisco la funzione costruttrice
			var builder = function ( href ) {

				var link = document.createElement( 'link' );
				link.type = 'text/css';
				link.rel = 'stylesheet';
				link.href = href;

				return link;
			};

			// Chiamo la funzione per il caricamento dei componenti
			$.loadComponent( uri, builder, callback, cache );
		},


		/* ============= GESTIONE DELLA PAGINA ============= */

		/** Converte i caratteri speciali di una stringa in entità HTML **/
		charsToEntities: function ( string ) {

			return string	.replace( /&/g, '&amp;' )
							.replace( /</g, '&lt;' )
							.replace( />/g, '&gt;' )
							//.replace( /'/g, '&#039;' )
							.replace( /"/g, '&quot;' );
		},

		/** Converte le entità HTML nei rispettivi caratteri **/
		entitiesToChars: function ( string ) {

			return string	.replace( /&amp;/g, '&' )
							.replace( /&lt;/g, '<' )
							.replace( /&gt;/g, '>' )
							//.replace( /&#039;/g, '\'' )
							.replace( /&quot;/g, '"' );
		},

		/** Redireziona l'utente ad un'altro indirizzo **/
		redirect: function ( uri, time, counter ) {

			// Se il conteggio è terminato reindirizzo l'utente
			if ( !time ) {

				window.location.replace( uri );

			} else {

				// Aggiorno il contatore del tempo restante
				if ( $.isDefined( counter ) ) {

					counter = ( isString( counter ) ? document.getElementById( counter ) : counter );
					counter.textContent = 'Sarai reindirizzato tra ' + time + ' secondi...';
				}

				// Richiamo la funzione dopo un secondo
				window.setTimeout( function () { redirect( uri, ( time - 1 ), counter ); }, 1000 );
			}
		},


		/* ============= INIZIALIZZAZIONE ED EVENTI ============= */

		/** Collega una funzione all'evento `ready` **/
		ready: function ( callback ) {

			ready_funcs.push( callback );
		},

		/** Innesca l'evento `ready` **/
		emitReady: function () {

			for ( var i = 0; i < ready_funcs.length; i++ )
				ready_funcs[i]();
		},

		/** Inizializza le componenti di Guacamole **/
		init: function ( modules, path ) {

			// Se è necessario aggiorno il percorso della libreria
			if ( $.isDefined( path ) )
				lib_path = path + '/';

			// Comincio l'inizializzazione alla fine del caricamento della pagina
			window.onload = function () { 

				// Costruisco i percorsi dei moduli
				modules = $.map( modules, function () {
					return $.lib_path + 'js/' + this + '.js';
				} );

				// Carico dinamicamente tutti i moduli
				// e invio il segnale di fine inizializzazione
				$.loadJS( modules, function () { $.emitReady(); } );
			};
		}
	} );


	/* ================ METODI DI ACCESSO UNIVERSALI ================ */

	Guacamole.extend( {

		/** Accesso al valore di un elemento **/ 
		valHooks: {

			select: {

				set: function ( node, value ) {

					$.each( node.options, function () {
						this.selected = $.inArray( this.value, value );
					} );
				},

				get: function ( node ) {

					return $.map( node.options, function () {
						if ( this.selected )
							return this.value;
					} );
				}
			}
		},

		/** Accesso ad un'attributo di un elemento **/ 
		attrHooks: {

			'class': {

				set: function ( node, value ) { node.className = value; },
				get: function ( node ) { return node.className }
			}
		},

		/** Accesso ad una proprietà dello stile di un elemento **/ 
		cssHooks: {

			'float': {

				set: function ( node, value ) {

					var style = node.style;

					if ( $.isDefined( style.cssFloat ) )
						style.cssFloat = value;
					else
						style.styleFloat = value;
				},

				get: function ( node ) {

					var style = node.style;
					return $.isDefined( style.cssFloat ) ? style.cssFloat : style.styleFloat;
				}
			}
		}
	} );

	$.each( ( 'width height left top right bottom' ).split(' '), function ( i, type ) {

		Guacamole.cssHooks[ type ] = {

			set: function ( node, value ) {

				if ( $.isNumeric( value ) )
					value = parseInt( value ) + 'px';

				node.style[ type ] = value;
			},

			// Questa funzione ritorna la misura sommata al padding
			// e allo spessore del bordo (in pixel)
			get: function ( node ) { return node[ 'offset' + $.capitalize( type ) ]; }
		};
	} );


	// Assegno un nome alla libreria
	BASE[ NAME ] = Guacamole;

}( window, '$' ) );

