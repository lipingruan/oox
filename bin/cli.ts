#! /usr/bin/env node

import { bold, underline } from 'chalk'

import { startup } from './starter'

import * as pkg from '../package.json'

const args = process.argv.slice ( 2 )

const command = args [ 0 ]

var isStartup = true

if ( !command || [ 'help', '-h', '-help', '--help', 'version', '-v', '-version', '--version' ].includes ( command ) ) {

    isStartup = false

    console.log ( )
    console.log ( 'OOX Service' )
    console.log ( bold`version`, bold.green`${pkg.version}` )
    console.log ( underline`${pkg.homepage}` )
    console.log ( )
}

if ( [ 'help', '-h', '-help', '--help' ].includes ( command ) ) {

    console.log ( bold`Usage:` )
    console.log ( '  oox entry.js' )
    console.log ( )
    console.log ( '  oox entry.js port=8080' )
    console.log ( )
    console.log ( '  oox app/entry/index.js group=app/ env=envs/entry.js ignore=core' )

    console.log ( )
    console.log ( bold`Params:` )

    const params = [
        [ '  default-env  [ file ]  ', '.js or .json file, merge to oox.config' ],
        [ '  env          [ file ]  ', '.js or .json file, merge to oox.config', bold`(after default-env)` ],
        [ '  port         [ int  ]  ', 'set', bold`0` ,'for random port, or any integer > 0' ],
        [ '  group        [ dir  ]  ', 'service group directory, all LocalCall transform to RPC' ],
        [ '  ignore       [ name ]  ', 'set a name for LocalCall do not transform to RPC, support string | array<string>' ],
        [ '  http         [ json ]  ', 'HTTP server options, support flat name, ex: http.path=/api' ],
        [ '  socketio     [ json ]  ', 'SocketIO server options, support flat name' ],
        [ '  registry     [ urls ]  ', 'registry service url, support string | array<string>' ],
        [ '  origin       [ urls ]  ', 'set', bold`*`, 'allow any connections <Access-Control-Allow-Origin>' ],
        [ '  ...                    ', 'set params as', bold`foo=bar`+',', 'usage as', bold`oox.config.foo` ]
    ]

    params.forEach ( row => console.log ( ...row, '\n' ) )
    
    console.log ( )
}


if ( isStartup ) startup ( )