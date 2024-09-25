/*
TODOs
- [x] spaces in name in grammars (multiple names)
- [x] selectors with ">"
- [ ] selectors with "-"
- [ ] patterns in captures
- [ ] contentName
- [ ] begin/while
- [ ] bitset font style
- [x] tm regex does not includes newlines in `\s`
*/

/**
 * @template T
 * @typedef {{[key in string]?: T}} Dict
 */

/**
 * @template T
 * @typedef {T | T[]} Many
 */

/**
 * @typedef  {object}          JSON_Grammar
 * @property {string}          scopeName
 * @property {JSON_Pattern[]}  patterns
 * @property {JSON_Repository} repository
 */

/**
 * @typedef  {object}    Grammar
 * @property {string}    scope
 * @property {Pattern[]} patterns
 */

/**
 * @typedef {Dict<JSON_Pattern>} JSON_Repository
 */

/**
 * @typedef {Dict<Pattern>} Repository
 */

/**
 * @typedef  {object}         JSON_Pattern
 * @property {string}         [include]
 * @property {string}         [name]
 * @property {string}         [match]
 * @property {string}         [begin]
 * @property {string}         [end]
 * @property {JSON_Captures}  [captures]
 * @property {JSON_Captures}  [beginCaptures]
 * @property {JSON_Captures}  [endCaptures]
 * @property {JSON_Pattern[]} [patterns]
 */

/**
 * @typedef  {object}    Pattern
 * @property {string[]}  names
 * @property {RegExp?}   begin_match
 * @property {Captures?} begin_captures
 * @property {RegExp?}   end_match
 * @property {Captures?} end_captures
 * @property {Pattern[]} patterns
 */

/**
 * @typedef {Dict<JSON_Capture>} JSON_Captures
 */

/**
 * @typedef {Dict<Capture>} Captures
 */

/**
 * @typedef  {object} JSON_Capture
 * @property {string} name
 */

/**
 * @typedef  {object}   Capture
 * @property {string[]} names
 */

/**
 * @param   {unknown | JSON_Grammar} grammar
 * @returns {grammar is JSON_Grammar} */
export function validate_json_grammar(grammar) {
	return (
		grammar !== null &&
		typeof grammar === "object" &&
		"name"       in grammar && typeof grammar.name === "string" &&
		"scopeName"  in grammar && typeof grammar.scopeName === "string" &&
		"patterns"   in grammar && Array.isArray(grammar.patterns) && grammar.patterns.every(validate_json_pattern) &&
		"repository" in grammar && typeof grammar.repository === "object" && grammar.repository !== null && Object.values(grammar.repository).every(validate_json_pattern)
	)
}

/**
 * @param   {unknown | JSON_Pattern}  pattern
 * @returns {pattern is JSON_Pattern} */
export function validate_json_pattern(pattern) {
	return (
		pattern !== null &&
		typeof pattern === "object" &&
		(!("include"       in pattern) || typeof pattern.include === "string") &&
		(!("match"         in pattern) || typeof pattern.match === "string") &&
		(!("begin"         in pattern) || typeof pattern.begin === "string") &&
		(!("end"           in pattern) || typeof pattern.end === "string") &&
		(!("captures"      in pattern) || validate_captures(pattern.captures)) &&
		(!("beginCaptures" in pattern) || validate_captures(pattern.beginCaptures)) &&
		(!("endCaptures"   in pattern) || validate_captures(pattern.endCaptures)) &&
		(!("patterns"      in pattern) || Array.isArray(pattern.patterns) && pattern.patterns.every(validate_json_pattern))
	)
}

/**
 * @param   {unknown | JSON_Captures}   captures
 * @returns {captures is JSON_Captures} */
export function validate_captures(captures) {
	return (
		captures !== null &&
		typeof captures === "object" &&
		Object.values(captures).every(validate_capture)
	)
}

/**
 * @param {unknown | JSON_Capture} capture
 * @returns {capture is JSON_Capture}
 */
