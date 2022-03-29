/**
 * See https://css.oddbird.net/toggles/explainer/
 *
 * DONE
 * - `toggle-root` property
 * - `toggle` shorthand property
 * - `toggle-trigger` property
 * - `toggle-visibility` property
 * - `:toggle()` selector
 * - Should elements with `toggle-visibility` be hidden on load if the state is 0? YES
 * - toggle modes (default, sticky, linear)
 * - wide and narrow scopes
 *
 * TODO
 * - `toggle-group`
 * - support dynamically added elements
 * - decouple from CSS rule order (rely only on markup)
*/
const toggleRoots = {}
const toggleRootRe = /(?<name>[\w-]+) *((?<initial>\d+)\/)?(?<total>\d*) *(?<modifiers>.*)/
const toggleTriggerRe = /(?<name>[\w-]+) *(?<targetState>\d*)/
const toggleVisibilityRe = /toggle *(?<name>[\w-]+)/

let counter = 0
const uid = () => counter++

/**
 * Strip the `[data-toggle="*"]` segment of a selector.
 * Used to determine a base selector for DOM nodes that need polyfilling
 */
const stripDataToggle = value => value.replace(/\[data-toggle=['"].*['"]\]/, '')

/**
 * Get a list of the `element` and its next siblings
 * @param {HTMLElement} element
*/
function withNextSiblings(element) {
  const siblings = [element]
  let next = element.nextElementSibling
  while (next !== null) {
    siblings.push(next)
    next = next.nextElementSibling
  }
  return siblings
}

/**
 * Create toggle root objects for all elements matching `selectors`.
 * The object keeps track of the current state
 * @param {string} name:    name of the toggle root
 * @param {int}    initial: initial state of the toggle root
 * @param {int}    total:   total states of the toggle root
 * @param {string} modifiers: additional toggle root settings (group, sticky, etc)
 * @param {string} selectors: CSS selectors of elements to be used as roots
*/
function createToggleRoots(name, initial, total, modifiers, selectors) {
  const _total = parseInt(total || 2)
  const _state = parseInt(initial || 0)
  const _modifiers = modifiers?.split(' ') || []
  const group = _modifiers.includes('group')
  const isNarrow = _modifiers.includes('self')
  let resetTo = 0
  if (_modifiers.includes('linear')) resetTo = _total - 1
  if (_modifiers.includes('sticky')) resetTo = 1
  const config = {
    name,
    resetTo,
    group,
    isNarrow,
    total: _total,
    state: _state,
  }
  document.querySelectorAll(selectors).forEach(el => {
    const id = `${name}-${uid()}`
    const elements = isNarrow ? [el] : withNextSiblings(el)
    elements.forEach(el => { el.dataset.toggleRoot = id })
    toggleRoots[id] = { ...config }
    renderToggleState(id)
  })
}

/**
 * Create toggle triggers for all elements matching `selectors`.
 * On click the elements will dispatch a custom `toggle` event
 * @param {string} name:        name of the toggle root to target
 * @param {int}    targetState: desired state
 * @param {string} selectors: CSS selectors of elements to be used as triggers
 */
function createToggleTriggers(name, targetState, selectors) {
  const dispatchToggleEvent = ({ target }) => {
    target.dispatchEvent(new CustomEvent('toggle', {
      bubbles: true,
      detail: { toggleRoot: name, targetState }
    }))
  }

  document.querySelectorAll(selectors).forEach(el => {
    el.addEventListener('click', dispatchToggleEvent)
  })
}

/**
 * Render toggle state information to the DOM
 * @param {string} toggleRootId: identifier of the toggle root to update
*/
function renderToggleState(toggleRootId) {
  const toggleRoot = toggleRoots[toggleRootId]

  // Find elements that need their visibility toggled
  document.querySelectorAll(`
     [data-toggle-root="${toggleRootId}"][data-toggle-visibility],
     [data-toggle-root="${toggleRootId}"] [data-toggle-visibility]
   `).forEach(el => {
    // Avoid interfering with other nested toggles that don't match
    // the current one
    const value = el.dataset.toggleRoot
    if (value && value !== toggleRootId) return

    el.dataset.toggleVisibility = toggleRoot.state > 0 ? 'visible' : 'hidden'
  })

  // Write the toggle state on elements selected by [data-toggle]
  document.querySelectorAll(`
     [data-toggle-root="${toggleRootId}"][data-toggle],
     [data-toggle-root="${toggleRootId}"] [data-toggle]
   `).forEach(el => {
    el.dataset.toggle = `${toggleRoot.name} ${toggleRoot.state}`
  })
}

// Insert styles for visually hidden content
const styleSheet = document.createElement('style')
styleSheet.innerHTML = `
[data-toggle-visibility='hidden']:not(:focus):not(:focus-within) {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important; /* Fix for https://github.com/twbs/bootstrap/issues/25686 */
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
`
document.head.append(styleSheet)

// Get a list of all selectors that use `data-toggle` and actually set the attribute in the DOM.
// The attribute is used instead of the `:toggle()` pseudoclass.
Polyfill({
  selectors: ['[data-toggle=',]
}).doMatched(rules => rules.each(rule => {
  let selectors = new Set(rule._rule.selectors.map(stripDataToggle))
  selectors = Array.from(selectors).join(',')
  document.querySelectorAll(selectors).forEach(el => {
    el.dataset.toggle = ''
  })
}))

// Add `data-toggle-visibility` attributes to elements that use the `toggle-visibility` property
Polyfill({
  declarations: ['toggle-visibility:*',]
}).doMatched(rules => rules.each(rule => {
  const ruleValue = rule.getDeclaration()['toggle-visibility']
  const { name } = toggleRootRe.exec(ruleValue).groups
  if (name === undefined) return

  document.querySelectorAll(rule.getSelectors()).forEach(el => {
    el.dataset.toggleVisibility = ''
  })
}))

// Polyfill toggle roots by targeting the `toggle-root` property
Polyfill({
  declarations: ['toggle-root:*']
}).doMatched(rules => rules.each(rule => {
  const ruleValue = rule.getDeclaration()['toggle-root']
  const { name, initial, total, modifiers } = toggleRootRe.exec(ruleValue).groups
  if (name === undefined) return
  createToggleRoots(name, initial, total, modifiers, rule.getSelectors())
}))

// Polyfill toggle triggers by targeting the `toggle-trigger` property
Polyfill({
  declarations: ['toggle-trigger:*']
}).doMatched(rules => rules.each(rule => {
  const ruleValue = rule.getDeclaration()['toggle-trigger']
  const { name, targetState } = toggleTriggerRe.exec(ruleValue).groups
  if (name === undefined) return
  createToggleTriggers(name, targetState, rule.getSelectors())
}))

// Polyfill the shorthand `toggle` property that configures both roots and triggers
Polyfill({
  declarations: ['toggle:*']
}).doMatched(rules => rules.each(rule => {
  const ruleValue = rule.getDeclaration()['toggle']
  const { name, initial, total, modifiers } = toggleRootRe.exec(ruleValue).groups
  if (name === undefined) return
  const selectors = rule.getSelectors()
  createToggleRoots(name, initial, total, modifiers, selectors)
  createToggleTriggers(name, undefined, selectors)
}))

// This listener does the heavy lifting by handling the custom `toggle` event fired by the triggers
document.body.addEventListener('toggle', event => {
  const { target } = event
  let { toggleRoot: name, targetState } = event.detail

  // Determine what toggle root is in scope
  const toggleRootElement = target.closest(`[data-toggle-root^="${name}-"]`)
  const id = toggleRootElement?.dataset?.toggleRoot || null
  const toggleRoot = toggleRoots[id]
  if (toggleRoot === undefined) return

  // Reset all other toggles if we're on a group
  if (toggleRoot.group) {
    for (let _id of Object.keys(toggleRoots)) {
      if (toggleRoots[_id].name === name) {
        toggleRoots[_id].state = 0
        renderToggleState(_id)
      }
    }
  }

  // Set the toggle to the target state or cycle through states
  try {
    targetState = parseInt(targetState)
  } catch (e) { }
  if (Number.isInteger(targetState)) {
    toggleRoot.state = targetState
  } else {
    if (toggleRoot.state == toggleRoot.total - 1) {
      toggleRoot.state = toggleRoot.resetTo
    } else {
      toggleRoot.state++
    }
  }

  renderToggleState(id)
})
