
import path from 'node:path'

import os from 'node:os'

import fs from 'node:fs'

import { get as httpGet } from 'node:http'

import { get as httpsGet } from 'node:https'

import oox from '../index.mjs'



function generateRPCProxyScript ( name, attributes = [ ] ) {

    let attrExports = ''

    for ( const attr of attributes ) {
    
        attrExports += `\nexport const ${attr} = proxyer.${attr}\n`
    }
    
    const script = `
import oox from 'oox'
function RPC_${name} ( ) { }
function dotCall ( name, action ) {
	
	return new Proxy ( RPC_${name}, {

        get ( target, key ) {

			return dotCall ( name, action ? action + '.' + key : key )
		},
		
		has ( target, key ) { return true },
		
		apply ( target, thisArg, args ) {

            return oox.rpc ( name, action, args )
		}
	} )
}
const proxyer = dotCall ( '${name}', '' )
export default proxyer
${attrExports}
`

    return script
}



function generateRPCProxyURL ( name, attributes ) {
    
    let searchText = ''

    if ( attributes.length ) {

        const search = new URLSearchParams ( )

        for ( const attr of attributes ) {
    
            search.append ( 'attr', attr )
        }

        searchText = '?' + search.toString ( )
    }

    return `oox://rpc/${name}.mjs${searchText}`
}



function isWebURL ( url ) {

    return url && ( url.startsWith ( 'https://' ) || url.startsWith ( 'http://' ) )
}



function isOOXURL ( url ) {

    return url && url.startsWith ( 'oox://' )
}



/**
 * make ESModule support dynamic <export *> attributes import
 * @param {string} importerSpecifier the import url
 * @param {string} specifier parentURL
 * @returns {string[]}
 */
function getImportAttributes ( importerSpecifier, specifier ) {

    const attributes = [ ]

    const contents = fs.readFileSync ( importerSpecifier, 'utf-8' )

    // import * as xxx from "xxx"
    const mergeImport = contents.match ( new RegExp ( `import.+\\*\\s*as\\s+(\\w+)\\s+from\\s*["']${specifier}["']` ) )

    if ( mergeImport ) {

        const mergeName = mergeImport [ 1 ]

        const attributesIterator = contents.matchAll ( new RegExp ( `${mergeName}\\s*\\.\\s*(\\w+)`, 'g' ) )

        for ( const caseItem of attributesIterator ) {

            attributes.push ( caseItem [ 1 ] )
        }
    }

    // import { a, b, c } from 'xxx'
    const attributeImport = contents.match ( new RegExp ( `import.+{(.+)}\\s*from\\s*["']${specifier}["']` ) )

    if ( attributeImport ) {

        const definedAttributes = attributeImport [ 1 ].split ( ',' ).map ( v => v.trim ( ) ).filter ( v => !v.startsWith ( 'default' ) )
        
        attributes.push ( ...definedAttributes )
    }

    return attributes
}



/**
 * @param {string} specifier
 * @param {{
 *   conditions: string[],
 *   parentURL: string | undefined,
 * }} context
 * @param {Function} defaultResolve
 * @returns {Promise<{ url: string }>}
 */
export async function resolve ( specifier, context, defaultResolve ) {

    const defaultSpecifer = specifier

    const { parentURL } = context

    // HTTP & HTTPS
    if ( isWebURL ( specifier ) ) {

        return { url: specifier }
    } else if ( isWebURL ( parentURL ) && ( specifier.startsWith ( '.' ) || specifier.startsWith ( '/' ) ) ) {

        return { url: new URL ( specifier, parentURL ).href }
    }

    // OOX special alias for web package
    if ( specifier === 'oox' ) {

        return {
            url: 'file://' + path.resolve ( './node_modules/oox/index.mjs' )
        }
    }

    const { entryFile } = oox.config

    // Relative specifier concat to absolute path
    if ( specifier.startsWith ( '.' ) && parentURL ) {

        specifier = path.posix.join ( path.dirname ( parentURL.replace ( 'file://', '' ) ), specifier )
    }

    // Windows pathname remove root sep
    if ( os.platform ( ) === 'win32' && specifier.startsWith ( '/' ) ) {

        specifier = specifier.replace ( '/', '' )
    }

    // OOX RPC Proxy URL generation
    if ( !specifier.endsWith ( entryFile.path ) && entryFile.group && specifier.startsWith ( entryFile.group ) ) {

        const subSpecifier = specifier.slice ( entryFile.group.length )

        const matchResult = subSpecifier.match ( /^\/?([\w-]+)(\/index)?(\.m?js)?$/ )

        if ( matchResult ) {

            const importerSpecifier = parentURL.replace ( os.platform ( ) === 'win32' ? /file:\/+/ : 'file://', '' )
            
            const attributes = getImportAttributes ( importerSpecifier, defaultSpecifer )

            return { url: generateRPCProxyURL ( matchResult [ 1 ], attributes ) }
        }
    }

    // restore Windows specifier protocol
    if ( os.platform ( ) === 'win32' && specifier.includes ( '/' ) && !specifier.startsWith ( 'file://' ) ) {

        specifier = 'file://' + specifier
    }

    return defaultResolve ( specifier, context, defaultResolve )
}



/**
 * @param {string} url
 * @param {{
 *   format: string,
 * }} context If resolve settled with a `format`, that value is included here.
 * @param {Function} defaultLoad
 * @returns {Promise<{
 *   format: string,
 *   source: string | ArrayBuffer | SharedArrayBuffer | Uint8Array,
 * }>}
 */
export async function load ( url, context, defaultLoad ) {

    if ( isWebURL ( url ) || isOOXURL ( url ) ) {

        return getSource ( url, context, defaultLoad )
    }

    return defaultLoad ( url, context, defaultLoad )
}



export function getFormat ( url, context, defaultGetFormat ) {

    if ( isWebURL ( url ) || isOOXURL ( url ) ) {

        return {
            format: 'module'
        }
    }

    return defaultGetFormat ( url, context, defaultGetFormat )
}



export function getSource ( url, context, defaultGetSource ) {

    if ( isWebURL ( url ) ) {

        const getMethod = url.startsWith ( 'https://' ) ? httpsGet : httpGet

        return new Promise ( ( resolve, reject ) => getMethod ( url, res => {
            let source = ''
            res
            .on ( 'data', chunk => source += chunk )
            .on ( 'end', () => resolve ( { format: 'module', source } ) )
        } ).on ( 'error', reject ) )
    } else if ( isOOXURL ( url ) ) {

        const mURL = new URL ( url )

        if ( mURL.host === 'rpc' ) {

            const regexp = /\/([\w-]+)\.mjs$/

            const matchResult = mURL.pathname.match ( regexp )

            // read all import attributes
            const attributes = mURL.searchParams.getAll ( 'attr' )
        
            const source = generateRPCProxyScript ( matchResult [ 1 ], attributes )

            return { format: 'module', source }
        }
    }
  
    return defaultGetSource ( url, context, defaultGetSource )
}



process.on ( 'unhandledRejection', console.error )