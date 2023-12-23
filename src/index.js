import * as shikiji from 'shikiji/core'
import * as shikiji_wasm from 'shikiji/wasm'

const SRC_PATH = 'src/'
const THEME_PATH = SRC_PATH + 'theme.json'
const LANG_PATH = SRC_PATH + 'odin.tmLanguage.json'
const CODE_PATH = SRC_PATH + 'sample.odin'

/**
 * @returns {Promise<string>}
 */
function fetchCode() {
	return fetch(CODE_PATH).then(res => res.text())
}
/**
 * @returns {Promise<shikiji.ThemeRegistration>}
 */
function fetchTheme() {
	return fetch(THEME_PATH).then(res => res.json())
}
/**
 * @returns {Promise<shikiji.LanguageRegistration>}
 */
function fetchLang() {
	return fetch(LANG_PATH).then(res => res.json())
}

const code_promise = fetchCode()
const theme_promise = fetchTheme()
const lang_promise = fetchLang()

const root = document.getElementById('root')
if (!root) throw new Error('Root el not found')

const highlighter_promise = shikiji.getHighlighterCore({
	themes: [theme_promise],
	langs: [lang_promise],
	loadWasm: shikiji_wasm.getWasmInlined,
})

const [code, theme, lang, highlighter] = await Promise.all([
	code_promise,
	theme_promise,
	lang_promise,
	highlighter_promise,
])

// const html = highlighter.codeToHtml(code, {
// 	lang: lang.name,
// 	theme: theme.name,
// })
// root.innerHTML = html

const tokens_lines = highlighter.codeToThemedTokens(code, {
	lang: lang.name,
	theme: theme.name,
})
/** @type {HTMLElement[]} */
const elements_lines = new Array(tokens_lines.length)

for (let i = 0; i < tokens_lines.length; i += 1) {
	const tokens = tokens_lines[i]
	/** @type {HTMLElement[]} */
	const elements = []

	for (const token of tokens) {
		if (!token.explanation) continue

		for (const explanation of token.explanation) {
			const el = document.createElement('span')
			el.className = 'token'
			elements.push(el)

			el.style.color = token.color || ''
			el.textContent = explanation.content
			switch (token.fontStyle) {
				case 1:
					el.style.fontStyle = 'italic'
					break
				case 2:
					el.style.fontWeight = 'bold'
					break
			}

			const last_scope = explanation.scopes[explanation.scopes.length - 1]
			let name = last_scope.scopeName
			if (name.endsWith('.odin')) {
				name = name.slice(0, -5)
			}
			el.dataset['scope'] = name
		}
	}

	const line = document.createElement('div')
	line.className = 'line'
	elements_lines[i] = line
	line.append(...elements)
}

const shiki_el = document.createElement('div')
shiki_el.className = 'shiki'
shiki_el.append(...elements_lines)
root.innerHTML = ''
root.append(shiki_el)

/*
Show hovered token scope
*/
const scope_el = document.createElement('div')
scope_el.className = 'scope'
document.body.append(scope_el)

shiki_el.addEventListener('mousemove', e => {
	const target = e.target
	if (!(target instanceof HTMLElement)) {
		scope_el.style.visibility = 'hidden'
		return
	}

	const scope = target.dataset['scope']
	if (!scope) {
		scope_el.style.visibility = 'hidden'
		return
	}

	scope_el.style.visibility = 'visible'
	scope_el.textContent = scope
	scope_el.style.left = e.clientX + 'px'
	scope_el.style.top = e.clientY + 'px'
})

/*
Remember scroll position
*/
const scroll_str = sessionStorage.getItem('scroll_position')
const scroll = scroll_str ? parseInt(scroll_str) : 0
window.scrollTo(0, scroll)

window.addEventListener('beforeunload', () => {
	const scroll = window.scrollY || document.documentElement.scrollTop
	const str = scroll.toString()
	sessionStorage.setItem('scroll_position', str)
})
