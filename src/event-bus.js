import Vue from 'vue'
const eb = new Vue()

/**
 * Init global msg exchange
 */
export function InitMsgHandling(state, actions) {
  // Handle messages from other parts of extension.
  browser.runtime.onMessage.addListener(msg => {
    if (!msg.name && !msg.action) return
    if (msg.windowId !== undefined && msg.windowId !== state.windowId) return
    if (msg.instanceType !== undefined && msg.instanceType !== state.instanceType) return

    // Emit
    if (msg.name) eb.$emit(msg.name, msg.arg)

    // Run action
    if (msg.action && actions[msg.action]) {
      let args = msg.args || []
      if (msg.injectState) args.unshift(state)
      if (msg.arg) args.push(msg.arg)
      actions[msg.action](...args)
    }
  })
}

export default eb