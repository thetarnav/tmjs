import * as tm from '../src/tm.js'
import * as h  from './html.js'

import {
	THEME_JSON_WEBPATH,
	SAMPLE_WEBPATH_ODIN, SAMPLE_WEBPATH_TS,
	LANG_WEBPATH_ODIN, LANG_WEBPATH_TS,
} from '../constants.js'

const root =              /** @type {HTMLElement} */(document.getElementById('root'))
const loading_indicator = /** @type {HTMLElement} */(document.getElementById('loading_indicator'))

const hash = location.hash.slice(1) || 'odin'
const scope_lang_suffix = '.'+hash

const fetch_promise_sample_ts   = fetch(SAMPLE_WEBPATH_TS)  .then(res => res.text())
const fetch_promise_sample_odin = fetch(SAMPLE_WEBPATH_ODIN).then(res => res.text())
const fetch_promise_lang_ts     = fetch(LANG_WEBPATH_TS)    .then(res => res.json())
const fetch_promise_lang_odin   = fetch(LANG_WEBPATH_ODIN)  .then(res => res.json())
const fetch_promise_theme       = fetch(THEME_JSON_WEBPATH) .then(res => res.json())

/**
@param   {string} scope 
@returns {string} */
function trim_scope_lang(scope) {
	if (scope.endsWith(scope_lang_suffix)) {
		return scope.slice(0, -scope_lang_suffix.length)
	}
	return scope
}

let count_scopes = 0

/**
@param   {tm.Scope} scope
@param   {string}   src
@returns {HTMLElement} */
function render_scope(scope, src) {

	count_scopes++

	/** @type {HTMLElement} */ let header
	/** @type {HTMLElement} */ let children

    let container = h.div({class: 'scope-container'}, [
		header = h.div({class: 'scope-header'},
			`${trim_scope_lang(scope.name)} (${scope.pos}-${scope.end})`,
		),
		children = h.div({class: 'scope-children'})
	])

	render_tooltip(header, src.slice(scope.pos, scope.end))

	for (let child of scope.children) {
		children.appendChild(render_scope(child, src))
	}

    return container
}

/**
@param   {tm.Scope} scope
@param   {string}   src
@returns {void}   */
function render_tree(scope, src) {
	root.appendChild(
		h.div({class: 'tree-container'},
			render_scope(scope, src),
		)
	)
	console.log(count_scopes)
}

/**
@param   {tm.Token[]}      tokens
@param   {tm.Theme_Item[]} theme_items
@param   {string}          src
@returns {void}            */
function render_tokens(tokens, theme_items, src) {

	/** @type {HTMLElement[]} */
	let elements = new Array(tokens.length)
	/** @type {tm.Scope_Theme_Settings_Cache} */
	let settings_cache = new Map()

	for (let i = 0; i < tokens.length; i += 1) {
		let token = tokens[i]
		let settings = tm.match_token_theme(token, theme_items, settings_cache)

		let el = elements[i] = h.span({class: 'token'}, src.slice(token.pos, token.end))

		if (settings.foreground) el.style.color           = settings.foreground
		if (settings.background) el.style.backgroundColor = settings.background
		if (settings.fontStyle) {
			if (settings.fontStyle === 'italic')    el.style.fontStyle      = 'italic'
			if (settings.fontStyle === 'bold')      el.style.fontWeight     = 'bold'
			if (settings.fontStyle === 'underline') el.style.textDecoration = 'underline'
		}

		/*
		Skip first because it's always the root scope
		*/
		let scopes_str = ''
		for (let i = 1; i < token.scopes.length; i += 1) {
			scopes_str += trim_scope_lang(token.scopes[i]) + '\n'
		}

		render_tooltip(el, scopes_str)
	}

	root.appendChild(h.div({class: 'shiki'}, elements))
}

const tooltip_el = root.appendChild(h.div({class: 'scope-tooltip'}))
tooltip_el.style.visibility = 'hidden'

let tooltip_scope_el = /** @type {HTMLElement?} */(null)
let tooltip_text = ''

/**
 * @param {HTMLElement} el
 * @param {string}      text
 */
function render_tooltip(el, text) {

	el.addEventListener('mousemove', e => {

		if (!tooltip_scope_el) {
			tooltip_el.style.visibility = 'visible'
			tooltip_el.style.willChange = 'transform'
		}

		if (tooltip_text !== text) {
			tooltip_el.textContent = text
			tooltip_text = text
		}

		tooltip_scope_el = el
		tooltip_el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
		tooltip_el.style.maxWidth  = `${window.innerWidth - e.clientX}px`
	})

	el.addEventListener('mouseleave', () => {
		if (tooltip_scope_el === el) {
			tooltip_el.style.visibility = 'hidden'
			tooltip_el.textContent      = ''
			tooltip_el.style.willChange = ''
			tooltip_scope_el            = null
			tooltip_text                = ''
		}
	})
}

export async function main() {
	loading_indicator.style.display = 'block'

	let code  = await (hash === 'ts' ? fetch_promise_sample_ts : fetch_promise_sample_odin)
	let lang  = await (hash === 'ts' ? fetch_promise_lang_ts : fetch_promise_lang_odin)
	let theme = await fetch_promise_theme

	if (!tm.validate_json_grammar(lang)) {
		console.error('Invalid grammar')
		return
	}

	let grammar = tm.json_to_grammar(lang)

	let theme_items = tm.json_to_theme_items(theme.tokenColors || [], grammar.scope)
	let tokens      = tm.code_to_tokens(code, grammar)
	render_tokens(tokens, theme_items, code)

	await new Promise(r => setTimeout(r))

	let tree = tm.parse_code(code, grammar)
	render_tree(tree, code)

	loading_indicator.style.display = 'none'
}
