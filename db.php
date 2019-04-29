<?php

/*
    Title --- db.php

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


/** GESTORE DEL DATABASE **/

class Database {

	// Gestore delle configurazioni
	private $config;

	// Istanza della connessione
	private $connection = NULL;

	/** Metodo costruttore **/
	function __construct() {

		// Rendo accessibile le configurazioni
		global $config;

		// Rendo accessibile il gestori delle configurazioni attraverso un membri interno
		$this->config = &$config;
	}

	/** Metodo distruttore **/
	function __destruct() {

		// Chiudo la connessione al database
		$this->close();
	}

	/** Connette il gestore ad un server SQL **/
	public function connect( $host, $user, $password ) {

		if ( !$this->connection = @mysql_connect( $host, $user, $password ) )
			$this->debug( 'Database->query():' );

		@mysql_set_charset( 'utf8', $this->connection ); 

		return $this->connection;
	}

	/** Controlla se il gestore è connesso al server SQL **/
	public function connected() {

		return ( $this->connection == true );
	}

	/** Seleziona un database **/
	public function selectDB( $db_name ) {

		return @mysql_select_db( $db_name, $this->connection );
	}

	/** Aggiunge le sequenze di escape in una stringa **/
	public function escape( $string ) {

		return @mysql_real_escape_string( $string );
	}

	/** Esegue una query sul database e ne memorizza la risposta **/
	public function query( $query ) {

		if ( !$response = @mysql_query( $query, $this->connection ) )
			$this->debug( 'Database->query():' );

		return $response;
	}

	/* Ritorna il numero dei riscontri */
	public function numOfRows( $response ) {

		return mysql_num_rows( $response );
	}

	/** Copia il primo riscontro in un array **/
	public function parse( &$response ) {

		return mysql_fetch_assoc( $response );
	}

	/** Copia tutti i riscontri in un array **/
	public function parseAll( &$response ) {

		$data = array();

		while ( $row = $this->parse( $response ) )
			array_push( $data, $row );

		return $data;
	}

	/** Ritorna l'id dell'ultima riga inserita **/
	public function lastId() {

		return mysql_insert_id( $this->connection );
	}

	/** Comunica un errore all'utente e termina l'esecuzione del programma **/
	public function debug( $message, $print_error = true ) {

		if ( $this->config['DEBUG'] )
			if ( $print_error ) echo $message . ' ' . mysql_error();
	}

	/** Chiudo la connessione con il server SQL **/
	public function close() {

		if ( $this->connection ) {

			mysql_close( $this->connection );
			$this->connection = null;
		}
	}


	/* ============= FUNZIONI DI ACCESSO ALLE INFORMAZIONI ============= */

	/** Registra un nuovo utente **/
	public function addUser( $name, $password ) {

		// Controllo che il nome non sia già in uso
		$response = $this->query(

			"SELECT
				user_id AS id
			 FROM {$this->config['DB_TABLE_PREFIX']}users
			 WHERE user_name = '$name'"
		);

		if ( $this->numOfRows( $response ) )
			return false;

		// Registro il nuovo utente
		return $this->query(

			"INSERT INTO {$this->config['DB_TABLE_PREFIX']}users( user_name, user_password )
			VALUES( '$name', PASSWORD( '$password' ) )"
		);
	}

	/** Legge le informazioni su un utente **/
	public function readUser( $user_id ) {

		$response = $this->query(

			"SELECT
				user_id AS id,
			  	user_name AS name
			 FROM {$this->config['DB_TABLE_PREFIX']}users
			 WHERE user_id = $user_id"
		);

		return $this->parse( $response );
	}

	/** Legge la lista degli utenti presenti in un canale **/
	public function readUserList( $channel ) {

		// Considero solo gli utenti che hanno contattato
		// il server nei precedenti 60 secondi
		$response = $this->query(

			"SELECT
				user_id AS id,
			  	user_name AS name,
			  	activity_typing AS typing
			 FROM {$this->config['DB_TABLE_PREFIX']}activities
			 LEFT JOIN {$this->config['DB_TABLE_PREFIX']}users ON user_id = activity_user
			 WHERE activity_channel = '$channel'
			 AND activity_timestamp > NOW() - 60
			 ORDER BY user_name ASC"
		);

		return $this->parseAll( $response );
	}

	/** Scrive un messaggio in un canale **/
	public function addMessage( $author, $channel, $text ) {

		return $this->query(

			"INSERT INTO {$this->config['DB_TABLE_PREFIX']}messages( message_author, message_channel, message_timestamp, message_text )
			 VALUES( $author, '$channel', NOW(), '$text' )"
		);
	}

	/** Legge gli ultimi messaggi inseriti in un canale **/
	public function readMessageList( $channel, $last ) {

		$response = $this->query(

			"SELECT
				message_id AS id,
			 	message_text AS text,
			 	UNIX_TIMESTAMP( message_timestamp ) AS timestamp,
				user_id AS author_id,
				user_name AS author_name
			 FROM {$this->config['DB_TABLE_PREFIX']}messages
			 LEFT JOIN {$this->config['DB_TABLE_PREFIX']}users ON user_id = message_author
			 WHERE message_channel = '$channel'
			 AND message_id > $last
			 ORDER BY message_id"
		);

		return $this->parseAll( $response );
	}

	/** Legge l'ultimo messaggio inserito nel canale **/
	public function lastMessage( $channel ) {

		$response = $this->query(

			"SELECT
				message_id AS id
			 FROM {$this->config['DB_TABLE_PREFIX']}messages
			 WHERE message_channel = '$channel'
			 ORDER BY message_id DESC
			 LIMIT 1"
		);

		return $this->parse( $response );
	}

	/** Autentica un utente **/
	public function signinUser( $name, $password ) {

		$response = $this->query(

			"SELECT
				user_id AS id,
				user_name AS name
			  FROM {$this->config['DB_TABLE_PREFIX']}users
			  WHERE user_name = '$name' AND user_password = PASSWORD( '$password' )"
		);

		return $response ? $this->parse( $response ) : null;
	}

	/** Aggiorna le attività di un utente **/
	public function updateActivity( $user, $channel, $ip, $typing ) {

		$typing = intval( $typing );

		return $this->query(

			"INSERT INTO {$this->config['DB_TABLE_PREFIX']}activities
				( activity_user, activity_channel, activity_timestamp, activity_ip, activity_typing )
  			 VALUES( $user, '$channel', NOW(), '$ip', $typing )
  			 ON DUPLICATE KEY UPDATE activity_timestamp = NOW(), activity_ip = '$ip', activity_typing = $typing"
		);
	}
}

?>
