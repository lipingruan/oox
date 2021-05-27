
const Global = require ( '../global' )

const RPC = require ( '../rpc/rpc.class' )

const SocketIO = require ( './socketio.class' )

module.exports = class Service extends RPC {



    static SocketIO = SocketIO



    static async call ( name, action, params, context ) {

        if ( !context || !context.traceId ) {

            let trace = { }

            Error.captureStackTrace ( trace )

            context = Global.genContextByStack ( trace.stack )
        }

        const socketIONodes = Global.socketIORegistry.get ( name )

        if ( socketIONodes.length ) {

            const node = this.selectSocketIONode ( socketIONodes )

            return this.SocketIO.call ( node, action, params, context )
        } else throw new Error ( 'No running service as ' + name )
    }



    /**
     * 
     * @param {string[]} nodes 
     */
    static selectSocketIONode ( nodes ) {

        return nodes [ Math.floor ( Math.random ( ) * nodes.length ) ]
    }
}