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

/** Stores the global toggle definitions and state  */
export const toggles = {}
/** Stores the global state machine definitions  */
export const toggleMachines = {}

/**
 * Update a toggle by name, merging keys and creating the record if necessary
 */
export function updateToggle(name, config) {
  const obj = toggles[name] || { name }
  toggles[name] = Object.assign(obj, config)
}

/**
 * Create a new toggle record with a root selector.
 * @param {string} ruleValue: value of the `toggle-root` or `toggle` rule
 * @param {string} selector: CSS selector of elements to be used as roots
 */
export function createToggleRoots(ruleValue, selector) {
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

  let initialIndex = states.indexOf(initial)
  if (initialIndex === -1) initialIndex = states.indexOf(at)
  if (initialIndex === -1) initialIndex = 0

  let resetTo = 0
  if (modifiers.includes('linear')) resetTo = total - 1
  if (modifiers.includes('sticky')) resetTo = 1

  updateToggle(name, {
    resetTo,
    group,
    isNarrow,
    total,
    states,
    machine,
    initialIndex,
    strict: Boolean(strict),
    rootSelector: selector,
  })
}

/**
 * Add triggers to a toggle record.
 * @param {string} ruleValue: value of the `toggle-trigger` rule
 * @param {string} selector: CSS selector of elements to be used as triggers
 */
export function createToggleTriggers(ruleValue, selector) {
  const { name, targetState, transition } = toggleTriggerRe.exec(ruleValue).groups
  if (name === undefined) return

  const currentTriggers = toggles[name]?.triggers || []
  updateToggle(name, {
    triggers: [...currentTriggers, { selector, targetState, transition }],
  })
}
