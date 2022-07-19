
import * as fs from 'node:fs'

import { createRequire } from 'module'

const require = createRequire ( import.meta.url )

const tsconfig = require ( '../tsconfig.json' )

const pkg = require ( '../package.json' )

// copy package.json
delete pkg.private
delete pkg.scripts
delete pkg.devDependencies
pkg.type = tsconfig.compilerOptions.module.toLowerCase ( ) === 'commonjs' ? 'commonjs' : 'module'
const  pkgString = JSON.stringify ( pkg, null, 4 )
const  pkgFileContents = pkgString
    .replace ( /("|\.\/)dist\//g, '$1' )
fs.writeFileSync ( 'dist/package.json', pkgFileContents )


// copy files to dist directory
const copyFiles = [
    'README.md',
    'LICENSE',
    'index.mjs',
    'bin/loader.mjs',
]

for ( const copyFile of copyFiles ) {

    fs.copyFileSync ( copyFile, 'dist/' + copyFile )
}