#! /usr/bin/env node

const chalk = require ( 'chalk' )

const starter = require ( './starter' )

const args = process.argv.slice ( 2 )

const command = args [ 0 ]

var startup = true

if ( !command || [ 'help', '-h', '-help', '--help', 'version', '-v', '-version', '--version' ].includes ( command ) ) {

    startup = false

    const pkg = require ( '../package.json' )

    console.log ( )
    console.log ( 'OOX Service' )
    console.log ( chalk.bold`version`, chalk.bold.green`${pkg.version}` )
    console.log ( chalk.underline`${pkg.homepage}` )
    console.log ( )
}

if ( [ 'help', '-h', '-help', '--help' ].includes ( command ) ) {

    console.log ( chalk.bold`Usage:` )
    console.log ( '  oox entry.js' )
    console.log ( )
    console.log ( '  oox entry.js port=8080' )
    console.log ( )
    console.log ( '  oox app/entry/index.js group=app/ env=envs/entry.js ignore=core' )

    console.log ( )
    console.log ( chalk.bold`Params:` )

    const params = [
        [ '  default-env  [ file ]  ', '.js or .json file, merge to global.oox' ],
        [ '  env          [ file ]  ', '.js or .json file, merge to global.oox', chalk.bold`(after default-env)` ],
        [ '  port         [ int  ]  ', 'set', chalk.bold`0` ,'for random port, or any integer > 0' ],
        [ '  group        [ dir  ]  ', 'service group directory, all LocalCall transform to RPC' ],
        [ '  ignore       [ name ]  ', 'set a name for LocalCall do not transform to RPC, support string | array<string>' ],
        [ '  http         [ json ]  ', 'HTTP server options, support json value' ],
        [ '  socketio     [ json ]  ', 'SocketIO server options, support json value' ],
        [ '  registry     [ urls ]  ', 'registry service url, support string | array<string>' ],
        [ '  template     [ file ]  ', 'custom Service class file path' ],
        [ '  origin       [ urls ]  ', 'set', chalk.bold`*`, 'allow any connections <Access-Control-Allow-Origin>' ],
        [ '  ...                    ', 'set params as', chalk.bold`foo=bar`+',', 'usage as', chalk.bold`global.oox.foo` ]
    ]

    params.forEach ( row => console.log ( ...row, '\n' ) )
    
    console.log ( )
}


if ( startup ) starter.startup ( )