/**
 * See https://css.oddbird.net/toggles/explainer/
 *
 * DONE
 * - `toggle-root` property
 * - `toggle` shorthand property
 * - `toggle-trigger` property
 * - `toggle-visibility` property
 * - Should elements with `toggle-visibility` be hidden on load if the state is 0? YES
 * - toggle modes (default, sticky, linear)
 * - wide and narrow scopes
 * - `@machine` definitions
 * - Don't break CSS parsing after `@machine`
 * - Transpile `:toggle()`
 *
 * TODO
 * - Do something with machine(***, strict)
 * - `toggle-group`
 * - support dynamically added elements
 * - preserve url() definitions when transpiling
 * - decouple from CSS rule order (rely only on markup)
 */
import * as stylis from 'stylis'

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
].join('|')
const pseudoElementRe = RegExp(`::?(${pseudoElements})`)

/** Build a regex from an array of parts */
const makeRegex = (parts, opts) => RegExp(parts.map(p => p.source).join(''), opts)

const toggleRootRe = makeRegex([
  /(?<name>[\w-]+)/, // Toggle root name
  / */, // Whitespace
  /((?<initial>\d+)\/)?/, // Initial state: Integer followed by slash (optional)
  /(?<numActive>\d*)?/, // Number of active states (optional)
  /(\[(?<states>.+)\])?/, // List of named states enclosed in [] (optional)
  / */, // Whitespace
  /(at +(?<at>[\w-]+))?/, // Literal 'at' followed by initial state (optional)
  / */, // Whitespace
  /(?<modifiers>.*)/, // Anything else (optional)
])
const toggleRootMachineRe = makeRegex([
  /((?<name>[\w-]+) +)?/, // Toggle root name (optional)
  /(machine\((?<machine>[\w-]+)(?<strict> *, *strict)?\))/, // State machine name
  / */, // Whitespace
  /(at +(?<at>[\w-]+))?/, // Literal 'at' followed by initial state (optional)
  / */, // Whitespace
  /(?<modifiers>.*)/, // Anything else (optional)
])
const toggleTriggerRe = makeRegex([
  /(?<name>[\w-]+)/, // Target toggle root
  / */, // Whitespace
  /(do[ \(](?<transition>[\w-]+)\)?)?/, // Transition name wrapped in `do()` (optional)
  /(?<targetState>[\w-]*)/, // Target state name (optional)
])
const toggleVisibilityRe = /toggle *(?<name>[\w-]+)/
const togglePseudoClassRe = /:toggle\((?<name>[\w-]+) *(?<value>[\w-]*)\)/

let counter = 0
const uid = () => counter++

const toggleRoots = {}
const toggleMachines = {}

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
 * @param {string} ruleValue: value of the `toggle-root` or `toggle` rule
 * @param {string} selectors: CSS selector of elements to be used as roots
 */
function createToggleRoots(ruleValue, selectors) {
  const regex = ruleValue.includes('machine(') ? toggleRootMachineRe : toggleRootRe
  let { name, machine, strict, initial, numActive, states, at, modifiers } =
    regex.exec(ruleValue).groups
  name = name || machine
  if (name === undefined) return

  let total
  const machineDef = toggleMachines[machine]
  if (machineDef !== undefined) {
    states = Object.keys(machineDef.states)
    total = states.length
  } else if (states !== undefined) {
    states = states.split(/ +/)
    total = states.length
  } else {
    total = parseInt(numActive || 1) + 1
    states = [...Array(total).keys()].map(String)
  }

  modifiers = modifiers?.split(/ +/) || []
  const group = modifiers.includes('group')
  const isNarrow = modifiers.includes('self')

  let activeIndex = states.indexOf(initial)
  if (activeIndex === -1) activeIndex = states.indexOf(at)
  if (activeIndex === -1) activeIndex = 0

  let resetTo = 0
  if (modifiers.includes('linear')) resetTo = total - 1
  if (modifiers.includes('sticky')) resetTo = 1

  const config = {
    name,
    resetTo,
    group,
    isNarrow,
    total,
    states,
    machine,
    activeIndex,
    strict: Boolean(strict),
  }

  document.querySelectorAll(selectors).forEach(el => {
    const id = `${name}-${uid()}`
    const elements = isNarrow ? [el] : withNextSiblings(el)
    elements.forEach(el => (el.dataset.toggleRoot = id))
    toggleRoots[id] = { ...config }
  })
}

