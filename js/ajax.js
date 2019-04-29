/*
    Title --- ajax.js

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


/** Modulo per le richieste AJAX **/
$.define( 'ajax', function ( $ ) {

	/** Crea l'istanza `XMLHttpRequest` (cross-browser) **/
	var xmlHttp = function ( method, uri, callback, cache ) {

		// La nuova istanza `XMLHttpRequest`
		var req;

		// IE7+, Opera, Chrome, Safari, Firefox
		if ( window.XMLHttpRequest ) {

			req = new XMLHttpRequest();

		} else {

			// IE6, IE5
			if ( window.ActiveXObject ) {

				// Cerco l'implementazione più recente per IE
				var msXmlHttp = [

					'Msxml2.XMLHTTP.6.0',
					'Msxml2.XMLHTTP.5.0',
					'Msxml2.XMLHTTP.4.0',
					'Msxml2.XMLHTTP.3.0',
					'Msxml2.XMLHTTP',
					'Microsoft.XMLHTTP'
				];

				$.each( msXmlHttp, function () {

					try {

						req = new ActiveXObject( this );
						if ( req ) return true;

					} catch ( e ) {}
				} );
			}
		}

		// Se non sono riuscito a costruire l'istanza `XMLHttpRequest`
		// sollevo un eccezione
		if ( !req )
			throw new Error( 'browser doesn\'t support XMLHttpRequest.' );

		// Se necessario prevengo la memorizzazione delle pagine
		// nella memoria cache del browser
		if ( !$.isDefined( cache ) || !cache )
			uri = $.preventCache( uri );

		// Imposto il tipo della richiesta
		req.open( method, uri, true );

		// Collego la funzione di callback all'evento `ready`
		if ( $.isDefined( callback ) ) {

			req.onreadystatechange = function () {

				if ( this.readyState == 4 )
					callback.call( this, this.responseText, this.status, this );
			};
		}

		return req;
	};

	/** Prepara i parametri di una richiesta POST **/
	var processData = function ( data ) {

		var result = [];

		for ( var key in data )
			result.push( encodeURIComponent( key ) + '=' + encodeURIComponent( data[key] ) );

		return result.join('&');
	};


	/* =================== METODI PUBBLICI =================== */

	return {

		/** Richiesta GET **/
		get: function ( uri, callback, cache ) {

			var req = xmlHttp( 'get', uri, callback, cache );
			req.send( null );
		},

		/** Richiesta POST **/
		post: function ( uri, data, callback, cache ) {

			var req = xmlHttp( 'post', uri, callback, cache );
			req.setRequestHeader( 'content-type', 'application/x-www-form-urlencoded; charset=UTF-8' );
			req.send( processData( data ) );
		}
	};
} );
