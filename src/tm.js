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
 @property {string}    name
 @property {string}    content_name
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
 @param   {JSON_Grammar} json
 @returns {Grammar}      */
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
		name          : "",
		content_name  : "",
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

		if (json.name) pattern.name = json.name

		if (json.captures) pattern.begin_captures = json_to_captures(json.captures)

		break
	}
	case json.begin !== undefined && json.end !== undefined:
	{
		pattern.begin_match = string_match_to_regex(json.begin)
		pattern.end_match   = string_match_to_regex(json.end)

		if (json.name) pattern.name = json.name
		if (json.contentName) pattern.content_name = json.contentName

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

/**
 @typedef  {object}  Tokenizer
 @property {string}  code
 @property {string}  line
 @property {number}  pos_char
 @property {number}  pos_line
 @property {Token[]} tokens // preallocated array
 @property {number}  len    // len of tokens
 */

/**
 @typedef  {object}   Token
 @property {number}   pos
 @property {number}   end
 @property {string[]} scopes
 */

/**
 @typedef  {object} Tokenizer2
 @property {string} code
 @property {string} line
 @property {number} line_pos
 @property {number} line_end
 @property {number} char_pos
*/

/**
 @typedef  {object} Token2
 @property {number} pos
 @property {number} end
 @property {Scope?} scope
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
 yields {@link scope} and each parent until {@link until}

@param   {Scope}   scope
@param   {Scope?} [until]
@returns {Generator<Scope>}
*/
function* each_scope(scope, until = null) {
	for (;;) {
		yield scope
		if (scope.parent == null || scope.parent === until)
			break
		scope = scope.parent
	}
}

/**
@param   {Tokenizer2} t
@param   {number}     n
@param   {Scope}      scope
@returns {void}      */
function move_char_pos(t, n, scope) {

	t.char_pos += n
	scope.end = t.char_pos

	if (t.char_pos >= t.line_end) {
		t.line_pos = t.line_end
		while (t.line_end++ < t.code.length && t.code[t.line_end] !== '\n') {}
		t.line = t.code.slice(t.line_pos, t.line_end)
	}
}

/**
@param   {string}  code
@param   {Grammar} grammar
@returns {Token[]} */
export function code_to_tokens(code, grammar)
{
	let tokens = /** @type {Token[]} */ (new Array(code.length))
	let source_scopes = [grammar.scope]

	/** @type {Tokenizer} */ let t = {
		code    : code,
		line    : code,
		pos_char: 0,
		pos_line: 0,
		tokens  : tokens,
		len     : 0,
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

	return tokens.slice(0, t.len)
}

/**
@param   {string}  code
@param   {Grammar} grammar
@returns {Scope} */
export function parse_code(code, grammar) {

	/** @type {Tokenizer2} */
	let t = {
		code:     code,
		line:     '',
		char_pos: 0,
		line_end: 0,
		line_pos: 0,
	}

	/** @type {Scope} */
	let root = {
		pos:      0,
		end:      0,
		name:     grammar.scope,
		parent:   null,
		children: [],
	}

	move_char_pos(t, 0, root)

	while (t.char_pos < t.code.length) {
		if (!parse_patterns(t, grammar.patterns, root)) {
			move_char_pos(t, 1, root)
		}
	}

	return root
}

/**
@param   {Tokenizer2} t
@param   {Pattern[]}  patterns
@param   {Scope}      scope
@returns {boolean}    found */
function parse_patterns(t, patterns, scope) {

	for (let pattern of patterns) {
		if (parse_pattern(t, pattern, scope)) {
			return true
		}
	}
	return false
}

/**
@param   {Tokenizer2} t
@param   {Pattern}    pattern
@param   {Scope}      parent
@returns {boolean}    */
function parse_pattern(t, pattern, parent) {

	// only patterns
	if (pattern.begin_match === null) {
		return parse_patterns(t, pattern.patterns, parent)
	}

	let pattern_start_pos = t.char_pos
	let pattern_scope = pattern.name.length === 0 ? parent : {
		pos:      t.char_pos,
		end:      t.char_pos,
		name:     pattern.name,
		parent:   parent,
		children: [],
	}

	// begin
	if (!match_captures_2(t, pattern.begin_match, pattern.begin_captures, pattern_scope)) {
		return false
	}

	// begin-end (+patterns)
	if (pattern.end_match != null) {

		let content_scope = pattern.content_name.length === 0 ? pattern_scope : {
			pos:      t.char_pos,
			end:      t.char_pos,
			name:     pattern.content_name,
			parent:   pattern_scope,
			children: [],
		}

		while (t.char_pos < t.code.length) {
			// end
			if (match_captures_2(t, pattern.end_match, pattern.end_captures, pattern_scope)) {
				break
			}
			// paterns
			if (!parse_patterns(t, pattern.patterns, content_scope)) {
				move_char_pos(t, 1, content_scope)
			}
		}

		if (content_scope !== pattern_scope && content_scope.pos !== content_scope.end) {
			pattern_scope.children.push(content_scope)
		}
	}

	// Sometimes the all of the matches return a result full of look-acheads
	// where each result is empty but successful
	// so the cursor doesn't move
	// and can cause an infinite loop if `true` is returned
	let success = pattern_start_pos !== t.char_pos

	if (success && pattern_scope !== parent) {
		parent.children.push(pattern_scope)
	}

	return success
}

/**
@param   {Tokenizer2} t
@param   {RegExp}     regex
@param   {Captures?}  captures
@param   {Scope}      match_parent
@returns {boolean} */
function match_captures_2(t, regex, captures, match_parent) {

	regex.lastIndex = t.char_pos-t.line_pos
	let result = regex.exec(t.line)
	if (result == null)
		return false

	// Set the len of match_parent
	// and move the cursor (changes line_pos!)
	let line_pos = t.line_pos
	move_char_pos(t, result[0].length, match_parent)

	if (captures == null)
		return true

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
	let scope = match_parent

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
				for (let name of capture.names) {
					let parent = scope
					parent.children.push(scope = {name, pos, end, parent, children: []})
				}
				break
			}
			if (scope.parent == null || scope === match_parent) {
				break
			}
			scope = scope.parent
		}
	}

	return true
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
		let pattern_scopes = pattern.name.length > 0
			? [...parent_scopes, pattern.name]
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

	let pattern_scopes = pattern.name.length > 0
		? [...parent_scopes, pattern.name]
		: parent_scopes

	let start_pos_char = t.pos_char

	match_captures(t, begin_result, pattern.begin_captures, pattern_scopes)

	// begin-end (+patterns)
	if (pattern.end_match != null) {

		let content_scopes = pattern.content_name.length > 0
			? [...pattern_scopes, pattern.content_name]
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
	if (t.len > 0) {
		let last_token = t.tokens[t.len-1]
		if (last_token.scopes !== scopes) {
			t.tokens[t.len++] = {
				pos:    t.pos_char,
				end:    t.pos_char+1,
				scopes: scopes,
			}
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
		t.tokens[t.len++] = {
			pos:    match_pos,
			end:    match_end,
			scopes: pattern_scopes,
		}
	} else {
		let ti_start = t.len

		t.tokens[t.len++] = {
			pos:    match_pos,
			end:    match_end,
			scopes: captures[0] !== undefined && captures[0].names.length > 0
				? [...pattern_scopes, ...captures[0].names]
				: pattern_scopes,
		}

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

			for (let ti = t.len-1; ti >= ti_start; ti--) {
				let prev = t.tokens[ti]

				/*
				 [   prev token  ]
					   [new]
				   v  v  v  v  v
				 [prev][new][prev]
				*/

				if (pos >= prev.pos && end <= prev.end) {
					t.tokens.splice(ti, 1, {
						pos:    prev.pos,
						end:    pos,
						scopes: prev.scopes,
					}, {
						pos:    pos,
						end:    end,
						scopes: [...prev.scopes, ...capture.names],
					}, {
						pos:    end,
						end:    prev.end,
						scopes: prev.scopes,
					})
					t.len += 2
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
