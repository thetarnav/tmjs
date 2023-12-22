import jsonc from 'jsonc-parser'
import fsp from 'fs/promises'
import path from 'path'
import url from 'url'
import chokidar from 'chokidar'

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

const src_path = path.join(dirname, 'src')
const theme_jsonc_path = path.join(src_path, 'theme.jsonc')
const theme_json_path = path.join(src_path, 'theme.json')

async function buildTheme() {
	const theme_jsonc = await fsp.readFile(theme_jsonc_path, 'utf8')
	const theme = jsonc.parse(theme_jsonc)
	const theme_json = JSON.stringify(theme, null, 4)

	await fsp.writeFile(theme_json_path, theme_json, 'utf8')
}

if (process.argv.includes('--watch')) {
	chokidar.watch(theme_jsonc_path).on('change', buildTheme)
	buildTheme()
} else {
	buildTheme()
}
