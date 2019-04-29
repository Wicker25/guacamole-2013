<?php

/*
    Title --- install.php

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


/** Scrive le configurazioni di Guacamole in un file php **/
function writeConfig( $config, $path ) {

	$file = fopen( $path, 'w' );

	if ( !$file )
		return 1;

	fwrite( $file, "<?php\n\n// Configurazioni di Guacamole\n" );

	foreach ( $config as $key => $value ) {

		if ( !is_numeric( $value ) )
			$value = "'$value'";

		fwrite( $file, "\$config['$key'] = $value;\n" );
	}

	fwrite( $file, "\n?>" );
	fclose( $file );

	return 0;
}

/** Costruisce il database e le tabelle di Guacamole **/
function buildDatabase( $config ) {

	// Includo il gestore del database
	require_once( $config['ROOT_PATH'] . 'db.php' );

	// Mi connetto al server SQL
	$db = new Database();

	if ( !$db->connect( $config['DB_HOST'], $config['DB_USER'], $config['DB_PASSWORD'] ) )
		return 1;

	// Se non esiste, creo il database di Guacamole
	$db->query( "CREATE DATABASE IF NOT EXISTS `${config['DB_NAME']}` CHARACTER SET utf8" );
	$db->selectDB( $config['DB_NAME'] );

	// Creo la tabella degli utenti
	$db->query(

		"CREATE TABLE IF NOT EXISTS {$config['DB_TABLE_PREFIX']}users (

			user_id			INT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_name		VARCHAR(32) NOT NULL,
			user_password	CHAR(41) NOT NULL,

			PRIMARY KEY( user_id )

		) ENGINE = INNODB DEFAULT CHARSET = utf8 COLLATE utf8_bin"
	);

	// Creo la tabella dei messaggi
	$db->query(

		"CREATE TABLE IF NOT EXISTS {$config['DB_TABLE_PREFIX']}messages (

			message_id				INT UNSIGNED NOT NULL AUTO_INCREMENT,
			message_author			INT UNSIGNED,
			message_channel			VARCHAR(32) NOT NULL,
			message_timestamp		TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			message_text			TEXT,

			PRIMARY KEY( message_id ),
			FOREIGN KEY( message_author ) REFERENCES {$config['DB_TABLE_PREFIX']}users( user_id ) ON DELETE CASCADE

		) ENGINE = INNODB DEFAULT CHARSET = utf8 COLLATE utf8_bin"
	);

	// Creo la tabella delle attività degli utenti
	$db->query(

		"CREATE TABLE IF NOT EXISTS {$config['DB_TABLE_PREFIX']}activities (

			activity_user			INT UNSIGNED,
			activity_channel		VARCHAR(32) NOT NULL,
			activity_timestamp		TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			activity_ip				VARCHAR(40) NOT NULL,
			activity_typing			BOOLEAN DEFAULT 0,

			PRIMARY KEY( activity_user, activity_channel ),
			FOREIGN KEY( activity_user ) REFERENCES {$config['DB_TABLE_PREFIX']}users( user_id ) ON DELETE CASCADE

		) ENGINE = INNODB DEFAULT CHARSET = utf8 COLLATE utf8_bin"
	);

	return 0;
}

/** Installa Guacamole **/
function installGuacamole() {

	echo '<p>- Costruisco il file delle configurazioni.</p>';

	// Memorizzo le configurazioni in un dizionario
	$config['DB_NAME']				= $_POST['db_name'];
	$config['DB_TABLE_PREFIX']		= $_POST['db_prefix'];

	$config['DB_HOST']				= $_POST['db_host'];
	$config['DB_USER']				= $_POST['db_user'];
	$config['DB_PASSWORD']			= $_POST['db_password'];

	$config['MESSAGE_MAXLENGTH']	= $_POST['maxlength'];

	// Ricavo i percorsi assoluti di Guacamole
	$config['ROOT_URL']		= dirname( $_SERVER['REQUEST_URI'] ) . '/';
	$config['ROOT_PATH']	= $_SERVER['DOCUMENT_ROOT'] . $config['ROOT_URL'];

	$config['DEBUG'] = true;

	// Costruisco il file delle configurazioni
	if ( writeConfig( $config, 'config.php' ) ) {

		echo '<p class="fail">Fallito.</p>';
		return 1;
	}

	echo '<p>- Costruisco il database e le tabelle di Guacamole.</p>';

	// Costruisco il file delle configurazioni
	if ( buildDatabase( $config ) ) {

		echo '<p class="fail">Fallito.</p>';
		return 1;
	}

	echo '<p>- Cancello l\'installatore.</p>';

	// "Cancello" l'installatore di Guacamole per non poter essere più usato
	if ( !rename( 'install.php', 'install.php.deleted' ) ) {

		echo '<p class="fail">Fallito.</p>';
		return 1;
	}

	echo '<p><a href="' . htmlspecialchars( $config['ROOT_URL'] ) . '">Inizia ad usare Guacamole</a></p>';
}

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>

	<head>
		<meta http-equiv="content-type" content="text/html; charset=utf-8">
		<title>Guacamole - Installazione</title>

		<style type="text/css">

			body { font: 12px sans-serif; }

			input {

				border: 1px solid black;
			}

			input[type="text"],
			input[type="password"] {

				width: 13em;
			}

			form {

				float: left;
				width: 30em;
				padding: 0.5em;
				border: 1px solid red;
				background: #eee;
			}

			dl {

				float: left;
				margin: 0;
			}

			dt, dd {

				height: 2.2em;
				vertical-align: middle;
				padding: 0;
				margin: 0.4em;
			}

			dt {

				float: left;
				width: 12em;
				text-align: left;
			}

			dd {

				float: right;
				width: 15em;
				text-align: right;
			}

			.fail { color: red; }

		</style>

	</head>

	<body>

<?php

	// Verifico che il form sia stato inviato
	if ( isset( $_POST['submit'] ) ) {

		// Installo Guacamole
		if ( installGuacamole() )
			echo '<p><a href="install.php">Torna alla pagina d\'installazione</a></p>';

	} else {

?>

		<form action="install.php" method="post">

			<dl>
				<dt><label for="db_name">Nome del database</label></dt>
				<dd><input type="text" name="db_name" id="db_name" value="guacamole"></dd>

				<dt><label for="db_prefix">Prefisso delle tabelle</label></dt>
				<dd><input type="text" name="db_prefix" id="db_prefix" value="gcml_"></dd>
			</dl>

			<dl>
				<dt><label for="db_host">Database Host</label></dt>
				<dd><input type="text" name="db_host" id="db_host" value="localhost"></dd>

				<dt><label for="db_user">User</label></dt>
				<dd><input type="text" name="db_user" id="db_user" value="root"></dd>

				<dt><label for="db_password">Password</label></dt>
				<dd><input type="password" name="db_password" id="db_password"></dd>
			</dl>

			<dl>
				<dt><label for="maxlength">Lunghezza massima dei messaggi</label></dt>
				<dd><input type="text" name="maxlength" id="maxlength" value="1024"></dd>

				<dd><input type="submit" name="submit" value="Installa"></dd>
			</dl>

		</form>

<?php } ?>

	</body>

</html>
