
import SocketIOClient from './client'

import * as oox from '../../index'

import { Socket, sockets, addGroupSocket, removeGroupSocket, ServerSocket, ClientSocket, SocketData, socketGroups, getGroupSockets } from './socket'



export default class SocketIOModule extends SocketIOClient {



    sockets = sockets

    getGroupSockets = getGroupSockets



    onSyncConnection ( socket: Socket ) {

        const mSockets = Array.from ( sockets.values ( ) )
        .filter ( s => 
            s !== socket && 
            s.data.name !== socket.data.name &&
            s.data.id.startsWith ( 'ws://' ) )

        return mSockets.map ( s => s.data )
    }


    
    serverOnDisconnect ( socket: ServerSocket, reason: string ) {

        super.serverOnDisconnect ( socket, reason )

        removeGroupSocket ( socket )
    }



    clientOnDisconnect ( socket: ClientSocket, reason: any ) {

        super.clientOnDisconnect ( socket, reason )

        removeGroupSocket ( socket )
    }



    /**
     * 
     * @param socket 是由哪个通道发送过来的
     * @param socketDatas 
     */
    clientOnSyncConnection ( socket: Socket, socketDatas: SocketData[] ) {

        for ( const socketData of socketDatas )
            if ( !sockets.has ( socketData.id ) )
                this.connect ( socketData.id ).catch ( (error: any) => console.error ( error ) )
    }



    onFetchActions ( socket: Socket, search: string ) {

        const data: string[] = [ ]

        for ( const key of oox.kvMethods.keys ( ) )
            if ( !key.endsWith ( '_proxy' ) && key.includes ( search ) ) data.push ( key )
        
        return data
    }



    fetchActions ( url: string, search?: string ): Promise<SocketData[]> 

    fetchActions ( name: string, search?: string ): Promise<SocketData[]>

    fetchActions ( arg0: string, search = '' ): Promise<SocketData[]> {

        let socket = sockets.get ( arg0 )

        if ( !socket ) {

            const group = socketGroups.get ( arg0 )

            if ( !group || !group.size ) throw new Error ( `Unknown service identify<${arg0}>` )

            socket = group.values ( ).next ( ).value
        }

        return <Promise<SocketData[]>>this.emit ( socket.data.id, 'fetchActions', [ search ] )
    }



    onConnection ( socket: Socket ) {

        addGroupSocket ( socket )

        const connectionContext: oox.Context = {
            sourceIP: '',
            ip: socket.data.host,
            caller: socket.data.name,
            callerId: socket.data.id,
        }

        socket.on ( 'fetchActions', async ( search: any, fn: (arg0: any) => void ) => {

            if ( 'function' !== typeof fn ) return

            const data = await this.onFetchActions ( socket, search )

            fn ( data )
        } )

        socket.on ( 'call', async ( action: string, params: any[], context: oox.Context, callback: (returns: any) => void ) => {

            if ( 'object' !== typeof context ) context = oox.genContext ( connectionContext )
            else context = oox.genContext ( Object.assign ( context, connectionContext ) )

            this.call ( action, params, context, callback )
        } )
    }



    /**
     * 
     * @param {Socket} socket 
     */
    serverOnConnection ( socket: ServerSocket ) {

        super.serverOnConnection ( socket )

        socket.setMaxListeners ( 0 )

        socket.on ( 'syncConnection', async (fn: (arg0: any[]) => void) => {

            if ( 'function' !== typeof fn ) return

            const data = this.onSyncConnection ( socket )

            fn ( data )
        } )

        this.onConnection ( socket )
    }



    async call ( action: string, params: any[], context: oox.Context, callback?: (returns: any) => void ) {

        const returns = await oox.call ( action, params, context )

        'function' === typeof callback && callback ( returns )

        return returns
    }



    clientOnConnection ( socket: ClientSocket ) {

        super.clientOnConnection ( socket )

        socket.emit ( 'syncConnection', (socketDatas: any) => this.clientOnSyncConnection ( socket, socketDatas ) )

        this.onConnection ( socket )
    }



    /**
     * socketio emit
     */
     async emit ( url: string, action: string, params: any[] ) {

        let socket: ServerSocket | ClientSocket = null

        try {

            socket = await this.connect ( url )
        } catch ( error ) {

            // try again
            socket = await this.connect ( url )
        }

        try {

            return await new Promise ( ( resolve, reject ) => {

                const onError = (reason: any) => {

                    const message = 'string' === typeof reason ? reason : reason instanceof Error ? reason.message : 'connect error'
    
                    reject ( new Error ( message ) )
                }
    
                // RPC 执行时中断连接
                socket.once ( 'disconnect', onError )

                socket.emit ( action, ...params, (returns: unknown) => {

                    socket.off ( 'disconnect', onError )

                    resolve ( returns )
                } )
            } )
        } catch ( error ) {

            throw new Error ( error.message )
        }
    }



    /**
     * RPC
     */
     async rpc ( url: string, action: string, params: [], context?: oox.Context ) {

        if ( !context || !context.traceId ) {

            context = oox.getContext ( )
        }

        const { error, body } = <oox.ReturnsBody>await this.emit ( url, 'call', [ action, params, context ] )

        if ( error ) throw new Error ( error.message )
        else return body
    }
}