/**
 * Create toggle triggers for all elements matching `selectors`.
 * On click the elements will dispatch a custom `toggle` event
 * @param {string} ruleValue: value of the `toggle-trigger` rule
 * @param {string} selectors: CSS selector of elements to be used as triggers
 */
function createToggleTriggers(ruleValue, selectors) {
  const { name, targetState, transition } = toggleTriggerRe.exec(ruleValue).groups
  if (name === undefined) return

  const dispatchToggleEvent = ({ target }) => {
    target.dispatchEvent(
      new CustomEvent('toggle', {
        bubbles: true,
        detail: { toggleRoot: name, targetState, transition },
      })
    )
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
      el.dataset.toggleVisibility = toggleRoot.activeIndex > 0 ? 'visible' : 'hidden'
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
      el.dataset.toggle = `${toggleRoot.name} ${
        toggleRoot.states[toggleRoot.activeIndex]
      }`
    })
}

/**
 * Parse `@machine` at-rules and convert them to machine objects
 * @param {stylis Element} element
 */
function toggleMachineWalker(element) {
  const name = (element.props || [])[0]
  if (!(element.type === '@machine' && name)) return

  const states = {}
  element.children
    .filter(child => child.type === 'rule')
    .forEach(rule => {
      states[rule.value] = Object.fromEntries(
        rule.children
          .filter(child => child.type === 'decl')
          .map(decl => [decl.props, decl.children])
      )
    })
  toggleMachines[name] = { name, states }
}

/**
 * Parse and mutate rules that use a `:toggle()` pseudoclass.
 * @param {stylis Element} element
 * @returns {bool} indicates if the AST was mutated and transpilation is required
 */
function togglePseudoClassWalker(element) {
  if (element.type !== 'rule') return

  let didReplace = false
  element.props = element.props.map(selector => {
    if (!selector.match(togglePseudoClassRe)) return selector

    // Set up `data-toggle` attribute on the selected nodes to polyfill behavior
    const baseSelector = selector
      .slice(0, selector.search(togglePseudoClassRe))
      .replace(pseudoElementRe, '')
    document.querySelectorAll(baseSelector).forEach(el => (el.dataset.toggle = ''))

    // Mutate the AST to convert the pseudoclass into `data-toggle` selector
    let replacement
    const { name, value } = togglePseudoClassRe.exec(selector).groups
    if (value) {
      replacement = `[data-toggle="${name} ${value}"]`
    } else {
      // Flexible selector that should match any non-zero state
      replacement = `[data-toggle^="${name} "]:not([data-toggle="${name} 0"])`
    }
    didReplace = true
    return selector.replace(togglePseudoClassRe, replacement)
  })

  return didReplace
}

/**
 * Parse declarations that use the `toggle-visibility` property and set the
 * `data-toggle-visibility` attribute
 * @param {stylis Element} element
 */
function toggleVisibilityWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-visibility')) return
  const { name } = toggleVisibilityRe.exec(element.children).groups
  if (name === undefined) return

  document.querySelectorAll(element.parent.value).forEach(el => {
    el.dataset.toggleVisibility = ''
  })
}

/**
 * Parse declarations that use the `toggle-root` property and create toggle root records.
 * @param {stylis Element} element
 */
function toggleRootWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-root')) return
  createToggleRoots(element.children, element.parent.value)
}

/**
 * Parse declarations that use the `toggle-trigger` property and initialize trigger logic.
 * @param {stylis Element} element
 */
function toggleTriggerWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-trigger')) return
  createToggleTriggers(element.children, element.parent.value)
}

/**
 * Parse declarations that use the `toggle` shorthand property and initialize roots and triggers.
 * @param {stylis Element} element
 */
function toggleWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle')) return
  const selectors = element.parent.value
  const ruleValue = element.children
  createToggleRoots(ruleValue, selectors)
  createToggleTriggers(ruleValue, selectors)
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
document.body.addEventListener('toggle', event => {
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
    for (let _id of Object.keys(toggleRoots)) {
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
    if (toggleRoot.activeIndex == toggleRoot.total - 1) {
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
