/*
    Title --- dialog.js

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


/** Modulo per la gestione delle finestre di dialogo **/
$.define( 'dialog', function ( $ ) {

	// Frequenza dell'animazione (ms)
	var anim_rate = 20; // 1 / 20ms = 1 / 0.02s = 50Hz


	/** Contrassegna un input come valido/invalido **/
	var setInvalid = function ( input, state ) {

		if ( state )
			input.addClass( 'invalid' );
		else
			input.removeClass( 'invalid' );
	};

	/** Convalida gli input di una finestra del dialogo **/
	var validateInputs = function ( dialog, submit, value, first ) {

		var success = true;

		if ( $.isDefined( first ) && first ) {

			// Mi sposto sul primo input vuoto o invalido.
			// senza verificare gli altri input
			$.each( dialog.inputs, function () {

				if ( !this.val() )
					success = false;

				else if ( this.hasClass( 'invalid' ) ) {

					this.change();

					if ( this.hasClass( 'invalid' ) )
						success = false;
				}

				if ( !success ) {

					this.focus();
					return true;
				}
			} );

		} else {

			// Verifico tutti gli input del dialogo ed in caso di errore
			// sposto il focus sul primo invalido
			$.each( dialog.inputs, function () {

				this.change();

				if ( success && this.hasClass( 'invalid' ) ) {

					this.focus();
					success = false;
				}
			} );
		}

		// Se la validazione è andata a buon fine,
		// richiamo la funzione di callback
		if ( success && $.isDefined( submit ) )
			submit.call( dialog, value );
	};


	/* =================== CLASSE DEL DIALOGO =================== */

	var Dialog = function ( settings ) {

		// Riferimento globale all'istanza
		var self = this;


		// Chiamo il metodo costruttore della classe genitore
		$.dom.call( this, '<div class="dialog window"></div>' );

		// Aggiungo il dialogo al corpo della pagina
		this
			.appendTo( document.body )
			.id( settings.id )
			.hide();

		// Costruisco il contenitore principale
		this.content = this
						.append( '<div class="content"></div>' )
							.id( settings.id + '_content' );

		// Imposto lo stile
		if ( $.isDefined( settings.style ) )
			this.css( settings.style );

		// Costruisco i pulsanti della finestra
		this
			.prepend( '<a class="action icon ico-close"></a>' )
				.click( function () { self.close( 300 ); } );


		// Costruisco gli input del dialogo e gli memorizzo in un dizionario
		this.inputs = $.map( settings.inputs, function ( id, data ) {

			// Costruisco un id univoco
			var real_id = settings.id + '_' + id;

			// Costruisco l'etichetta dell'input
			if ( $.isDefined( data.label ) )
				self.content
					.append( '<label></label>' )
						.text( data.label )
						.attr( 'for', real_id )

			// Costruisco l'input
			var input = self.content
						.append( '<input type="' + data.type + '">' )
							.id( real_id );

			// Imposto il valore iniziale
			if ( $.isDefined( data.value ) )
				input.val( data.value );

			// Imposto la validazione dell'input
			if ( $.isDefined( data.validate ) ) {

				var rule = data.validate,
					type = $.type( rule );

				// Test con un'espressione regolare
				if ( type == 'regexp' ) {

					input.change( function () {
						setInvalid( input, !rule.test( input.val() ) );
					} );

				// Confronto con il valore di un altro input
				} else if ( type == 'string' ) {

					input.change( function () {
						setInvalid( input, input.val() != self.inputs[ rule ].val() );
					} );
				}
			}

			if ( data.type == 'submit' ) {

				// Collego la funzione di callback ai `submit`
				input.click( function () {
					validateInputs( self, settings.submit, data.value );
				} );

			} else if ( data.type == 'button' ) {

				// Collego la funzione di callback ai `button`
				if ( data.callback )
					input.click( data.callback );

			} else {

				/*
					Quando l'utente preme un tasto in un input rimuovo
					momentaneamente la classe `invalid`.
					Quando, invece, è premuto il tasto `invio` sposto
					il focus sul primo input vuoto o errato, oppure,
					se non c'è ne sono, sottoscrivo il dialogo.
				*/
				input.keypress( function ( event ) {

					input.removeClass( 'invalid' );

					if ( event.keyCode == $.keyCode[ 'ENTER' ] ) {

						input.change();
						validateInputs( self, settings.submit, data.value, true );
					}
				} );
			}

			// Aggiungo l'input alla lista
			return input;
		} );


		// Memorizzo le funzioni collegate agli eventi
		this.callback = { open: settings.open, close: settings.close };
	};


	/** Scorciatoia per i metodi pubblici della classe **/
	Dialog.fn = Dialog.prototype; 

	/** Eredito i metodi pubblici dalla classe contenitrice **/
	$.extend( Dialog.fn, $.dom.prototype )


	/* =================== METODI PUBBLICI =================== */

	$.extend( Dialog.fn, {

		/** Muove la finesta del dialogo al centro di una finestra genitore **/
		center: function ( parent ) {

			parent = $(parent);

			// Mi assicuro che la finestra del dialogo sia visibile
			this.show();
			this.content.show();

			// Imposto la nuova posizione assoluta
			var x = parent.width() / 2 - this.width() / 2,
				y = parent.height() / 2 - this.height() / 2;

			this.position( x, y );

			return this;
		},

		/** Disabilita/abilita tutti gli input del dialogo **/
		enable: function () {

			$.each( this.inputs, function () { this.disabled( false ); } );
			return this;
		},

		/** Disabilita/abilita tutti gli input del dialogo **/
		disable: function () {

			$.each( this.inputs, function () { this.disabled( true ); } );
			return this;
		},

		/** Contrassegna tutti gli input come validi **/
		valid: function () {

			$.each( this.inputs, function () {

				if ( !$.inArray( this.attr( 'type' ), [ 'button', 'submit' ] ) )
					setInvalid( this, false );
			} );

			return this;
		},

		/** Contrassegna tutti gli input come invalidi **/
		invalid: function () {

			$.each( this.inputs, function () {

				if ( !$.inArray( this.attr( 'type' ), [ 'button', 'submit' ] ) )
					setInvalid( this, true );
			} );

			return this;
		},

		/** Apre la finesta del dialogo **/
		open: function ( duration, callback ) {

			var self = this;

			// Eseguo la funzione collegata all'evento di apertura
			if ( $.isDefined( this.callback.open ) )
				this.callback.open.call( this );

			// Mi assicuro che il dialogo sia visibile
			this.show();
			this.content.show();

			// Calcolo l'incremento dell'animazione
			var height		= this.height(),
				steps		= duration / anim_rate,
				increment	= height / steps;

			// Nasconto i contenuti del dialogo fino alla fine
			// dell'animazione
			this.content.hide();

			var current = 0;

			// Avvio l'animazione
			$.recall( function () {

				current += increment;

				if ( current < height )
					self.height( current );

				else {

					// Cancello l'altezza inline e mostro il contenuto del dialogo
					self.height( '' );
					self.content.show();

					// Imposto il focus sul primo input
					$.first( self.inputs ).focus();

					// Eseguo la funzione di callback
					if ( $.isDefined( callback ) )
						callback.call( self );

					return true;
				}

			}, anim_rate );

			return this;
		},

		/** Chiude la finestra del dialogo **/
		close: function ( duration, callback ) {

			var self = this;

			// Mi assicuro che il dialogo sia visibile
			this.show();
			this.content.show();

			// Calcolo l'incremento dell'animazione
			var height		= this.height(),
				steps		= duration / anim_rate,
				increment	= height / steps;

			var current = height;

			// Nascondo il contenuto del dialogo e ne imposto
			// l'altezza iniziale (altrimenti, essendo vuoto, collasserebbe)
			this.content.hide();
			this.height( current );

			$.recall( function () {

				current -= increment;

				if ( current > 0 )
					self.height( current );

				else {

					// Eseguo la funzione collegata all'evento di chiusura
					if ( $.isDefined( self.callback.close ) )
						self.callback.close.call( self );

					// Nascondo il dialogo e cancello l'altezza inline
					self.hide();
					self.height( '' );

					// Eseguo la funzione di callback
					if ( $.isDefined( callback ) )
						callback.call( self );

					return true;
				}

			}, anim_rate );

			return this;
		},

		/** Scuoto la finesta del dialogo **/
		shake: function ( range, duration, callback ) {

			var self = this;

			// Calcolo l'incremento del movimento e, per un effetto
			// più "sgraziato", diminuisco la frequenza dell'animazione
			var steps		= duration / 60,
				increment	= range / steps;

			var left		= this.left(),
				direction	= 1,
				current		= range;

			// Avvio l'animazione
			$.recall( function () {

				direction = -direction;
				current -= 1;
				self.left( left + current * direction );

				if ( current <= 0 ) {

					if ( $.isDefined( callback ) )
						callback.call( self );

					return true;
				}

			}, 60 );

			return this;
		}
	} );


	/** Ritorno una funzione che instanzia la classe **/
	return ( function ( settings ) {
		return new Dialog( settings );
	} );
} );
