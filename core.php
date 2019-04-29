<?php

/*
    Title --- core.php

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


/** GESTORE DELLA CHAT **/

class Core {

	// Istanze dei gestori
	private $config, $session, $db;

	// Risposta del sistema
	/*
		{
			code:	<CODICE DI RISPOSTA>,
			data:	{

				#<CHANNEL>:	{

					<TIPO>:	<INFORMAZIONE>,
					...
				},
				...
			}
		}

		= Codici di controllo =
		000: nessun errore
		001: richiesta sconosciuta
		002: parametri errati
		003: troppe richieste ravvicinate
		004: utente non autenticato
		005: utente già registrato
		006: autenticazione errata
		007: nome del canale errato
		008: impossibile inviare il messaggio
		101: problemi interni al server
	*/
	private $response;


	/** Metodo costruttore **/
	function __construct() {

		// Rendo accessibile le configurazioni
		global $config;
		$this->config	= &$config;

		// Creo le istanze dei gestori
		$this->session	= new Session();
		$this->db		= new Database();

		// Mi connetto al server SQL
		$this->db->connect(	$this->config['DB_HOST'],
							$this->config['DB_USER'],
							$this->config['DB_PASSWORD'] );

		$this->db->selectDB( $this->config['DB_NAME'] );

		// Rimuovo le informazioni sensibili
		unset( $this->config['DB_PASSWORD'] );
	}

	/** Metodo distruttore **/
	function __destruct() {

	}

	/** Ricava e formatta i parametri d'ingresso **/
	// es. rules => 'i:integervar, d:doublevar, e:escapedvar, ...'
	public function input( $rules, &$data ) {

		$data = array();

		preg_match_all( '/\b([idbes]|ch):(\w+)\b/', $rules, $matches, PREG_SET_ORDER );

		foreach ( $matches as $m ) {

			$type = $m[1];
			$name = $m[2];

			if ( !isset( $_POST[ $name ] ) ) {

				$this->response['code'] = 2;
				break;
			}

			switch ( $type ) {

				case 'b':
				case 'i':	{ $data[ $name ] = intval( $_POST[ $name ] ); break; }
				case 'd':	{ $data[ $name ] = doubleval( $_POST[ $name ] ); break; }
				case 's':	{ $data[ $name ] = $_POST[ $name ]; break; }
				case 'e':	{ $data[ $name ] = $this->db->escape( $_POST[ $name ] ); break; }
				case 'ch':	{ $data[ $name ] = $this->prepareChannels( $_POST[ $name ] ); }

				default: break;
			}
		}

		return ( $this->response['code'] == 0 );
	}

	/** Aggiunge un'informazione alla risposta del sistema **/
	public function output( $type, $data ) {

		$this->response['data'][ $type ] = $data;
	}

	/** Prepara i nomi dei canali **/
	public function prepareChannels( $string ) {

		$list = explode( ',', $string );

		foreach ( $list as $channel ) {

			// Mi assicuro che il nome del canale sia composto da un minimo di 5 caratteri
			// e contenga solo caratteri alfanumerici
			if ( !preg_match( '/^[a-z][a-z0-9\-_]{2,15}$/', $channel ) ) {

				$this->response['code'] = 7;
				break;
			}
		}

		return $list;
	}

	/** Aggiorna la lista dei canali aperti **/
	public function updateChannels( $list ) {

		// Aggiorno l'ultimo messaggio dei canali appena aperti
		// e rimuovo dalla sessione quelli chiusi
		foreach ( $list as $channel ) {

			if ( !$this->session->hasElement( 'last_message', $channel ) ) {

				$last = $this->db->lastMessage( $channel );
				$last = $last ? $last['id'] : 0;
				$this->session->setElement( 'last_message', $channel, $last );
			}
		}

		foreach ( $this->session->get( 'last_message' ) as $channel ) {

			if ( !in_array( $channel, $list ) )
				$this->session->removeElement( 'last_message', $channel );
		}
	}

	/** Registra un nuovo utente **/
	public function signup() {

		if ( $this->input( 's:user, s:password', $args ) ) {

			// Controllo il formato del nome e della password
			if ( !preg_match( '/^[a-z][a-z0-9]{2,31}$/i', $args['user'] ) &&
				 !preg_match( '/^[\S\s]{4,32}$/i', $args['password'] ) ) {

				$this->response['code'] = 2;
				return;
			}

			// Registro il nuovo utente
			if ( !$response = $this->db->addUser( $args['user'], $args['password'] ) ) {

				$this->response['code'] = 5;
				return;
			}

			$args['password'] = $this->db->escape( $args['password'] );

			// Leggo le informazioni del nuovo utente
			$user = $this->db->readUser( $this->db->lastId() );

			// Memorizzo le informazioni nella sessione
			$this->session->set( 'user_id', $user['id'] );
			$this->session->set( 'user_name', $user['name'] );
			$this->session->set( 'last_message', array() );

			// Metto in uscita le informazioni sull'utente
			$this->output( 'user', $user );
		}
	}

