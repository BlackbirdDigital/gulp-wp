/**
 * Task: translate
 */

// Node
const { join } = require( 'path' );
const { promisify } = require( 'util' );

// External
const fileData = promisify( require( 'wp-get-file-data' ) );
const logFiles = require( 'gulp-debug' );
const sort = require( 'gulp-sort' );
const wpPot = require( 'gulp-wp-pot' );

// Internal
const { handleStreamError } = require( '../util' );

module.exports = {
	task: ( gulp, { src, dest }, registry ) => {
		return function translate() {
			const { plugin } = registry.config;
			const metadataFile = plugin || 'style.css';
			const projectType = plugin ? 'Plugin' : 'Theme';

			return fileData( metadataFile, {
				package: `${ projectType } Name`,
				domain: 'Text Domain',
			} ).then( ( { domain, package } ) => {
				// Add metadataFile to src array
				if ( Array.isArray( src ) ) {
					src.push( metadataFile );
				} else {
					src = [ src, metadataFile ];
				}

				return gulp
					.src( src )
					.pipe( handleStreamError( 'styles' ) )
					.pipe( sort() )
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
					.pipe(
						gulp.dest(
							join( dest, `${ domain || 'translations' }.pot` )
						)
					)
					.pipe(
						logFiles( {
							title: 'translate result:',
							showCount: false,
						} )
					);
			} );
		};
	},
	config: {
		src: [ '**/*.php', '!node_modules/**/*', '!**/*.asset.php' ],
		dest: 'languages',
	},
};
