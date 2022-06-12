
const fs = require ( 'node:fs' )
const path = require ( 'node:path' )

const tsconfig = require ( '../tsconfig.json' )
const package = require ( '../package.json' )

const { compilerOptions: { outDir, declarationDir } } = tsconfig


// removing output directory
if ( fs.existsSync ( outDir ) ) {

    const files = fs.readdirSync ( outDir )

    for ( const file of files ) {

        fs.rmSync ( path.join ( outDir, file ), { recursive: true, force: true } )
    }
} else {

    fs.mkdirSync ( outDir )
}


// copy package.json
delete package.scripts
delete package.devDependencies
fs.writeFileSync ( 
    'build/package.json', 
    JSON.stringify ( package, null, 4 )
        .replace ( /("|\.\/)build\//g, '$1' ) 
)


// copy files to build directory
const copyFiles = [
    'README.md',
    'LICENSE',
    'index.mjs',
]

for ( const copyFile of copyFiles ) {

    fs.copyFileSync ( copyFile, 'build/' + copyFile )
}

require ( 'typescript/lib/tsc' )