
const os = require ( 'os' )

const http = require ( 'http' )

const https = require ( 'https' )

const querystring = require('querystring')

const Context = require  ( './rpc/context.class' )



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

      kvMethods.set ( nameStack.concat ( key ).join ( '.' ), val.bind ( methods )  )
    } else {

      exports.genKVMethods ( val, kvMethods, nameStack.concat ( key ) )
    }
  }

  return kvMethods
}



/**
 * parse traceId from execution stack
 * @param {String} stack 
 * @returns {String}
 */
exports.getTraceIdByStack = function ( stack ) {

  if ( !stack ) {

    let trace = { }

    Error.captureStackTrace ( trace )

    stack = trace.stack
  }

  const prefix = 'OOXTrace.<computed>'

  const index = stack.indexOf ( prefix )

  if ( index === -1 ) return null

  return stack.slice ( index ).match ( /(?<=as\s).*?(?=\s|\])/ ) [ 0 ]
}



/**
 * 
 * @param {String} traceId 全局唯一请求ID
 * @param {Map<String,Function>} methods 服务函数扁平化列表
 */
exports.genOOXTrace = function ( traceId, methods ) {

  const OOXTrace = { /* OOXTrace.<computed> [as traceId] */ }



  /**
   * trace magic function
   * @param {String} action 
   * @param {Array} params 
   * @param {Context} context 
   */
  OOXTrace [ traceId ] = async function ( action, params, context ) {

    const __proxy = '__proxy', _proxy = '_proxy'



    // 目标函数
    const target = methods.get ( action )

    // 目标代理函数
    const targetProxy = methods.get ( action + _proxy )

    // 即不存在目标也不存在目标代理时, 报错函数不存在
    if ( !target && !targetProxy ) throw new Error ( 'Invalid Action [' + action + ']' )



    // 最顶层代理
    const topProxy = methods.get ( __proxy )

    if ( topProxy ) {

      const proxyReturns = await topProxy ( action, params, context )

      if ( proxyReturns !== undefined ) return proxyReturns
    }



    // 'x.y.z' => [ 'x', 'y', 'z' ]
    const nameStack = action.split ( '.' ), size = nameStack.length - 1
    
    let  index = -1, proxyPrefix = ''



    // 根代理遍历
    while ( ++index < size ) {

      // x.
      // x.y.
      proxyPrefix += nameStack [ index ] + '.'

      // x.__proxy
      // x.y.__proxy
      const rootProxy = methods.get ( proxyPrefix + __proxy )

      // x.__proxy ( 'y.z', ... )
      // x.y.__proxy ( 'z', ... )
      if ( rootProxy ) {

        const proxyReturns = await rootProxy ( nameStack.slice ( index ).join ( '.' ), params, context )

        if ( proxyReturns !== undefined ) return proxyReturns
      }
    }



    // 同级代理
    const layerProxy = methods.get ( proxyPrefix + _proxy )

    if ( layerProxy ) {

      const proxyReturns = await layerProxy ( nameStack [ index ], params, context )

      if ( proxyReturns !== undefined ) return proxyReturns
    }



    if ( targetProxy ) {

      const proxyReturns = await targetProxy ( params, context )

      if ( proxyReturns !== undefined ) return proxyReturns
    }



    // make sure target action execute after all proxies
    if ( target ) return await target ( ...params )
  }

  return OOXTrace
}
