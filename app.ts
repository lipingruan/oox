
import { EventEmitter } from 'node:events'

import { AsyncLocalStorage } from 'node:async_hooks'

import { genKVMethods } from './utils'



export * as logger from './logger'



export interface ReturnsBody {
    traceId: string,
    success: boolean,
    body?: any,
    error?: {
        message: string,
        stack: string,
    }
}



export class Context {
    [x: string]: any

    // 请求溯源ID
    traceId? = ''
}



export const asyncStore = new AsyncLocalStorage<Context> ( )

export const eventHub = new EventEmitter ( )



/**
 * sourceMethods => methods
 */
let sourceMethods: any = { }



/**
 * the kvMethods is all actions refs [has bind this]
 */
export const kvMethods: Map<string, Function> = new Map ( )

export const sourceKVMethods: Map<string, Function> = new Map ( )



export function setMethods ( methods: any ) {

    sourceMethods = methods

    kvMethods.clear ( )

    sourceKVMethods.clear ( )

    genKVMethods ( methods, kvMethods, sourceKVMethods )
}



export function getMethods ( ) {

    return sourceMethods
}


export function on ( event: 'app:configured' | 'app:served' | 'app:stopped', listener: ( ) => void ): void
export function on ( event: 'request', listener: ( action: string, params: any[], context: Context ) => void ): void
export function on ( event: 'success', listener: ( action: string, params: any[], context: Context, result: ReturnsBody ) => void ): void
export function on ( event: 'fail',    listener: ( action: string, params: any[], context: Context, error: Error ) => void ): void
export function on ( event: 'log',     listener: ( context: Context, tag: string, msgs: any[] ) => void ): void
export function on ( event: string,    listener: ( ...args: any[] ) => void ): void
export function on ( event: string,    listener: ( ...args: any[] ) => void ) {
    eventHub.on ( event, listener )
}

export function once ( event: 'app:configured' | 'app:served' | 'app:stopped', listener: ( ...args: any[] ) => void ): void
export function once ( event: 'request', listener: ( action: string, params: any[], context: Context ) => void ): void
export function once ( event: 'success', listener: ( action: string, params: any[], context: Context, result: ReturnsBody ) => void ): void
export function once ( event: 'fail',    listener: ( action: string, params: any[], context: Context, error: Error ) => void ): void
export function once ( event: 'log',     listener: ( context: Context, tag: string, msgs: any[] ) => void ): void
export function once ( event: string,    listener: ( ...args: any[] ) => void ): void
export function once ( event: string, listener: ( ...args: any[] ) => void ) {
    eventHub.once ( event, listener )
}

export function off ( event: 'app:configured' | 'app:served' | 'app:stopped' | 'request' | 'success' | 'fail' | 'log', listener: ( ...args: any[] ) => void ): void
export function off ( event: string, listener: ( ...args: any[] ) => void ): void
export function off ( event: string, listener: ( ...args: any[] ) => void ) {
    eventHub.off ( event, listener )
}

export function emit ( event: string, ...args: any[] ) {
    return eventHub.emit ( event, ...args )
}



/**
 * Call an Function on RPC server
 * @param action 
 * @param params 
 * @param context 
 * @returns 
 */
export async function call ( action: string, params: any[]=[], context: Context ): Promise<ReturnsBody> {

    if ( !Array.isArray ( params ) ) params = [ params ]

    const { traceId } = context

    eventHub.emit ( 'request', action, params, context )

    const returns: ReturnsBody = {
        traceId,
        success: false
    }

    try {

        const result = await execute ( action, [ ...params ], context )

        returns.body = result

        returns.success = true

        eventHub.emit ( 'success', action, params, context, result )
    } catch ( error ) {

        returns.error = {
            message: error.message,
            stack: error.stack
        }

        eventHub.emit ( 'fail', action, params, context, error )
    } finally {

        return returns
    }
}



export async function execute ( action: string, params: Array<any>, context: Context ) {

    const __proxy = '__proxy', _proxy = '_proxy'

    if ( __proxy === action || _proxy === action || action.endsWith ( _proxy ) ) throw new Error ( 'Invalid Action[' + action + ']' )

    const methods = kvMethods



    // 目标函数
    const target = methods.get ( action )

    // 目标代理函数
    const targetProxy = methods.get ( action + _proxy )

    // 即不存在目标也不存在目标代理时, 报错函数不存在
    if ( !target && !targetProxy ) throw new Error ( 'Unknown Action [' + action + ']' )

    asyncStore.enterWith ( context )



    // ============================ PROXY BEGIN ============================
    // 最顶层代理
    const topProxy = methods.get ( __proxy )

    if ( topProxy ) {

        const proxyReturns = await topProxy ( action, params, context )

        if ( proxyReturns !== undefined ) return proxyReturns
    }



    // 'x.y.z' => [ 'x', 'y', 'z' ]
    const nameStack = action.split ( '.' ), size = nameStack.length - 1

    let  index = -1, proxyPrefix = ''



    // 根代理遍历
    while ( ++index < size ) {

        // x.
        // x.y.
        proxyPrefix += nameStack [ index ] + '.'

        // x.__proxy
        // x.y.__proxy
        const rootProxy = methods.get ( proxyPrefix + __proxy )

        // x.__proxy ( 'y.z', ... )
        // x.y.__proxy ( 'z', ... )
        if ( rootProxy ) {

            const proxyReturns = await rootProxy ( nameStack.slice ( index ).join ( '.' ), params, context )

            if ( proxyReturns !== undefined ) return proxyReturns
        }
    }



    // 同级代理
    const layerProxy = methods.get ( proxyPrefix + _proxy )

    if ( layerProxy ) {

        const proxyReturns = await layerProxy ( nameStack [ index ], params, context )

        if ( proxyReturns !== undefined ) return proxyReturns
    }



    if ( targetProxy ) {

        const proxyReturns = await targetProxy ( params, context )

        if ( proxyReturns !== undefined ) return proxyReturns
    }
    // ============================= PROXY END =============================



    // make sure target action execute after all proxies
    if ( target ) {

        return await target ( ...params )
    }
}
