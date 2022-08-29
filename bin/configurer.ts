
import * as fs from 'node:fs'

import * as path from 'node:path'

import * as argv from './argv'



/**
 * x.y=1 => { x: { y: 1 } }
 */
function mergeFlatEnv ( env: { [x: string]: any } ) {

    for ( const key of Object.keys ( env ) ) {

        // x.y.z
        if ( key.includes ( '.' ) && !key.startsWith ( '.' ) && !key.endsWith ( '.' ) ) {

            const subKeys = key.split ( '.' )

            const valueKey = subKeys.pop ( )

            let tmpEnv = env

            for ( const subKey of subKeys ) {

                if ( subKey in tmpEnv ) { } else {

                    tmpEnv [ subKey ] = { }
                }

                tmpEnv = tmpEnv [ subKey ]
            }

            tmpEnv [ valueKey ] = env [ key ]
        }
    }
}



async function readEnvFile ( filePath: string ) {

    let env: { [x: string]: any } = { }

    if ( filePath && fs.existsSync ( filePath ) ) {

        if ( filePath.endsWith ( '.json' ) ) {

            const raw = fs.readFileSync ( filePath, 'utf-8' )

            env = JSON.parse ( raw )
        } else {

            const finalPath = path.resolve ( filePath ).replace ( /\\/g, '/' )

            env = await eval ( `import('file://${finalPath}')` )
        }
    } else {

        throw new Error ( 'Env file not found: ' + filePath )
    }

    return env.default || env
}



export async function configure ( ) {

    const env = Object.create ( null )

    const defaultEnvPath = argv.getEnvArg ( 'default-env' )

    const targetEnvPath = argv.getEnvArg ( 'env' )

    const defaultEnv = defaultEnvPath ? await readEnvFile ( defaultEnvPath ) : { }

    const targetEnv = targetEnvPath ? await readEnvFile ( targetEnvPath ) : { }

    Object.assign ( env, defaultEnv, targetEnv, argv.getAllEnvArgs ( ) )

    mergeFlatEnv ( env )

    if ( 'string' === typeof env.ignore ) env.ignore = env.ignore.split ( ',' )

    if ( 'string' === typeof env.registry ) env.registry = env.registry.split ( ',' )

    if ( 'string' === typeof env.origin && env.origin.includes ( ',' ) ) {

        env.origin = env.origin.split ( ',' )
    }

    return env
}