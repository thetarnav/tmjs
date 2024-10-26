/*
The entry point proxy during development
*/

import {WEB_SOCKET_PORT} from '../constants.js'

const root = /** @type {HTMLElement} */(document.getElementById('root'))

export function main() {
	const socket = new WebSocket('ws://localhost:'+WEB_SOCKET_PORT)

	socket.addEventListener('message', () => {
		import_main()
	})

	import_main()
}

let counter = 0

// https://github.com/nodejs/help/issues/2751#issuecomment-1075535742
async function import_main() {

	root.innerHTML = ''

	counter++
	let module = await import('./index.js?dev='+counter)
	module.main()
}
