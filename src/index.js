import * as shikiji from 'shikiji/core'
import * as shikiji_wasm from 'shikiji/wasm'

const THEME_PATH = 'theme.json'
const LANG_PATH = 'odin.tmLanguage.json'
const CODE_PATH = 'sample.odin'

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
/** @type {Map<HTMLElement, string>} */
const scopes_map = new Map()

for (let i = 0; i < tokens_lines.length; i += 1) {
	const tokens = tokens_lines[i]
	/** @type {HTMLElement[]} */
	const elements = new Array(tokens.length)

	for (let j = 0; j < tokens.length; j += 1) {
		const token = tokens[j]
		if (!token.explanation) continue

		const token_el = document.createElement('span')
		token_el.className = 'token'
		elements[j] = token_el

		for (const explanation of token.explanation) {
			const scope_el = document.createElement('span')
			scope_el.className = 'scope'
			token_el.append(scope_el)

			scope_el.style.color = token.color || ''
			scope_el.textContent = explanation.content
			switch (token.fontStyle) {
				case 1:
					scope_el.style.fontStyle = 'italic'
					break
				case 2:
					scope_el.style.fontWeight = 'bold'
					break
			}

			/*
			Skip first because it's always the root scope
			*/
			let scope = ''
			for (let i = 1; i < explanation.scopes.length; i += 1) {
				let name = explanation.scopes[i].scopeName
				if (name.endsWith('.odin')) {
					name = name.slice(0, -5)
				}
				scope += name + '\n'
			}

			scopes_map.set(scope_el, scope)
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
const tooltip_el = document.createElement('div')
tooltip_el.className = 'scope-tooltip'
document.body.append(tooltip_el)

/** @type {HTMLElement | null} */
let last_scope_el = null
shiki_el.addEventListener('mousemove', e => {
	const target = e.target
	if (!(target instanceof HTMLElement)) {
		tooltip_el.style.visibility = 'hidden'
		last_scope_el = null
		return
	}

	if (target !== last_scope_el) {
		const scope = scopes_map.get(target)
		if (!scope) {
			tooltip_el.style.visibility = 'hidden'
			last_scope_el = null
			return
		}

		last_scope_el = target
		tooltip_el.textContent = scope
		tooltip_el.style.visibility = 'visible'
	}

	tooltip_el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
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
