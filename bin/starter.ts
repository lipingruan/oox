
import * as fs from 'node:fs'

import * as path from 'node:path'

import { bold, underline } from 'chalk'

import * as oox from '../index'

import { proxyGroup } from './proxyer'

import { configure } from './configurer'

import { registry } from './register'

import SocketIOModule from '@oox/module-socketio'

// preload modules
const socketio = new SocketIOModule ( )

oox.modules.add ( socketio )



function getEntryFile ( env: { [x: string]: any } ) {

    const args = process.argv.slice ( 2 )

    var [ entryFilename ] = args.filter ( arg => !arg.includes ( '=' ) && arg.endsWith ( '.js' ) )

    if ( !entryFilename ) throw new Error ( 'Cannot find entry file' )

    const fullPath = path.resolve ( entryFilename )

    const filename = path.basename ( fullPath )

    const fullDirectory = path.dirname ( fullPath )

    const directory = fullDirectory.split ( path.sep ).pop ( )

    const groupFullDirectory = env.group ? path.resolve ( env.group ) : ''

    var name = filename === 'index.js' && groupFullDirectory !== fullDirectory ? directory : filename.split ( '.js' ) [ 0 ]

    return { name, path: fullPath, group: groupFullDirectory }
}



function loadEntry ( name: string, entryPath: string ) {

    oox.config.name = name

    const methods = require ( entryPath )

    oox.setMethods ( methods )
}



export async function startup( ) {

    // 加载环境变量
    const env = configure ( )

    Object.assign ( oox.config, env )



    // 获取服务入口地址
    const entryFile = getEntryFile ( env )

    // 代理<服务间调用>
    if ( env.group ) {

        const excludes = [ entryFile.name ]

        if ( Array.isArray ( env.ignore ) ) excludes.push ( ...env.ignore )

        proxyGroup ( entryFile.group, excludes )
    }

    // 加载服务
    loadEntry ( entryFile.name, entryFile.path )



    // 服务配置
    if ( !env.port && !env.http && !env.socketio ) env.port = 0

    const httpConfig = oox.modules.builtins.http.config, socketioConfig = socketio.config

    if ( 'number' === typeof env.port ) {

        httpConfig.port = socketioConfig.port = env.port
    }

    if ( env.origin ) httpConfig.origin = env.origin

    if ( 'http' in env ) {

        if ( env.http ) Object.assign ( httpConfig, env.http )
        else httpConfig.disabled = true
    }

    if ( 'socketio' in env ) {

        if ( env.socketio ) Object.assign ( socketioConfig, env.socketio )
        else socketioConfig.disabled = true
    }



    // 服务启动
    await oox.serve ( )

    console.log ( )
    console.log ( 'Service', bold`${oox.config.name}`, 'running.' )
    if ( !httpConfig.disabled ) console.log ( '  at', underline.green`http://${oox.config.host}:${httpConfig.port}${httpConfig.path}` )
    if ( !socketioConfig.disabled ) console.log ( '  at', underline.green`ws://${oox.config.host}:${socketioConfig.port}${socketioConfig.path}` )
    console.log ( )

    // 服务注册
    if ( env.registry ) registry ( env.registry )
}