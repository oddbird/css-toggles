import * as stylis from 'stylis'
import { toggles, toggleMachines } from './store'
import {
  toggleMachineWalker,
  togglePseudoClassWalker,
  toggleRootWalker,
  toggleTriggerWalker,
  toggleVisibilityWalker,
  toggleWalker,
  togglePseudoClassRe,
} from './walkers'

// https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements#index
const pseudoElements = [
  'after',
  'backdrop',
  'before',
  'cue',
  'cue-region',
  'first-letter',
  'first-line',
  'file-selector-button',
  'grammar-error',
  'marker',
  'placeholder',
  'selection',
  'spelling-error',
  'target-text',
]
const pseudoElementRe = RegExp(`::?(${pseudoElements.join('|')})`)

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
 *  Perform initial DOM setup for the toggle identified by `name`
 * @param {string} name
 */
function initToggle(name) {
  const { rootSelector, isNarrow, triggers, watchers, collapsibles, initialIndex } =
    toggles[name]
  toggles[name].activeIndices = {}

  // Toggle roots
  document.querySelectorAll(rootSelector).forEach((el, i) => {
    const id = `${name}-${i}`
    const elements = isNarrow ? [el] : withNextSiblings(el)
    elements.forEach(el => (el.dataset.toggleRoot = id))
    toggles[name].activeIndices[id] = initialIndex
  })

  // Toggle triggers
  triggers?.forEach(({ selector, targetState, transition }) => {
    document.querySelectorAll(selector).forEach(el => {
      el.dataset.toggleTrigger = [name, targetState, transition].join('/')
      if (['button', 'a', 'input'].includes(el.nodeName.toLowerCase())) return

      // Emulate button behavior on non-button trigger
      el.setAttribute('tabindex', 0)
      el.setAttribute('role', 'button')
      el.setAttribute('aria-pressed', false)
    })
  })

  // :toggle() selector: Remove the custom syntax and polyfill a `data-toggle`
  // attribute on the matching nodes
  watchers?.forEach(selector => {
    const baseSelector = selector
      .slice(0, selector.search(togglePseudoClassRe))
      .replace(pseudoElementRe, '')
    document.querySelectorAll(baseSelector).forEach(el => (el.dataset.toggle = ''))
  })

  // Toggle visibility
  collapsibles?.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => (el.dataset.toggleVisibility = ''))
  })
}

/**
 * Sync the DOM to the current state of a toggle
 * @param {string} domId: unique identifier of the toggle to update
 */
function renderToggle(domId) {
  const [name] = domId.split('-')
  const toggleRoot = toggles[name]
  const activeIndex = toggleRoot.activeIndices[domId]

  // Find elements that need their visibility toggled
  document
    .querySelectorAll(
      `
      [data-toggle-root="${domId}"][data-toggle-visibility],
      [data-toggle-root="${domId}"] [data-toggle-visibility]
      `
    )
    .forEach(el => {
      // Avoid interfering with other nested toggles that don't match the current one
      const closestRoot = el.closest('[data-toggle-root]')
      if (closestRoot?.dataset.toggleRoot !== domId) return
      el.dataset.toggleVisibility = activeIndex > 0 ? 'visible' : 'hidden'
    })

  // Write the toggle state on elements selected by [data-toggle]
  document
    .querySelectorAll(
      `
      [data-toggle-root="${domId}"][data-toggle],
      [data-toggle-root="${domId}"] [data-toggle]
      `
    )
    .forEach(el => {
      // Avoid interfering with other nested toggles that don't match the current one
      const closestRoot = el.closest('[data-toggle-root]')
      if (closestRoot?.dataset.toggleRoot !== domId) return
      el.dataset.toggle = `${toggleRoot.name} ${toggleRoot.states[activeIndex]}`
    })

  // Update pressed state of polyfilled triggers
  document
    .querySelectorAll(
      `
      [data-toggle-root="${domId}"][data-toggle-trigger][aria-pressed],
      [data-toggle-root="${domId}"] [data-toggle-trigger][aria-pressed]
      `
    )
    .forEach(el => {
      // Avoid interfering with other nested toggles that don't match the current one
      const closestRoot = el.closest('[data-toggle-root]')
      if (closestRoot?.dataset.toggleRoot !== domId) return
      el.setAttribute('aria-pressed', activeIndex > 0)
    })
}

/**
 * Execute all walkers on the text source of a stylesheet.
 * @param {string} sheetSrc
 * @param {string} url
 * @returns {string} transpiled source, or empty string if no transpilation is required
 */
