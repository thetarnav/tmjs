import * as shikiji from 'shikiji'

const root = document.getElementById('root')
if (!root) throw new Error('Root el not found')

const highlighter = await shikiji.getHighlighter({
    themes: ['nord'],
    langs: [],
})

/** @type {Promise<string>} */
const code_promise = fetch('./sample.odin').then(res => res.text())

/**
 * @returns {Promise<void>}
 */
const update = async () => {
    /** @type {shikiji.LanguageRegistration} */
    const lang = await fetch('./odin.tmLanguage.json').then(res => res.json())
    const code = await code_promise

    await highlighter.loadLanguage(lang)

    const html = highlighter.codeToHtml(code, {
        lang: lang.name,
        theme: 'nord',
    })

    root.innerHTML = html
}

update()

window.addEventListener('keydown', e => {
    if (e.key === 'r') {
        e.preventDefault()
        root.innerHTML = 'Loading...'
        update()
    }
})
