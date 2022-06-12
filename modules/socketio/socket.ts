
import { Socket as _ServerSocket } from 'socket.io'
import { Socket as _ClientSocket } from 'socket.io-client'



export interface SocketData {

    /**
     * 是否连接成功
     */
    connected: boolean

    /**
     * 连接主机地址
     */
    host: string

    /**
     * 连接服务名称
     */
    name: string

    /**
     * 目标服务网络唯一ID
     */
    id: string

    /**
     * 连接所属服务名称
     */
    owner: string
}



export interface ServerSocket extends _ServerSocket {
    data: Partial<SocketData>
}



export interface ClientSocket extends _ClientSocket {
    data?: Partial<SocketData>
}



export type Socket = ServerSocket | ClientSocket



export const sockets = new Map<string, Socket>()



export const socketGroups = new Map<string,Set<Socket>>()



export function addGroupSocket ( socket: Socket ) {

    const { id, name } = socket.data

    sockets.set ( id, socket )

    if ( socketGroups.has ( name ) ) {

        socketGroups.get ( name ).add ( socket )
    } else {

        socketGroups.set ( name, new Set ( [ socket ] ) )
    }
}



export function removeGroupSocket ( socket: Socket ) {

    const { name } = socket.data

    if ( socketGroups.has ( name ) ) {

        socketGroups.get ( name ).delete ( socket )
    }
}



export function getGroupSockets ( name: string ) {

    if ( !socketGroups.has ( name ) ) {

        const group:Set<Socket> = new Set ( )

        socketGroups.set ( name, group )

        return group
    }

    return socketGroups.get ( name )
}
