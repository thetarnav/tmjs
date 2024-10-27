import * as tm       from '../tm/tm.js'
import * as tm_theme from '../tm/theme.js'
import * as h        from './html.js'

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

/** @type {tm_theme.Simple_Theme_Colors} */
const THEME_COLORS = {
	base:        '#b6aaad',
	punctuation: '#b6aaadab',
	string:      '#82b057',
	keyword:     '#c15c53',
	const_lang:  '#d69461',
	const_var:   '#cda881',
	function:    '#6e9ac4',
	type:        '#30ab92',
	link:        '#0000ff',
	tag:         '#e07c3b',
	attribute:   '#d69461',
}

const shiki_el = root.appendChild(h.div({class: 'shiki'}))
shiki_el.style.color = THEME_COLORS.base

/**
@param {tm.Scope} tree
@param {string}   src
*/
async function render_tree_nested(tree, src) {

	/**
	@typedef {object} Render_Item
	@property {number}      depth
	@property {tm.Scope}    scope
	@property {HTMLElement} el
	*/

	/** @type {Render_Item[]} */ let to_render = []
	/** @type {Render_Item[]} */ let to_render_next = [{
		depth: 0,
		scope: tree,
		el:    shiki_el,
	}]

	while (to_render_next.length > 0) {
		
		[to_render, to_render_next] = [to_render_next, to_render]
		to_render_next.length = 0

		for (let item of to_render) {

			if (item.scope.children.length === 0)
				continue

			let elements = []

			// before
			let before_text = src.slice(item.scope.pos, item.scope.children[0].pos)
			if (before_text.length > 0) {
				elements.push(before_text)
			}

			// children with in-betweens
			for (let i = 0; i < item.scope.children.length; i++) {

				let child_scope = item.scope.children[i]
				let child_text  = src.slice(child_scope.pos, child_scope.end)
				let child_theme = tm_theme.simple_get_name_settings(child_scope.name, THEME_COLORS)

				let child_el = h.span({class: 'token'}, child_text)
				tm_theme.style_element_with_theme_settings(child_el, child_theme)

				to_render_next.push({
					depth: item.depth+1,
					scope: child_scope,
					el:    child_el,
				})
				elements.push(child_el)

				// between children
				if (i < item.scope.children.length-1) {
					let after_child_text = src.slice(child_scope.end, item.scope.children[i+1].pos)
					if (after_child_text.length > 0) {
						elements.push(after_child_text)
					}
				}

			}

			// after
			let after_text = src.slice(item.scope.children[item.scope.children.length-1].end, item.scope.end)
			if (after_text.length > 0) {
				elements.push(after_text)
			}

			item.el.replaceChildren(...elements)
		}

		await new Promise(r => setTimeout(r))
	}
}

/**
@param {tm.Scope} tree
@param {string}   src
*/
async function render_tree_tokens(tree, src) {

	let items = []
	let elements = []

	for (let scope of tm.each_scope_tokens(tree)) {

		let depth = 0
		for (let _ of tm.each_scope_until(scope)) {
			depth++
		}
		let settings = tm_theme.simple_get_scope_settings(scope, THEME_COLORS)

		let el = h.span({class: 'token'}, src.slice(scope.pos, scope.end))
		elements.push(el)
		items.push({el, depth, scope})

		tm_theme.style_element_with_theme_settings(el, settings)

		render_tooltip(el, trim_scope_lang(scope.name))

		// render every 100 els
		if (elements.length === 100) {

			shiki_el.removeChild(/**@type {Text}*/(shiki_el.lastChild))
			shiki_el.append(...elements, document.createTextNode(src.slice(scope.end)))

			elements.length = 0
			await new Promise(r => setTimeout(r))
		}
	}

	shiki_el.removeChild(/**@type {Text}*/(shiki_el.lastChild))
	shiki_el.append(...elements)
}

let count_scopes = 0

/**
@param   {tm.Scope} scope
@param   {string}   src
@returns {HTMLElement} */
function render_thee_scope(scope, src) {

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
		children.appendChild(render_thee_scope(child, src))
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
			render_thee_scope(scope, src),
		)
	)
	console.log(count_scopes)
}

/**
@param   {tm.Token[]}            tokens
@param   {tm_theme.Theme_Item[]} theme_items
@param   {string}                src
@returns {void}                  */
function render_tokens(tokens, theme_items, src) {

	/** @type {HTMLElement[]} */
	let elements = new Array(tokens.length)
	/** @type {tm_theme.Scope_Theme_Settings_Cache} */
	let settings_cache = new Map()

	for (let i = 0; i < tokens.length; i += 1) {
		let token = tokens[i]
		let settings = tm_theme.match_token_theme(token, theme_items, settings_cache)

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

	let code = await (hash === 'ts' ? fetch_promise_sample_ts : fetch_promise_sample_odin)
	shiki_el.appendChild(document.createTextNode(code))

	let lang = await (hash === 'ts' ? fetch_promise_lang_ts : fetch_promise_lang_odin)
	// let theme = await fetch_promise_theme

	if (!tm.validate_json_grammar(lang)) {
		console.error('Invalid grammar')
		return
	}

	let grammar = tm.json_to_grammar(lang)

	// let theme_items = tm.json_to_theme_items(theme.tokenColors || [], grammar.scope)
	// let tokens      = tm.code_to_tokens(code, grammar)
	// render_tokens(tokens, theme_items, code)

	// await new Promise(r => setTimeout(r))

	let tree = tm.parse_code(code, grammar)
	// render_tree_old(tree, code)
	// render_tree_tokens(tree, code)
	render_tree_nested(tree, code)

	loading_indicator.style.display = 'none'
}
