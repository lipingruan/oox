


exports.getAllEnvArgs = function ( ) {

    const args = process.argv.slice ( 2 )

    const env = { }

    for ( const arg of args ) {

        if ( arg.startsWith ( '--' ) ) {

        env [ arg.slice ( 2 ) ] = true
        } else if ( arg.startsWith ( '-' ) ) {

        env [ arg.slice ( 1 ) ] = true
        } else if ( !arg.includes ( '=' ) ) {

        env [ arg ] = true
        } else {

        const index = arg.indexOf ( '=' )

        const key = arg.slice ( 0, index )

        const val = arg.slice ( index + 1 )

        env [ key ] = exports.parseEnvArg ( val )
        }
    }

    return env
}



exports.getEnvArgs = function ( names ) {

    const env = { }

    for ( let name of names ) {

        env [ name ] = exports.getEnvArg ( name )
    }

    return env
}



// 从命令行参数列表中获取参数值
exports.getEnvArg = function ( name ) {

    if ( 
        process.argv.includes ( name ) || 
        process.argv.includes ( '-' + name ) || 
        process.argv.includes ( '--' + name ) 
        ) {

        return true
    } else {

        const prefix = name + '='

        const [ argv ] = process.argv.filter ( arg => arg.startsWith ( prefix ) )

        if ( !argv ) return null

        const arg = argv.slice ( prefix.length )

        return exports.parseEnvArg ( arg )
    }
}



exports.parseEnvArg = function ( value ) {

    switch ( value ) {
        case 'no': return false
        case 'yes': return true
        case 'nil': return null
        default:
        try {

            return JSON.parse ( value )
        } catch ( error ) {

            if ( value.includes ( ',' ) ) return value.split ( ',' )

            return value
        }
    }
}
