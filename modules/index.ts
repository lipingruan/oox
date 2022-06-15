
import * as path from 'node:path'

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
    


    async serve ( ) {

        try {

            for ( const module of this.#queue ) {

                if ( module.name === 'oox:socketio' ) {
                    // http & socketio shared port

                    const _socketio = <SocketIO>module, _http = this.builtins.http

                    const httpConfig = this.builtins.http.getConfig ( ), socketioConfig = _socketio.getConfig ( )

                    let isShareServer = false

                        // 都没设置端口
                        isShareServer = !httpConfig.port && !socketioConfig.port
                        // 都设置相同端口
                        isShareServer = isShareServer || httpConfig.port === socketioConfig.port
                        // http 模块未被禁用
                        isShareServer = isShareServer && !httpConfig.disabled

                    if ( isShareServer ) {

                        socketioConfig.path = path.posix.join ( httpConfig.path, socketioConfig.path )
                        _socketio.server = _http.server
                    }
                }

                if ( !module.getConfig ( ).disabled ) {

                    await module.serve ( )
                }
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