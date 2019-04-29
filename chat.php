<?php

/*
    Title --- chat.php

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


// Includo le configurazioni
require_once( 'config.php' );

// Includo i moduli di Guacamole
require_once( $config['ROOT_PATH'] . 'session.php' );
require_once( $config['ROOT_PATH'] . 'db.php' );
require_once( $config['ROOT_PATH'] . 'core.php' );

// Creo l'istanza di Guacamole e la eseguo
$core = new Core();
$core->perform();

?>
