/*
    Title --- chat.js

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


/** Modulo della Chat **/
$.define( 'chat', function ( $ ) {

	// Espressioni regolari
	var re_username	= /^[a-z][a-z0-9]{4,31}$/i,
		re_password	= /^[\S\s]{4,32}$/i,
		re_channel	= /^[a-z][a-z0-9\-_]{2,15}$/;

	// Lista dei bbcode
	var bbcodes = {

		'b'	: 'bold',
		'i'	: 'italic',
		'u'	: 'underline',
		's'	: 'strike'
	};

	// Codici degli smiles
	var emoticon_codes = {

		':)'		: 'smile',
		':('		: 'sad',
		';)'		: 'wink',
		':|'		: 'neutral',
		':D'		: 'cheesygrin',
		':P'		: 'razz',
		':O'		: 'surprised',
		':\'('		: 'cry',
		':S'		: 'confused',
		':x'		: 'mad',
		'8-)'		: 'cool',
		':lol:'		: 'lol',
		':shock:'	: 'eek',
		':evil:'	: 'evil',
		':oops:'	: 'redface',
		':roll:'	: 'rolleyes',
		':twisted:'	: 'twisted'
	};


	/* =================== CLASSE DELLA CHAT =================== */

	var Chat = function ( components ) {

		// Riferimento globale all'istanza
		var self = this;

		// Informazioni sull'utente utilizzato
		var cur_user;

		// Canale corrente e lista dei canali aperti
		var cur_channel, channel_list = [];

		// Intervallo di aggiornamento (ms)
		var update_delay = 3000;

		// Dimensione massima del messaggio
		var maxlength = 1024;

		// Formato delle date nei messaggi
		var fmt_message_time = 'D g:i a';

		// Flag di controllo che indica se
		// la finestra principale è disabilitata
		var disabled_window = true;

		// Ricavo le componenti della chat
		var window		= $( components.window ),
			tabs		= $( components.tabs ),
			history		= $( components.history ),
			users		= $( components.users ),
			toolbar		= $( components.toolbar ),
			entry		= $( components.entry ),
			statusbar	= $( components.statusbar );


		// Id della funzione di aggiornamento
		var update_timer;

		// Ultima digitazione nella casella di testo
		var last_typing = 0;

		// Array dei tasti premuti nella casella d'inserimento
		var entry_keys = [];


		/* =================== FINESTRA DI REGISTRAZIONE =================== */

		var signup_dialog = $.dialog( {

			id:		'signup',
			style:	{ width: '14em' },

			inputs: {

				username:	{ type: 'text',		label: 'User',		validate: re_username },
				password:	{ type: 'password',	label: 'Password',	validate: re_password },
				confirm:	{ type: 'password',	label: 'Conferma',	validate: 'password' },
				signup:		{ type: 'submit',	value: 'Registrati'	}
			},

			open: function () {

				disabled_window = false;

				this
					.center( window )
					.enable();
			},

			close: function () { disabled_window = true; },

			submit: function () {

				this.disable();

				// Estraggo i parametri usati per la registrazione
				var user		= this.inputs['username'].val(),
					password	= this.inputs['password'].val(),
					confirm		= this.inputs['confirm'].val();

				// Effettuo la richiesta al server
				self.signup( {

					user:		user,
					password:	password,
					channels:	'main',

					success: function () {
						signup_dialog.close( 300, enableEntry );
					},

					fail: function () {

						signup_dialog
							.invalid()
							.shake( 10, 500, function () {
								signup_dialog.enable();
							} );
					}
				} );
			}
		} );


		/* =================== FINESTRA DI AUTENTICAZIONE =================== */

		var signin_dialog = $.dialog( {

			id:		'signin',
			style:	{ width: '14em' },

			inputs: {

				username:	{ type: 'text',		label: 'User',		validate: re_username	},
				password:	{ type: 'password',	label: 'Password',	validate: re_password	},
				signin:		{ type: 'submit',	value: 'Accedi' },

				signup: {

					type:	'button',
					value:	'Registrati',

					/*
						Quando l'utente preme sul pulsante "Registrati"
						passo al dialogo per la registrazione di un nuovo utente
						copiando il nome utente e la password dalla finestra corrente
					*/
					callback: function () {

						disabled_window = true;

						var username = signin_dialog.inputs['username'].val(),
							password = signin_dialog.inputs['password'].val();

						signup_dialog.inputs['username'].val( username ),
						signup_dialog.inputs['password'].val( password ),

						// Dopo una piccola pausa passo al secondo dialogo
						signin_dialog.close( 300, function () {
							$.recall( function () { signup_dialog.open( 300 ); return true; }, 300 );
						} );
					}
				}
			},

			open: function () {

				disabled_window = false;

				this
					.center( window )
					.enable();
			},

			close: function () { disabled_window = true; },

			submit: function () {

				this.disable();

				// Estraggo i parametri usati per l'autenticazione
				var user		= this.inputs['username'].val(),
					password	= this.inputs['password'].val();

				// Effettuo la richiesta al server
				self.signin( {

					user:		user,
					password:	password,
					channels:	'main',

					success: function () {
						signin_dialog.close( 300, enableEntry );
					},

					fail: function () {

						signin_dialog
							.invalid()
							.shake( 10, 500, function () {
								signin_dialog.enable();
							} );
					}
				} );
			}
		} );


		/* =============== FINESTRA PER L'APERTURA DI UN CANALE =============== */

		var open_dialog = $.dialog( {

			id:		'open',
			style:	{ width: '18.3em' },

			inputs: {

				name:	{ type: 'text',		label: 'Nome del canale',	validate: re_channel },
				submit:	{ type: 'submit',	value: 'Apri' }
			},

			open:	function () { disabled_window = false; this.center( window ); },
			close:	function () { disabled_window = true; },

			submit: function () {

				// Estraggo il nome del canale ed effettuo la richiesta al server
				var input = this.inputs['name'];
				self.openChannel( input.val() );
				input.val('');

				this.close( 300 );
			}
		} );


		/* =============== FINESTRA DI USCITA =============== */

		var signout_dialog = $.dialog( {

			id:		'signout',
			style:	{ width: '17em' },

			inputs: {

				signout:	{ type: 'submit', value: 'Conferma'	},
				cancel:		{ type: 'submit', value: 'Annulla'	}
			},

			open:	function () { disabled_window = false; this.center( window ); },
			close:	function () { disabled_window = true; },

			submit: function ( value ) {

				if ( value == 'Conferma' )
					self.signout();

				this.close( 300 );
			}
		} );

		// Inserisco il messaggio della finestra
		signout_dialog.content.prepend( '<p>Desideri interrompere la sessione?</p>' )


		/* =================== METODI PRIVATI =================== */

		/** Inizializza la barra delle schede **/
		var initTabs = function () {

			tabs
				.append( '<div></div>' )
					.parent()
				.append( '<a class="icon ico-add"></a>' )
					.click( function () {

						if ( cur_user && disabled_window )
							open_dialog.open( 300 );
					} )
					.parent()
				.append( '<a class="icon ico-signin"></a>' )
					.click( function () {

						if ( disabled_window ) {

							if ( !cur_user )
								signin_dialog.open( 300 );
							else
								signout_dialog.open( 300 );
						}
					} )
					.parent()
				.append( '<a class="icon ico-help" href="manuale.htm"></a>' );
		};

		/** Abilita la casella d'ingresso **/
		var enableEntry = function () {

			entry
				.disabled( false )
				.focus()
				.blur();
		};

		/** Aggiunge un nuovo pulsante alla barra degli strumenti **/
		var addToolButton = function ( code, style ) {

			toolbar
				.append( '<a class="icon"></a>' )
					.addClass( 'ico-' + style )
					.click( function () {

						if ( !entry.disabled() ) {

							entry
								.trigger( 'focus' )		// <-- IE <= 8 non permette il focus immediato
								//.focus()
								.val( entry.val() + code + ' ' )
								.focus();
						}
					} );
		};

		/** Popola la barra degli strumenti **/
		var initToolbar = function () {

			// Inserisco i pulsanti del bbcode e delle emoticon
			$.each( bbcodes, function ( code, style ) {
				addToolButton( '[' + code + '][/' + code + ']', style );
			} );

			$.each( emoticon_codes, function ( code, emoticon ) {
				addToolButton( code, emoticon );
			} );
		};

		/** Inizializza la casella di inserimento dei messaggi **/
		var initEntry = function () {

			entry
				.val('')
				.disabled( true );

			// Eventi da tastiera
			entry.keydown( function ( event ) {

				// Aggiorno la lista dei tasti premuti
				entry_keys[ event.keyCode ] = true;

				// Se viene premuto il tasto `invio` mentre il tasto
				// `shift` è sollevato, invio il messaggio al server
				// e pulisco la casella d'inserimento
				if ( ( $.keyCode[ 'ENTER' ] in entry_keys ) &&
						!( $.keyCode[ 'SHIFT' ] in entry_keys ) ) {

					var text = entry.val();

					// Limito le dimensioni del messaggio
					if ( text.length > maxlength )
						text = text.substring( 0, maxlength );

					if ( text ) {

						self.send( text );
						entry.val('');
					}

					$.preventDefault( event );
				}
			} );

			entry.keyup( function ( event ) {

				// Aggiorno la lista dei tasti premuti
				if ( event.keyCode in entry_keys )
					delete entry_keys[ event.keyCode ];
			} );

			entry.keypress( function ( event ) {

				// Memorizzo l'ultima digitazione dell'utente
				last_typing = $.timestamp();
			} );

			// Inserisco alcuni messaggi interattivi per l'utente
			entry.focus( function () {

				if ( entry.hasClass( 'empty' ) )
					entry
						.val('')
						.removeClass( 'empty' );
			} );

			entry.blur( function () {

				if ( !entry.val() )
					entry
						.val( 'Scrivi qui il tuo messaggio...' )
						.addClass( 'empty' );
			} );
		};

		/** Prepara la lista dei canali affiché possano essere inviati come parametro **/
		var parseChannelList = function ( channels ) {

			return $.isArray( channels ) ? channels.join(',') : channels;
		};

		/** Interpreta il testo del messaggio ed inserisce decorazioni, link e emoticons **/
		var parseText = function ( text ) {

			text = $.trim( text.replace( /\r/g, '' ) );

			// Converto i caratteri speciali in entità HTML
			text = $.charsToEntities( text );

			// Costruisco i paragrafi del messaggio
			text = '<p>' + text.replace( /(\n+)/ig, '</p><p>' ) + '</p>';

			// Bbcode
			$.each( bbcodes, function ( code, style ) {
				text = text.replace(
					new RegExp( '\\[' + code + '\\]([\\s\\S]*?)\\[\\/' + code + '\\]', 'img' ),
					'<span class="bbcode-' + style + '">$1</span>'
				);
			} );

			// Link ai siti web e ai canali della chat
			/*
				Utilizzo un attributo temporaneo per contrassegnare i link
				dei canali che devono essere ancora attivati.
				Tale attributo non dovrebbe essere un problema perché,
				stando alle specifiche del W3C:

				- If a user agent encounters an attribute it does not recognize,
				  it should ignore the entire attribute specification (i.e., the attribute and its value).

				# http://www.w3.org/TR/html401/appendix/notes.html#notes-invalid-docs
			*/
			text = text
					.replace( /#([a-z][a-z0-9\-_]{2,15})/mg, '<a class="channel-link" channel="$1">#$1</a>' )
					.replace( /((http|ftp)s?:[\w-\.\/\?&=\+;]+)/ig, '<a href="$1">$1</a>' );

			// Emoticons
			$.each( emoticon_codes, function ( code, emoticon ) {
				text = text.replace(
					new RegExp( code.replace( /([.?*+^$[\]\\(){}|-])/g, '\\$1' ), 'mg' ),
					'<img src="emoticons/' + emoticon + '.gif" alt="' + code + '">'
				);
			} );

			return text;
		};

		/** Aggiunge una notifica nella barra di stato **/
		var notify = function ( text, type, append ) {

			// Se la statusbar non è stata definita, uso la console di javascript
			if ( !statusbar.nodeList ) {

				$.console( text, type );
				return;
			}

			if ( !append )
				statusbar.html( '<span>' + text + '</span>' );
			else
				statusbar
					.append( '<span></span>' )
					.text( text );
		};

		/** Aggiorna la lista degli utenti di un canale **/
		var updateUserList = function ( channel, data ) {

			var list = $( '#users_' + channel ).clean();

			$.each( data, function ( i, user ) {

				var elem = list
							.append( '<span></span>' )
							.text( user.name );

				if ( user.name == cur_user.name )
					elem.css( 'font-weight', 'bold' );

				else if ( parseInt( user.typing ) )
					elem.css( 'font-style', 'italic' );
			} );
		};

		/** Aggiunge un messaggio in un canale **/
		var addMessage = function ( channel, data ) {

			// Interpreto il testo
			var code = parseText( data.text );

			// Ricavo il contenitore dei messaggi del canale
			var history_ch = $( '#history_' + channel );

			// Ricavo l'autore e il timestamp dell'ultimo messaggio
			var last_author		= history_ch.data( 'last_author' ),
				last_timestamp	= history_ch.data( 'last_timestamp' );

			// Se l'autore del messaggio è cambiato o sono passati più di un minuto,
			// costruisco un nuovo contenitore per il messaggio
			if ( last_author != data.author_id || data.timestamp > last_timestamp + 60 ) {

				history_ch
					.append( '<div></div>' )
						.html( code )
						.prepend( '<div></div>' )
							.append( '<span class="author"></span>' )
								.text( data.author_name )
								.parent()
							.append( '<span class="time"></span>' )
								.text( $.date( fmt_message_time, data.timestamp ) );

				history_ch
					.data( 'last_author', data.author_id )
					.data( 'last_timestamp', data.timestamp );

			// Altrimenti aggiorno il contenuto dell'ultimo messaggio arrivato
			} else {

				history_ch
					.child( 'div' )
						.last()
						.addHtml( code );
			}

			// Attivo i link dei canali
			$( '.channel-link' )
				.each( function ( i, node ) {

					node = $(node);

					if ( node.hasAttr( 'channel' ) ) {

						var link_ch = node.attr( 'channel' );

						node
							.removeAttr( 'channel' )
							.click( function () { openChannel( link_ch ); } );
					}
				} );

			// Se il canale non è quello corrente, notifico i nuovi messaggi nella scheda
			if ( cur_channel != channel ) {

				$( '#tab_' + channel )
					.child( '.status' )
						.removeClass( 'ico-idle' )
						.addClass( 'ico-news' );

			// Altrimenti mi limito a mostrare l'ultimo messaggio inserito
			} else history_ch.scrollTop( history_ch.scrollHeight() );
		};

		/** Seleziona un canale tra quelli aperti **/
		var showChannel = function ( channel ) {

			var tab = $( '#tab_' + channel );

			if ( !tab.hasClass( 'selected' ) ) {

				// Deseleziona tutte le schede e seleziona quella indicata
				tabs
					.child( 'div' )
						.child( 'div' )
							.removeClass( 'selected' );

				tab
					.addClass( 'selected' )
					.child( '.status' )
						.removeClass( 'ico-news' )
						.addClass( 'ico-idle' );

				// Mostro le componenti del canale
				// e ripristino lo scrolling del div
				$( '#users_' + channel ).show();

				var history_ch = $( '#history_' + channel );

				history_ch
					.show()
					.scrollTop( history_ch.data( 'scroll' ) );

				// Memorizzo la posizione dello scrolling
				// e nascondo le componenti del vecchio canale
				if ( cur_channel ) {

					$( '#users_' + cur_channel ).hide();

					var history_ch = $( '#history_' + cur_channel );

					history_ch
						.data( 'scroll', history_ch.scrollTop() )
						.hide();
				}

				// Memorizzo il nuovo canale
				cur_channel = channel;
			}
		};

		/** Apre un nuovo canale **/
		var openChannel = function ( channel ) {

			// Apro più canali alla volta
			if ( $.isArray( channel ) ) {

				$.each( channel, function () {
					openChannel( this );
				} );

				return;
			}

			// Controllo la validità del nome del canale
			if ( !re_channel.test( channel ) ) {

				notify( 'Nome del canale errato.', 'error' );
				return;
			}

			// Controllo che il canale non sia già stato aperto
			if ( !$.inArray( channel, channel_list ) ) {

				channel_list.push( channel );

				// Costruisco la scheda del canale, la sua lista utenti
				// e il contenitore dei messaggi
				tabs
					.child( 'div' )
						.append( '<div></div>' )
							.id( 'tab_' + channel )
							.append( '<span></span>' )
								.text( '#' + channel )
								.click( function () { showChannel( channel ); } )
								.parent()
							.append( '<a class="status icon ico-idle"></a>' )
								.parent()
							.append( '<a class="action icon ico-close"></a>' )
								.click( function ( event ) {
									closeChannel( channel );
								} );

				history
					.append( '<div></div>' )
						.id( 'history_' + channel )
						.hide();

				users
					.append( '<div class="menu"></div>' )
						.id( 'users_' + channel )
						.hide();
			}

			// Mostro il canale
			showChannel( channel );
		};

		/** Chiude un canale aperto **/
		var closeChannel = function ( channel ) {

			// Controllo che il canale sia effettivamente aperto
			if ( $.inArray( channel, channel_list ) ) {

				channel_list = $.remove( channel, channel_list );

				// Cancello le strutture collegate al canale
				$( '#tab_'		+ channel ).destroy();
				$( '#users_'	+ channel ).destroy();
				$( '#history_'	+ channel ).destroy();

				// Se è stato cancellato il canale corrente,
				// mostro il primo tra quegli rimasti
				if ( channel == cur_channel && channel_list.length ) {

					cur_channel = null;
					showChannel( channel_list[0] );
				}
			}
		};

		/** Restituisce il messaggio collegato al numero dell'errore **/
		var textError = function ( errno ) {

			switch ( errno ) {

				case 1:		return 'Richiesta sconosciuta.';
				case 2:		return 'Parametri della richiesta errati.';
				case 3:		return 'Richiesta troppo ravvicinata.';
				case 4:		return 'Operazione non consentita: utente non autenticato.';
				case 5:		return 'Registrazione fallita: username già registrato.';
				case 6:		return 'Autenticazione fallita: username o password errati.';
				case 7:		return 'Nome del canale errato.';
				case 7:		return 'Impossibile inviare il messaggio.';
				case 101:	return 'Errore interno al server.';

				default:	return 'Errore sconosciuto.';
			}
		};

		/** Interpreta la risposta del server ed aggiorna lo stato della chat **/
		var parseResponse = function ( response ) {

			// Convero la risposta del server in un'istanza
			response = $.parseJSON( response );

			// Gestisco eventuali errori
			if ( response.code != 0 ) {

				var error = textError( response.code );

				if ( error )
					notify( error, 'error' );

				// Interrompo la sessione sull'utente
				stop();

				return response.code;
			}

			// Intepreto le informazioni contenute nella risposta
			$.each( response.data, function ( id, data ) {

				/* Aggiornamento dei dati dell'utente (per esempio dopo l'autenticazione) */
				if ( id == 'user' ) {

					cur_user = data;

				/* Informazioni su un canale */
				} else if ( id.charAt(0) == '#' ) {

					var channel = id.slice(1);

					if ( $.inArray( channel, channel_list ) ) {

						/* Lista degli utenti del canale */
						if ( data.users )
							updateUserList( channel, data.users );

						/* Nuovi messaggi del canale */
						if ( data.messages ) {

							$.each( data.messages, function ( i, message ) {

								addMessage( channel, {

									author_id:		message.author_id,
									author_name:	message.author_name,
									text:			message.text,
									timestamp:		parseInt( message.timestamp )
								} );
							} );
						}
					}
				}
			} );

			return 0;
		};

		/** Avvia il loop di aggiornamento **/
		var run = function () {

			// Richiamo la funzione di aggiornamento ad intervalli regolari
			update_timer = $.recall( function () {

				// Se l'utente non è più connesso, interrompo l'aggiornamento della chat
				if ( !cur_user )
					return true;

				// Contatta il server e aggiorna lo stato della chat
				if ( channel_list ) {

					var data = { channels: parseChannelList( channel_list ) };

					// Se l'utente sta scrivendo un messaggio, lo faccio sapere al server
					if ( $.timestamp() < last_typing + 2 )
						data[ 'typing' ] = cur_channel;

					$.ajax.post( 'chat.php?mode=update', data, function ( response, status, req ) {
						parseResponse( response );
					} );
				}

			}, update_delay );
		};

		/** Interrompo la sessione dell'utente **/
		var stop = function () {

			// Chiudo tutti i canali aperti
			$.each( channel_list, function () {
				closeChannel( this );
			} );

			// Cancello le informazione sull'utente
			cur_user	= null;
			cur_channel	= null;

			// Disabilito la casella d'ingresso
			entry
				.val('')
				.disabled( true );

			// Fermo il loop di aggiornamento
			if ( update_timer ) {

				$.stopCall( update_timer );
				update_timer = null;
			}
		};


		/* =================== METODI PUBBLICI =================== */

		// Costruisco i metodi pubblici della classe
		$.extend( this, {

			/** Inizializza le componenti della chat **/
			init: function () {

				// Inizializzo le componenti della chat
				initTabs();
				initToolbar();
				initEntry();

				notify( 'Pronto all\'uso!' );
			},

			/** Registra un nuovo utente **/
			signup: function ( args ) {

				notify( 'Registrazione in corso...' );

				// Invio la richiesta al server
				$.ajax.post( 'chat.php?mode=signup', {

					user:		args.user,
					password:	args.password,
					channels:	parseChannelList( args.channels )

				}, function ( data, status, req ) {

					// Se l'autenticazione è riuscita avvio il loop di aggiornamento
					if ( parseResponse( data ) ) {

						args.fail.call( self );
						return
					}

					notify( 'riuscita.', 'info', true );

					// Apro i canali specificati
					if ( $.isDefined( args.channels ) )
						openChannel( args.channels );

					// Avvio il loop di aggiornamento
					run();

					args.success.call( self );
				} );
			},

			/** Autentica l'utente **/
			signin: function ( args ) {

				notify( 'Autenticazione in corso...' );

				// Invio la richiesta al server
				$.ajax.post( 'chat.php?mode=signin', {

					user:		args.user,
					password:	args.password,
					channels:	parseChannelList( args.channels )

				}, function ( data, status, req ) {

					// Interpreto la risposta e gestisco eventuali errori
					if ( parseResponse( data ) ) {

						args.fail.call( self );
						return
					}

					notify( 'riuscita.', 'info', true );

					// Apro i canali specificati
					if ( $.isDefined( args.channels ) )
						openChannel( args.channels );

					// Avvio il loop di aggiornamento
					run();

					args.success.call( self );
				} );
			},

			/** Effettua il logout **/
			signout: function ( callback ) {

				$.ajax.get( 'chat.php?mode=signout', function () {

					// Interrompo la sessione dell'utente
					stop();

					notify( 'Disconnesso.' );

					if ( $.isDefined( callback ) )
						openChannel( callback );
				} );
			},

			/** Seleziona/apre un canale **/
			openChannel: openChannel,

			/** Invia un nuovo messaggio **/
			send: function ( text ) {

				if ( !channel_list ) {

					notify( 'Nessun canale selezionato.', 'warn' );
					return;
				}

				notify( 'Invio in corso...' );

				// Invio la richiesta al server
				$.ajax.post( 'chat.php?mode=write', {

					channel:	cur_channel,
					text:		text,
					channels:	parseChannelList( channel_list )

				}, function ( response, status, req ) {

					if ( !parseResponse( response ) )
						notify( 'inviato (' + text.length + ' caratteri).', 'info', true );
				} );
			}
		} );
	};


	return Chat;
} );

