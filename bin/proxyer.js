
const fs = require ( 'fs' )

const path = require ( 'path' )

var Service = require ( '../service/service.class' )



/**
 * 重写 require 缓存
 * @param {String} id 
 * @param {*} exports 
 */
 function rewriteModuleCache ( id, exports ) {

    const path = id.split ( '/' ).slice ( 0, -1 ).join ( '/' )

    const pathSplit = path.split ( '/' )

    const paths = pathSplit.map ( ( v, i, a ) => a.slice ( 0, i + 1 ).concat ( 'node_modules' ).join ( '/' ) ).reverse ( )

    const m = new module.constructor ( )

    m.id = id
    m.path = path
    m.exports = exports
    m.filename = m.id
    m.loaded = true
    m.children = [ ]
    m.paths = paths
    m.parent = null

    require.cache [ id ] = m
}



function dotCall ( name, paths = [ ] ) {
	
	return new Proxy ( function ( ) { }, {

        get ( target, key ) {

			return dotCall ( name, paths.concat ( key ) )
		},
		
		has ( target, key ) { return true },
		
		apply ( target, thisObject, args ) {

            return Service.call ( name, paths.join ( '.' ), args )
		}
	} )
}



exports.proxyServices = ( servicesDirectory, excludes = [ ] ) => {

    if ( !servicesDirectory ) return

    const directory = path.resolve ( servicesDirectory )

    const stat = fs.statSync ( directory )

    if ( !stat.isDirectory ( ) ) throw new Error ( 'services must be directory' )

    const subs = fs.readdirSync ( directory )

    for ( const filename of subs ) {

        const fullPath = path.resolve ( directory + '/' + filename )

        const stat = fs.statSync ( fullPath )

        let id = '', name = ''

        if ( stat.isDirectory ( ) && fs.existsSync ( fullPath + '/index.js' ) ) {

            id = fullPath + '/index.js'
            name = filename
        } else if ( filename.endsWith ( '.js' ) ) {

            id = fullPath
            name = filename.split ( '.js' ) [ 0 ]
        } else continue

        if ( !excludes.includes ( name ) ) rewriteModuleCache ( id, dotCall ( name ) )
    }
}



exports.setService = serviceClazz => Service = serviceClazz