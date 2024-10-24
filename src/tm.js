/*

TODOs

tokenizer:
- [x] spaces in name in grammars (multiple names)
- [ ] patterns in captures
- [x] contentName
- [ ] begin/while
- [ ] including other langs
- [ ] inline oniguruma-to-js
- [x] tm regex does not includes newlines in `\s`
	- [ ] needs double checking
- [ ] tree result

theme:
- [x] selectors with '>'
- [ ] selectors with '-'
- [ ] selectors with ','
- [ ] fix specificity (visible in jsdoc)
- [ ] bitset font style

*/

export const URL_GRAMMAR_TYPESCRIPT = 'https://raw.githubusercontent.com/shikijs/textmate-grammars-themes/refs/heads/main/packages/tm-grammars/grammars/typescript.json'

/**
 @template T
 @typedef {{[key in string]?: T}} Dict
*/

/**
 @template T
 @typedef {T | T[]} Many
*/

/* -------------------------------------------------------------------------------------------------

	JSON GRAMMAR

*/

/**
 @typedef  {object}          JSON_Grammar
 @property {string}          scopeName
 @property {JSON_Pattern[]}  patterns
 @property {JSON_Repository} repository
*/

/**
 @typedef  {object}    Grammar
 @property {string}    scope
 @property {Pattern[]} patterns
*/

/**
 @typedef {Dict<JSON_Pattern>} JSON_Repository
*/

/**
 @typedef {Dict<Pattern>} Repository
*/

/**
 @typedef  {object}         JSON_Pattern
 @property {string}         [include]
 @property {string}         [name]
 @property {string}         [contentName]
 @property {string}         [match]
 @property {string}         [begin]
 @property {string}         [end]
 @property {JSON_Captures}  [captures]
 @property {JSON_Captures}  [beginCaptures]
 @property {JSON_Captures}  [endCaptures]
 @property {JSON_Pattern[]} [patterns]
*/

/**
 @typedef  {object}    Pattern
 @property {string[]}  names
 @property {string[]}  content_names
 @property {RegExp?}   begin_match
 @property {Captures?} begin_captures
 @property {RegExp?}   end_match
 @property {Captures?} end_captures
 @property {Pattern[]} patterns
*/

/**
 @typedef {Dict<JSON_Capture>} JSON_Captures
*/

/**
 @typedef {Dict<Capture>} Captures
*/

/**
 @typedef  {object} JSON_Capture
 @property {string} name
*/

/**
 @typedef  {object}   Capture
 @property {string[]} names
*/

/**
 @param   {unknown | JSON_Grammar} grammar
 @returns {grammar is JSON_Grammar} */
export function validate_json_grammar(grammar) {
	return (
		grammar !== null && typeof grammar === 'object' &&
		'name'       in grammar && typeof grammar.name === 'string' &&
		'scopeName'  in grammar && typeof grammar.scopeName === 'string' &&
		'patterns'   in grammar && validate_array(grammar.patterns, validate_json_pattern) &&
		'repository' in grammar && validate_dict(grammar.repository, validate_json_pattern)
	)
}

/**
 @param   {unknown | JSON_Pattern}  pattern
 @returns {pattern is JSON_Pattern} */
export function validate_json_pattern(pattern) {
	return (
		pattern !== null && typeof pattern === 'object' &&
		(!('name'          in pattern) || typeof pattern.name        === 'string') &&
		(!('contentName'   in pattern) || typeof pattern.contentName === 'string') &&
		(!('include'       in pattern) || typeof pattern.include     === 'string') &&
		(!('match'         in pattern) || typeof pattern.match       === 'string') &&
		(!('begin'         in pattern) || typeof pattern.begin       === 'string') &&
		(!('end'           in pattern) || typeof pattern.end         === 'string') &&
		(!('captures'      in pattern) || validate_dict(pattern.captures, validate_capture)) &&
		(!('beginCaptures' in pattern) || validate_dict(pattern.beginCaptures, validate_capture)) &&
		(!('endCaptures'   in pattern) || validate_dict(pattern.endCaptures, validate_capture)) &&
		(!('patterns'      in pattern) || validate_array(pattern.patterns, validate_json_pattern))
	)
}

