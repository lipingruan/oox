
import { eventHub, asyncStore } from './app'



function log ( tag: string, ...msgs: any[] ) {

    const context = asyncStore.getStore ( )

    eventHub.emit ( 'log', context, { tag, msgs } )
}



export function info ( ...msgs: any[] ) {

    return log ( 'info', ...msgs )
}



export function warning ( ...msgs: any[] ) {

    return log ( 'warning', ...msgs )
}



export function error ( ...msgs: any[] ) {

    return log ( 'error', ...msgs )
}