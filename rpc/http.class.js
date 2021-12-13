
const http = require ( 'http' )

const { parseHTTPBody, getIPAddress, httpRequest } = require ( '../util' )

const Context = require ( './context.class' )

const RPC = require ( './rpc.interface.class' )

const Global = require ( '../global' )



module.exports = class HTTPModule {



    /**
     * @type {RPC}
     */
    rpc = null



    /**
     * listen port
     */
    port = 0



    /**
     * socket.io service path
     */
    path = '/'



    /**
     * @param {{port:Number, path:String}} config
     */
    set config ( config ) {

        if ( !config ) return this.rpc.config.gateway.http = null

        config = this.rpc.config.gateway.http = Object.assign ( this.config || { }, config )

        this.port = config.port || 0

        if ( config.path ) this.path = config.path
        else config.path = this.path
    }



    get config ( ) {

        return this.rpc.config.gateway.http
    }



    /**
     * @type {http.Server}
     */
    server = null



    /**
     * 
     * @param {RPC} rpc 
     */
    constructor ( rpc ) {

        this.rpc = rpc
    }



    /**
     * start http service
     * @returns {http.Server}
     */
    async serve ( ) {

        await this.stop ( )

        const config = this.config

        if ( !config ) return

        const { port } = config

        const isRndPort = 'number' !== typeof port || port === 0

        const server = 
        this.server = http.createServer ( this.call.bind ( this ) )

        server.listen ( isRndPort ? 0 : port )

        config.port = server.address ( ).port
        config.path = this.path

        return server
    }



    /**
     * stop http service
     */
    stop ( ) {

        if ( this.server && this.server.listening )
        return new Promise ( ( resolve, reject ) => {

            this.server.close ( function ( error ) {

                if ( error ) reject ( error ) 
                else resolve ( )
            } )
        } )
    }



    /**
     * CORS
     * @param {http.IncomingMessage} request 
     * @param {http.ServerResponse} response 
     */
    cors ( request, response ) {

        // origin checking
        if ( this.rpc.config.origin ) {

            const origin = this.rpc.config.origin

            const requestOrigin = request.headers.origin

            if ( origin === '*' ) {

                response.setHeader ( 'Access-Control-Allow-Origin', '*' )
            } else if ( origin === requestOrigin || Array.isArray ( origin ) && origin.includes ( requestOrigin ) ) {

                response.setHeader ( 'Access-Control-Allow-Origin', requestOrigin )

                response.setHeader ( 'Vary', 'Origin' )
            } else {

                response.statusCode = 403

                response.end ( )

                return false
            }

            response.setHeader ( 'Access-Control-Max-Age', 3600 )
            response.setHeader ( 'Access-Control-Allow-Headers', 'x-caller,content-type' )
            response.setHeader ( 'Access-Control-Allow-Methods', 'POST' )
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
     * @param {http.IncomingMessage} request 
     * @param {http.ServerResponse} response 
     */
    async call ( request, response ) {

        if ( request.url !== this.path ) {

            return this.respond ( request, response, new Error ( 'URL Incorrect' ) )
        }

        if ( !this.cors ( request, response ) ) return

        let body = Object.create ( null )

        try {

            body = await parseHTTPBody ( request )

            if ( !body || 'object' !== typeof body ) throw new Error ( 'Content Invalid' )

        } catch ( error ) {

            return this.respond ( request, response, error )
        }

        // global unique id
        const traceId = request.headers [ 'x-trace-id' ]

        // service name, required
        const caller = request.headers [ 'x-caller' ] || 'anonymous'

        // client ip or caller service ip
        const ip = request.headers [ 'x-ip' ] || request.socket.remoteAddress

        // startup client ip
        const sourceIP = request.headers [ 'x-real-ip' ]

        const { action, params = [ ] } = body

        const context = Global.genContext ( { traceId, caller, sourceIP, ip } )

        const format = await this.rpc.call ( action, params, context )

        this.respond ( request, response, format )
    }



    /**
     * HTTP Response Catch
     * @param {http.IncomingMessage} request 
     * @param {http.ServerResponse} response 
     * @param {Object} format 
     * @param {Boolean} format.success
     * @param {Error} format.error
     * @param {any} format.body
     */
    respond ( request, response, format ) {

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
     * @param {String|URL|http.RequestOptions} url
     * @param {String} action 函数名称
     * @param {Array} params 参数列表
     * @param {Context} context 上下文
     */
    static async call ( url, action, params, context ) {

        if ( !context || !context.traceId ) {

            context = Global.getContext ( )
        }

        const { traceId, caller, sourceIP } = context

        const headers = {
            'Content-Type': 'application/json',
            'x-trace-id': String ( traceId ),
        }

        if ( caller ) headers [ 'x-caller' ] = String ( caller )

        if ( sourceIP ) headers [ 'x-real-ip' ] = sourceIP

        headers [ 'x-ip' ] = getIPAddress ( 4 ) [ 0 ]

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