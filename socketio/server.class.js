
const { getIPAddress } = require ( '../util' )

const http = require ( 'http' )

const SocketIO = require ( 'socket.io' )

const Socket = require ( './socket.class' )

const Global = require ( '../global' )



module.exports = class SocketIOServer {



    /**
     * service name
     */
    name = ''



    /**
     * service host ip
     */
    host = getIPAddress ( 4 ) [ 0 ]



    /**
     * listen port
     */
    port = 0



    /**
     * socket.io service path
     */
    path = '/socket.io'



    /**
     * means this.server created by myself<SocketIOServer>
     */
    #isSelfServer = false



    /**
     * @type {http.Server}
     */
    server = null



    /**
     * @type {SocketIO.Server}
     */
    socketServer = null



    constructor ( name ) {

        this.name = name

        Global.socketIOServers.push ( this )
    }



    async serve ( ) {

        await this.stop ( )

        const port = this.port

        const isRndPort = 'number' !== typeof port || port === 0

        const isSelfServer = this.#isSelfServer = this.server ? true : false

        const server = this.server = isSelfServer ? this.server : 
            http.createServer ( ( request, response ) => response.end ( 'No HTTP Gateway' ) )

        if ( !server.listening ) server.listen ( isRndPort ? 0 : port )

        this.port = server.address ( ).port

        this.createSocketIOServer ( )
    }



    async stop ( ) {

        if ( this.socketServer )
        await new Promise ( ( resolve, reject ) =>
            this.socketServer.close ( error => error ? reject ( error ) : resolve ( ) ) )

        if ( this.#isSelfServer ) 
        await new Promise ( ( resolve, reject ) => {

            this.server.close ( function ( error ) {

                if ( error ) reject ( error ) 
                else resolve ( )
            } )
        } )
    }



    genOptions ( ) {

        return {
            /**
             * name of the path to capture
             * @default "/socket.io"
             */
            path: this.path,
            /**
             * how many ms before a client without namespace is closed
             * @default 45000
             */
            connectTimeout: 5000,
            /**
             * how many ms without a pong packet to consider the connection closed
             * @default 5000
             */
            pingTimeout: 2000,
            /**
             * how many ms before sending a new ping packet
             * @default 25000
             */
            pingInterval: 10000,
            /**
             * how many bytes or characters a message can be, before closing the session (to avoid DoS).
             * @default 1e5 (100 KB)
             */
            maxHttpBufferSize: 1e5
        }
    }



    createSocketIOServer ( ) {

        const socketServer = this.socketServer = new SocketIO.Server ( this.server, this.genOptions ( ) )

        socketServer.on ( 'connection', this.onSocketConnection.bind ( this ) )
    }



    /**
     * 服务端Socket连接事件
     * @param {Socket} socket 
     */
    onSocketConnection ( socket ) {

        const headers = socket.handshake.headers

        // client ip or caller service ip
        const ip = headers [ 'x-real-ip' ] || headers [ 'x-ip' ] || socket.handshake.address

        // service name
        const caller = headers [ 'x-caller' ] || 'anonymous'

        const callerId = headers [ 'x-caller-id' ] || socket.id

        // 已经存在相同的连接
        if ( Global.sockets.has ( callerId ) ) {

            const oldSocket = Global.sockets.get ( callerId )

            if ( oldSocket.data.connected ) {

                return socket.send ( 'Connection Exists' ).disconnect ( true )
            } else {

                Global.sockets.delete ( callerId )

                oldSocket.disconnect ( true )
            }
        }

        socket.data = { connected: true, host: ip, name: caller, id: callerId, owner: this.name }

        // 保存 callerId 与 socket 对应关系
        Global.sockets.set ( callerId, socket )

        socket.on ( 'disconnect', reason => this.onSocketDisconnect ( socket, new Error ( `SocketIO name[${caller}] id[${callerId}] ${reason}` ) ) )

        socket.emit ( 'oox_connected', { name: this.name } )

        this.onConnection ( socket )
    }



    onConnection ( socket ) { }



    /**
     * 服务端Socket断开事件
     * @param {Socket} socket 
     * @param {Error} reason
     */
    onSocketDisconnect ( socket, reason ) {

        socket.data.connected = false

        Global.sockets.delete ( socket.data.id )

        this.onDisconnect ( socket, reason )
    }



    onDisconnect ( socket, reason ) { }
}