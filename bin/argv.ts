


export function getAllEnvArgs ( ) {

    const args = process.argv.slice ( 2 )

    const env: { [x: string]: any } = { }

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

        env [ key ] = parseEnvArg ( val )
        }
    }

    return env
}



export function getEnvArgs ( names: string[] ) {

    const env: { [x: string]: any } = { }

    for ( let name of names ) {

        env [ name ] = getEnvArg ( name )
    }

    return env
}



// 从命令行参数列表中获取参数值
export function getEnvArg ( name: string ) {

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

        return parseEnvArg ( arg )
    }
}



export function parseEnvArg ( value: string ) {

    switch ( value ) {
        case 'no': return false
        case 'yes': return true
        case 'none':
        case 'NULL':
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
