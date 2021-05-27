
const SocketIO = require ( 'socket.io' )

module.exports = class Socket extends SocketIO.Socket {



    static Data = {
        connected: false,
        host: '',
        name: '',
        id: '',
        owner: ''
    }



    /**
     * Socket 扩展连接信息
     * @type {Socket.Data}
     */
    data = Object.assign ( { }, Socket.Data )
}