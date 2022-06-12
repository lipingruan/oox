
import Module from './module'

import HTTP from './http'

import SocketIO from './socketio'



export default class Modules extends Module {



    /**
     * the module unique name
     */
    name = 'oox:modules'



    /**
     * FIFO queue for modules starting
     */
    #queue: Module[] = [ ]



    /**
     * all modules map
     */
    #map:Map<string,Module> = new Map ( )



    /**
     * all builtin modules
     */
    builtins = {
        http: new HTTP,
        socketio: new SocketIO
    }



    constructor ( ) {
        super ( )

        this.add ( this.builtins.http )
            .add ( this.builtins.socketio )
    }



    add ( module: Module ) {

        if ( !module.name || 'string' !== typeof module.name ) throw new Error ( `Module<${module.name}> has noname` )

        if ( this.#map.has ( module.name ) ) throw new Error ( `Module<${module.name}> has exists` )

        this.#map.set ( module.name, module )

        this.#queue.push ( module )

        return this
    }



    get ( name: string ): Module {

        return this.#map.get ( name )
    }



    async remove ( name: string ) {

        const module = this.get ( name )

        if ( !module ) return

        await module.stop ( )

        const index = this.#queue.indexOf ( module )

        this.#queue.splice ( index, 1 )

        this.#map.delete ( name )
    }
    


    setConfig ( ) {

    }



    getConfig ( ) {

    }



    async serve ( ) {

        try {

            for ( const module of this.#queue ) {

                if ( module.name === 'oox:socketio' ) {
                    // http & socketio shared port

                    const _socketio = <SocketIO>module, _http = this.builtins.http

                    const httpConfig = this.builtins.http.getConfig ( ), socketioConfig = _socketio.getConfig ( )

                    let isShareServer = false

                        isShareServer = !httpConfig.port && !socketioConfig.port

                        isShareServer ||= httpConfig.port === socketioConfig.port

                    if ( isShareServer ) _socketio.server = _http.server
                }

                await module.serve ( )
            }
        } catch ( error ) {

            await this.stop ( )

            throw error
        }
    }



    async stop ( ) {

        for ( const module of this.#queue ) {
            await module.stop ( )
        }
    }
}