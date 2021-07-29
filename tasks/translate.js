/**
 * Task: translate
 */

// Node
const { join } = require( 'path' );
const { promisify } = require( 'util' );

// External
const fileData = promisify( require( 'wp-get-file-data' ) );
const gulp = require( 'gulp' );
const sort = require( 'gulp-sort' );
const wpPot = require( 'gulp-wp-pot' );

// Internal
const { handleStreamError, logEntries } = require( '../util' );

module.exports = ( {
	src = [ '**/*.php', '!node_modules/**/*', '!**/*.asset.php' ],
	dest = 'languages',
} = {} ) => {
	return function translate() {
		// TODO: different file if plugin
		const metadataFile = 'style.css';
		return fileData( metadataFile, {
			package: 'Theme Name',
			domain: 'Text Domain',
		} ).then( ( { domain, package } ) => {
			// Add metadataFile to src array
			if ( Array.isArray( src ) ) {
				src.push( metadataFile );
			} else {
				src = [ src, metadataFile ];
			}

			return (
				gulp
					.src( src )
					.pipe( handleStreamError( 'styles' ) )
					.pipe( sort() )
					//.pipe( logEntries( 'Translate files:' ) )
					.pipe(
						wpPot( {
							domain,
							package,
							//bugReport: 'https://example.com',
							//lastTranslator: 'Your Name Here <you@example.com>',
							//team: 'Team Name Here <team@example.com>',
							metadataFile,
						} )
					)
					.pipe( gulp.dest( join( dest, `${ domain }.pot` ) ) )
			);
		} );
	};
};
