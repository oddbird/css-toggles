import * as stylis from 'stylis'
import { toggleRoots, toggleMachines } from './store'
import {
  toggleMachineWalker,
  togglePseudoClassWalker,
  toggleRootWalker,
  toggleTriggerWalker,
  toggleVisibilityWalker,
  toggleWalker,
} from './walkers'

/**
 * Render toggle state information to the DOM
 * @param {string} toggleRootId: identifier of the toggle root to update
 */
function renderToggleState(toggleRootId) {
  const toggleRoot = toggleRoots[toggleRootId]
  const { activeIndex } = toggleRoot

  // Find elements that need their visibility toggled
  document
    .querySelectorAll(
      `
      [data-toggle-root="${toggleRootId}"][data-toggle-visibility],
      [data-toggle-root="${toggleRootId}"] [data-toggle-visibility]
      `
    )
    .forEach(el => {
      // Avoid interfering with other nested toggles that don't match the current one
      const closestRoot = el.closest('[data-toggle-root]')
      if (closestRoot?.dataset.toggleRoot !== toggleRootId) return
      el.dataset.toggleVisibility = activeIndex > 0 ? 'visible' : 'hidden'
    })

  // Write the toggle state on elements selected by [data-toggle]
  document
    .querySelectorAll(
      `
      [data-toggle-root="${toggleRootId}"][data-toggle],
      [data-toggle-root="${toggleRootId}"] [data-toggle]
      `
    )
    .forEach(el => {
      // Avoid interfering with other nested toggles that don't match the current one
      const closestRoot = el.closest('[data-toggle-root]')
      if (closestRoot?.dataset.toggleRoot !== toggleRootId) return
      el.dataset.toggle = `${toggleRoot.name} ${toggleRoot.states[activeIndex]}`
    })

  // Update pressed state of polyfilled triggers
  document
    .querySelectorAll(
      `
      [data-toggle-root="${toggleRootId}"][data-toggle-trigger][aria-pressed],
      [data-toggle-root="${toggleRootId}"] [data-toggle-trigger][aria-pressed]
      `
    )
    .forEach(el => {
      // Avoid interfering with other nested toggles that don't match the current one
      const closestRoot = el.closest('[data-toggle-root]')
      if (closestRoot?.dataset.toggleRoot !== toggleRootId) return
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

// This listener does the heavy lifting by handling the custom `toggle` event fired by the triggers
document.body.addEventListener('_toggleTrigger', event => {
  const { target } = event
  let { toggleRoot: name, targetState, transition } = event.detail

  // Determine what toggle root is in scope
  const toggleRootElement = target.closest(`[data-toggle-root^="${name}-"]`)
  const id = toggleRootElement?.dataset?.toggleRoot || null
  const toggleRoot = toggleRoots[id]
  if (toggleRoot === undefined) return

  const currentState = toggleRoot.states[toggleRoot.activeIndex]

  // Reset all other toggles if we're on a group
  if (toggleRoot.group) {
    for (const _id of Object.keys(toggleRoots)) {
      if (toggleRoots[_id].name === name) {
        toggleRoots[_id].activeIndex = 0
        renderToggleState(_id)
      }
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
    if (toggleRoot.activeIndex === toggleRoot.total - 1) {
      toggleRoot.activeIndex = toggleRoot.resetTo
    } else {
      toggleRoot.activeIndex++
    }
  } else {
    toggleRoot.activeIndex = nextIndex
  }

  renderToggleState(id)
})

// Kick off the polyfill by parsing all inline stylesheets
document.querySelectorAll('style').forEach(handleStyleTag)

// Also parse all linked stylesheets
Promise.all([...document.querySelectorAll('link')].map(handleLinkedStylesheet)).then(
  () => {
    // Finally update the DOM to match all toggle root states
    Object.keys(toggleRoots).forEach(renderToggleState)
  }
)

// Insert styles for hidden content
document.head.insertAdjacentHTML(
  'beforeend',
  '<style>[data-toggle-visibility="hidden"] { display: none; }</style>'
)
