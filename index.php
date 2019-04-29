<?php

	// Se è necessario redireziono l'utente alla pagina di installazione
	if ( file_exists( 'install.php' ) )
		header( 'Location: install.php', true, 303 );

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>

	<head>

		<meta http-equiv="content-type" content="text/html; charset=utf-8">
		<meta http-equiv="content-script-type" content="text/javascript">
		<link type="text/css" rel="stylesheet" href="css/style.css">
		<script type="text/javascript" src="js/guacamole.js"></script>

		<!-- Inizializzo il sistema alla fine del caricamento della pagina -->
		<script type="text/javascript">$.init( [ 'dom', 'dialog', 'date', 'ajax', 'chat' ] );</script>

		<title>Guacamole</title>

	</head>

	<body>

		<div class="window" id="main">

			<div class="content">

				<div id="tabs"></div>
				<div class="widget" id="history"></div>
				<div class="widget" id="users"></div>

				<div id="toolbar"></div>
				<textarea class="widget" id="entry" cols="20" rows="2"></textarea>
				<div id="statusbar"></div>

			</div>

		</div>

		<script type="text/javascript">
		<!--
			$.ready( function () {

				// Inizializzo la chat
				var chat = new $.chat( {

					window:		'#main',
					tabs:		'#tabs',
					history:	'#history',
					users:		'#users',
					toolbar:	'#toolbar',
					entry:		'#entry',
					statusbar:	'#statusbar'
				} );

				chat.init();
			} );
		-->
		</script>

	</body>

</html>
