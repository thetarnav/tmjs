import fs   from 'node:fs'
import path from 'node:path'
import url  from 'node:url'
import ts   from 'typescript'

import {
	SRC_DIRNAME, TYPES_DIRNAME,
} from './constants.js'

const dirname        = path.dirname(url.fileURLToPath(import.meta.url))
const file_js_path   = path.join(dirname, SRC_DIRNAME, 'tm.js')
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

function main() {
	
	// Re-create output dir
	if (fs.existsSync(types_dir_path)) {
		fs.rmSync(types_dir_path, {recursive: true, force: true})
	}
	fs.mkdirSync(types_dir_path)
	
	// Emit d.ts files
	const program = ts.createProgram([file_js_path], ts_options)
	program.emit()
	console.log(`DTS complete at ${Math.ceil(performance.now())}ms`)
}

main()