
if ( Error.stackTraceLimit < 20 ) Error.stackTraceLimit = 20

const Global = require ( './global.class' )

/**
 * @type {Global}
 */
const oox = global.oox

module.exports = oox || new Global

global.oox = module.exports