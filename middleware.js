


/**
 * Map<中间件名字,中间件函数>
 * @type {Map<String,Function>}
 */
exports.middlewares = new Map ( )



/**
 * WeakMap<殼函數，原函數>
 * @type {Map<String,Function>}
 */
exports.wrappedActions = new Map ( )



/**
 * Map<中间件名字,Set<接口函数>>
 * @type {Map<String,Set<Function>>}
 */
exports.middlewareActions = new Map ( )



/**
 * WeakMap<接口函数,[中间件名字]>
 * @type {WeakMap<Function,[String]>}
 */
exports.actionMiddlewares = new WeakMap ( )



/**
 * @type {Map<String,Proxy>}
 */
exports.middlewareProxys = new Map ( )



/**
 * 
 * @param {String} key 
 * @param {Function} middleware 
 * @returns {(Function)=>{}}
 */
exports.define = ( key, middleware ) => {

    if ( middleware ) {

        exports.middlewares.set ( key, middleware )

        exports.middlewareActions.set ( key, new Set ( ) )

        const proxy = new Proxy ( middleware, {

            has ( target, action ) {

                const sourceMethod = exports.wrappedActions.get ( action )

                return exports.middlewareActions.get ( key ).has ( sourceMethod )
            }
        } )

        // save proxy
        exports.middlewareProxys.set ( key, proxy )
    } else {

        return arg => exports.define ( key, arg )
    }
}



/**
 * 
 * @param {String} key 
 * @param {Function} action 
 * @param {'start'|'end'} place 
 */
exports.use = ( key, action, place='end' ) => {

    if ( !exports.middlewareActions.has ( key ) ) exports.middlewareActions.set ( key, new Set ( ) )

    if ( !exports.actionMiddlewares.has ( action ) ) exports.actionMiddlewares.set ( action, [ ] )

    // 双向绑定

    exports.middlewareActions.get ( key ).add ( action )

    if ( place === 'end' ) {

        exports.actionMiddlewares.get ( action ).push ( key )
    } else {

        exports.actionMiddlewares.get ( action ).unshift ( key )
    }
}



exports.delete = ( key ) => {

    exports.middlewares.delete ( key )

    if ( exports.middlewareActions.has ( key ) ) {

        const actions = exports.middlewareActions.get ( key ).values ( )

        // remove action bindings
        for ( const action of actions ) {

            const middlewareNames = exports.actionMiddlewares.get ( action ).filter ( value => value !== key )

            exports.actionMiddlewares.set ( action, middlewareNames )
        }
    }

    exports.middlewareActions.get ( key ).clear ( )

    exports.middlewareActions.delete ( key )
}



exports.handler = new Proxy ( o=>o, {



    get ( target, key ) {

        return exports.middlewareProxys.get ( key )
    },



    set ( target, key, action ) {

        if ( exports.middlewares.has ( key ) ) {

            exports.use ( key, action, 'start' )
        } else {

            exports.define ( key, action )
        }

        return true
    },



    deleteProperty ( target, key ) {

        exports.delete ( key )

        return true
    },



    apply ( target, thisArg, args ) {

        return exports.define.apply ( exports, args )
    }
} )
