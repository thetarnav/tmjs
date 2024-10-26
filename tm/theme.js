/*

Matching styles for tokens/scopes
from vscode's json theme
or with a simple matching mechanism


TODO:

- [x] selectors with '>'
- [ ] selectors with '-'
- [ ] selectors with ','
- [ ] fix specificity (visible in jsdoc)
- [ ] bitset font style

*/

import * as tm from './tm.js'

/**
 @typedef  {object} JSON_Theme_Settings
 @property {string} [foreground]
 @property {string} [background]
 @property {string} [fontStyle]
 */

/** @typedef {Map<string, JSON_Theme_Settings>} Scope_Theme_Settings_Cache */

/**
@typedef  {object}              JSON_Theme_Item
@property {string[] | string}   [scope]
@property {JSON_Theme_Settings} settings
*/

/**
@typedef  {object}              Theme_Item
@property {string[]}            selector
@property {JSON_Theme_Settings} settings
*/

/**
@param   {JSON_Theme_Item[]} json
@param   {string}            source_scope
@returns {Theme_Item[]}      */
export function json_to_theme_items(json, source_scope)
{
	/** @type {Theme_Item[]} */
	let items = new Array(json.length)
	let len = 0

	for (let item of json)
	{
		let selectors = Array.isArray(item.scope) ? item.scope : [item.scope ?? source_scope]

		for (let selector_raw of selectors)
		{
			/*
			parse selector

			' source meta.block >   child.scope'
			 v v v v v v v v v v v v v v v v
			['source', 'meta.block', '>', 'child.scope']

			*/
			let selector = ['']
			let is_space = false

			for (let char of selector_raw) {
				switch (char) {
				case ' ':
					is_space = true
					break
				case '>':
					selector.push('>', '')
					is_space = false
					break
				default:
					if (is_space &&
					    selector[selector.length-1] !== '>' &&
					    selector[selector.length-1] !== '') {
						selector.push('')
					}
					is_space = false
					selector[selector.length-1] += char
					break
				}
			}

			items[len++] = {
				selector: selector,
				settings: item.settings,
			}
		}
	}

	return items
}

/**
@param   {string} scope
@param   {string} selector_part
@returns {boolean} */
export function matches_scope(scope, selector_part) {
	return scope.startsWith(selector_part) && (
		scope.length === selector_part.length ||
		scope[selector_part.length] === '.')
}
/**
@param   {string}            scope
@param   {readonly string[]} selector_parts
@returns {boolean} */
export function matches_scopes(scope, selector_parts) {
	return selector_parts.some(part => matches_scope(scope, part))
}

/**
@param   {tm.Token}                   token
@param   {Theme_Item[]}               theme
@param   {Scope_Theme_Settings_Cache} cache
@returns {JSON_Theme_Settings}        */
export function match_token_theme(token, theme, cache)
{
	let cache_string = token.scopes.join(' ')
	let cached = cache.get(cache_string)
	if (cached !== undefined)
		return cached

	/** @type {JSON_Theme_Settings} */ let settings = {}

	let specificity_foreground = 0
	let specificity_background = 0
	let specificity_font_style = 0

	theme_loop:
	for (let item of theme)
	{
		let scope_idx = token.scopes.length-1
		let specificity = 0

		selector_loop:
		for (let i = item.selector.length-1; i >= 0; i -= 1)
		{
			let selector_part = item.selector[i]

			// direct child
			if (selector_part === '>')
			{
				i -= 1
				if (scope_idx >= 0 && i >= 0)
				{
					selector_part = item.selector[i]
					let scope = token.scopes[scope_idx]
					scope_idx -= 1

					if (matches_scope(scope, selector_part)) {
						specificity += (scope_idx+2) * 10 * selector_part.length
						continue selector_loop
					}
				}
				// not found
				continue theme_loop
			}

			while (scope_idx >= 0)
			{
				let scope = token.scopes[scope_idx]
				scope_idx -= 1

				if (matches_scope(scope, selector_part)) {
					specificity += (scope_idx+2) * 10 * selector_part.length
					continue selector_loop
				}
			}

			// not found
			continue theme_loop
		}

		// found
		if (specificity > specificity_foreground && 'foreground' in item.settings) {
			settings.foreground    = item.settings.foreground
			specificity_foreground = specificity
		}
		if (specificity > specificity_background && 'background' in item.settings) {
			settings.background    = item.settings.background
			specificity_background = specificity
		}
		if (specificity > specificity_font_style && 'fontStyle' in item.settings) {
			settings.fontStyle     = item.settings.fontStyle
			specificity_font_style = specificity
		}
		continue theme_loop
	}

	cache.set(cache_string, settings)
	return settings
}

/**
@param {{readonly style: CSSStyleDeclaration}} el
@param {JSON_Theme_Settings}                   settings
*/
export function style_element_with_theme_settings(el, settings) {
	if (settings.foreground) el.style.color           = settings.foreground
	if (settings.background) el.style.backgroundColor = settings.background
	if (settings.fontStyle) {
		if (settings.fontStyle === 'italic')    el.style.fontStyle      = 'italic'
		if (settings.fontStyle === 'bold')      el.style.fontWeight     = 'bold'
		if (settings.fontStyle === 'underline') el.style.textDecoration = 'underline'
	}
}

