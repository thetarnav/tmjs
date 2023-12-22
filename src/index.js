import * as shikiji from 'shikiji'

const SRC_PATH = 'src/'
const THEME_PATH = SRC_PATH + 'theme.json'
const LANG_PATH = SRC_PATH + 'odin.tmLanguage.json'
const CODE_PATH = SRC_PATH + 'sample.odin'

/**
 * @returns {Promise<string>}
 */
function fetchCode() {
	return fetch(CODE_PATH).then(res => res.text())
}
/**
 * @returns {Promise<shikiji.ThemeRegistration>}
 */
function fetchTheme() {
	return fetch(THEME_PATH).then(res => res.json())
}
/**
 * @returns {Promise<shikiji.LanguageRegistration>}
 */
function fetchLang() {
	return fetch(LANG_PATH).then(res => res.json())
}

const code_promise = fetchCode()
const theme_promise = fetchTheme()

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
	const lang = await fetchLang()
	await highlighter.loadLanguage(lang)

	const html = highlighter.codeToHtml(code, {
		lang: lang.name,
		theme: theme.name,
	})
	root.innerHTML = html

	const scroll_str = sessionStorage.getItem('scroll_position')
	const scroll = scroll_str ? parseInt(scroll_str) : 0
	window.scrollTo(0, scroll)
}

update()

window.addEventListener('keydown', e => {
	if (e.key === 'r') {
		e.preventDefault()
		update()
	}
})

window.addEventListener('beforeunload', () => {
	const scroll = window.scrollY || document.documentElement.scrollTop
	const str = scroll.toString()
	sessionStorage.setItem('scroll_position', str)
})
