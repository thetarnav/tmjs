/**
 * @template T 
 * @typedef {{[key in string]?: T}} Dict
 */

/**
 * @typedef  {object}     Grammar
 * @property {string}     name
 * @property {string}     scopeName
 * @property {Pattern[]}  patterns
 * @property {Repository} repository
 */

/**
 * @typedef {Dict<Pattern>} Repository
 */

/**
 * @typedef  {object}    Pattern
 * @property {string}    [include]
 * @property {string}    [name]
 * @property {string}    [match]
 * @property {string}    [begin]
 * @property {string}    [end]
 * @property {Captures}  [captures]
 * @property {Captures}  [beginCaptures]
 * @property {Captures}  [endCaptures]
 * @property {Pattern[]} [patterns]
 */

/** 
 * @typedef {Dict<Capture>} Captures
 */

/**
 * @typedef  {object} Capture
 * @property {string} name
 */

/**
 * @param   {unknown | Grammar} grammar 
 * @returns {grammar is Grammar} */
export function validate_grammar(grammar) {
	return (
		grammar !== null &&
		typeof grammar === "object" &&
		"name"       in grammar && typeof grammar.name === "string" &&
		"scopeName"  in grammar && typeof grammar.scopeName === "string" &&
		"patterns"   in grammar && Array.isArray(grammar.patterns) && grammar.patterns.every(validate_pattern) &&
		"repository" in grammar && typeof grammar.repository === "object" && grammar.repository !== null && Object.values(grammar.repository).every(validate_pattern)
	)
}

/**
 * @param   {unknown | Pattern}  pattern 
 * @returns {pattern is Pattern} */
