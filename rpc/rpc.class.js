
const { genOOXTrace } = require ( '../util' )

const Context = require ( './context.class' )

const HTTP = require ( './http.class' )

const SocketIO = require ( './socketio.class' )

const Global = require ( '../global' )

const RPCInterface = require ( './rpc.interface.class' )

const Middleware = require ( '../middleware' )



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

        this.emit ( 'request', action, params, context )

        const format = {
            traceId,
            success: false
        }

        try {

            const result = await this.execute ( this.kvMethods, action, [ ...params ], context )

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

            return format
        }
    }


    /**
     * 
     * @param {Map<String,Function>} methods 服务函数扁平化列表
     * @param {String} action
     * @param {Array} params
     * @param {Context} context
     */
    async execute ( methods, action, params, context ) {

        const __proxy = '__proxy', _proxy = '_proxy'



        // 目标函数
        const target = methods.get ( action )

        // 目标代理函数
        const targetProxy = methods.get ( action + _proxy )

        // 即不存在目标也不存在目标代理时, 报错函数不存在
        if ( !target && !targetProxy ) throw new Error ( 'Invalid Action [' + action + ']' )

        Global.asyncStore.enterWith ( context )



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



        // make sure target action execute after all proxies
        if ( target ) {

            const sourceMethod = Middleware.wrappedActions.get ( action )

            const middlewareNames = Middleware.actionMiddlewares.get ( sourceMethod )

            if ( middlewareNames && middlewareNames.length ) for ( const name of middlewareNames ) {

                const middleware = Middleware.middlewares.get ( name )

                await middleware ( action, params, context )
            }
            
            return await target ( ...params )
        }
    }
  
}
