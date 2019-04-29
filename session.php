<?php

/*
    Title --- session.php

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


/** GESTORE DELLA SESSIONE **/

class Session {

	// Variabili della sessione
	private $session;

	/** Metodo costruttore **/
	function __construct() {

		// Inizializza la sessione
		session_start();

		// Collego le variabili della sessione
		$this->session = &$_SESSION;
	}

	/** Metodo distruttore **/
	function __destruct() {

	}

	/** Imposta una variabile della sessione **/
	public function set( $id, $value ) {

		$this->session[ $id ] = $value;
	}

	/** Imposta un elemento di un array della sessione **/
	public function setElement( $id, $key, $value ) {

		$this->session[ $id ][ $key ] = $value;
	}

	/** Controlla se esiste un certa variabile della sessione **/
	public function has( $id ) {

		return isset( $this->session[ $id ] );
	}

	/** Controlla se un array della sessione contiene un certo **/
	public function hasElement( $id, $key ) {

		return isset( $this->session[ $id ][ $key ] );
	}

	/** Ritorna una variabile della sessione **/
	public function get( $id ) {

		return isset( $this->session[ $id ] ) ? $this->session[ $id ] : NULL;
	}

	/** Ritorna un elemento di un array della sessione **/
	public function getElement( $id, $key ) {

		return isset( $this->session[ $id ][ $key ] ) ? $this->session[ $id ][ $key ] : NULL;
	}

	/** Elimina una variabile della sessione **/
	public function remove( $id ) {

		unset( $this->session[ $id ] );
	}

	/** Elimina un elemento di un array della sessione **/
	public function removeElement( $id, $key ) {

		unset( $this->session[ $id ][ $key ] );
	}

	/** Distrugge la sessione corrente **/
	public function destroy() {

		session_destroy();
	}
}

?>
