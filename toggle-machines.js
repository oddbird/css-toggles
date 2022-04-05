/**
 * Custom CSS parser with support for `@machine`
 * @param {string} sheetSrc: CSS source code to parse
 * @returns {[object]} List of state machine definitions
 *
 * @see https://github.com/philipwalton/polyfill/blob/master/src/modules/styles-manager.js
*/
function parseToggleMachines(sheetSrc) {
  function trim(val) {
    return (val || '').trim()
  }
  /** Opening brace */
  function open() {
    return match(/^\{\s*/)
  }

  /** Closing brace */
  function close() {
    return match(/^\}\s*/)
  }

  /** Match `re` and return captures */
  function match(re) {
    var m = re.exec(sheetSrc)
    if (!m) return
    sheetSrc = sheetSrc.slice(m[0].length)
    return m
  }

  /** Parse whitespace */
  function whitespace() {
    match(/^\s*/)
  }

  /** Parse selector */
  function selector() {
    var m = match(/^([^{]+)/)
    if (!m) return
    return trim(m[0]).split(/\s*,\s*/)
  }

  /** Parse declaration */
  function declaration() {
    // prop
    var property = match(/^(\*?[\-\w]+)\s*/)
    if (!property) return
    property = property[0]

    // :
    if (!match(/^:\s*/)) return

    // val
    var value = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)\s*/)
    if (!value) return
    value = trim(value[0])

    // ;
    match(/^[;\s]*/)

    return { property, value }
  }

  /** Parse declarations */
  function declarations() {
    var decls = []

    if (!open()) return

    // declarations
    var decl
    while (decl = declaration()) {
      decls.push(decl)
    }

    if (!close()) return
    return decls
  }

  /** Parse rule */
  function rule() {
    var sel = selector()
    if (!sel) return
    return { selectors: sel, declarations: declarations() }
  }

  /** Parse ruleset */
  function rules() {
    var node
    var rules = []
    whitespace()
    while (sheetSrc.charAt(0) != '}' && (node = rule())) {
      rules.push(node)
    }
    return rules
  }

  /** Parse our custom `@machine` definition */
  function machine() {
    var m = match(/^@machine *([^{]+)/)
    if (!m) return
    var machine = trim(m[1])

    if (!open()) return
    const statesAsStyles = rules()
    if (!close()) return

    const states = {}
    statesAsStyles.forEach(rule => {
      const machineName = rule.selectors[0]
      states[machineName] = Object.fromEntries(
        rule.declarations.map(decl => [decl.property, decl.value])
      )
    })

    return { machine, states }
  }

  let node
  const machineList = []
  whitespace()
  while (sheetSrc.charAt(0) != '}' && (node = machine() || rule())) {
    if (node.machine) machineList.push(node)
  }
  return machineList
}
