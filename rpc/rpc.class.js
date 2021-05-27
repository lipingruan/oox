
const { genOOXTrace } = require ( '../util' )

const Context = require ( './context.class' )

if ( Error.stackTraceLimit < 20 ) Error.stackTraceLimit = 20

const HTTP = require ( './http.class' )

const SocketIO = require ( './socketio.class' )

const Global = require ( '../global' )

const RPCInterface = require ( './rpc.interface.class' )



module.exports = class RPC extends RPCInterface {

    static Context = Context

    static HTTP = HTTP
    static SocketIO = SocketIO



    /**
     * @type {HTTP}
     */
    http = new this.constructor.HTTP ( this )



    /**
     * @type {SocketIO}
     */
    socketio = new this.constructor.SocketIO ( this )



    /**
     * new RPC service
     * @param {*} methods 
     */
    constructor ( name, methods ) {
        super ( name, methods )

        Global.instances.push ( this )
    }



    async serve ( ) {

        let isShareServer = false

        if ( this.http.config && this.socketio.config ) {

            isShareServer = !this.http.config.port && !this.socketio.config.port

            isShareServer |= this.http.config.port === this.socketio.config.port
        }

        await this.http.serve ( )

        if ( isShareServer ) this.socketio.server = this.http.server

        await this.socketio.serve ( )
    }



    async stop ( ) {

        await this.http.stop ( )
        await this.socketio.stop ( )
    }



    /**
     * 通用RPC调用方法
     * @param {String} action 
     * @param {[]} params 
     * @param {Context} context 
     */
    async call ( action, params=[], context ) {

        if ( !Array.isArray ( params ) ) params = [ params ]

        const { traceId } = context

        Global.contexts.set ( traceId, context )

        this.emit ( 'request', action, params, context )

        const format = {
            traceId,
            success: false
        }

        const OOXTrace = genOOXTrace ( traceId, this.kvMethods )

        try {

            const result = await OOXTrace [ traceId ] ( action, params, context )

            format.body = result

            format.success = true

            this.emit ( 'success', action, params, context, result )
        } catch ( error ) {

            format.error = {
            message: error.message,
            stack: error.stack
            }

            this.emit ( 'fail', action, params, context, error )
        } finally {

            delete OOXTrace [ traceId ]

            Global.contexts.delete ( traceId )

            return format
        }
    }
}
