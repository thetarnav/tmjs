import * as fs      from 'fs'
import * as convert from './src/convert_tm_to_js.js'

/**
@param {string} input_filename 
@param {string} output_filename
*/
function convert_json_file(input_filename, output_filename) {

	let file_content = fs.readFileSync(input_filename, 'utf-8')
	let json_obj = JSON.parse(file_content)

	convert.convert_grammar(json_obj)

	fs.writeFileSync(output_filename, JSON.stringify(json_obj, null, '\t'))
}

const [inputFile, outputFile] = process.argv.slice(2)

if (!inputFile || !outputFile) {
	console.log('Usage: node convert_tm_to_js.js <input_file> <output_file>')
	process.exit(1)
}

convert_json_file(inputFile, outputFile)