export function validate_pattern(pattern) {
	return (
		pattern !== null &&
		typeof pattern === "object" &&
		(!("include"       in pattern) || typeof pattern.include === "string") &&
		(!("name"          in pattern) || typeof pattern.name === "string") &&
		(!("match"         in pattern) || typeof pattern.match === "string") &&
		(!("begin"         in pattern) || typeof pattern.begin === "string") &&
		(!("end"           in pattern) || typeof pattern.end === "string") &&
		(!("captures"      in pattern) || validate_captures(pattern.captures)) &&
		(!("beginCaptures" in pattern) || validate_captures(pattern.beginCaptures)) &&
		(!("endCaptures"   in pattern) || validate_captures(pattern.endCaptures)) &&
		(!("patterns"      in pattern) || Array.isArray(pattern.patterns) && pattern.patterns.every(validate_pattern))
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

class Tokenizer {
	code = ""
	pos_char = 0
	pos_line = 0
	repo = /** @type {Repository} */({})
}

class Token {
	content = ""
	tokens  = /** @type {Token[]} */([])
	scope   = ""
}

/**
 * @param {Tokenizer} t 
 * @param {number}    n 
 */
function increse_pos(t, n)
{
	while (n > 0) {
		if (t.code[t.pos_char] === "\n") {
			t.pos_line = t.pos_char + 1
		}

		t.pos_char += 1
		n -= 1
	}
}

/**
 * @param   {string}  code 
 * @param   {Grammar} grammar
 * @returns {Token[]} */
export function code_to_tokens(code, grammar)
{
	let t = new Tokenizer()
	t.code = code
	t.repo = grammar.repository

	/** @type {Token[]} */
	let code_tokens = []

	loop: while (t.pos_char < t.code.length)
	{
		for (const pattern of grammar.patterns) {
			let tokens = try_get_tokens(t, pattern)
			if (tokens.length > 0) {
				code_tokens.push.apply(code_tokens, tokens)
				continue loop
			}
		}
		
		increse_pos(t, 1)
	}

	return code_tokens
}

/**
 * @param   {Tokenizer}            t
 * @param   {RegExp}               match
 * @param   {Captures | undefined} captures
 * @param   {string | undefined}   scope_name
 * @returns {Token | null}         */
function match_token_with_captures(t, match, captures, scope_name)
{
	match.lastIndex = t.pos_char - t.pos_line
	let result = match.exec(t.code.slice(t.pos_line))
	if (result === null) return null

	let token = new Token()
	token.content = result[0]
	if (scope_name) token.scope = scope_name

	// handle captures
	if (captures !== undefined)
	{
		if (result.length === 1)
		{
			let subtoken = new Token()
			subtoken.content = result[0]
			let capture = captures[0]
			if (capture !== undefined) subtoken.scope = capture.name
			token.tokens.push(subtoken)
		}
		else {
			let last_end = 0
			
			for (let key = 1; key < result.length; key += 1)
			{
				let group   = result[key]
				let indices = /** @type {RegExpIndicesArray} */(result.indices)[key]
				if (indices === undefined) continue
				let [pos, end] = indices

				// text between captures
				if (pos > last_end) {
					let subtoken = new Token()
					subtoken.content = t.code.slice(t.pos_char + last_end, t.pos_char + pos)
					token.tokens.push(subtoken)
				}
				last_end = end

				let capture_token = new Token()
				capture_token.content = group
				let capture = captures[key]
				if (capture !== undefined) capture_token.scope = capture.name
				token.tokens.push(capture_token)
			}

			// text after last capture
			if (last_end < result[0].length)
			{
				let subtoken = new Token()
				subtoken.content = t.code.slice(t.pos_char + last_end, t.pos_char + result[0].length)
				token.tokens.push(subtoken)
			}
		}

	}

	increse_pos(t, result[0].length)

	return token
}

/**
 * @param   {Tokenizer} t
 * @param   {Pattern}   pattern
 * @returns {Token[]}   */
function try_get_tokens(t, pattern)
{
	/** @type {Token[]} */
	let tokens = []

	switch (true) {
	case pattern.match !== undefined:
	{
		let match = new RegExp(pattern.match, "yd")
		let token = match_token_with_captures(t, match, pattern.captures, pattern.name)
		if (token) tokens.push(token)
		break
	}
	case pattern.begin !== undefined && pattern.end !== undefined:
	{
		let begin_pos = t.pos_char

		let begin_match = new RegExp(pattern.begin, "yd")
		let begin_token = match_token_with_captures(t, begin_match, pattern.beginCaptures, undefined)
		if (begin_token === null) break

		let pattern_token = new Token()
		if (pattern.name) pattern_token.scope = pattern.name
		tokens.push(pattern_token)
		pattern_token.tokens.push(begin_token)

		let end_match = new RegExp(pattern.end, "yd")
		let patterns = pattern.patterns || []

		loop: while (t.pos_char < t.code.length)
		{
			// end
			let end_token = match_token_with_captures(t, end_match, pattern.endCaptures, undefined)
			if (end_token) {
				pattern_token.content = t.code.slice(begin_pos, t.pos_char)
				pattern_token.tokens.push(end_token)
				break loop
			}

			// patterns
			for (let subpattern of patterns) {
				let tokens = try_get_tokens(t, subpattern)
				if (tokens.length > 0) {
					pattern_token.tokens.push.apply(pattern_token.tokens, tokens)
					continue loop
				}
			}

			// text between patterns
			let last_token = pattern_token.tokens[pattern_token.tokens.length-1]
			if (last_token.scope !== "" || last_token.tokens.length > 0) {
				last_token = new Token()
				pattern_token.tokens.push(last_token)
			}
			last_token.content += t.code[t.pos_char]

			increse_pos(t, 1)
		}

		break
	}
	case pattern.include !== undefined:
	{
		let included = t.repo[pattern.include.substring(1)]
		if (included) {
			tokens.push.apply(tokens, try_get_tokens(t, included))
		}
		break
	}
	case pattern.patterns !== undefined:
	{
		for (let subpattern of pattern.patterns) {
			let subtokens = try_get_tokens(t, subpattern)
			if (subtokens.length > 0) {
				tokens.push.apply(tokens, subtokens)
				break
			}
		}
		break
	}
	}

	return tokens
}

