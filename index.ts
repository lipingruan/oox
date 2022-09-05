
import { randomUUID } from 'node:crypto'

import * as app from './app'

import { getIPAddress } from './utils'

import Module, { ModuleConfig } from './modules/module'

import Modules from './modules'



export { ReturnsBody } from './app'
export { Module, ModuleConfig }
export const modules = new Modules



export const {
    asyncStore,
    setMethods,
    getMethods,
    kvMethods,
    sourceKVMethods,
    call,
    execute,
    logger,
    on,
    once,
    off,
    emit,
} = app



export class Context extends app.Context {
    // 请求溯源IP
    sourceIP = ''
    // 请求者IP
    ip = ''
    // 请求者名称
    caller = 'anonymous'
    // 请求者ID (长连接专用)
    callerId = ''
    // 请求者连接把柄
    connection?: RPCKeepAliveConnection

    toJSON? ( ) {

        const context = Object.assign ( { }, this )
        delete context.connection

        return context
    }
}



export class Config {

    [x: string]: any

    // 服务名称
    name = 'local'
    // 启动文件
    entryFile = {
        // 启动文件路径
        path: '',
        // 服务列表路径
        group: '',
    }
    // 主机地址
    host = getIPAddress ( 4 ) [ 0 ]
    // 默认监听端口
    port = 0
    // 默认跨域设置
    origin = ''
}



export const config = new Config ( )



let genTraceIdFunction = ( ) => randomUUID ( )



export function setGenTraceIdFunction ( fn: () => string ) {

    genTraceIdFunction = fn
}



/**
 * 生成随机不重复id
 */
export function genTraceId ( ): string {

    return genTraceIdFunction ( )
}



/**
 * 获取链路跟踪上下文
 */
export function genContext ( context?: Context ): Context {

    const newContext = Object.assign ( new Context ( ), context )
    
    if ( !newContext.traceId ) newContext.traceId = genTraceId ( )
    if ( !newContext.sourceIP ) newContext.sourceIP = newContext.ip

    return newContext
}



export function getContext ( ): Context {

    const context = <Context>asyncStore.getStore ( )

    return context || genContext ( )
}



export async function serve ( ) {
    
    await modules.serve ( )
}



export async function stop ( ) {

    await modules.stop ( )
}



export interface RPCConnectionAdapter {

    rpc ( connection: any, action: string, params: any[], context: Context ): Promise<any>;
}



export interface RPCKeepAliveConnectionData {

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
}



export class RPCKeepAliveConnection {

    data: RPCKeepAliveConnectionData

    nativeConnection: any = null

    adapter: RPCConnectionAdapter = null

    constructor ( adapter: RPCConnectionAdapter, nativeConnection: any, data?: RPCKeepAliveConnectionData ) {
        
        this.adapter = adapter
        this.nativeConnection = nativeConnection

        if ( data ) this.data = data
    }
}



export const keepAliveConnections: Map<string,Map<string,RPCKeepAliveConnection>> = new Map ( )



export function getKeepAliveConnections ( name: string ): Map<string,RPCKeepAliveConnection> {

    return keepAliveConnections.get ( name ) || new Map<string, RPCKeepAliveConnection> ( )
}



export function getKeepAliveConnection ( name: string, id: string ): RPCKeepAliveConnection|null {

    const connections = keepAliveConnections.get ( name )

    if ( !connections ) return null

    return connections.get ( id )
}



export function addKeepAliveConnection ( connection: RPCKeepAliveConnection ) {

    const { name, id } = connection.data

    if ( keepAliveConnections.has ( name ) ) {

        keepAliveConnections.get ( name ).set ( id, connection )
    } else {

        keepAliveConnections.set ( name, new Map ( [ [ id, connection ] ] ) )
    }
}



export function removeKeepAliveConnection ( connection: RPCKeepAliveConnection ): void
export function removeKeepAliveConnection ( name: string, id: string ): void
export function removeKeepAliveConnection ( name: string|RPCKeepAliveConnection, id?: string ): void {

    if ( name instanceof RPCKeepAliveConnection ) {

        id = name.data.id
        name = name.data.name
    }

    if ( keepAliveConnections.has ( name ) ) {

        const group = keepAliveConnections.get ( name )

        group.delete ( id )

        if ( !group.size ) keepAliveConnections.delete ( name )
    }
}



/**
 * random connection select for default load balance policy
 * @param name service name
 * @returns selected connection
 */
let loadBalancePolicy = ( name: string ) => {

    const connections = keepAliveConnections.get ( name )

    if ( !connections || !connections.size ) return null

    const arrayConnections = Array.from ( connections.values ( ) )

    const index = Math.floor ( Math.random ( ) * arrayConnections.length )

    return arrayConnections [ index ]
}



export function setLoadBalancePolicy ( policy: ( name: string ) => RPCKeepAliveConnection ) {

    loadBalancePolicy = policy
}



export async function rpc ( appName: string, action: string, params: any[], context?: Context ): Promise<any>
export async function rpc ( connection: RPCKeepAliveConnection, action: string, params: any[], context?: Context ): Promise<any>
export async function rpc ( arg1: string | RPCKeepAliveConnection, action: string, params: any[], context?: Context ) {
        
    if ( !context || !context.traceId ) {
    
        context = getContext ( )
    }

    let connection: RPCKeepAliveConnection

    if ( arg1 instanceof RPCKeepAliveConnection ) {

        connection = arg1
    } else if ( 'string' === typeof arg1 ) {

        connection = loadBalancePolicy ( arg1 )

        if ( !connection ) throw new Error ( `Connection<${arg1}> not found` )
    } else throw new Error ( `Unknown rpc arg1<${arg1}>` )

    return connection.adapter.rpc ( connection.nativeConnection, action, params, context )
}
