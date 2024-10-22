import * as onigtojs from 'oniguruma-to-js'

/**
@param   {string} str 
@returns {string} */
export function convert_regex_str(str) {	
	return onigtojs.onigurumaToRegexp(str, {
		flags: 'ydm',
		ignoreContiguousAnchors: true,
	}).source
}

/**
@param   {string} key 
@returns {boolean} */
function is_regex_key(key) {
	return key === 'match' ||
	       key === 'begin' ||
	       key === 'end'
}

/**
Recursively converts oniguruma regexes to JS regexes in the JSON object.
@param {Object|Array<*>} json_obj
*/
export function convert_grammar(json_obj) {

	if (Array.isArray(json_obj)) {
		for (let item of json_obj) {
			convert_grammar(item)
		}
	} else if (typeof json_obj === 'object' && json_obj !== null) {

		for (let [key, value] of Object.entries(json_obj)) {

			if (is_regex_key(key) && typeof value === 'string') {
				// @ts-expect-error
				json_obj[key] = convert_regex_str(value)
			} else {
				convert_grammar(value)
			}
		}
	}
}
