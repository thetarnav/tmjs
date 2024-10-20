const oniguruma = require('vscode-oniguruma')
const path = require('path')

// Load the wasm for vscode-oniguruma
const loadOniguruma = async () => {
    const wasmPath = path.join(__dirname, 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm')
    const wasmBin = require('fs').readFileSync(wasmPath).buffer
    await oniguruma.loadWASM(wasmBin)
}

/**
 * @param {string} input 
 */
const compareWhitespaceHandling = async (input) => {
    await loadOniguruma()

    // Oniguruma regular expression
    const onigRegex = new oniguruma.OnigScanner([`\\s`])
    let onigMatches = []
    let match = onigRegex.findNextMatchSync(input, 0)
    while (match) {
        onigMatches.push({ pos: match.captureIndices[0].start, text: input.slice(match.captureIndices[0].start, match.captureIndices[0].end) })
        match = onigRegex.findNextMatchSync(input, match.captureIndices[0].end)
    }

    // JS regular expression
    const jsRegex = /\s/g
    const jsMatches = []
    let jsMatch
    while ((jsMatch = jsRegex.exec(input)) !== null) {
        jsMatches.push({ pos: jsMatch.index, text: jsMatch[0] })
    }

    console.log('Input:', input)
    console.log('vscode-oniguruma \\s result:', onigMatches)
    console.log('JavaScript RegExp \\s result:', jsMatches)
}

compareWhitespaceHandling(`This is a   test with\tvarious\nspaces
and a newline`)