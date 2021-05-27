
const SocketIOClient = require ( 'socket.io-client' )

const Socket = require ( './socket.class' )

const SocketIOServer = require ( './server.class' )

const Global = require ( '../global' )



module.exports = class SocketIOCore extends SocketIOServer {



    /**
     * 连接RPC服务
     * @param {String} url ws服务器地址
     * @param {String} caller 本地服务名称
     * @returns {Promise<Socket>}
     */
    static async connect ( url, caller = null ) {

        let socket = Global.sockets.get ( url )

        // 已经连接的直接返回
        if ( socket ) {

            try {

                await this.waitConnection ( socket )
            } catch ( error ) {
    
                this.onSocketDisconnect ( socket, error )
    
                throw error
            }

            return socket
        }

        if ( !caller ) throw new Error ( 'Caller Required' )



        const headers = {
            'x-caller': String ( caller )
        }



        const [ callerServer ] = Global.socketIOServers.filter ( server => server.name === caller )

        if ( callerServer ) {

            const { host, port, path } = callerServer

            headers [ 'x-ip' ] = host

            headers [ 'x-caller-id' ] = `ws://${host}:${port}${path}`
        }



        // create socket handler
        const mURL = new URL ( url )

        socket = SocketIOClient.io ( mURL.origin, {
            extraHeaders: headers,
            path: mURL.pathname
        } )

        socket.data = { connected: false, id: url, host: mURL.host, owner: caller }

        Global.sockets.set ( url, socket )

        this.onSocketCreated ( socket )



        try {

            await this.waitConnection ( socket )
        } catch ( error ) {

            this.onSocketDisconnect ( socket, error )

            throw error
        }

        return socket
    }



    static onSocketCreated ( socket ) {

        socket.once ( 'disconnect', reason => this.onSocketDisconnect ( socket, reason ) )
    }



    /**
     * 客户端Socket连接事件
     * @param {Socket} socket 
     */
    static onSocketConnection ( socket ) {

        socket.data.connected = true

        this.onConnection ( socket )
    }



    static onConnection ( socket ) { }



    /**
     * 客户端Socket断开事件
     * @param {Socket} socket 
     */
    static onSocketDisconnect ( socket, reason ) {

        socket.data.connected = false

        socket.disconnect ( true )

        Global.sockets.delete ( socket.data.id )

        this.onDisconnect ( socket, reason )
    }



    static onDisconnect ( socket, reason ) { }



    /**
     * 等待socket连接
     * @param {Socket} socket 
     */
    static async waitConnection ( socket ) {

        if ( socket.data.connected ) return

        if ( socket.connect ) socket.connect ( )

        try {

            await new Promise ( function ( resolve, reject ) {

                const onError = function ( reason ) {

                    socket.offAny ( onError )

                    const message = 'string' === typeof reason ? reason : reason.message

                    reject ( new Error ( `SocketIO name[${socket.data.name}] id[${socket.data.id}] ${message}` ) )
                }

                socket.once ( 'disconnect', onError )

                socket.once ( 'connect_error', onError )

                socket.once ( 'connect_timeout', onError )

                socket.once ( 'reconnect_error', onError )

                socket.once ( 'reconnect_failed', onError )

                socket.once ( 'oox_connected', function ( { name } ) {

                    socket.offAny ( onError )

                    socket.data.name = name

                    resolve ( )
                } )
            } )
        } catch ( error ) {

            throw new Error ( error.message )
        }

        this.onSocketConnection ( socket )
    }
}