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

/**
 * @typedef  {object}              Tokenizer
 * @property {string}              code
 * @property {Repository}          repo
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
	/** @type {Token[]} */ let tokens = new Array(code.length)

	/** @type {Tokenizer} */
	let t = {
		code    : code,
		pos_char: 0,
		pos_line: 0,
		repo    : grammar.repository,
		tokens  : tokens,
		len     : 0,
	}

	/** @type {string[]} */ let source_scopes = [grammar.scopeName]

	loop: while (t.pos_char < t.code.length)
	{
		for (const pattern of grammar.patterns) {
			let count = pattern_to_tokens(t, pattern, source_scopes)
			if (count > 0) continue loop
		}
		
		increse_pos(t, 1)
	}

	return tokens.slice(0, t.len)
}

/**
 * @param   {Tokenizer}            t
 * @param   {RegExp}               match
 * @param   {Captures | undefined} captures
 * @param   {string[]}             pattern_scopes
 * @returns {number}               */
function match_token_with_captures(t, match, captures, pattern_scopes)
{
	let pos_token = t.pos_char
	match.lastIndex = pos_token - t.pos_line
	let result = match.exec(t.code.slice(t.pos_line))
	if (result === null) return 0

	increse_pos(t, result[0].length)

	if (captures === undefined)
	{
		/** @type {Token} */ let token = {
			content: result[0],
			scopes : pattern_scopes,
		}
		t.tokens[t.len] = token
		t.len += 1
		return 1
	}

	if (result.length === 1)
	{
		/** @type {Token} */ let token = {
			content: result[0],
			scopes : pattern_scopes,
		}
		if (captures[0] !== undefined) token.scopes.push(captures[0].name)
		t.tokens[t.len] = token
		t.len += 1
		return 1
	}

	let tokens_count = 0
	let last_end = 0
	
	for (let key = 1; key < result.length; key += 1)
	{
		let group   = result[key]
		let indices = /** @type {RegExpIndicesArray} */(result.indices)[key]
		if (indices === undefined) continue
		let [pos, end] = indices

		// text between captures
		if (pos > last_end) {
			/** @type {Token} */ let subtoken = {
				content: t.code.slice(pos_token + last_end, pos_token + pos),
				scopes : pattern_scopes,
			}
			t.tokens[t.len] = subtoken
			t.len += 1
			tokens_count += 1
		}
		last_end = end

		// capture
		/** @type {Token} */ let capture_token = {
			content: group,
			scopes : pattern_scopes,
		}
		let capture = captures[key]
		if (capture !== undefined) capture_token.scopes = capture_token.scopes.concat(capture.name)
		t.tokens[t.len] = capture_token
		t.len += 1
		tokens_count += 1
	}

	// text after last capture
	if (last_end < result[0].length)
	{
		/** @type {Token} */ let subtoken = {
			content: t.code.slice(pos_token + last_end, pos_token + result[0].length),
			scopes : pattern_scopes,
		}
		t.tokens[t.len] = subtoken
		t.len += 1
		tokens_count += 1
	}

	return tokens_count
}

/**
 * @param   {Tokenizer} t
 * @param   {Pattern}   pattern
 * @param   {string[]}  parent_scopes
 * @returns {number}    */
function pattern_to_tokens(t, pattern, parent_scopes)
{
	let pattern_scopes = pattern.name !== undefined
		? [...parent_scopes, pattern.name]
		: parent_scopes

	switch (true) {
	case pattern.match !== undefined:
	{
		let match = new RegExp(pattern.match, "yd")
		return match_token_with_captures(t, match, pattern.captures, pattern_scopes)
	}
	case pattern.begin !== undefined && pattern.end !== undefined:
	{
		// begin
		let begin_match = new RegExp(pattern.begin, "yd")
		let total_count = match_token_with_captures(t, begin_match, pattern.beginCaptures, pattern_scopes)
		if (total_count === 0) return 0

		let end_match = new RegExp(pattern.end, "yd")
		let patterns = pattern.patterns || []

		loop: while (t.pos_char < t.code.length) {
			// end
			let count = match_token_with_captures(t, end_match, pattern.endCaptures, pattern_scopes)
			if (count > 0) {
				total_count += count
				break loop
			}

			// patterns
			for (let subpattern of patterns) {
				let count = pattern_to_tokens(t, subpattern, pattern_scopes)
				if (count > 0) {
					total_count += count
					continue loop
				}
			}

			// text between patterns
			let last_token = t.tokens[t.len-1]
			if (last_token.scopes !== pattern_scopes) {
				last_token = {content: "", scopes: pattern_scopes}
				t.tokens[t.len] = last_token
				t.len += 1
				total_count += 1
			}
			last_token.content += t.code[t.pos_char]

			increse_pos(t, 1)
		}

		return total_count
	}
	case pattern.include !== undefined:
	{
		let included = t.repo[pattern.include.substring(1)]
		return included
			? pattern_to_tokens(t, included, pattern_scopes)
			: 0
	}
	case pattern.patterns !== undefined:
	{
		for (let subpattern of pattern.patterns) {
			let count = pattern_to_tokens(t, subpattern, pattern_scopes)
			if (count > 0) return count
		}
		return 0
	}
	}

	return 0
}




