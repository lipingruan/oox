
import { networkInterfaces } from 'os'



export function getIPAddress ( version = 4 ): string[] {

  const interfaces = networkInterfaces ( )

  const ip: string[] = [ ]

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



export function getAllCallablePropertyNames ( obj: any ): string[] {

  if ( !obj ) return [ ]

  let props: string[] = [ ], tmpProps: string[] = [ ], index = 0, size = 0, tmpProp = ''

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



export function genKVMethods ( methods: any, kvMethods:Map<string,Function>=new Map(), sourceKVMethods:Map<string,Function>=new Map(), nameStack: string[] = [ ] ) {

  let keys = getAllCallablePropertyNames ( methods )

  for ( const key of keys ) {

    /**
     * @type {Function}
     */
    let val: any = methods [ key ]
    
    if ( 'function' === typeof val ) {

      const action = nameStack.concat ( key ).join ( '.' )

      // 原函数绑定
      sourceKVMethods.set ( action, val )
      // 壳函数绑定
      kvMethods.set ( action, val.bind ( methods ) )
    } else {

      genKVMethods ( val, kvMethods, sourceKVMethods, nameStack.concat ( key ) )
    }
  }

  return { kvMethods, sourceKVMethods }
}