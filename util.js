
const os = require ( 'os' )

const http = require ( 'http' )

const https = require ( 'https' )

const Context = require  ( './rpc/context.class' )

const Middleware = require ( './middleware' )



exports.getIPAddress = function ( version = 4 ) {

  const interfaces = os.networkInterfaces ( )

  const ip = [ ]

  for ( const name of Object.keys ( interfaces ) ) 
    for ( const intf of interfaces [ name ] )
      if ( intf.mac !== '00:00:00:00:00:00' )
        if ( ( version !== 4 && version !== 6 ) || 'IPv' + version === intf.family ) 
          ip.push ( intf.address )

  if ( !ip.length ) {
    if ( version !== 6 ) ip.push ( '127.0.0.1' )
    if ( version !== 4 ) ip.push ( '::1' )
  }

  return ip
}



/**
 * String => Buffer
 * @param {*} stream 
 * @param {*} totalLength 
 * @returns {Promise<Buffer>}
 */
exports.stream2buffer = function ( stream, totalLength=0 ) {

  return new Promise ( function ( resolve, reject ) {

    let buffers = [ ]

    stream.on ( 'error', reject )

    if ( totalLength ) {

      stream.on ( 'data', function ( data ) { buffers.push ( data ) } )
    } else {

      stream.on ( 'data', function ( data ) { 
        buffers.push ( data )
        totalLength += data.length
      } )
    }

    stream.on ( 'end', function ( ) { resolve ( Buffer.concat ( buffers, totalLength ) ) } )
  } )
}



/**
 * Request => JSONObject
 * @param {http.IncomingMessage} request 
 */
exports.parseHTTPBody = async function ( request ) {

  if ( request.method === 'GET' ) return null

  let contentType = request.headers [ 'content-type' ]

  // application/json; charset=utf-8
  if ( contentType ) contentType = contentType.split ( ';' ) [ 0 ].trim ( )

  const contentSize = request.headers [ 'content-length' ]

  const buffer = await exports.stream2buffer ( request, +contentSize || 0 )

  if ( contentSize && buffer.length !== +contentSize ) throw new Error ( 'Content-Length Incorrect' )

  const bodyString = buffer.toString ( )

  /*
  if ( 'application/x-www-form-urlencoded' === contentType )
  return querystring.parse ( bodyString )
  */

  try {

    return JSON.parse ( bodyString )
  } catch ( error ) {

    return bodyString
  }
}



/**
 * http request
 * @param {URL|String|http.RequestOptions} url 
 * @param {http.RequestOptions|String} options
 * @param {String} body 
 */
exports.httpRequest = function ( url, options, body ) {

  if ( 'string' === typeof options ) {
    
    body = options
    options = { }
  }

  return new Promise ( function ( resolve, reject ) {

    const request = http.request ( url, options, async function ( response ) {

      try {

        const result = await exports.parseHTTPBody ( response )

        resolve ( result )
      } catch ( error ) {

        const decoration = new Error ( `${response.statusCode} - ${error.message}` )

        reject ( decoration )
      }
    } )

    request.on ( 'error', reject )

    if ( body ) {

      request.method = 'POST'

      request.setHeader ( 'Content-Type', 'application/json' )

      request.setHeader ( 'Content-Length', Buffer.byteLength ( body ) )

      request.write ( body )
    }

    request.end ( )
  } )
}



exports.getAllCallablePropertyNames = function ( obj ) {

  if ( !obj ) return [ ]

  let props = [ ], tmpProps = [ ], index = 0, size = 0, tmpProp = ''

  const bans = [ "constructor", "__defineGetter__", "__defineSetter__"
  , "hasOwnProperty", "__lookupGetter__", "__lookupSetter__"
  , "isPrototypeOf", "propertyIsEnumerable", "toString"
  , "valueOf", "__proto__", "toLocaleString" ]

  do {

    tmpProps = Object.getOwnPropertyNames ( obj )

    index = -1, size = tmpProps.length

    while ( ++index < size ) {

      tmpProp = tmpProps [ index ]

      if ( !props.includes ( tmpProp ) && !bans.includes ( tmpProp ) ) {

        props.push ( tmpProp )
      }
    }
    
  } while ( obj = Object.getPrototypeOf ( obj ) )

  return props
}



/**
 * 
 * @param {Object} methods 
 * @param {Map<String,Function>} kvMethods 
 * @param {Array<String>} nameStack
 */
exports.genKVMethods = function ( methods, kvMethods=new Map(), nameStack=[] ) {

  let keys = exports.getAllCallablePropertyNames ( methods )

  let index = -1, size = keys.length

  while ( ++index < size ) {

    let key = keys [ index ]

    /**
     * @type {Function}
     */
    let val = methods [ key ]
    
    if ( 'function' === typeof val ) {

      const action = nameStack.concat ( key ).join ( '.' )

      // 中間件函數脫殼綁定
      Middleware.wrappedActions.set ( action, val )

      kvMethods.set ( action, val.bind ( methods ) )
    } else {

      exports.genKVMethods ( val, kvMethods, nameStack.concat ( key ) )
    }
  }

  return kvMethods
}