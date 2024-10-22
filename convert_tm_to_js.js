import * as fs       from 'fs'
import * as onigtojs from 'oniguruma-to-js'

/**
@param   {string} str 
@returns {string} */
function convert_regex_str(str) {	
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
function convert_json_regexes(json_obj) {

	if (Array.isArray(json_obj)) {
		for (let item of json_obj) {
			convert_json_regexes(item)
		}
	} else if (typeof json_obj === 'object' && json_obj !== null) {

		for (let [key, value] of Object.entries(json_obj)) {

			if (is_regex_key(key) && typeof value === 'string') {
				// @ts-expect-error
				json_obj[key] = convert_regex_str(value)
			} else {
				convert_json_regexes(value)
			}
		}
	}
}

/**
@param {string} input_filename 
@param {string} output_filename
*/
function convert_json_file(input_filename, output_filename) {

	let file_content = fs.readFileSync(input_filename, 'utf-8')
	let json_obj = JSON.parse(file_content)

	convert_json_regexes(json_obj)

	fs.writeFileSync(output_filename, JSON.stringify(json_obj, null, '\t'))
}

const [inputFile, outputFile] = process.argv.slice(2)

if (!inputFile || !outputFile) {
	console.log('Usage: node convert_tm_to_js.js <input_file> <output_file>')
	process.exit(1)
}

convert_json_file(inputFile, outputFile)