/**
 @template T
 @param   {unknown}                           value
 @param   {(v: unknown, i: number) => v is T} predicate
 @returns {value is T[]}                      */
function validate_array(value, predicate) {
	return (
		Array.isArray(value) && value.every(predicate)
	)
}

/**
 @template T
 @param   {unknown}                value
 @param   {(v: unknown) => v is T} predicate
 @returns {value is Dict<T>}       */
function validate_dict(value, predicate) {
	return (
		typeof value === 'object' && value !== null && Object.values(value).every(predicate)
	)
}

/**
 @param {unknown | JSON_Capture}    capture
 @returns {capture is JSON_Capture} */
export function validate_capture(capture) {
	return (
		capture !== null && typeof capture === 'object' &&
		'name' in capture && typeof capture.name === 'string'
	)
}

/**
 * Parsing json grammar file to a struture expected by the parser.
 * 
 * **BEFORE USE:**
 * 
 * The json grammar needs their regex strings converted from oniguruma to js.
 * `json_to_grammar` doesn't handle that, it assumes the regexes are already converted.
 * 
 * See the `"convert_tm_to_js.js"` file.
 * 
 * @param   {JSON_Grammar} json
 * @returns {Grammar}      */
export function json_to_grammar(json)
{
	/** @type {Repository} */ let repo = {}

	return {
		scope   : json.scopeName,
		patterns: json.patterns.map(p => json_to_pattern(p, json.repository, repo)),
	}
}

/**
@param   {string} str
@returns {RegExp} */
function string_match_to_regex(str) {
	return new RegExp(str, 'ydm')
}

/**
@param   {JSON_Pattern}    json
@param   {JSON_Repository} repo_json
@param   {Repository}      repo
@returns {Pattern}        */
function json_to_pattern(json, repo_json, repo)
{
	/** @type {Pattern} */ let pattern = {
		names         : [],
		content_names : [],
		begin_match   : null,
		begin_captures: null,
		end_match     : null,
		end_captures  : null,
		patterns      : [],
	}

	switch (true) {
	case json.match !== undefined:
	{
		pattern.begin_match = string_match_to_regex(json.match)

		if (json.name) pattern.names = json.name.split(' ')

		if (json.captures) pattern.begin_captures = json_to_captures(json.captures)

		break
	}
	case json.begin !== undefined && json.end !== undefined:
	{
		pattern.begin_match = string_match_to_regex(json.begin)
		pattern.end_match   = string_match_to_regex(json.end)

		if (json.name) pattern.names = json.name.split(' ')
		if (json.contentName) pattern.content_names = json.contentName.split(' ')

		if (json.beginCaptures) pattern.begin_captures = json_to_captures(json.beginCaptures)
		if (json.endCaptures) pattern.end_captures = json_to_captures(json.endCaptures)

		if (json.patterns) pattern.patterns = json.patterns.map(p => json_to_pattern(p, repo_json, repo))

		break
	}
	case json.include !== undefined:
	{
		let patterns = repo[json.include]
		if (patterns !== undefined)
			return patterns

		if (json.include[0] !== '#')
			break

		let patterns_json = repo_json[json.include.slice(1)]
		if (patterns_json === undefined)
			break

		repo[json.include] = pattern
		Object.assign(pattern, json_to_pattern(patterns_json, repo_json, repo))

		break
	}
	case json.patterns !== undefined:
	{
		if (json.patterns) pattern.patterns = json.patterns.map(p => json_to_pattern(p, repo_json, repo))

		break
	}
	}

	return pattern
}

/**
 @param   {JSON_Captures} json
 @returns {Captures}      */
function json_to_captures(json)
{
	let captures = /** @type {Captures} */ ({...json}) // copy keys
	for (let [k, v] of Object.entries(json)) {
		// json values cannot be undefined
		captures[k] = {names: /** @type {JSON_Capture} */(v).name.split(' ')}
	}
	return captures
}

/* -------------------------------------------------------------------------------------------------

	PARSER
	code -> Scope tree

*/

/**
 @typedef  {object} Parser
 @property {string} code
 @property {string} line
 @property {number} line_pos
 @property {number} line_end
 @property {number} char_pos
 @property {Scope}  match_scope container scope for parse_match
*/

