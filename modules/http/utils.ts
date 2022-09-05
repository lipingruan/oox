
import * as http from 'node:http'
import { Readable } from 'node:stream'



/**
 * Stream => Buffer
 */
export function stream2buffer ( stream: Readable, totalLength: number=0 ): Promise<Buffer> {

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
 */
export async function parseHTTPBody ( request: http.IncomingMessage ): Promise<any> {

  if ( request.method === 'GET' ) return null

  let contentType = request.headers [ 'content-type' ]

  // application/json; charset=utf-8
  if ( contentType ) contentType = contentType.split ( ';' ) [ 0 ].trim ( )

  const contentSize = request.headers [ 'content-length' ]

  const buffer = await stream2buffer ( request, +contentSize || 0 )

  if ( contentSize && buffer.length !== +contentSize ) throw new Error ( 'Content-Length Incorrect' )

  const bodyString = buffer.toString ( )

  if ( 'application/json' === contentType ) {

    return JSON.parse ( bodyString )
  } else {

    return bodyString
  }
}



/**
 * http request
 */
export function httpRequest ( url: URL | string, options: http.RequestOptions, body: string ): Promise<any> {

  return new Promise ( function ( resolve, reject ) {

    const request = http.request ( url, options, async function ( response ) {

      try {

        const result = await parseHTTPBody ( response )

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
