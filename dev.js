import * as url from 'node:url'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as http from 'node:http'
import * as path from 'node:path'
import * as console from 'node:console'
import * as jsonc from 'jsonc-parser'
import * as chokidar from 'chokidar'

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

chokidar.watch(theme_jsonc_path).on('change', buildTheme)
buildTheme()

const PORT = 3000

/**
 * @param {string} ext
 * @returns {string}
 */
const mimeType = ext => {
	switch (ext) {
		case 'html':
			return 'text/html; charset=UTF-8'
		case 'js':
		case 'mjs':
			return 'application/javascript'
		case 'json':
			return 'application/json'
		case 'wasm':
			return 'application/wasm'
		case 'css':
			return 'text/css'
		case 'png':
			return 'image/png'
		case 'jpg':
			return 'image/jpg'
		case 'gif':
			return 'image/gif'
		case 'ico':
			return 'image/x-icon'
		case 'svg':
			return 'image/svg+xml'
		default:
			return 'application/octet-stream'
	}
}

const trueFn = () => true
const falseFn = () => false

/**
 * @param {Promise<*>} promise
 * @returns {Promise<boolean>}
 */
const promiseToBool = promise => promise.then(trueFn, falseFn)

/**
 * @param {string} path
 * @returns {string}
 */
const toWebFilepath = path => (path.endsWith('/') ? path + 'index.html' : path)

/**
 * @param {string} filepath
 * @returns {Promise<boolean>}
 */
const fileExists = async filepath => promiseToBool(fsp.access(filepath))

/**
 * @param {string} filepath
 * @returns {string}
 */
const toExt = filepath => path.extname(filepath).substring(1).toLowerCase()

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @returns {Promise<void>}
 */
const requestListener = async (req, res) => {
	if (!req.url || req.method !== 'GET') {
		res.writeHead(404)
		res.end()
		console.log(`${req.method} ${req.url} 404`)
		return
	}

	const relative_filepath = toWebFilepath(req.url)
	const filepath = relative_filepath.startsWith('/node_modules/')
		? path.join(dirname, relative_filepath)
		: path.join(src_path, relative_filepath)

	const exists = await fileExists(filepath)
	if (!exists) {
		res.writeHead(404)
		res.end()
		console.log(`${req.method} ${req.url} 404`)
		return
	}

	const ext = toExt(filepath)
	const mime_type = mimeType(ext)
	res.writeHead(200, {'Content-Type': mime_type})

	const stream = fs.createReadStream(filepath)
	stream.pipe(res)

	console.log(`${req.method} ${req.url} 200`)
}

http.createServer(requestListener).listen(PORT)
console.log(`Server running at http://127.0.0.1:${PORT}`)
