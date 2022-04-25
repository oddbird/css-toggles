import { toggleMachines, createToggleRoots, createToggleTriggers } from './store'

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
const togglePseudoClassRe = /:toggle\((?<name>[\w-]+) *(?<value>[\w-]*)\)/
const toggleVisibilityRe = /toggle *(?<name>[\w-]+)/

/**
 * Parse `@machine` at-rules and convert them to machine objects
 * @param {stylis Element} element
 */
export function toggleMachineWalker(element) {
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
export function togglePseudoClassWalker(element) {
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
export function toggleVisibilityWalker(element) {
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
export function toggleRootWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-root')) return
  createToggleRoots(element.children, element.parent.value)
}

/**
 * Parse declarations that use the `toggle-trigger` property and initialize trigger logic.
 * @param {stylis Element} element
 */
export function toggleTriggerWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-trigger')) return
  createToggleTriggers(element.children, element.parent.value)
}

/**
 * Parse declarations that use the `toggle` shorthand property and initialize roots and triggers.
 * @param {stylis Element} element
 */
export function toggleWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle')) return
  const selectors = element.parent.value
  const ruleValue = element.children
  createToggleRoots(ruleValue, selectors)
  createToggleTriggers(ruleValue, selectors)
}
