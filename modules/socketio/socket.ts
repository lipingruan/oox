
import { Socket as _ServerSocket } from 'socket.io'
import { Socket as _ClientSocket } from 'socket.io-client'

import { RPCKeepAliveConnectionData } from '../../index'



export interface ServerSocket extends _ServerSocket {
    data: RPCKeepAliveConnectionData
}



export interface ClientSocket extends _ClientSocket {
    data: RPCKeepAliveConnectionData
}



export type Socket = ServerSocket | ClientSocket



export const sockets = new Map<string, Socket>()