/**
 @typedef  {object}  Scope
 @property {string}  name
 @property {number}  pos
 @property {number}  end
 @property {Scope?}  parent
 @property {Scope[]} children
*/

/**
 yields {@link scope} and each parent until (not including) {@link until}

@param   {Scope}   scope
@param   {Scope?} [until]
@returns {Generator<Scope>}
*/
export function* each_scope_until(scope, until = null) {
	for (;;) {
		yield scope
		if (scope.parent == null || scope.parent === until)
			break
		scope = scope.parent
	}
}

/**
@param   {string[]} names
@param   {number}   pos 
@param   {number}   end
@param   {Scope}    scope
@param   {number}   [names_offset]
@returns {Scope}    */
function make_scope_for_each_name(names, pos, end, scope, names_offset = 0) {
	for (let i = names_offset; i < names.length; i++) {
		scope.children.push(scope = {pos, end, name: names[i], parent: scope, children: []})
	}
	return scope
}

/**
@param   {Parser}     p
@param   {number}     n
@returns {void}      */
function move_char_pos(p, n) {
	p.char_pos += n
	if (p.char_pos >= p.line_end) {
		p.line_pos = p.line_end
		while (p.line_end < p.code.length && p.code[p.line_end++] !== '\n') {}
		p.line = p.code.slice(p.line_pos, p.line_end)
	}
}

/**
@param   {string}  code
@param   {Grammar} grammar
@returns {Scope}   */
export function parse_code(code, grammar) {

	/** @type {Parser} */
	let t = {
		code:        code,
		line:        '',
		char_pos:    0,
		line_end:    0,
		line_pos:    0,
		match_scope: {
			pos:      0,
			end:      0,
			name:     '',
			parent:   null,
			children: [],
		},
	}

	/** @type {Scope} */
	let root = {
		pos:      0,
		end:      t.code.length,
		name:     grammar.scope,
		parent:   null,
		children: [],
	}

	move_char_pos(t, 0)

	while (t.char_pos < t.code.length) {
		if (!parse_patterns(t, grammar.patterns, root)) {
			move_char_pos(t, 1)
		}
	}

	return root
}

/**
@param   {Parser} t
@param   {Pattern[]}  patterns
@param   {Scope}      scope
@returns {boolean} */
function parse_patterns(t, patterns, scope) {
	for (let pattern of patterns) {
		let pos_before = t.char_pos
		parse_pattern(t, pattern, scope)
		if (pos_before < t.char_pos) {
			return true
		}
	}
	return false
}

/**
@param   {Parser}  t
@param   {Pattern} pattern
@param   {Scope}   parent
@returns {void} */
function parse_pattern(t, pattern, parent) {

	// only patterns
	if (pattern.begin_match === null) {
		parse_patterns(t, pattern.patterns, parent)
		return
	}

	// begin
	let pattern_pos = t.char_pos
	if (!parse_match(t, pattern.begin_match, pattern.begin_captures)) {
		return
	}

	let pattern_scope = make_scope_for_each_name(pattern.names, pattern_pos, t.char_pos, parent)
	// begin match scopes
	for (let scope of t.match_scope.children) {
		pattern_scope.children.push(scope)
		scope.parent = pattern_scope
	}

	// begin-end (+patterns)
	if (pattern.end_match != null) {

		let content_scope = make_scope_for_each_name(pattern.content_names, t.char_pos, t.char_pos, pattern_scope)
		let content_end = t.char_pos

		while (t.char_pos < t.code.length) {
			// end
			content_end = t.char_pos
			if (parse_match(t, pattern.end_match, pattern.end_captures)) {
				break
			}
			// paterns
			if (!parse_patterns(t, pattern.patterns, content_scope)) {
				move_char_pos(t, 1)
			}
		}

		// end match scope
		for (let scope of t.match_scope.children) {
			pattern_scope.children.push(scope)
			scope.parent = pattern_scope
		}

		// set content length
		for (let scope of each_scope_until(content_scope, pattern_scope)) {
			scope.end = content_end
		}
	}

	// set pattern length
	for (let scope of each_scope_until(pattern_scope, parent)) {
		scope.end = t.char_pos
	}
}

