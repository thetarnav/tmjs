/**
 * @template T 
 * @typedef {{[key in string]?: T}} Dict
 */

/**
 * @typedef  {object}          JSON_Grammar
 * @property {string}          scopeName
 * @property {JSON_Pattern[]}  patterns
 * @property {JSON_Repository} repository
 */

/**
 * @typedef {Dict<JSON_Pattern>} JSON_Repository
 */

/**
 * @typedef  {object}         JSON_Pattern
 * @property {string}         [include]
 * @property {string}         [name]
 * @property {string}         [match]
 * @property {string}         [begin]
 * @property {string}         [end]
 * @property {Captures}       [captures]
 * @property {Captures}       [beginCaptures]
 * @property {Captures}       [endCaptures]
 * @property {JSON_Pattern[]} [patterns]
 */

/** 
 * @typedef {Dict<Capture>} Captures
 */

/**
 * @typedef  {object} Capture
 * @property {string} name
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
 * @param   {unknown | Captures}   captures 
 * @returns {captures is Captures} */
export function validate_captures(captures) {
	return (
		captures !== null &&
		typeof captures === "object" &&
		Object.values(captures).every(validate_capture)
	)
}

/**
 * @param {unknown | Capture} capture 
 * @returns {capture is Capture}
 */
export function validate_capture(capture) {
	return (
		capture !== null &&
		typeof capture === "object" &&
		"name" in capture && typeof capture.name === "string"
	)
}

/**
 * @typedef  {object}    Grammar
 * @property {string}    scope
 * @property {Pattern[]} patterns
 */

/**
 * @typedef {Dict<Pattern>} Repository
 */

/**
 * @typedef  {object}    Pattern
 * @property {string?}   name
 * @property {RegExp?}   begin_match
 * @property {Captures?} begin_captures
 * @property {RegExp?}   end_match
 * @property {Captures?} end_captures
 * @property {Pattern[]} patterns
 */

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
 * @param   {JSON_Pattern}    json
 * @param   {JSON_Repository} repo_json
 * @param   {Repository}      repo
 * @returns {Pattern}        */
function json_to_pattern(json, repo_json, repo)
{
	switch (true) {
	case json.match !== undefined:
	{
		/** @type {Pattern} */ let pattern = {
			name          : json.name || null,
			begin_match   : new RegExp(json.match, "yd"),
			begin_captures: json.captures || null,
			end_match     : null,
			end_captures  : null,
			patterns      : [],
		}
		return pattern
	}
	case json.begin !== undefined && json.end !== undefined:
	{
		/** @type {Pattern} */ let pattern = {
			name          : json.name || null,
			begin_match   : new RegExp(json.begin, "yd"),
			begin_captures: json.beginCaptures || null,
			end_match     : new RegExp(json.end,   "yd"),
			end_captures  : json.endCaptures   || null,
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
			name          : null,
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
		pattern.name           = actual.name
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
			name          : json.name || null,
			begin_match   : null,
			begin_captures: null,
			end_match     : null,
			end_captures  : null,
			patterns      : patterns,
		}
	}
	}

	return {
		name          : null,
		begin_match   : null,
		begin_captures: null,
		end_match     : null,
		end_captures  : null,
		patterns      : [],
	}
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
		let pattern_scopes = pattern.name !== null
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

	let pattern_scopes = pattern.name !== null
		? [...parent_scopes, pattern.name]
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
	let match_scopes = captures[0] !== undefined
		? [...pattern_scopes, captures[0].name]
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
			scopes : capture !== undefined ? [...match_scopes, capture.name] : match_scopes,
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
 * @typedef  {object}            Theme_Item
 * @property {string[] | string} scope
 * @property {Theme_Settings}    settings
 */

/**
 * @typedef  {object} Theme_Settings
 * @property {string} [foreground]
 * @property {string} [background]
 * @property {string} [fontStyle]
 */

/**
 * @param   {string}  expected
 * @param   {string}  actual
 * @returns {boolean} greater then or equal */
function match_scope(expected, actual) {
	if (expected.length === actual.length) {
		return expected === actual
	}
	if (expected.length < actual.length) {
		return actual.startsWith(expected) && actual[expected.length] === "."
	}
	return false
}

/**
 * @param {Token}        token
 * @param {Theme_Item[]} theme
 * @returns {Theme_Settings} */
export function match_token_theme(token, theme)
{
	let scopes = token.scopes
	/** @type {Theme_Settings} */ let settings = {}

	for (let i = scopes.length - 1; i >= 0; i -= 1)
	{
		let scope = scopes[i]
		
		for (let item of theme)
		{
			if (typeof item.scope === "string") {
				if (match_scope(item.scope, scope)) {
					if (!("foreground" in settings)) settings.foreground = item.settings.foreground
					if (!("background" in settings)) settings.background = item.settings.background
					if (!("fontStyle"  in settings)) settings.fontStyle  = item.settings.fontStyle
					break
				}
			} else {
				if (!Array.isArray(item.scope)) {
					continue
				}
				for (let scope_item of item.scope) {
					if (match_scope(scope_item, scope)) {
						if (!("foreground" in settings)) settings.foreground = item.settings.foreground
						if (!("background" in settings)) settings.background = item.settings.background
						if (!("fontStyle"  in settings)) settings.fontStyle  = item.settings.fontStyle
						break
					}
				}
			}
		}
	}

	return settings
}
