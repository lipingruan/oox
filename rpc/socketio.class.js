
const SocketIOClient = require ( '../socketio/client.class' )

const Context = require ( './context.class' )

const RPC = require ( './rpc.interface.class' )

const Socket = require ( '../socketio/socket.class' )

const Global = require ( '../global' )



module.exports = class SocketIOModule extends SocketIOClient {



    /**
     * @type {RPC}
     */
    rpc = null



    /**
     * @param config {{port:Number, path:String}}
     */
    set config ( config ) {

        if ( !config ) return this.rpc.config.gateway.socketio = null

        config = this.rpc.config.gateway.socketio = Object.assign ( this.config || { }, config )

        this.port = config.port || 0

        if ( config.path ) this.path = config.path
        else config.path = this.path
    }



    get config ( ) {

        return this.rpc.config.gateway.socketio
    }



    /**
     * 
     * @param {RPC} rpc 
     */
    constructor ( rpc ) {

        super ( rpc.name )

        this.rpc = rpc

        this.host = rpc.config.host
    }



    async serve ( ) {

        if ( !this.config ) return

        await super.serve ( )

        this.config.port = this.port
        this.config.path = this.path
    }



    async stop ( ) {

        await super.stop ( )
    }



    genOptions ( ) {

        const options = super.genOptions ( )
        
        if ( this.rpc.config.origin ) {

            const origin = this.rpc.config.origin

            options.cors = {
                origin
            }
        }

        return options
    }



    /**
     * 
     * @param {Socket} socket 
     */
    onConnection ( socket ) {

        super.onConnection ( socket )

        socket.setMaxListeners ( 0 )

        const connectionContext = {
            ip: socket.data.host,
            caller: socket.data.name,
            callerId: socket.data.id,
        }

        socket.on ( 'call', async ( action, params, context, callback ) => {

            if ( 'object' !== typeof context ) context = Global.genContext ( connectionContext )
            else context = Global.genContext ( Object.assign ( context, connectionContext ) )

            this.call ( action, params, context, callback )
        } )
    }



    async call ( action, params, context, callback ) {

        const format = await this.rpc.call ( action, params, context )

        'function' === typeof callback && callback ( format )
    }



    /**
     * 
     * @param {Socket} socket 
     */
    static onConnection ( socket ) {

        super.onConnection ( socket )

        const [ callerServer ] = Global.socketIOServers.filter ( server => server.name === socket.data.owner )

        if ( callerServer ) socket.on ( 'call', callerServer.call.bind ( callerServer ) )
    }



    /**
     * RPC emit
     * @param {String} url
     * @param {String} action 函数名称
     * @param {[]} params 参数列表
     * @param {Context} context 上下文
     */
     static async emit ( url, action, params, context ) {

        if ( !context || !context.traceId ) {

            let trace = { }

            Error.captureStackTrace ( trace )

            context = Global.genContextByStack ( trace.stack )
        }

        /**
         * @type {Socket}
         */
        let socket = null

        try {

            socket = await this.connect ( url, context.caller )
        } catch ( error ) {

            // try again
            socket = await this.connect ( url, context.caller )
        }

        try {

            return await new Promise ( ( resolve, reject ) => {

                const onError = reason => reject ( new Error ( `SocketIO name[${socket.data.name}] id[${socket.data.id}] ` + ( 'string' === typeof reason ? reason : reason.message ) ) )
    
                // RPC 执行时中断连接
                socket.once ( 'disconnect', onError )

                socket.emit ( action, ...params, format => {

                    socket.off ( 'disconnect', onError )

                    resolve ( format )
                } )
            } )
        } catch ( error ) {

            throw new Error ( error.message )
        }
    }



    /**
     * HTTP RPC
     * @param {String} url
     * @param {String} action 函数名称
     * @param {[]} params 参数列表
     * @param {Context} context 上下文
     */
     static async call ( url, action, params, context ) {

        if ( !context || !context.traceId ) {

            let trace = { }

            Error.captureStackTrace ( trace )

            context = Global.genContextByStack ( trace.stack )
        }

        const { error, body } = await this.emit ( url, 'call', [ action, params, context ], context )

        if ( error ) throw new Error ( error.message )
        else return body
    }
}