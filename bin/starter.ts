
import * as fs from 'node:fs'

import * as path from 'node:path'

import { bold, underline } from 'chalk'

import * as oox from '../index'

import { proxyGroup } from './proxyer'

import { configure } from './configurer'

import { registry } from './register'



function getEntryFile ( env: { [x: string]: any }, entryFilename?: string ) {

    const entryMatchRegExp = /(\w+)\.((\w?js)|(ts\w?))$/

    if ( !entryFilename ) {

        const args = process.argv.slice ( 2 )

        entryFilename = args.find ( arg => !arg.includes ( '=' ) && entryMatchRegExp.test ( arg ) )
    }

    if ( !entryFilename ) throw new Error ( 'Cannot find entry file' )

    const fullPath = path.resolve ( entryFilename )

    const filename = path.basename ( fullPath )

    const fullDirectory = path.dirname ( fullPath )

    const directory = fullDirectory.split ( path.sep ).pop ( )

    const groupFullDirectory = env.group ? path.resolve ( env.group ) : ''

    const entryMatch = filename.match ( entryMatchRegExp )

    const entryFilenameWithoutExtension = entryMatch [ 1 ]

    var name = entryFilenameWithoutExtension === 'index' && groupFullDirectory !== fullDirectory ? directory : entryFilenameWithoutExtension

    return { name, path: fullPath, group: groupFullDirectory }
}



async function loadEntry ( name: string, entryPath: string ) {

    oox.config.name = name

    // Typescript 4.7.3, not supported import() expression
    const methods = await eval ( `import('file://${entryPath.replace(/\\/g, '/')}')` )

    oox.setMethods ( methods.default || methods )
}



export async function startup ( env?: {[x: string]: any}, entryFilename?: string ) {

    // 加载环境变量
    env = await configure ( env )

    Object.assign ( oox.config, env )



    // 获取服务入口地址
    const entryFile = getEntryFile ( env, entryFilename )

    oox.config.entryFile = {
        path: entryFile.path.replace ( /\\/g, '/' ),
        group: entryFile.group.replace ( /\\/g, '/' ),
    }



    // 模块配置
    oox.modules.setConfig ( oox.config )

    oox.emit ( 'app:configured' )



    // 代理<服务间调用>
    if ( env.group ) {

        const excludes = [ entryFile.name ]

        if ( Array.isArray ( env.ignore ) ) excludes.push ( ...env.ignore )

        proxyGroup ( entryFile.group, excludes )
    }

    // 服务启动
    await oox.serve ( )

    // 加载服务
    await loadEntry ( entryFile.name, entryFile.path )

    oox.emit ( 'app:served' )



    const { http: { config: httpConfig }, socketio: { config: socketioConfig } } = oox.modules.builtins

    console.log ( )
    console.log ( 'Service', bold`${oox.config.name}`, 'running.' )
    if ( !httpConfig.disabled ) console.log ( '  at', underline.green`http://${oox.config.host}:${httpConfig.port}${httpConfig.path}` )
    if ( !socketioConfig.disabled ) console.log ( '  at', underline.green`ws://${oox.config.host}:${socketioConfig.port}${socketioConfig.path}` )
    console.log ( )

    // 服务注册
    if ( env.registry ) registry ( env.registry )
}