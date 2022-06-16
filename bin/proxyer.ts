
import * as fs from 'node:fs'

import * as path from 'node:path'

import * as oox from '../index'

import { Module } from 'node:module'



/**
 * 重写 require 缓存
 */
 function rewriteModuleCache ( id: string, exports: any ) {

    const pathname = id.split ( path.sep ).slice ( 0, -1 ).join ( path.sep )

    const pathSplit = pathname.split ( path.sep )

    const paths = pathSplit.map ( ( v: string, i: number, a: string[] ) => a.slice ( 0, i + 1 ).concat ( 'node_modules' ).join ( path.sep ) ).reverse ( )

    const m = new Module ( id, null )

    m.path = pathname
    m.exports = exports
    m.filename = m.id
    m.loaded = true
    m.children = [ ]
    m.paths = paths

    require.cache [ id ] = m
}



function dotCall ( name: string, action: string ) {
	
	return new Proxy ( function ( ) { }, {

        get ( target, key: string ) {

			return dotCall ( name, action ? action + '.' + key : key )
		},
		
		has ( target, key ) { return true },
		
		apply ( target, thisArg, args ) {

            return oox.rpc ( name, action, args )
		}
	} )
}



export function proxyGroup ( groupDirectory: string, excludes = [ ] ) {

    if ( !groupDirectory ) return

    const directory = path.resolve ( groupDirectory )

    const stat = fs.statSync ( directory )

    if ( !stat.isDirectory ( ) ) throw new Error ( 'group must be directory' )

    const subs = fs.readdirSync ( directory )

    for ( const filename of subs ) {

        const fullPath = path.resolve ( directory + path.sep + filename )

        const stat = fs.statSync ( fullPath )

        let id = '', name = ''

        if ( stat.isDirectory ( ) && fs.existsSync ( fullPath + '/index.js' ) ) {

            id = fullPath + '/index.js'
            name = filename
        } else if ( filename.endsWith ( '.js' ) ) {

            id = fullPath
            name = filename.split ( '.js' ) [ 0 ]
        } else continue

        if ( !excludes.includes ( name ) ) rewriteModuleCache ( id, dotCall ( name, '' ) )
    }
}