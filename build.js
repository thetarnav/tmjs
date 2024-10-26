import fs   from 'node:fs'
import path from 'node:path'
import url  from 'node:url'
import ts   from 'typescript'

import {
	SRC_DIRNAME, TYPES_DIRNAME,
} from './constants.js'

const dirname        = path.dirname(url.fileURLToPath(import.meta.url))
const src_dir_path   = path.join(dirname, SRC_DIRNAME)
const types_dir_path = path.join(dirname, TYPES_DIRNAME)

/** @type {ts.CompilerOptions} */
const ts_options = {
	allowJs:              true,
	checkJs:              true,
	skipLibCheck:         false,
	maxNodeModuleJsDepth: 1,
	emitDeclarationOnly:  true,
	noEmit:               false,
	noEmitOnError:        false,
	declaration:          true,
	declarationMap:	      true,
	outDir:               'types',
}

// build every file in the src dir
const entry_paths = fs.readdirSync(src_dir_path)
	.map(file => path.join(src_dir_path, file))

// Re-create output dir
if (fs.existsSync(types_dir_path)) {
	fs.rmSync(types_dir_path, {recursive: true, force: true})
}
fs.mkdirSync(types_dir_path)

// Emit d.ts files
const program = ts.createProgram(entry_paths, ts_options)
program.emit()
console.log(`DTS complete at ${Math.ceil(performance.now())}ms`)