/**
 * @typedef  {object     } Tokenizer2
 * @property {string     } code
 * @property {Repository } repo
 * @property {Token[]    } tokens
 * @property {number     } pos_char
 * @property {number     } pos_line
 * @property {string[]   } stack_scope
 * @property {Pattern[][]} stack_patterns
 * @property {number[]   } stack_pattern_idx
 * @property {number     } stack_len
 */

/**
 * @param   {string}  code 
 * @param   {Grammar} grammar
 * @returns {Token[]} */
export function code_to_tokens2(code, grammar)
{
	/** @type {Tokenizer2} */ let t = {
		code             : code,
		repo             : grammar.repository,
		tokens           : [],
		pos_char         : 0,
		pos_line         : 0,
		stack_scope      : [grammar.scopeName],
		stack_patterns   : [grammar.patterns],
		stack_pattern_idx: [0],
		stack_len        : 1
	}

	loop: while (t.pos_char < code.length)
	{
		let patterns    = t.stack_patterns   [t.stack_len-1]
		let pattern_idx = t.stack_pattern_idx[t.stack_len-1]
		t.stack_pattern_idx[t.stack_len-1] += 1

		if (pattern_idx >= patterns.length) {
			t.stack_len -= 1
			continue loop
		}

		let pattern = patterns[pattern_idx]

		switch (true) {
		case pattern.match !== undefined:
		{
			let match = new RegExp(pattern.match, "yd")
			let pattern_tokens = match_token_with_captures2(t, match, pattern.captures, pattern.name)
			t.tokens.push.apply(t.tokens, pattern_tokens)
			break
		}
		case pattern.begin !== undefined && pattern.end !== undefined:
		{
			break
		}
		case pattern.include !== undefined:
		{
			let included = t.repo[pattern.include.substring(1)]
			if (included) {
				t.stack_patterns   [t.stack_len] = [included]
				t.stack_pattern_idx[t.stack_len] = 0
				t.stack_len += 1
			}
			break
		}
		case pattern.patterns !== undefined:
		{
			t.stack_patterns   [t.stack_len] = pattern.patterns
			t.stack_pattern_idx[t.stack_len] = 0
			t.stack_len += 1
			break
		}
		}
	}
}

/**
 * @param   {Tokenizer2}           t
 * @param   {RegExp}               match
 * @param   {Captures | undefined} captures
 * @param   {string | undefined}   scope_name
 * @returns {Token[]}              */
function match_token_with_captures2(t, match, captures, scope_name)
{
	let pos_token = t.pos_char
	match.lastIndex = pos_token - t.pos_line
	let result = match.exec(t.code.slice(t.pos_line))
	if (result === null) return []

	increse_pos(t, result[0].length)

	let pattern_scopes = t.stack_scope.slice(0, t.stack_len - 1)
	if (scope_name) pattern_scopes.push(scope_name)

	if (captures === undefined)
	{
		/** @type {Token} */ let token = {
			content: result[0],
			scopes : pattern_scopes,
		}

		return [token]
	}

	if (result.length === 1)
	{
		/** @type {Token} */ let token = {
			content: result[0],
			scopes : pattern_scopes,
		}
		if (captures[0] !== undefined) token.scopes.push(captures[0].name)

		return [token]
	}

	/** @type {Token[]} */ let tokens = []
	let last_end = 0
	
	for (let key = 1; key < result.length; key += 1)
	{
		let group   = result[key]
		let indices = /** @type {RegExpIndicesArray} */(result.indices)[key]
		if (indices === undefined) continue
		let [pos, end] = indices

		// text between captures
		if (pos > last_end) {
			/** @type {Token} */ let subtoken = {
				content: t.code.slice(pos_token + last_end, pos_token + pos),
				scopes : pattern_scopes,
			}
			tokens.push(subtoken)
		}
		last_end = end

		// capture
		/** @type {Token} */ let capture_token = {
			content: group,
			scopes : pattern_scopes,
		}
		let capture = captures[key]
		if (capture !== undefined) capture_token.scopes = capture_token.scopes.concat(capture.name)
		tokens.push(capture_token)
	}

	// text after last capture
	if (last_end < result[0].length)
	{
		/** @type {Token} */ let subtoken = {
			content: t.code.slice(pos_token + last_end, pos_token + result[0].length),
			scopes : pattern_scopes,
		}
		tokens.push(subtoken)
	}

	return tokens
}
