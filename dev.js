import * as url      from "node:url"
import * as fs       from "node:fs"
import * as fsp      from "node:fs/promises"
import * as http     from "node:http"
import * as path     from "node:path"
import * as jsonc    from "jsonc-parser"
import * as chokidar from "chokidar"
import * as ws       from "ws"

import {
	HTTP_PORT, WEB_SOCKET_PORT,
	THEME_JSONC_FILENAME, THEME_JSON_WEBPATH,
	THEME_JSON_FILENAME, SRC_DIRNAME, SITE_DIRNAME,
} from "./constants.js"

const dirname          = path.dirname(url.fileURLToPath(import.meta.url))
const site_path        = path.join(dirname, SITE_DIRNAME)
const src_path         = path.join(dirname, SRC_DIRNAME)
const theme_jsonc_path = path.join(site_path, THEME_JSONC_FILENAME)
const theme_json_path  = path.join(site_path, THEME_JSON_FILENAME)

http.createServer(requestListener).listen(HTTP_PORT)
console.log(`Server running at http://127.0.0.1:${HTTP_PORT}`)

const wss = new ws.WebSocketServer({port: WEB_SOCKET_PORT})
console.log("WebSocket server running at http://127.0.0.1:" + WEB_SOCKET_PORT)

/** @type {Promise<void>} */
let theme_promise = buildTheme()

let watcher = chokidar.watch([src_path, site_path])

watcher.on("change", filename => {
	if (path.join(dirname, filename) === theme_jsonc_path) {
		theme_promise = buildTheme()
	}
	for (const client of wss.clients) {
		client.send(filename)
	}
})

/** @returns {Promise<void>} */
async function buildTheme() {
	let theme_jsonc = await fsp.readFile(theme_jsonc_path, "utf8")
	let theme       = jsonc.parse(theme_jsonc)
	let theme_json  = JSON.stringify(theme, null, '\t')
	await fsp.writeFile(theme_json_path, theme_json)
}

/**
@param   {http.IncomingMessage} req
@param   {http.ServerResponse}  res
@returns {Promise<void>}        */
async function requestListener(req, res) {

	if (!req.url || req.method !== "GET") {
		res.writeHead(404)
		res.end()

		console.log(`${req.method} ${req.url} 404`)
		return
	}

	/*
	Generated files
	*/
	if (req.url === THEME_JSON_WEBPATH) {
		await theme_promise
	}

	/*
	HTML
	*/
	if (req.url === "/") {
		let html = await fsp.readFile('index.html', "utf8")
		html += `
<script>
	const socket = new WebSocket("ws://localhost:${WEB_SOCKET_PORT}");
	socket.addEventListener("message", () => {
		location.reload();
	});
</script>`
		res.writeHead(200, {"Content-Type": "text/html; charset=UTF-8"})
		res.end(html)

		console.log(`${req.method} ${req.url} 200`)
		return
	}

	/*
	Static files
	*/
	let relative_filepath = toWebFilepath(req.url)
	let filepath = path.join(dirname, relative_filepath)

	let exists = await fileExists(filepath)
	if (!exists) {
		res.writeHead(404)
		res.end()

		console.log(`${req.method} ${req.url} 404`)
		return
	}

	let ext = toExt(filepath)
	let mime_type = mimeType(ext)
	res.writeHead(200, {"Content-Type": mime_type})

	let stream = fs.createReadStream(filepath)
	stream.pipe(res)

	console.log(`${req.method} ${req.url} 200`)
}

/**
@param   {string} ext
@returns {string} */
function mimeType(ext) {
	switch (ext) {
	case "html": return "text/html; charset=UTF-8"
	case "js":
	case "mjs":  return "application/javascript"
	case "json": return "application/json"
	case "wasm": return "application/wasm"
	case "css":  return "text/css"
	case "png":  return "image/png"
	case "jpg":  return "image/jpg"
	case "gif":  return "image/gif"
	case "ico":  return "image/x-icon"
	case "svg":  return "image/svg+xml"
	default:     return "application/octet-stream"
	}
}

function trueFn()  {return true}
function falseFn() {return false}

/**
 * @param   {Promise<any>}     promise
 * @returns {Promise<boolean>}
 */
function promiseToBool(promise) {
	return promise.then(trueFn, falseFn)
}

/**
 * @param   {string} path
 * @returns {string}
 */
function toWebFilepath(path) {
	return path.endsWith("/") ? path + "index.html" : path
}

/**
 * @param   {string}           filepath
 * @returns {Promise<boolean>}
 */
function fileExists(filepath) {
	return promiseToBool(fsp.access(filepath))
}

/**
 * @param   {string} filepath
 * @returns {string}
 */
function toExt(filepath) {
	return path.extname(filepath).substring(1).toLowerCase()
}
