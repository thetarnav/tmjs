import * as tm from './tm.js'

/**
@typedef  {object} Colors
@property {string} base
@property {string} punctuation
@property {string} string
@property {string} keyword
@property {string} const_lang
@property {string} const_var
@property {string} function
@property {string} type
@property {string} link
*/

/**
@param   {tm.Token} token 
@param   {Colors}   colors
@returns {tm.JSON_Theme_Settings} */
export function get_token_settings(token, colors) {

	/** @type {tm.JSON_Theme_Settings} */
	let styles = {
		foreground: colors.base,
	}

	for (let scope of token.scopes) {
		set_scope_settings(styles, scope, colors)
	}

	return styles
}

/**
@param   {string} scope
@param   {Colors} colors
@returns {tm.JSON_Theme_Settings} */
export function get_scope_settings(scope, colors) {
	/** @type {tm.JSON_Theme_Settings} */
	let styles = {
		foreground: colors.base,
	}
	set_scope_settings(styles, scope, colors)
	return styles
}

/**
@param   {tm.JSON_Theme_Settings} styles 
@param   {string}                 scope
@param   {Colors}                 colors
@returns {void} */
export function set_scope_settings(styles, scope, colors) {
	switch (true) {
	// Reset
	case tm.matches_scope(scope, 'meta.template.expression'):
		styles = {
			foreground: colors.base,
		}
		break
	// Punctuation
	case tm.matches_scopes(scope, [
		'punctuation',
		'meta.brace',
		'keyword.operator.type.annotation',
	]):
		styles.foreground = colors.punctuation
		break
	// Comments
	case tm.matches_scopes(scope, [
		'comment',
		'source.embedded',
	]):
		styles.foreground = colors.punctuation
		styles.fontStyle  = 'italic'
		break
	// Strings
	case tm.matches_scope(scope, 'string'):
		styles.foreground = colors.string
		break
	// Keywords expressions
	case tm.matches_scope(scope, 'keyword.operator.expression'):
		styles.foreground = colors.keyword
		styles.fontStyle  = 'italic'
		break
	// Operators
	case tm.matches_scope(scope, 'keyword.operator'):
		styles.foreground = colors.keyword
		break
	// Keywords
	case tm.matches_scope(scope, 'keyword'):
		styles.foreground = colors.keyword
		styles.fontStyle  = 'italic'
		break
	// =>
	case tm.matches_scope(scope, 'storage.type.function.arrow'):
		styles.foreground = colors.keyword
		break
	// Storage keywords
	case tm.matches_scope(scope, 'storage'):
		styles.foreground = colors.keyword
		styles.fontStyle  = 'italic'
		break
	// Constant variables
	case tm.matches_scopes(scope, [
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
	case tm.matches_scopes(scope, [
		'constant',
		'support.type.builtin',
	]):
		styles.foreground = colors.const_lang
		break
	// Functions
	case tm.matches_scopes(scope, [
		'support.function',
		'entity.name.function',
		'meta.require',
		'variable.function',
	]):
		styles.foreground = colors.function
		break
	// Types
	case tm.matches_scopes(scope, [
		'support.type',
		'entity.name.type',
	]):
		styles.foreground = colors.type
		break
	// Links
	case tm.matches_scope(scope, 'variable.other.link.underline'):
		styles.foreground = colors.link
		break
	// Variables
	case tm.matches_scope(scope, 'variable'):
		styles.foreground = colors.base
		break
	}
}