/**
@param   {Parser}    t
@param   {RegExp}    regex
@param   {Captures?} captures
@returns {boolean}   */
function parse_match(t, regex, captures) {

	t.match_scope.children = [] // used in parse_pattern to get the scopes

	regex.lastIndex = t.char_pos-t.line_pos
	let result = regex.exec(t.line)
	if (result == null) {
		return false
	}

	let match_len = result[0].length

	// match with no length still counts
	// (can be made entirely from a look-ahead)
	if (match_len === 0) {
		return true
	}

	// move the cursor (changes t.line_pos!)
	let line_pos = t.line_pos
	move_char_pos(t, match_len)

	if (captures == null) {
		return true
	}

	/*
	 Find a parent scope for each capture

	 [foo := baz -> bar;;]  match_parent
	 [foo := baz -> bar;;]  (0) → match_parent
	 [foo] ↑      ↑     ↑   (1) → parent(0)
	     [:=]     ↑     ↑   (2) → try(1) → parent(0)
	        [baz -> bar]↑   (3) → try(2) → parent(0)
	        [baz] ↑  ↑  ↑   (4) → parent(3)
	            [->] ↑  ↑   (5) → try(4) → parent(3)
	               [bar]↑   (6) → try(5) → parent(3)
	                  [;;]  (7) → try(6) → try(3) → parent(0)
	*/

	let scope = t.match_scope
	scope.pos = t.char_pos-match_len
	scope.end = t.char_pos

	for (let i = 0; i < result.length; i++) {

		let indices = /** @type {RegExpIndicesArray} */(result.indices)[i]
		let capture = captures[i]

		if (indices == null || capture == null || capture.names.length === 0)
			continue

		let pos = indices[0] + line_pos
		let end = indices[1] + line_pos

		if (pos === end)
			continue

		for (;;) {
			if (pos >= scope.pos && end <= scope.end) {
				scope = make_scope_for_each_name(capture.names, pos, end, scope)
				break
			}
			if (scope.parent == null) {
				break
			}
			scope = scope.parent
		}
	}

	return true
}

/* -------------------------------------------------------------------------------------------------

	TOKENIZER
	code -> Token[]

*/

/**
 @typedef  {object}  Tokenizer
 @property {string}  code
 @property {string}  line
 @property {number}  pos_char
 @property {number}  pos_line
 @property {Token[]} tokens
*/

/**
 @typedef  {object}   Token
 @property {number}   pos
 @property {number}   end
 @property {string[]} scopes
*/

/**
@param   {string}  code
@param   {Grammar} grammar
@returns {Token[]} */
export function code_to_tokens(code, grammar)
{
	let source_scopes = [grammar.scope]

	/** @type {Tokenizer} */ let t = {
		code    : code,
		line    : code,
		pos_char: 0,
		pos_line: 0,
		tokens  : [],
	}

	loop: while (t.pos_char < t.code.length)
	{
		for (let pattern of grammar.patterns) {
			if (pattern_to_tokens(t, pattern, source_scopes)) {
				continue loop
			}
		}
		increment_pos(t, source_scopes)
	}

	return t.tokens
}

/**
 @param   {Tokenizer} t
 @param   {Pattern}   pattern
 @param   {string[]}  parent_scopes
 @returns {boolean}   success */
function pattern_to_tokens(t, pattern, parent_scopes)
{
	// only patterns
	if (pattern.begin_match === null)
	{
		let pattern_scopes = pattern.names.length > 0
			? [...parent_scopes, ...pattern.names]
			: parent_scopes

		for (let subpattern of pattern.patterns) {
			if (pattern_to_tokens(t, subpattern, pattern_scopes)) {
				return true
			}
		}
		return false
	}

	// begin
	pattern.begin_match.lastIndex = t.pos_char - t.pos_line
	let begin_result = pattern.begin_match.exec(t.line)
	if (begin_result === null) {
		return false
	}

	let pattern_scopes = pattern.names.length > 0
		? [...parent_scopes, ...pattern.names]
		: parent_scopes

	let start_pos_char = t.pos_char

	match_captures(t, begin_result, pattern.begin_captures, pattern_scopes)

	// begin-end (+patterns)
	if (pattern.end_match != null) {

		let content_scopes = pattern.content_names.length > 0
			? [...pattern_scopes, ...pattern.content_names]
			: pattern_scopes

		loop:
		while (t.pos_char < t.code.length) {
			// end
			pattern.end_match.lastIndex = t.pos_char-t.pos_line
			let end_result = pattern.end_match.exec(t.line)
			if (end_result !== null) {
				match_captures(t, end_result, pattern.end_captures, pattern_scopes)
				break loop
			}

			// patterns
			for (let subpattern of pattern.patterns) {
				if (pattern_to_tokens(t, subpattern, content_scopes)) {
					continue loop
				}
			}

			increment_pos(t, content_scopes)
		}
	}

	// Sometimes the all of the matches return a result full of look-acheads
	// where each `result[0].length === 0`
	// so the cursor doesn't move
	// and can cause an infinite loop if `true` is returned
	return start_pos_char !== t.pos_char
}

