
const fs = require ( 'fs' )

const path = require ( 'path' )

const argv = require ( './argv' )



/**
 * x.y=1 => { x: { y: 1 } }
 * @param {*} env 
 */
function mergeFlatEnv ( env ) {

    for ( const key of Object.keys ( env ) ) {

        // x.y.z
        if ( key.includes ( '.' ) && !key.startsWith ( '.' ) && !key.endsWith ( '.' ) ) {

            const subKeys = key.split ( '.' )

            const valueKey = subKeys.pop ( )

            let tmpEnv = env

            for ( subKey of subKeys ) {

                if ( subKey in tmpEnv ) { } else {

                    tmpEnv [ subKey ] = { }
                }

                tmpEnv = tmpEnv [ subKey ]
            }

            tmpEnv [ valueKey ] = env [ key ]
        }
    }
}



exports.configure = ( ) => {

    let env = Object.create ( null )

    const defaultEnvPath = argv.getEnvArg ( 'default-env' )

    if ( defaultEnvPath && fs.existsSync ( defaultEnvPath ) ) {

        Object.assign ( env, require ( path.resolve ( defaultEnvPath ) ) )
    }



    const envPath = argv.getEnvArg ( 'env' )

    if ( envPath && fs.existsSync ( envPath ) ) {

        Object.assign ( env, require ( path.resolve ( envPath ) ) )
    }

    Object.assign ( env, argv.getAllEnvArgs ( ) )

    mergeFlatEnv ( env )

    if ( 'string' === typeof env.ignore ) env.ignore = env.ignore.split ( ',' )

    if ( 'string' === typeof env.registry ) env.registry = env.registry.split ( ',' )

    if ( 'string' === typeof env.origin && env.origin.includes ( ',' ) ) {

        env.origin = env.origin.split ( ',' )
    }

    return env
}