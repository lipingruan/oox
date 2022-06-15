
import * as fs from 'node:fs'

import * as path from 'node:path'

import { createRequire } from 'module'

const require = createRequire ( import.meta.url )

const tsconfig = require ( '../tsconfig.json' )

const { compilerOptions: { outDir, declarationDir } } = tsconfig

const delay = ms => new Promise ( resolve => setTimeout ( resolve, ms ) )

// removing output directory
if ( fs.existsSync ( outDir ) ) {

    const files = fs.readdirSync ( outDir )

    for ( const file of files ) {

        fs.rmSync ( path.join ( outDir, file ), { recursive: true, force: true } )
    }
} else {

    fs.mkdirSync ( outDir )

    await delay ( 60 )
}

require ( 'typescript/lib/tsc' )