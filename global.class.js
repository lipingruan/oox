
const { getTraceIdByStack } = require ( './util' )

const Context = require ( './rpc/context.class' )

const RPC = require ( './rpc/rpc.interface.class' )

const Socket = require ( './socketio/socket.class' )

const SetMap = require ( './setMap.class' )



module.exports = class Global {



    /**
     * @type {[RPC]}
     */
    instances = [ ]



    /**
     * all contexts map
     * @type {Map<String,Context>}
     */
    contexts = new Map ( )



    /**
     * @type {Map<String,Socket>}
     */
    sockets = new Map ( )



    /**
     * @type {SocketIOServer[]}
     */
    socketIOServers = [ ]



    /**
     * @type {Map<String,Set<Socket>>}
     */
    socketIORegistry = new SetMap



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
    }



    /**
     * 获取链路跟踪上下文
     * @param {Context} param0 
     */
    genContext ( { caller, traceId, ip, sourceIP } = { } ) {

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

        return context
    }



    genContextByStack ( stack ) {

        if ( !stack ) {

            let trace = { }

            Error.captureStackTrace ( trace )

            stack = trace.stack
        }

        const traceId = getTraceIdByStack ( stack )

        if ( traceId ) {

            const sourceContext = this.contexts.get ( traceId )

            if ( sourceContext ) {

                return this.genContext ( { traceId, sourceIP: sourceContext.sourceIP } )
            } else {

                return this.genContext ( { traceId } )
            }
        } else return this.genContext ( )
    }
}
