import { El } from './el.js'


class Debug extends El {

  static {
    const _notify = El.notify
    const _dep = El.dep

    El.notify = function(...args) {
      console.log("el.notify", ...args)
      return _notify(...args)
    }

    El.dep = function(path) {
      if (!El._contextId) return true
      try { var _prev = El.deps[path][El._contextId] } catch {}
      const value = _dep(path);
      try { var _new = El.deps[path][El._contextId] } catch {}
      if (_prev != _new && _new) {
        console.log("el.dep", El._contextId, path)
      }
      return value
    }
  }

  constructor() {
    super()
    const _render = this.render.bind(this)
    this.render = function(html) {
      console.log('el.render', this.tagName, this.getAttribute('key'))
      return _render(html)
    }
  }
}

export { Debug as El }