export function validate_capture(capture) {
	return (
		capture !== null &&
		typeof capture === "object" &&
		"name" in capture && typeof capture.name === "string"
	)
}

/**
 * @param   {JSON_Grammar} json
 * @returns {Grammar}      */
export function json_to_grammar(json)
{
	/** @type {Repository} */ let repo = {}

	/** @type {Grammar} */ let grammar = {
		scope   : json.scopeName,
		patterns: [],
	}

	for (const json_pattern of json.patterns) {
		grammar.patterns.push(json_to_pattern(json_pattern, json.repository, repo))
	}

	return grammar
}

/**
@param   {string} str 
@returns {RegExp}
*/
function string_match_to_regex(str) {
	str = str.replaceAll("\\s", "[ \\t\\v\\f]") // tm regex does not includes newlines in \s
	return new RegExp(str, "yd")
}

/**
@param   {JSON_Pattern}    json
@param   {JSON_Repository} repo_json
@param   {Repository}      repo
@returns {Pattern}        */
function json_to_pattern(json, repo_json, repo)
{
	switch (true) {
	case json.match !== undefined:
	{
		/** @type {Pattern} */ let pattern = {
			names         : json.name !== undefined ? json.name.split(" ") : [],
			begin_match   : string_match_to_regex(json.match),
			begin_captures: json.captures ? json_to_captures(json.captures) : null,
			end_match     : null,
			end_captures  : null,
			patterns      : [],
		}
		return pattern
	}
	case json.begin !== undefined && json.end !== undefined:
	{
		/** @type {Pattern} */ let pattern = {
			names         : json.name !== undefined ? json.name.split(" ") : [],
			begin_match   : string_match_to_regex(json.begin),
			begin_captures: json.beginCaptures ? json_to_captures(json.beginCaptures) : null,
			end_match     : string_match_to_regex(json.end),
			end_captures  : json.endCaptures   ? json_to_captures(json.endCaptures)   : null,
			patterns      : [],
		}
		if (json.patterns !== undefined) {
			for (const sub_json of json.patterns) {
				pattern.patterns.push(json_to_pattern(sub_json, repo_json, repo))
			}
		}
		return pattern
	}
	case json.include !== undefined:
	{
		let patterns = repo[json.include]
		if (patterns !== undefined) {
			return patterns
		}

		/** @type {Pattern} */ let pattern = {
			names         : [],
			begin_match   : null,
			begin_captures: null,
			end_match     : null,
			end_captures  : null,
			patterns      : [],
		}

		if (json.include[0] !== "#") {
			return pattern
		}

		let patterns_json = repo_json[json.include.slice(1)]
		if (patterns_json === undefined) {
			return pattern
		}

		repo[json.include] = pattern
		let actual = json_to_pattern(patterns_json, repo_json, repo)
		pattern.names          = actual.names
		pattern.begin_match    = actual.begin_match
		pattern.begin_captures = actual.begin_captures
		pattern.end_match      = actual.end_match
		pattern.end_captures   = actual.end_captures
		pattern.patterns       = actual.patterns

		return pattern
	}
	case json.patterns !== undefined:
	{
		/** @type {Pattern[]} */ let patterns = []
		for (const sub_json of json.patterns) {
			patterns.push(json_to_pattern(sub_json, repo_json, repo))
		}
		return {
			names         : json.name !== undefined ? json.name.split(" ") : [],
			begin_match   : null,
			begin_captures: null,
			end_match     : null,
			end_captures  : null,
			patterns      : patterns,
		}
	}
	}

	return {
		names         : [],
		begin_match   : null,
		begin_captures: null,
		end_match     : null,
		end_captures  : null,
		patterns      : [],
	}
}

/**
 * @param   {JSON_Captures} json
 * @returns {Captures}      */
function json_to_captures(json)
{
	/** @type {Captures} */ let captures = /** @type {*} */ ({...json}) // copy keys
	for (let [k, v] of Object.entries(json)) {
		captures[k] = {
			// json values cannot be undefined
			names: /** @type {JSON_Capture} */ (v).name.split(" "),
		}
	}
	return captures
}

