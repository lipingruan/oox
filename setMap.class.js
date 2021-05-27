
module.exports = class SetMap {



    /**
     * @type {Map<String,Set>}
     */
    map = new Map ( )



    has ( name, node ) {

        if ( !this.map.has ( name ) ) return false

        if ( !node ) return true

        const set = this.map.get ( name )

        return set.has ( node )
    }



    add ( name, node ) {

        if ( !this.map.has ( name ) ) {

            this.map.set ( name, new Set ( [ node ] ) )
        } else {

            this.map.get ( name ).add ( node )
        }
    }



    delete ( name, node ) {

        if ( !this.map.has ( name ) ) return

        if ( !node ) return void this.map.get ( name ).clear ( )

        this.map.get ( name ).delete ( node )
    }



    get ( name ) {

        if ( !name ) {

            const result = Object.create ( null )

            for ( const key of this.map.keys ( ) ) {

                result [ key ] = this.get ( key )
            }

            return result
        } else if ( this.map.has ( name ) ) {

            return Array.from ( this.map.get ( name ).values ( ) )
        } else return [ ]
    }
}
