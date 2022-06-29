
import Module from './module'

import HTTP from './http'



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
    }



    constructor ( ) {
        super ( )

        this.add ( this.builtins.http )
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



    setConfig ( config: any ) {
        
        for ( const module of this.#queue ) {

            if ( module.name in config ) {

                const moduleConfig = config [ module.name ]

                if ( moduleConfig ) {

                    module.setConfig ( moduleConfig )
                } else {

                    module.setConfig ( { disabled: true } )
                }

                config [ module.name ] = module.getConfig ( )
            }
        }
    }
    


    async serve ( ) {

        try {

            for ( const module of this.#queue ) {

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