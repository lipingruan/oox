
const RPCSocketIO = require ( '../rpc/socketio.class' )

const Socket = require ( '../socketio/socket.class' )

const Global = require ( '../global' )



module.exports = class SocketIO extends RPCSocketIO {



    /**
     * 
     * @param {Socket} socket 
     * @returns 
     */
    onConnection ( socket ) {

        super.onConnection ( socket )

        Global.socketIORegistry.add ( socket.data.name, socket.data.id )

        socket.on ( 'syncConnection', async fn => {

            if ( 'function' !== typeof fn ) return

            const data = await this.onSyncConnection ( socket )

            fn ( data )
        } )

        socket.on ( 'fetchActions', async ( search, fn ) => {

            if ( 'function' !== typeof fn ) return

            const data = this.constructor.onFetchActions ( socket, search )

            fn ( data )
        } )
    }



    /**
     * 
     * @param {Socket} socket 
     * @returns 
     */
    onSyncConnection ( socket ) {

        const sockets = Array.from ( Global.sockets.values ( ) )
        .filter ( s => 
            s !== socket && 
            s.data.name !== socket.data.name &&
            s.data.id.startsWith ( 'ws://' ) )

        return sockets.map ( s => s.data )
    }


    
    /**
     * 
     * @param {Socket} socket 
     */
    onDisconnect ( socket, reason ) {

        super.onDisconnect ( socket, reason )

        Global.socketIORegistry.delete ( socket.data.name, socket.data.id )
    }



    /**
     * 
     * @param {Socket} socket 
     */
    static onConnection ( socket ) {

        super.onConnection ( socket )

        Global.socketIORegistry.add ( socket.data.name, socket.data.id )

        socket.emit ( 'syncConnection', socketDatas => this.onSyncConnection ( socket, socketDatas ) )

        socket.on ( 'fetchActions', async ( search, fn ) => {

            if ( 'function' !== typeof fn ) return
            
            const actions = this.onFetchActions ( socket, search )

            fn ( actions )
        } )
    }



    static onDisconnect ( socket, reason ) {

        super.onDisconnect ( socket, reason )

        Global.socketIORegistry.delete ( socket.data.name, socket.data.id )
    }



    /**
     * 
     * @param {Socket} socket 是由哪个通道发送过来的
     * @param {Socket.Data[]} socketDatas 
     */
    static onSyncConnection ( socket, socketDatas ) {

        for ( const socketData of socketDatas )
            if ( !Global.sockets.has ( socketData.id ) )
                this.connect ( socketData.id, socket.data.owner ).catch ( error => console.error ( error ) )
    }



    /**
     * 
     * @param {Socket} socket 
     * @param {String} search 
     * @returns {String[]}
     */
    static onFetchActions ( socket, search ) {

        const data = [ ]

        const [ service ] = Global.instances.filter ( service => service.name === socket.data.owner )

        if ( !service ) return data

        for ( const key of service.kvMethods.keys ( ) )
            if ( key.includes ( search ) ) data.push ( key )
        
        return data
    }
}