	/** Autentica un utente **/
	public function signin() {

		if ( $this->input( 'e:user, e:password', $args ) ) {

			if ( !$user = $this->db->signinUser( $args['user'], $args['password'] ) ) {

				$this->response['code'] = 6;
				return;
			}

			// Memorizzo le informazioni nella sessione
			$this->session->set( 'user_id', $user['id'] );
			$this->session->set( 'user_name', $user['name'] );
			$this->session->set( 'last_message', array() );

			// Metto in uscita le informazioni sull'utente
			$this->output( 'user', $user );
		}
	}

	/** Annulla l'autenticazione di un utente **/
	public function signout() {

		// Cancello le informazioni della sessione
		$this->session->remove( 'user_id' );
		$this->session->remove( 'user_name' );
		$this->session->remove( 'last_message' );
	}

	/** Scrive un messaggio in un canale **/
	public function write() {

		if ( $this->input( 'ch:channel, s:text', $args ) ) {

			$author = $this->session->get( 'user_id' );
			$channel = $args['channel'][0];

			// Limito la dimensione del messaggio
			$maxlength = $this->config['MESSAGE_MAXLENGTH'];

			$text = strlen( $args['text'] ) > $maxlength ? substr( $args['text'], 0, $maxlength ) : $args['text'];
			$text = $this->db->escape( $text );

			// Registro il messaggio nel database
			if ( !$this->db->addMessage( $author, $channel, $text ) )
				$this->response['code'] = 8;
		}
	}

	/** Aggiorna lo stato della chat **/
	public function update() {

		if ( $this->input( 'ch:channels', $args ) ) {

			$author	= $this->session->get( 'user_id' );
			$ip		= $_SERVER['REMOTE_ADDR'];

			// Aggiorno la lista dei canali dell'utente
			$this->updateChannels( $args['channels'] );

			$typing = null;

			// Controllo se al momento l'utente sta scrivendo in qualche canale
			if ( isset( $_POST[ 'typing' ] ) ) {

				$typing = $this->prepareChannels( $_POST[ 'typing' ] );
				$typing = $typing[0];
			}

			// Leggo la lista degli utenti e i nuovi messaggi nel canale
			// e aggiorno lo stato dell'utente
			foreach ( $args['channels'] as $channel ) {

				$data = array();

				if ( $users = $this->db->readUserList( $channel ) )
					$data['users'] = $users;

				$last = $this->session->getElement( 'last_message', $channel );

				if ( $messages = $this->db->readMessageList( $channel, $last ) ) {

					$data['messages'] = $messages;

					$last = end( $messages );
					$this->session->setElement( 'last_message', $channel, $last['id'] );
				}

				// Aggiorno le attività dell'utente nel canale
				$this->db->updateActivity( $author, $channel, $ip, $channel == $typing );

				// Metto in uscita le informazioni sul canale
				$this->output( "#$channel", $data );
			}
		}
	}

	/** Eseguo Guacamole **/
	public function perform() {

		// Risposta del sistema
		$this->response = array( 'code' => 0, 'data' => array() );

		// Verifico la connessione al database
		if ( $this->db->connected() ) {

			if ( isset( $_REQUEST['mode'] ) ) {

				$mode = $_REQUEST['mode'];

				// Processo la richiesta dell'utente
				switch ( $mode ) {

					case 'signup':	{ $this->signup();	break; }
					case 'signin':	{ $this->signin();	break; }

					default: {

						// Mi assicuro che l'utente sia autenticato
						// per poter eseguire le altre funzioni
						if ( $this->session->get( 'user_id' ) ) {

							switch ( $mode ) {

								case 'signout':	{ $this->signout();	break; }
								case 'write':	{ $this->write();	break; }
								case 'update':	{ break; }

								default: { $this->response['code'] = 1; break; }
							}

						} else {

							if ( in_array( $mode, array( 'signout', 'write', 'update' ) ) )
								$this->response['code'] = 4;
							else
								$this->response['code'] = 1;
						}

						break;
					}
				}

				// Se non ci sono stati errori e l'utente è ancora loggato
				// cerco tutti gli aggiornamenti della chat e gli aggiungo alla risposta
				if ( $this->session->get( 'user_id' ) && $this->response['code'] == 0 )
					$this->update();
			}

		} else $this->response['code'] = 101;


		// Scrivo la risposta in uscita
		header( 'Cache-Control: no-cache, must-revalidate' );
		header( 'Content-type: application/json; charset=utf-8' );

		echo json_encode( $this->response );
	}
}

?>
