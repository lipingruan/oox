
import * as http from 'node:http'

import { httpRequest, parseHTTPBody } from './utils'

import * as oox from '../../index'

import Module, { ModuleConfig } from '../module'



export class HTTPConfig extends ModuleConfig {
    // listen port
    port = 0
    // service path
    path = '/'
    // browser cross origin
    origin = ''
}



export default class HTTPModule extends Module {



    name = 'http'

    config = new HTTPConfig

    server: http.Server = null



    setConfig ( config:HTTPConfig ) {

        Object.assign ( this.config, config )

        if ( !config.hasOwnProperty ( 'port' ) ) {

            this.config.port = oox.config.port
        }

        if ( !config.hasOwnProperty ( 'origin' ) ) {

            this.config.origin = oox.config.origin
        }
    }
    
    
    
    getConfig ( ): HTTPConfig {
    
        return this.config
    }
    
    
    
    /**
     * start http service
     */
    async serve ( ) {
    
        await this.stop ( )
    
        const { port } = this.config
    
        this.server = http.createServer ( this.call.bind ( this ) )
    
        this.server.listen ( port )
    
        const address = this.server.address ( )
        
        if ( !address || 'object' !== typeof address ) throw new Error ( 'Cannot read http server port' )
    
        this.config.port = address.port
    }
    
    
    
    /**
     * stop http service
     */
    stop ( ) {
    
        if ( this.server && this.server.listening )
        return new Promise<void> ( ( resolve, reject ) => {
    
            this.server.close ( function ( error ) {
    
                if ( error ) reject ( error ) 
                else resolve ( )
            } )
        } )
    }
    
    
    
    /**
     * browser cross origin
     */
    cors ( request: http.IncomingMessage, response: http.ServerResponse ) {
    
        // origin checking
        const origin = this.config.origin
    
        const requestOrigin = request.headers.origin
    
        if ( origin && requestOrigin ) {
    
            if ( origin === '*' || origin === requestOrigin || Array.isArray ( origin ) && origin.includes ( requestOrigin ) ) {
    
                response.setHeader ( 'Access-Control-Allow-Origin', requestOrigin )
    
                response.setHeader ( 'Vary', 'Origin' )
            } else {
    
                response.statusCode = 403
    
                response.end ( )
    
                return false
            }
    
            response.setHeader ( 'Access-Control-Max-Age', 3600 )
            response.setHeader ( 'Access-Control-Allow-Headers', 'x-caller,content-type' )
            response.setHeader ( 'Access-Control-Allow-Methods', '*' )
        }
    
        if ( request.method === 'OPTIONS' ) {
    
            response.statusCode = 204
    
            response.end ( )
    
            return false
        }
    
        return true
    }
    
    
    
    /**
     * HTTP-RPC服务器请求监听方法
     */
    async call ( request: http.IncomingMessage, response: http.ServerResponse ) {

        if ( request.url !== this.config.path ) {

            const error = {
                message: 'Invalid URL',
                stack: ''
            }

            Error.captureStackTrace ( error )
    
            return this.respond ( request, response, {
                success: false,
                error
            } )
        }
    
        if ( !this.cors ( request, response ) ) return
    
        let body = Object.create ( null )
    
        try {
    
            body = await parseHTTPBody ( request )
    
            if ( !body || 'object' !== typeof body ) throw new Error ( 'Content Invalid' )
    
        } catch ( error ) {
    
            return this.respond ( request, response, {
                success: false,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            } )
        }
    
        // global unique id
        const traceId = String ( request.headers [ 'x-trace-id' ] || '' )
    
        // service name, required
        const caller = String ( request.headers [ 'x-caller' ] || 'anonymous' )
    
        // client ip or caller service ip
        const ip = String ( request.headers [ 'x-ip' ] || request.socket.remoteAddress || '' )
    
        // startup client ip
        const sourceIP = String ( request.headers [ 'x-real-ip' ] || '' )
    
        const { action, params = [ ] } = body
    
        const context = oox.genContext ( { traceId, caller, sourceIP, ip, callerId: '' } )
    
        const format = await oox.call ( action, params, context )
    
        this.respond ( request, response, format )
    }
    
    
    
    /**
     * HTTP Response Catch
     */
    respond ( request: http.IncomingMessage, response: http.ServerResponse, format: { body?: any; success: boolean; error?: { message: any; stack: any } } ) {
    
        let formatString = ''
    
        try {
    
            formatString = JSON.stringify ( format )
        } catch ( { message, stack } ) {
    
            delete format.body
    
            format.success = false
    
            format.error = {
                message,
                stack
            }
    
            formatString = JSON.stringify ( format )
        }
    
        response.setHeader ( 'Content-Type', 'application/json' )
    
        response.setHeader ( 'Content-Length', Buffer.byteLength ( formatString ) )
    
        response.end ( formatString )
    }
    
    
    
    /**
     * HTTP RPC
     */
    async rpc ( url: string | URL, action: string, params: Array<any>, context?: oox.Context ) {
    
        if ( !context || !context.traceId ) {
    
            context = oox.getContext ( )
        }
    
        const { traceId, caller, sourceIP } = context
    
        const headers = {
            'Content-Type': 'application/json',
            'x-trace-id': String ( traceId ),
        }
    
        if ( caller ) headers [ 'x-caller' ] = String ( caller )
    
        if ( sourceIP ) headers [ 'x-real-ip' ] = sourceIP
    
        // headers [ 'x-ip' ] = getIPAddress ( 4 ) [ 0 ]
    
        const format = await httpRequest ( url, {
            headers
        }, JSON.stringify ( { action, params } ) )
    
        if ( 'string' === typeof format ) throw new Error ( format )
    
        const { error, body } = format
    
        if ( error ) {
    
            const asyncError = new Error ( error.message )
    
            throw asyncError
        } else {
    
            return body
        }
    }
}