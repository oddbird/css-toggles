import {
  toggleMachines,
  createToggleRoots,
  createToggleTriggers,
  updateToggle,
  toggles,
} from './store'

export const togglePseudoClassRe = /:toggle\((?<name>[\w-]+) *(?<value>[\w-]*)\)/
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
 * Parse and mutate rules that use a `:toggle()` pseudoclass. Add matching
 * elements to a list of "watchers".
 * @param {stylis Element} element
 * @returns {bool} indicates if the AST was mutated and transpilation is
 * required
 */
export function togglePseudoClassWalker(element) {
  if (element.type !== 'rule') return

  let didReplace = false
  element.props = element.props.map(selector => {
    const { name, value } = togglePseudoClassRe.exec(selector)?.groups || {}
    if (!name) return selector

    const currentWatchers = toggles[name]?.watchers || []
    updateToggle(name, {
      watchers: [...currentWatchers, selector],
    })

    // Mutate the AST to convert the pseudoclass into `data-toggle` selector
    let replacement
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
 * Parse declarations that use the `toggle-visibility` property and add them to
 * a list of "collapsibles"
 * @param {stylis Element} element
 */
export function toggleVisibilityWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-visibility')) return
  const { name } = toggleVisibilityRe.exec(element.children).groups
  if (name === undefined) return

  const currentCollapsibles = toggles[name]?.collapsibles || []
  updateToggle(name, {
    collapsibles: [...currentCollapsibles, ...element.parent.props],
  })
}

/**
 * Parse declarations that use the `toggle-root` property and create toggle root
 * records.
 * @param {stylis Element} element
 */
export function toggleRootWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-root')) return
  createToggleRoots(element.children, element.parent.value)
}

/**
 * Parse declarations that use the `toggle-trigger` property and initialize
 * trigger logic.
 * @param {stylis Element} element
 */
export function toggleTriggerWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle-trigger')) return
  createToggleTriggers(element.children, element.parent.value)
}

/**
 * Parse declarations that use the `toggle` shorthand property and initialize
 * roots and triggers.
 * @param {stylis Element} element
 */
export function toggleWalker(element) {
  if (!(element.type === 'decl' && element.props === 'toggle')) return
  const selector = element.parent.value
  const ruleValue = element.children

  createToggleRoots(ruleValue, selector)

  // In shorthand mode pass only the toggle name to the trigger as the rest of
  // the rule value should not be parsed
  const [toggleName] = ruleValue.split(' ')
  createToggleTriggers(toggleName, selector)
}
