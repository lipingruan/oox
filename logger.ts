
import { eventHub, asyncStore } from './app'



export function info ( ...msgs: any[] ) {

    const context = asyncStore.getStore ( )

    if ( context ) eventHub.emit ( 'log', context, 'info', msgs )
    else console.info ( '[INFO]', ...msgs )
}



export function warn ( ...msgs: any[] ) {

    const context = asyncStore.getStore ( )

    if ( context ) eventHub.emit ( 'log', context, 'warn', msgs )
    else console.warn ( '[WARN]', ...msgs )
}



export function error ( ...msgs: any[] ) {

    const context = asyncStore.getStore ( )

    if ( context ) eventHub.emit ( 'log', context, 'error', msgs )
    else console.error ( '[ERROR]', ...msgs )
}



export function trace ( name?: string ) {

    const context = asyncStore.getStore ( )

    const trace = { stack: '' }
    
    Error.captureStackTrace ( trace )

    const stack = trace.stack
        .replace ( /.*\n.*logger.js.*\n/, name || 'Untitle\n' )

    if ( context ) eventHub.emit ( 'log', context, 'trace', stack )
    else console.log ( '[TRACE]', stack )
}