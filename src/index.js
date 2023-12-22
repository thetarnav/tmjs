import * as shikiji from 'shikiji'

const SRC_PATH = 'src/'

/** @type {Promise<string>} */
const code_promise = fetch(SRC_PATH + 'sample.odin').then(res => res.text())

/** @type {Promise<shikiji.ThemeRegistration>} */
const theme_promise = fetch(SRC_PATH + 'theme.json').then(res => res.json())

const root = document.getElementById('root')
if (!root) throw new Error('Root el not found')

const code = await code_promise
const theme = await theme_promise

const highlighter = await shikiji.getHighlighter({
    themes: [theme],
    langs: [],
})

/**
 * @returns {Promise<void>}
 */
const update = async () => {
    /** @type {shikiji.LanguageRegistration} */
    const lang = await fetch(SRC_PATH + 'odin.tmLanguage.json').then(res => res.json())
    await highlighter.loadLanguage(lang)

    const html = highlighter.codeToHtml(code, {
        lang: lang.name,
        theme: theme.name,
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