/**
 * @typedef  {object}              Tokenizer
 * @property {string}              code
 * @property {string}              line
 * @property {number}              pos_char
 * @property {number}              pos_line
 * @property {{[_:number]: Token}} tokens // preallocated array
 * @property {number}              len    // len of tokens
 */

/**
 * @typedef  {object}   Token
 * @property {string}   content
 * @property {string[]} scopes
 */

/**
 * @param   {string}  code
 * @param   {Grammar} grammar
 * @returns {Token[]} */
export function code_to_tokens(code, grammar)
{
	/** @type {Token[]}  */ let tokens = new Array(code.length)
	/** @type {string[]} */ let source_scopes = [grammar.scope]
	/** @type {Tokenizer} */
	let t = {
		code    : code,
		line    : code,
		pos_char: 0,
		pos_line: 0,
		tokens  : tokens,
		len     : 0,
	}

	loop: while (t.pos_char < t.code.length)
	{
		for (const pattern of grammar.patterns) {
			if (pattern_to_tokens(t, pattern, source_scopes)) {
				continue loop
			}
		}

		increment_pos(t, source_scopes)
	}

	return tokens.slice(0, t.len)
}

/**
 * @param   {Tokenizer} t
 * @param   {Pattern}   pattern
 * @param   {string[]}  parent_scopes
 * @returns {boolean}   success */
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

	match_captures(t, begin_result, pattern.begin_captures, pattern_scopes)
	increase_pos(t, begin_result[0].length)

	// no end
	if (pattern.end_match === null) {
		return true
	}

	loop: while (t.pos_char < t.code.length)
	{
		// end
		pattern.end_match.lastIndex = t.pos_char - t.pos_line
		let end_result = pattern.end_match.exec(t.line)
		if (end_result !== null)
		{
			match_captures(t, end_result, pattern.end_captures, pattern_scopes)
			increase_pos(t, end_result[0].length)
			break loop
		}

		// patterns
		for (let subpattern of pattern.patterns) {
			if (pattern_to_tokens(t, subpattern, pattern_scopes)) {
				continue loop
			}
		}

		increment_pos(t, pattern_scopes)
	}

	return true
}

/**
 * @param   {Tokenizer} t
 * @param   {string[]}  scopes
 * @returns {void}      */
function increment_pos(t, scopes)
{
	// token for skipped text
	if (t.len > 0) {
		let last_token = t.tokens[t.len-1]
		if (last_token.scopes !== scopes) {
			t.tokens[t.len++] = {
				content: t.code[t.pos_char],
				scopes : scopes,
			}
		} else {
			last_token.content += t.code[t.pos_char]
		}
	}

	// new line pos
	if (t.code[t.pos_char] === "\n") {
		t.pos_line = t.pos_char + 1
		t.line     = t.code.slice(t.pos_line)
	}

	t.pos_char += 1
}

/**
 * @param   {Tokenizer} t
 * @param   {number}    n
 * @returns {void}      */
function increase_pos(t, n)
{
	t.pos_char += n
	if (t.code[t.pos_char-1] === "\n") {
		t.pos_line = t.pos_char
		t.line     = t.code.slice(t.pos_line)
	}
}

/**
 * @param   {Tokenizer}       t
 * @param   {RegExpExecArray} result
 * @param   {Captures?}       captures
 * @param   {string[]}        pattern_scopes
 * @returns {void}            */
