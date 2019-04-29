/*
    Title --- date.js

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


/** Modulo per la formattazione dell'orario **/
$.define( 'date', function ( $ ) {

	/**
		La seguente è un'implementazione Javascript della funzione `date` di PHP.
		Questa funzione NON E' INEDITA, ma è stata scritta da me il 19 aprile 2012.
		Vedi: http://www.hackyourmind.org/blog/javascript-formatting-date-like-php/
	**/

	return ( function ( format, time, r ) {

		// Preparo i parametri
		r = ( $.isDefined( r ) && r );
		var date = $.isDefined( time ) ? ( time instanceof Date ? time : new Date( time * 1000 ) ) : new Date;

		// Calcolo il numero dei secondi dall'inizio dell'anno
		var yearSecs = ( date - new Date( date.getFullYear(), 0, 1 ) ) / 1000;

		// Estraggo alcune informazioni dalla formattazione standard
		var meta = String( date ).match( /^.*?([A-Z]{1,4})([\-+]\d{4}) \(([A-Z]+)\).*$/ );

		// Estraggo le informazioni
		date = {

			d : date.getDate(),
			D : date.getDay(),
			m : date.getMonth(),
			y : date.getFullYear(),
			l : ( new Date( date.getFullYear(), 1, 29 ).getMonth() === 1 | 0 ),
			h : date.getHours(),
			M : date.getMinutes(),
			s : date.getSeconds(),
			u : date.getMilliseconds(),
			t : date.getTime(),
			z : date.getTimezoneOffset()
		};

		// Stringa della data formattata
		var str = '';

		// Riempie con gli zeri gli spazi alla sinistra di un numero
		var pad = function ( value, len ) {

			return ( '000000000' + String( value ) ).slice( -len );
		};

		// Parametri della formattazione
		var fmt_values = {

			d : function () { return pad( date.d, 2 ); },
			D : function () { return [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ][ date.D ]; },
			j : function () { return date.d; },
			l : function () { return [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ][ date.D ]; },
			N : function () { return date.D + 1; },
			S : function () { return [ 'th', 'st', 'nd', 'rd' ][ date.d % 10 > 3 ? 0 : ( date.d < 10 || date.d > 20 ) * date.d % 10 ]; },
			w : function () { return date.D; },
			z : function () { return Math.ceil( yearSecs / 86400 ); },
			W : function () { return Math.ceil( yearSecs / 604800 ); },
			F : function () { return [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ][ date.m ]; },
			m : function () { return pad( date.m + 1, 2 ); },
			M : function () { return [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ][ date.m ]; },
			n : function () { return date.m + 1; },
			t : function () { return [31, ( date.l ? 29 : 28 ), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][ date.m ]; },
			L : function () { return date.l; },
			Y : function () { return date.y; },
			y : function () { return String( date.y ).slice( -2 ); },
			a : function () { return ( date.h < 12 ? 'am' : 'pm' ); },
			A : function () { return ( date.h < 12 ? 'AM' : 'PM' ); },
			g : function () { return date.h % 12 || 12; },
			G : function () { return date.h; },
			h : function () { return pad( date.h % 12 || 12, 2 ); },
			H : function () { return pad( date.h, 2 ); },
			i : function () { return pad( date.M, 2 ); },
			s : function () { return pad( date.s, 2 ); },
			u : function () { return date.u * 1000; },
			I : function () { return ( date.m > 2 && date.m < 10 || ( date.m == 2 && date.D - date.d >= 8 - 1 ) ); },
			O : function () { return meta[2]; },
			P : function () { return meta[2].slice( 0, -2 ) + ':' + meta[2].slice( -2 ); },
			T : function () { return meta[3]; },
			Z : function () { return -date.z * 60; },
			c : function () { return ( !r ? this.date( 'Y-m-d\\TH:i:sP', time, true ) : null ); },
			r : function () { return ( !r ? this.date( 'D, d M Y H:i:s O', time, true ) : null ); },
			U : function () { return Math.floor( date.t / 1000 ); }
		};

		// Divido la stringa di formattazione in token tenendo conto dei caratteri di escape
		var tokens = format.match( /(\\.|.)/gi );

		// Costruisco la stringa del tempo
		for ( var i = 0; i < tokens.length; i++ )
			str += ( tokens[i] in fmt_values ? fmt_values[ tokens[i] ]() : ( tokens[i].length == 1 ? tokens[i] : tokens[i][1] ) );

		return str;
	} );
} );
