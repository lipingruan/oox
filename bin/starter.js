
const fs = require ( 'fs' )

const path = require ( 'path' )

const Service = require ( '../service/service.class' )

const chalk = require ( 'chalk' )

const proxyer = require ( './proxyer' )

const configurer = require ( './configurer' )

const register = require ( './register' )



function getEntryFile ( ) {

    const args = process.argv.slice ( 2 )

    var [ entryFilename ] = args.filter ( arg => !arg.includes ( '=' ) && arg.endsWith ( '.js' ) )

    if ( !entryFilename ) throw new Error ( 'Cannot find entry file' )

    const fullPath = path.resolve ( entryFilename )

    const filename = path.basename ( fullPath )

    const directory = path.dirname ( fullPath ).split ( path.sep ).pop ( )

    var name = filename === 'index.js' ? directory : filename.split ( '.js' ) [ 0 ]

    return { name, path: fullPath }
}



function genEntry ( name, entryPath, templatePath ) {

    /**
     * @type {Service}
     */
    var entry = require ( entryPath )

    if ( 'object' === typeof entry && 'function' === typeof entry.call && 'string' === typeof entry.name && 'object' === typeof entry.config ) {

        // entry instanceof RPC

    } else if ( 'function' === typeof entry && 'function' === typeof entry.call ) {

        // entry extendsof RPC

        entry = new entry ( name, null )
    } else {

        // custom service class

        if ( !templatePath ) templatePath = path.dirname ( entryPath ) + '/service.class.js'

        templatePath = path.resolve ( templatePath )

        if ( fs.existsSync ( templatePath ) ) {

            const CustomService = require ( templatePath )

            entry = new CustomService ( name, entry )
        } else {

            entry = new Service ( name, entry )
        }
    }

    return entry
}



exports.startup = async ( ) => {

    // 加载环境变量
    const env = configurer.configure ( )

    Object.assign ( oox, env )



    // 获取服务入口地址
    const entryFile = getEntryFile ( )

    // 代理<服务间调用>
    if ( env.group ) {

        const excludes = [ entryFile.name ]

        if ( Array.isArray ( env.ignore ) ) excludes.push ( ...env.ignore )

        proxyer.proxyServices ( env.group, excludes )
    }

    // 加载服务
    const entry = genEntry ( entryFile.name, entryFile.path, env.template )

    proxyer.setService ( entry.constructor )
    register.setService ( entry.constructor )



    // 服务配置
    if ( !env.port && !env.http && !env.socketio ) env.port = 0

    if ( 'number' === typeof env.port ) {

        if ( !entry.http.config ) entry.http.config = { }
        if ( !entry.socketio.config ) entry.socketio.config = { }

        entry.http.config.port = 
        entry.socketio.config.port = env.port
    }

    if ( 'http' in env ) entry.http.config = env.http

    if ( 'socketio' in env ) entry.socketio.config = env.socketio

    if ( env.origin ) entry.config.origin = env.origin



    // 服务启动
    await entry.serve ( )

    console.log ( )
    console.log ( 'Service', chalk.bold`${entry.name}`, 'running.' )
    if ( entry.http.config ) console.log ( '  at', chalk.underline.green`http://${entry.config.host}:${entry.http.config.port}${entry.http.config.path}` )
    if ( entry.socketio.config ) console.log ( '  at', chalk.underline.green`ws://${entry.config.host}:${entry.socketio.config.port}${entry.socketio.config.path}` )
    console.log ( )

    // 服务注册
    if ( env.registry ) register.connect ( entry, env.registry )
}