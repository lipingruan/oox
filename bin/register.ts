
import { red, underline, green } from 'chalk'

import * as oox from '../index'

import { default as SocketIOModule, Socket } from '@oox/module-socketio'



const delay = ( ms: number ) => new Promise ( resolve => setTimeout ( resolve, ms ) )



function urlFormatter ( url: string ) {

    // :6000
    if ( url.startsWith ( ':' ) ) url = oox.config.host + url

    // http://127.0.0.1:6000
    if ( url.startsWith ( 'http://' ) ) url = url.slice ( 7 )

    // 127.0.0.1:6000
    if ( !url.startsWith ( 'ws://' ) ) url = 'ws://' + url

    const urlObject = new URL ( url )

    if ( urlObject.pathname === '/' && !url.endsWith ( '/' ) ) url = url + '/socket.io'

    return url
}



async function connect ( url: string, prevError: Error = null ) {

    const socketio = <SocketIOModule>oox.modules.get ( 'socketio' )

    const { host } = oox.config

    const { port, path } = socketio.config

    if ( `ws://${host}:${port}${path}` === url ) return

    try {

        const socket = await socketio.connect ( url )

        onConnection ( socket, url )
    } catch ( error ) {

        if ( !prevError ) console.log ( red`[Registry]`, underline.red`${url}`, 'error.' )

        await delay ( 5000 )

        connect ( url, error )
    }
}



async function onConnection ( socket: Socket, url: string ) {

    const { name } = socket.data

    socket.on ( 'disconnect', async ( ) => {

        console.log ( red`[Registry]`, `Service<${name}>`, underline.red`${url}`, 'disconnected.' )

        await delay ( 1000 )

        connect ( url )
    } )

    console.log ( green`[Registry]`, `Service<${name}>`, underline.green`${url}`, 'connected.' )
}



export async function registry ( urls: string|string[] ) {

    if ( 'string' === typeof urls ) urls = [ urls ]

    for (const url of urls) {

        connect ( urlFormatter ( url ) )
    }
}