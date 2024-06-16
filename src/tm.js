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
 * @typedef {Record<number, Capture>} Captures
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
	pos  = 0
	repo = /** @type {Repository} */({})
}

class Token {
	content = ""
	tokens  = /** @type {Token[]} */([])
	scope   = ""
}

/**
 * @param   {string}  code 
 * @param   {Grammar} grammar
 * @returns {Token[]} */
export function code_to_tokens(code, grammar) {

	let t = new Tokenizer()
	t.code = code
	t.repo = grammar.repository

	/** @type {Token[]} */
	let code_tokens = []

	loop: while (t.pos < t.code.length) {
		for (const pattern of grammar.patterns) {
			let tokens = try_get_tokens(t, pattern)
			if (tokens.length > 0) {
				code_tokens.push.apply(code_tokens, tokens)
				continue loop
			}
		}
		t.pos += 1
	}

	return code_tokens
}

/**
 * @param   {Tokenizer} t
 * @param   {Pattern}   pattern
 * @returns {Token[]}   */
function try_get_tokens(t, pattern) {
	/** @type {Token[]} */
	let tokens = []

	switch (true) {
	case pattern.match !== undefined: {
		let match = new RegExp(pattern.match, "y")
		let result = match.exec(t.code.substring(t.pos))
		if (result === null) break
	
		let token = new Token()
		token.content = result[0]
		if (pattern.name) token.scope = pattern.name
		tokens.push(token)

		t.pos += match.lastIndex
		break
	}
	case pattern.begin !== undefined && pattern.end !== undefined: {
		let begin = new RegExp(pattern.begin, "y")
		let begin_result = begin.exec(t.code.substring(t.pos))
		if (begin_result === null) break

		let token = new Token()
		if (pattern.name) token.scope = pattern.name
		tokens.push(token)
	
		t.pos += begin.lastIndex

		let end = new RegExp(pattern.end, "y")

		loop: while (t.pos < t.code.length) {
			if (pattern.patterns !== undefined) {
				for (let subpattern of pattern.patterns) {
					let tokens = try_get_tokens(t, subpattern)
					if (tokens.length > 0) {
						token.tokens.push.apply(tokens, tokens)
						continue loop
					}
				}
			}

			let end_result = end.exec(t.code.substring(t.pos))
			if (end_result) {
				t.pos += end.lastIndex
				token.content = t.code.slice(begin_result.index, end_result.index)
				break
			}

			t.pos += 1
		}

		break
	}
	case pattern.include !== undefined: {
		let included = t.repo[pattern.include.substring(1)]
		if (included) {
			tokens.push.apply(tokens, try_get_tokens(t, included))
		}
		break
	}
	case pattern.patterns !== undefined: {
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