function initStylesheet(sheetSrc, url) {
  let didReplace = false
  function walk(element) {
    if (element.type === 'comm') return

    toggleMachineWalker(element)
    didReplace |= togglePseudoClassWalker(element)
    toggleVisibilityWalker(element)
    toggleRootWalker(element)
    toggleTriggerWalker(element)
    toggleWalker(element)

    const size = (element.children || []).length
    for (let i = 0; i < size; i++) walk(element.children[i])
  }

  const cssAst = stylis.compile(sheetSrc)
  cssAst.forEach(walk)
  return didReplace ? stylis.serialize(cssAst, stylis.stringify) : ''
}

/**
 * Parse and transpile inline <style> tags
 * @param {HTMLElement} el
 */
function handleStyleTag(el) {
  const newSrc = initStylesheet(el.innerHTML)
  if (!newSrc) return
  el.innerHTML = newSrc
}

/**
 * Parse and transpile <link rel="stylesheet">
 * @param {HTMLElement} el
 */
async function handleLinkedStylesheet(el) {
  if (el.rel !== 'stylesheet') return
  const srcUrl = new URL(el.href, document.baseURI)
  if (srcUrl.origin !== location.origin) return
  const src = await fetch(srcUrl.toString()).then(r => r.text())

  const newSrc = initStylesheet(src, srcUrl.toString())
  if (!newSrc) return

  const blob = new Blob([newSrc], { type: 'text/css' })
  el.href = URL.createObjectURL(blob)
}

/**
 *  Dispatch the custom toggle event to trigger a state change and re-render
 * @param {Event} event
 */
function dispatchToggleEvent({ target }) {
  const [name, targetState, transition] = target.dataset.toggleTrigger.split('/')
  if (!name) return
  target.dispatchEvent(
    new CustomEvent('_toggleTrigger', {
      bubbles: true,
      detail: { name, targetState, transition },
    })
  )
}

/* Use a single listener for all key presses that should fire toggle events */
document.addEventListener('keydown', event => {
  const { target, key } = event
  if (!target.hasAttribute('data-toggle-trigger')) return
  if (![' ', 'Enter', 'Spacebar'].includes(key)) return
  if (['button', 'a', 'input'].includes(target.nodeName.toLowerCase())) return
  event.preventDefault()
  dispatchToggleEvent(event)
})

/* Use a single listener for all clicks that should fire toggle events */
document.addEventListener('click', event => {
  if (!event.target.hasAttribute('data-toggle-trigger')) return
  dispatchToggleEvent(event)
})

/* Handle the custom event fired by the triggers */
document.body.addEventListener('_toggleTrigger', event => {
  const { target } = event
  let { name, targetState, transition } = event.detail

  // Determine what toggle root is in scope
  const toggleRootElement = target.closest(`[data-toggle-root^="${name}-"]`)
  const domId = toggleRootElement?.dataset?.toggleRoot
  const toggleRoot = toggles[name]
  if (toggleRoot === undefined) return

  let activeIndex = toggleRoot.activeIndices[domId]
  const currentState = toggleRoot.states[activeIndex]

  // Reset all other toggles if we're on a group
  if (toggleRoot.group) {
    for (const _id of Object.keys(toggleRoot.activeIndices)) {
      toggleRoot.activeIndices[_id] = 0
      renderToggle(_id)
    }
  }

  // Let the state machine transition to the next state if applicable
  const machine = toggleMachines[toggleRoot.machine]
  if (machine !== undefined) {
    targetState = machine.states[currentState][transition]
    if (targetState === undefined) return
  }

  // Set the toggle to the target state or cycle through states
  const nextIndex = toggleRoot.states.indexOf(targetState)
  if (nextIndex === -1) {
    if (activeIndex === toggleRoot.total - 1) {
      activeIndex = toggleRoot.resetTo
    } else {
      activeIndex++
    }
  } else {
    activeIndex = nextIndex
  }

  // Render the new DOM state
  toggleRoot.activeIndices[domId] = activeIndex
  renderToggle(domId)
})

// Kick off the polyfill by parsing all inline stylesheets
document.querySelectorAll('style').forEach(handleStyleTag)

// Also parse all linked stylesheets
Promise.all([...document.querySelectorAll('link')].map(handleLinkedStylesheet)).then(
  () => {
    // Finally initialize and render the toggles to the DOM
    Object.keys(toggles).forEach(name => {
      initToggle(name)
      Object.keys(toggles[name].activeIndices).forEach(renderToggle)
    })
  }
)

// Insert styles for hidden content
document.head.insertAdjacentHTML(
  'beforeend',
  '<style>[data-toggle-visibility="hidden"] { display: none; }</style>'
)
