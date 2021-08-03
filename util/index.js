/**
 * Util
 */

// Node
const {
	accessSync,
	closeSync,
	constants: fsConstants,
	openSync,
	readdirSync,
	readSync,
} = require( 'fs' );
const { basename, extname, join } = require( 'path' );
const { cwd } = require( 'process' );

// External
const c = require( 'ansi-colors' );
const debug = require( 'gulp-debug' );
const { sync: glob } = require( 'glob' );
const log = require( 'gulplog' );
const notify = require( 'gulp-notify' );
const plumber = require( 'gulp-plumber' );

c.enabled = require( 'color-support' ).hasBasic;

notify.logLevel( 0 );

/**
 * Global config used for all "instances" of gulp-dependents, because the first that runs sets the config for all.
 *
 * Custom JS parser: https://stackoverflow.com/a/66748484/900971
 */
const jsPostfixes = [ '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs' ];
const jsDependentsConfig = {
	postfixes: jsPostfixes,
	parserSteps: [
		/import(?:["'\s]*(?:[\w*${}\n\r\t, ]+)from\s*)?["'\s]*(.*[@\w_-]+)["'\s].*;?$/gm,
		function ( path ) {
			// Remove file extension, if any
			// TODO: insert postfixes dynamically?
			path = path.replace( /\.[js|jsx|ts|tsx|mjs|cjs]$/, '' );

			// Local packages
			paths = [ path, `${ path }/index` ];

			return paths;
		},
	],
	basePath: [ 'node_modules' ],
};
const dependentsConfig = {
	'.scss': {
		basePath: [ 'node_modules' ],
	},
};
for ( const ext of jsPostfixes ) {
	dependentsConfig[ ext ] = jsDependentsConfig;
}

/**
 * Attempts to locate the main plugin file similar to how WordPress does, with a little extra help from `glob`.
 *
 * @function
 * @returns {string} Plugin file path
 */
const getPluginFile = () => {
	// get all php files in the root of the cwd
	const pluginFilePaths = glob( './*.php' );
	// for each file, check the first 8192 bytes for "Plugin Name"
	log.debug( 'Looking for main plugin file...' );
	for ( const path of pluginFilePaths ) {
		try {
			const header = Buffer.alloc( 8192 );
			const fd = openSync( path );
			readSync( fd, header );
			closeSync( fd );
			if ( header.indexOf( 'Plugin Name:' ) !== -1 ) {
				log.debug( 'Found main plugin file:', c.blue( path ) );
				return path;
			}
		} catch ( err ) {
			// Not this one...
		}
	}
	log.warn(
		c.yellow(
			'Not able to locate main plugin file. Make sure you include the required'
		),
		c.cyan( 'Plugin Name' ),
		c.yellow( 'field.' )
	);
	return null;
};

/**
 * Handle stream errors without stopping the entire workflow.
 *
 * @function
 * @returns {stream}
 */
const handleStreamError = ( task ) => {
	return plumber( {
		// NOTE: can't be arrow function
		errorHandler: function ( err ) {
			// Separate simplifier message for notification
			let notifyErr = err;

			// Checks for PluginError object and reformat
			if ( err.plugin && err.name && err.message ) {
				notifyErr = err.message;
				err = `${ c.red( err.name ) } in plugin "${ c.cyan(
					err.plugin
				) }"\n${ c.red( err.message ) }`;
			}

			log.error( err );
			notify( {
				title: `Error in '${ task }' task`,
				sound: process.env.NOTIFY || true,
			} ).write( notifyErr );

			this.emit( 'end' );
		},
	} );
};

/**
 * Stop handling stream errors.
 *
 * @function
 * @returns {function}
 */
handleStreamError.stop = () => {
	return plumber.stop();
};

/**
 * Checks if style.css exists.
 *
 * @function
 * @returns {boolean}
 */
const isTheme = () => {
	try {
		accessSync( 'style.css', fsConstants.R_OK );
		log.debug( 'Project is type', c.cyan( 'theme' ) );
		return true;
	} catch ( err ) {
		log.debug( 'Project is type', c.cyan( 'plugin' ) );
		return false;
	}
};

/**
 * Load local config file if it exists
 *
 * @function
 * @returns {object} Config object
 */
const loadConfig = () => {
	const configPath = join( cwd(), 'gulp-wp.config.js' );
	try {
		accessSync( configPath, fsConstants.R_OK );
		log.debug( 'Loading local config file', c.blue( configPath ) );
		return require( configPath );
	} catch ( err ) {
		log.debug( 'No local config file found' );
		return null;
	}
};

/**
 * Load predefined tasks.
 *
 * @function
 * @returns {object} Object with tasks as properties
 */
const loadTasks = () => {
	// Get files from tasks folder
	// TODO: get task files from local project?
	const taskFiles = glob( '*.js', { cwd: join( __dirname, '..', 'tasks' ) } );
	return taskFiles.reduce( ( acc, file ) => {
		const taskName = basename( file, '.js' );
		const taskInfo = require( `../tasks/${ taskName }` );

		// Validate task function exists
		if (
			taskInfo.hasOwnProperty( 'task' ) &&
			typeof taskInfo.task === 'function'
		) {
			acc[ taskName ] = taskInfo;
		} else {
			throw new Error(
				`Task file "${ taskName }" has no task property, or the task prop is not a function.`
			);
		}

		return acc;
	}, {} );
};

/**
 * File logging utility
 */
const logFiles = ( options ) => {
	const { task, title: desc } = options;
	const title = `${ c.cyan( task ) } ${ desc }`;
	options = Object.assign( {}, options, {
		title,
		logger: log.info,
	} );
	return debug( options );
};

module.exports = {
	c,
	dependentsConfig,
	getPluginFile,
	handleStreamError,
	isTheme,
	loadConfig,
	loadTasks,
	log,
	logFiles,
};
