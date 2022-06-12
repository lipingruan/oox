
import * as app from './app'

import { getIPAddress } from './utils'

import Module from './modules/module'

import Modules from './modules'

// import { wrappedActions, actionMiddlewares, middlewares } from './middleware'


export { ReturnsBody } from './app'
export { Module }
export const modules = new Modules



export const {
    asyncStore,
    setMethods,
    getMethods,
    kvMethods,
    sourceKVMethods,
    call,
    execute,
    on
} = app



export class Context extends app.Context {
    // 请求溯源IP
    sourceIP? = ''
    // 请求者IP
    ip = ''
    // 请求者名称
    caller = 'anonymous'
    // 请求者ID (长连接专用)
    callerId? = ''
}



export class Config {
    // 服务名称
    name = 'local'
    // 主机地址
    host = getIPAddress ( 4 ) [ 0 ]
}



export const config = new Config ( )



let genTraceIdFunction: () => string = function ( ) {

    const uid = [ 
        Math.floor ( Date.now ( ) / 1000 ).toString ( 16 ),
        Math.floor ( Math.random ( ) * 0xffffffff ).toString ( 16 ).padStart ( 8, '0' )
    ]

    return uid.join ( '' )
}



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



export class RPCKeepAliveConnection {

    nativeConnection: any = null

    adapter: RPCConnectionAdapter = null
}



export const keepAliveConnections: Map<string,RPCKeepAliveConnection[]> = new Map ( )



export async function rpc ( appName: string, action: string, params: any[], context?: Context ) {
        
    if ( !context || !context.traceId ) {
    
        context = getContext ( )
    }

    const connections = keepAliveConnections.get ( appName )

    if ( !connections || !connections.length ) throw new Error ( `Connection<${appName}> not found` )

    const connection = connections [ 0 ]

    return connection.adapter.rpc ( connection.nativeConnection, action, params, context )
}
