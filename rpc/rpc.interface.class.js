
const { EventEmitter } = require ( 'events' )

const { genKVMethods, getIPAddress } = require ( '../util' )

const Context = require ( './context.class' )

const Config = require ( './config.class' )

if ( Error.stackTraceLimit < 20 ) Error.stackTraceLimit = 20



module.exports = class RPC extends EventEmitter {



    /**
     * refMethods => methods
     */
    refMethods = { }



    /**
     * the kvMethods is all actions refs
     * @type {Map<String,Function>}
     */
    kvMethods = new Map ( )



    set methods ( methods ) {

        this.refMethods = methods

        this.kvMethods.clear ( )

        genKVMethods ( methods, this.kvMethods )
    }



    appendMethods ( methods ) {

        genKVMethods ( methods, this.kvMethods )
    }



    get methods ( ) {

        return this.refMethods
    }



    /**
     * RPC Node Name
     */
    name = ''



    config = new Config



    /**
     * new RPC service
     * @param {*} methods 
     */
    constructor ( name, methods ) {
        super ( )

        this.name = name

        if ( methods )
        this.methods = methods

        const [ host ] = getIPAddress ( 4 )

        this.config.host = host

        this.config.name = name
    }



    async serve ( ) { }



    async stop ( ) { }



    /**
     * RPC事件监听
     * @param {'request'|'success'|'fail'} event
     * @param {(action: String, params: [], context: Context, result: {
     * traceId: String,
     * success: Boolean,
     * body: any,
     * error: Error
     * } | Error) => void} listener
     */
    on ( event, listener ) {
        return super.on ( event, listener )
    }



    /**
     * 通用RPC调用方法
     * @param {String} action 
     * @param {[]} params 
     * @param {Context} context 
     */
    async call ( action, params=[], context ) { }
}
