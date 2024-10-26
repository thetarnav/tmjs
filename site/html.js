


/**
@typedef  {object} Props
@property {string} [class]
*/

/**
@typedef  {Node | string | (Node | string)[]} Children
*/

/**
@typedef {{
	<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props, children?: Children): HTMLElementTagNameMap[K],
    (tag: string, props?: Props, children?: Children): HTMLElement,
}} Create_Element
*/

/**
@param   {string} tag 
@param   {Props}  [props]
@param   {Children} [children]
@returns {HTMLElement} */
function _el(tag, props, children) {
	let el = document.createElement(tag)

	if (props && props.class !== undefined) {
		el.className = props.class
	}

	if (children) {
		if (Array.isArray(children)) {
			el.append(...children)
		} else {
			el.append(children)
		}
	}

	return el
}
export const el = /** @type {Create_Element} */(_el)

/**
@param   {Props}  [props]
@param   {Children} [children]
@returns {HTMLDivElement} */
export function div(props, children) {return el('div', props, children)}

/**
@param   {Props}  [props]
@param   {Children} [children]
@returns {HTMLSpanElement} */
export function span(props, children) {return el('span', props, children)}
