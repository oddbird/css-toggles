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
  /(do[ (](?<transition>[\w-]+)\)?)?/, // Transition name wrapped in `do()` (optional)
  /(?<targetState>[\w-]*)/, // Target state name (optional)
])

let counter = 0
const uid = () => counter++

export const toggleRoots = {}
export const toggleMachines = {}

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
export function createToggleRoots(ruleValue, selectors) {
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
export function createToggleTriggers(ruleValue, selectors) {
  const { name, targetState, transition } = toggleTriggerRe.exec(ruleValue).groups
  if (name === undefined) return

  const dispatchToggleEvent = ({ target }) => {
    target.dispatchEvent(
      new CustomEvent('_toggleTrigger', {
        bubbles: true,
        detail: { toggleRoot: name, targetState, transition },
      })
    )
  }

  function handleKeyDown(event) {
    if (![' ', 'Enter', 'Spacebar'].includes(event.key)) return
    event.preventDefault()
    dispatchToggleEvent(event)
  }

  document.querySelectorAll(selectors).forEach(el => {
    el.dataset.toggleTrigger = ''
    el.addEventListener('click', dispatchToggleEvent)
    if (['button', 'a', 'input'].includes(el.nodeName.toLowerCase())) return

    // Emulate button behavior on non-button trigger
    el.addEventListener('keydown', handleKeyDown)
    el.setAttribute('tabindex', 0)
    el.setAttribute('role', 'button')
    el.setAttribute('aria-pressed', false)
  })
}