/**
@typedef  {object} Simple_Theme_Colors
@property {string} base
@property {string} punctuation
@property {string} string
@property {string} keyword
@property {string} const_lang
@property {string} const_var
@property {string} function
@property {string} type
@property {string} link
@property {string} tag
@property {string} attribute
*/

/**
@param   {tm.Token}            token
@param   {Simple_Theme_Colors} colors
@returns {JSON_Theme_Settings} */
export function simple_get_token_settings(token, colors) {
	return simple_get_names_settings(token.scopes, colors)
}

/**
@param   {tm.Scope}            scope
@param   {Simple_Theme_Colors} colors
@returns {JSON_Theme_Settings} */
export function simple_get_scope_settings(scope, colors) {

	let names = []
	for (let s of tm.each_scope_until(scope)) {
		names.push(s.name)
	}

	/** @type {JSON_Theme_Settings} */
	let styles = {
		foreground: colors.base,
	}

	for (let i = names.length-1; i >= 0; i--) {
		simple_set_name_settings(styles, names[i], colors)
	}

	return styles
}

/**
@param   {string[]}            names
@param   {Simple_Theme_Colors} colors
@returns {JSON_Theme_Settings} */
export function simple_get_names_settings(names, colors) {
	/** @type {JSON_Theme_Settings} */
	let styles = {
		foreground: colors.base,
	}

	for (let name of names) {
		simple_set_name_settings(styles, name, colors)
	}

	return styles
}

/**
@param   {string}              scope
@param   {Simple_Theme_Colors} colors
@returns {JSON_Theme_Settings} */
export function simple_get_name_settings(scope, colors) {
	/** @type {JSON_Theme_Settings} */
	let styles = {
		foreground: colors.base,
	}
	simple_set_name_settings(styles, scope, colors)
	return styles
}

/**
@param   {JSON_Theme_Settings} styles
@param   {string}              scope
@param   {Simple_Theme_Colors} colors
@returns {void} */
export function simple_set_name_settings(styles, scope, colors) {
	switch (true) {
	// Reset
	case matches_scope(scope, 'meta.template.expression'):
		styles = {
			foreground: colors.base,
		}
		break
	// Punctuation
	case matches_scopes(scope, [
		'punctuation',
		'meta.brace',
		'keyword.operator.type.annotation',
	]):
		styles.foreground = colors.punctuation
		break
	// Comments
	case matches_scopes(scope, [
		'comment',
		'source.embedded',
	]):
		styles.foreground = colors.punctuation
		styles.fontStyle  = 'italic'
		break
	// Strings
	case matches_scope(scope, 'string'):
		styles.foreground = colors.string
		break
	// Keywords expressions
	case matches_scope(scope, 'keyword.operator.expression'):
		styles.foreground = colors.keyword
		styles.fontStyle  = 'italic'
		break
	// Operators
	case matches_scope(scope, 'keyword.operator'):
		styles.foreground = colors.keyword
		break
	// Keywords
	case matches_scope(scope, 'keyword'):
		styles.foreground = colors.keyword
		styles.fontStyle  = 'italic'
		break
	// =>
	case matches_scope(scope, 'storage.type.function.arrow'):
		styles.foreground = colors.keyword
		break
	// Storage keywords
	case matches_scope(scope, 'storage'):
		styles.foreground = colors.keyword
		styles.fontStyle  = 'italic'
		break
	// Constant variables
	case matches_scopes(scope, [
		'entity.name.type.module',
		'entity.name.namespace',
		'entity.name.type.namespace',
		'entity.name.class',
		'entity.other.inherited-class',
		'variable.language',
		'variable.other.constant',
		'variable.other.enummember',
		'variable.other.constant.property',
	]):
		styles.foreground = colors.const_var
		break
	// Language constants
	case matches_scopes(scope, [
		'constant',
		'support.type.builtin',
	]):
		styles.foreground = colors.const_lang
		break
	// Functions
	case matches_scopes(scope, [
		'support.function',
		'entity.name.function',
		'meta.require',
		'variable.function',
	]):
		styles.foreground = colors.function
		break
	// Types
	case matches_scopes(scope, [
		'support.type',
		'entity.name.type',
	]):
		styles.foreground = colors.type
		break
	// Links
	case matches_scope(scope, 'variable.other.link.underline'):
		styles.foreground = colors.link
		break
	// Variables
	case matches_scope(scope, 'variable'):
		styles.foreground = colors.base
		break
	// Attributes
	case matches_scope(scope, 'entity.other.attribute-name'):
		styles.foreground = colors.attribute
		break
	// Tags
	case matches_scope(scope, 'entity.name.tag'):
		styles.foreground = colors.tag
		break
	}
}
