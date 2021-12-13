
if ( Error.stackTraceLimit < 20 ) Error.stackTraceLimit = 20

const { AsyncLocalStorage } = require ( 'async_hooks' )

const Context = require ( './rpc/context.class' )

const RPC = require ( './rpc/rpc.interface.class' )

const Socket = require ( './socketio/socket.class' )

const SetMap = require ( './setMap.class' )

const Middleware = require ( './middleware' )



const Global = {



    asyncStore: new AsyncLocalStorage ( ),



    md: Middleware.handler,



    /**
     * @type {[RPC]}
     */
    instances: [ ],



    /**
     * @type {Map<String,Socket>}
     */
    sockets: new Map ( ),



    /**
     * @type {SocketIOServer[]}
     */
    socketIOServers: [ ],



    /**
     * @type {Map<String,Set<Socket>>}
     */
    socketIORegistry: new SetMap,



    /**
     * 生成随机不重复id
     * @returns {String}
     */
    genTraceId ( ) {

        const uid = [ 
            Math.floor ( Date.now ( ) / 1000 ).toString ( 16 ),
            Math.floor ( Math.random ( ) * 0xffffffff ).toString ( 16 ).padStart ( 8, '0' )
        ]

        return uid.join ( '' )
    },



    /**
     * 获取链路跟踪上下文
     * @param {Context} param0 
     * @returns {Context}
     */
    genContext ( { caller, callerId, traceId, ip, sourceIP } = { } ) {

        const context = new Context ( )

        if ( caller ) {

            context.caller = caller
        } else {

            const primaryService = this.instances [ 0 ]

            if ( primaryService ) context.caller = primaryService.name
        }

        context.traceId = traceId || this.genTraceId ( )
        context.ip = ip
        context.sourceIP = sourceIP || ip
        context.callerId = callerId

        return context
    },



    /**
     * 
     * @returns {Context}
     */
    getContext ( ) {

        const context = this.asyncStore.getStore ( )

        return context || this.genContext ( )
    },
}

/**
 * @type {Global}
 */
global.oox = module.exports = global.oox || Global