
const Global = require ( '../global' )

const RPC = require ( '../rpc/rpc.class' )

const SocketIO = require ( './socketio.class' )

const Context = require ( '../rpc/context.class' )



module.exports = class Service extends RPC {



    static SocketIO = SocketIO



    /**
     * 
     * @param {String} name 
     * @param {String} action 
     * @param {Array} params 
     * @param {Context} context 
     * @returns 
     */
    static async call ( name, action, params, context ) {

        if ( !context || !context.traceId ) {

            context = Global.getContext ( )
        }

        const socketIONodes = Global.socketIORegistry.get ( name )

        if ( socketIONodes.length ) {

            const node = this.selectSocketIONode ( socketIONodes )

            return this.SocketIO.call ( node, action, params, context )
        } else throw new Error ( 'No running service as ' + name )
    }



    static async emit ( name, action, params, context ) {

        if ( !context || !context.traceId ) {

            context = Global.getContext ( )
        }

        const socketIONodes = Global.socketIORegistry.get ( name )

        if ( socketIONodes.length ) {

            const node = this.selectSocketIONode ( socketIONodes )

            return this.SocketIO.emit ( node, action, params, context )
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