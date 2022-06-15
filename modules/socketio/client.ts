
import * as SocketIOClient from 'socket.io-client'

import { ClientSocket as Socket, sockets } from './socket'

import SocketIOServer from './server'

import * as oox from '../../index'



export default class SocketIOCore extends SocketIOServer {



    /**
     * connect to <SocketIO RPC> service
     */
    async connect ( url: string ) {

        let socket = <Socket>sockets.get ( url )

        // 已经连接的直接返回
        if ( socket ) {

            try {

                await this.clientWaitConnection ( <Socket>socket )
            } catch ( error ) {
    
                this.clientOnSocketDisconnect ( <Socket>socket, error.message )
    
                throw error
            }

            return socket
        }



        const headers = {
            'x-caller': oox.config.name
        }


        const { host } = oox.config

        const { port, path } = this.config

        headers [ 'x-ip' ] = host

        headers [ 'x-caller-id' ] = `ws://${host}:${port}${path}`



        // create socket handler
        const mURL = new URL ( url )

        socket = <Socket>SocketIOClient.io ( mURL.origin, {
            extraHeaders: headers,
            path: mURL.pathname
        } )

        socket.data = { name: 'anonymous', connected: false, id: url, host: mURL.host }

        sockets.set ( url, socket )



        try {

            await this.clientWaitConnection ( socket )
        } catch ( error ) {

            this.clientOnSocketDisconnect ( socket, error )

            throw error
        }

        return socket
    }



    /**
     * 客户端Socket连接事件
     */
    clientOnSocketConnection ( socket: Socket ) {

        socket.data.connected = true

        socket.once ( 'disconnect', reason => this.clientOnSocketDisconnect ( socket, reason ) )

        this.clientOnConnection ( socket )
    }



    clientOnDisconnect ( socket: Socket, reason: any ) { }



    clientOnConnection ( socket: Socket ) { }



    /**
     * 客户端Socket断开事件
     * @param {Socket} socket 
     */
    clientOnSocketDisconnect ( socket: Socket, reason: any ) {

        socket.data.connected = false

        socket.disconnect ( )

        sockets.delete ( socket.data.id )

        this.clientOnDisconnect ( socket, reason )
    }



    /**
     * 等待socket连接
     */
    async clientWaitConnection ( socket: Socket ) {

        if ( socket.data.connected ) return

        if ( socket.connect ) socket.connect ( )

        try {

            await new Promise<void> ( ( resolve, reject ) => {

                const onError = ( reason: any ) => {
    
                    socket.offAny ( onError )
    
                    const message = 'string' === typeof reason ? reason : reason instanceof Error ? reason.message : 'connect error'
    
                    reject ( new Error ( message ) )
                }
    
                socket.once ( 'disconnect', onError )
    
                socket.once ( 'connect_error', onError )
    
                socket.once ( 'connect_timeout', onError )
    
                socket.once ( 'reconnect_error', onError )
    
                socket.once ( 'reconnect_failed', onError )
    
                socket.once ( 'oox_connected', ( { name } ) => {
    
                    socket.offAny ( onError )
    
                    socket.data.name = name
    
                    resolve ( )
                } )
            } )
        } catch ( error ) {

            throw new Error ( error.message )
        }

        this.clientOnSocketConnection ( socket )
    }
}