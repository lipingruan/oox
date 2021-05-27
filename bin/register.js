
const chalk = require ( 'chalk' )

var Service = require ( '../service/service.class' )



function delay ( ms ) {

    return new Promise ( function ( resolve, reject ) {

        setTimeout ( resolve, ms )
    } )
}



function urlFormatter ( service, url ) {

    // :6000
    if ( url.startsWith ( ':' ) ) url = service.config.host + url

    // http://127.0.0.1:6000
    if ( url.startsWith ( 'http://' ) ) url = url.substr ( 7 )

    // 127.0.0.1:6000
    if ( !url.startsWith ( 'ws://' ) ) url = 'ws://' + url

    const urlObject = new URL ( url )

    if ( urlObject.pathname === '/' && !url.endsWith ( '/' ) ) url = url + '/socket.io'

    return url
}


/**
 * 
 * @param {Service} service 
 * @param {String} url 
 */
async function connect ( service, url, prevError = null ) {

    if ( service.socketio.config ) {

        const { port, path } = service.socketio.config

        if ( `ws://${service.config.host}:${port}${path}` === url ) return
    }

    try {

        const socket = await Service.SocketIO.connect ( url, service.name )

        onConnection ( socket, service, url )
    } catch ( error ) {

        if ( !prevError ) console.log ( chalk.red`[Registry]`, chalk.underline.red`${url}`, 'error.' )

        await delay ( 5000 )

        connect ( service, url, error )
    }
}



async function onConnection ( socket, service, url ) {

    socket.on ( 'disconnect', async ( ) => {

        console.log ( chalk.red`[Registry]`, chalk.underline.red`${url}`, 'disconnected.' )

        await delay ( 1000 )

        connect ( service, url )
    } )

    console.log ( chalk.green`[Registry]`, chalk.underline.green`${url}`, 'connected.' )
}



/**
 * 
 * @param {Service} service 
 * @param {String[]} registry 
 */
exports.connect = async ( service, registry ) => {

    if ( 'string' === typeof registry ) {

        connect ( service, urlFormatter ( service, registry ) )
    } else {
        
        for ( const url of registry ) {

            connect ( service, urlFormatter ( service, url ) )
        }
    }
}



exports.setService = serviceClazz => Service = serviceClazz