function match_captures(t, result, captures, pattern_scopes)
{
	if (result[0].length === 0) return

	if (captures == null)
	{
		t.tokens[t.len++] = {
			content: result[0],
			scopes : pattern_scopes,
		}
		return
	}

	// capture 0 is the whole match
	let match_scopes = captures[0] !== undefined && captures[0].names.length > 0
		? [...pattern_scopes, ...captures[0].names]
		: pattern_scopes

	if (result.length === 1)
	{
		t.tokens[t.len++] = {
			content: result[0],
			scopes : match_scopes,
		}
		return
	}

	// line-relative
	let last_end  = result.index
	let match_end = result.index + result[0].length

	for (let key = 1; key < result.length; key += 1)
	{
		let group   = result[key]
		let indices = /** @type {RegExpIndicesArray} */(result.indices)[key]
		if (indices === undefined) continue
		let [pos, end] = indices

		// look ahead
		if (end > match_end) {
			break
		}

		// text between captures
		if (pos > last_end) {
			t.tokens[t.len++] = {
				content: t.code.slice(t.pos_line + last_end, t.pos_line + pos),
				scopes : match_scopes,
			}
		}
		last_end = end

		// capture
		let capture = captures[key]
		t.tokens[t.len++] = {
			content: group,
			scopes : capture !== undefined && capture.names.length > 0
				? [...match_scopes, ...capture.names]
				: match_scopes,
		}
	}

	// text after last capture
	if (last_end < match_end)
	{
		t.tokens[t.len++] = {
			content: t.code.slice(t.pos_line + last_end, t.pos_line + match_end),
			scopes : match_scopes,
		}
	}
}

/**
 * @typedef  {object}              JSON_Theme_Item
 * @property {string[] | string}   [scope]
 * @property {JSON_Theme_Settings} settings
 */

/**
 * @typedef  {object}              Theme_Item
 * @property {string[]}            selector
 * @property {JSON_Theme_Settings} settings
 */

/**
 * @param   {JSON_Theme_Item[]} json
 * @param   {string}            source_scope
 * @returns {Theme_Item[]}      */
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
			
			" source meta.block >   child.scope"
			 v v v v v v v v v v v v v v v v
			["source", "meta.block", ">", "child.scope"]

			*/
			/** @type {string[]} */ let selector = [""]
			let is_space = false
			
			for (let char of selector_raw) {
				switch (char) {
				case ' ':
					is_space = true
					break
				case '>':
					selector.push(">", "")
					is_space = false
					break
				default:
					if (is_space && selector[selector.length-1] !== ">" && selector[selector.length-1] !== "") {
						selector.push("")
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
 * @typedef  {object} JSON_Theme_Settings
 * @property {string} [foreground]
 * @property {string} [background]
 * @property {string} [fontStyle]
 */

/** @typedef {Map<string, JSON_Theme_Settings>} Scope_Theme_Settings_Cache */

/**
 * @param   {Token} token
 * @param   {Theme_Item[]} theme
 * @param   {Scope_Theme_Settings_Cache} cache
 * @returns {JSON_Theme_Settings}        */
export function match_token_theme(token, theme, cache)
{
	let cache_string = token.scopes.join(" ")
	let cached = cache.get(cache_string)
	if (cached !== undefined) {
		return cached
	}

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
			if (selector_part === ">")
			{
				i -= 1
				if (scope_idx >= 0 && i >= 0)
				{
					selector_part = item.selector[i]
					let scope = token.scopes[scope_idx]
					scope_idx -= 1
					if (scope.startsWith(selector_part) && (
						scope.length === selector_part.length ||
						scope[selector_part.length] === "."
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
					scope[selector_part.length] === "."
				)) {
					specificity += (scope_idx+2) * 10 * selector_part.length
					continue selector_loop
				}
			}

			// not found
			continue theme_loop
		}

		// found
		if (specificity > specificity_foreground && "foreground" in item.settings) {
			settings.foreground    = item.settings.foreground
			specificity_foreground = specificity
		}
		if (specificity > specificity_background && "background" in item.settings) {
			settings.background    = item.settings.background
			specificity_background = specificity
		}
		if (specificity > specificity_font_style && "fontStyle" in item.settings) {
			settings.fontStyle     = item.settings.fontStyle
			specificity_font_style = specificity
		}
		continue theme_loop
	}

	cache.set(cache_string, settings)
	return settings
}