/**
 @param   {Tokenizer} t
 @param   {string[]}  scopes
 @returns {void}      */
function increment_pos(t, scopes)
{
	// token for skipped text
	if (t.tokens.length > 0) {
		let last_token = t.tokens[t.tokens.length-1]
		if (last_token.scopes !== scopes) {
			t.tokens.push({
				pos:    t.pos_char,
				end:    t.pos_char+1,
				scopes: scopes,
			})
		} else {
			last_token.end += 1
		}
	}

	// new line pos
	if (t.code[t.pos_char] === '\n') {
		t.pos_line = t.pos_char + 1
		t.line     = t.code.slice(t.pos_line)
	}

	t.pos_char += 1
}

/**
 @param   {Tokenizer}       t
 @param   {RegExpExecArray} result
 @param   {Captures?}       captures
 @param   {string[]}        pattern_scopes
 @returns {void}            */
function match_captures(t, result, captures, pattern_scopes)
{
	let match_len = result[0].length
	if (match_len === 0)
		return

	let match_pos = t.pos_line + result.index
	let match_end = match_pos + match_len

	if (captures == null) {
		t.tokens.push({
			pos:    match_pos,
			end:    match_end,
			scopes: pattern_scopes,
		})
	} else {
		let ti_start = t.tokens.length

		t.tokens.push({
			pos:    match_pos,
			end:    match_end,
			scopes: captures[0] !== undefined && captures[0].names.length > 0
				? [...pattern_scopes, ...captures[0].names]
				: pattern_scopes,
		})

		for (let ri = 1; ri < result.length; ri++) {

			let indices = /** @type {RegExpIndicesArray} */(result.indices)[ri]
			if (indices == null)
				continue

			let capture = captures[ri]
			if (capture == null || capture.names.length === 0)
				continue

			let pos = indices[0] + t.pos_line
			let end = indices[1] + t.pos_line

			// look ahead
			if (end > match_end)
				break

			for (let ti = t.tokens.length-1; ti >= ti_start; ti--) {
				let prev = t.tokens[ti]

				/*
				 [   prev token  ]
					   [new]
				   v  v  v  v  v
				 [prev][new][prev]
				*/

				if (pos >= prev.pos && end <= prev.end) {
					t.tokens.splice(ti+1, 0, {
						pos:    pos,
						end:    end,
						scopes: [...prev.scopes, ...capture.names],
					}, {
						pos:    end,
						end:    prev.end,
						scopes: prev.scopes,
					})
					prev.end = pos
					break
				}
			}
		}
	}

	// Increase char pos
	t.pos_char += match_len
	if (t.code[t.pos_char-1] === '\n') {
		t.pos_line = t.pos_char
		t.line     = t.code.slice(t.pos_line)
	}
}

/* -------------------------------------------------------------------------------------------------

	THEME

*/

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
 @typedef  {object} JSON_Theme_Settings
 @property {string} [foreground]
 @property {string} [background]
 @property {string} [fontStyle]
 */

/** @typedef {Map<string, JSON_Theme_Settings>} Scope_Theme_Settings_Cache */

/**
@param   {Token}                      token
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

					if (scope.startsWith(selector_part) && (
						scope.length === selector_part.length ||
						scope[selector_part.length] === '.'
					)) {
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

				if (scope.startsWith(selector_part) && (
					scope.length === selector_part.length ||
					scope[selector_part.length] === '.'
				)) {
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
