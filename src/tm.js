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

/**
 * @typedef  {object}     Tokenizer
 * @property {string}     code
 * @property {number}     pos
 * @property {Repository} repo
 */

/**
 * @typedef  {object}  Token
 * @property {string}  content
 * @property {Token[]} tokens
 * @property {string}  scope
 */

/**
 * @param   {string}  code 
 * @param   {Grammar} grammar
 * @returns {Token[]} */
export function code_to_tokens(code, grammar) {

	/** @type {Tokenizer} */
	let t = {
		code: code,
		pos : 0,
		repo: grammar.repository,
	}

	/** @type {Token[]} */
	let tokens = []

	loop: while (t.pos < t.code.length) {
		for (const pattern of grammar.patterns) {
			let tokens = try_get_tokens(t, pattern)
			if (tokens.length > 0) {
				tokens.push.apply(tokens, tokens)
				continue loop
			}
		}
		t.pos += 1
	}

	return tokens
}

/**
 * @param   {Tokenizer} t
 * @param   {Pattern}   pattern
 * @returns {Token[]}   */
function try_get_tokens(t, pattern) {
	/** @type {Token[]} */
	let tokens = []

	switch (true) {
	case pattern.match !== undefined:
		let match = new RegExp(pattern.match, "y")
		match.lastIndex = t.pos
		let result = match.exec(t.code)
		if (result === null) break
	
		t.pos = match.lastIndex
		tokens.push({ content: result[0], tokens: [], scope: pattern.name || "" })
		break
	case pattern.begin !== undefined && pattern.end !== undefined:
		let begin = new RegExp(pattern.begin, "y")
		begin.lastIndex = t.pos
		let begin_result = begin.exec(t.code)
		if (begin_result === null) break
	
		t.pos = begin.lastIndex
		let end = new RegExp(pattern.end, "y")
		end.lastIndex = t.pos
	
		let end_result = end.exec(t.code)
		if (!end_result) break

		let content = t.code.slice(t.pos, end_result.index)
		tokens.push({ content, tokens: [], scope: pattern.name || "" })
		t.pos = end.lastIndex
		// while (true) {
		// }
		break
	case pattern.include !== undefined:
		let included = t.repo[pattern.include.substring(1)]
		if (included) {
			tokens.push.apply(tokens, try_get_tokens(t, included))
		}
		break
	case pattern.patterns !== undefined:
		for (const subpattern of pattern.patterns) {
			let subtokens = try_get_tokens(t, subpattern)
			tokens.push.apply(tokens, subtokens)
		}
		break
	}

	return tokens
}

