class El extends HTMLElement {
  constructor() {
    super()
    this._id = `${this.tagName}:${this.getAttribute('key') || Math.random().toString(36).slice(2)}`
    El.els = El.els || {}
    El.stash = El.stash || {}
    El.tags = El.tags || {}
    El.keys = El.keys || new WeakMap
    El.style = El.style || El.importStyle()
    El.styles = El.styles || {};
    this.$html = this.$html.bind(this)
  }
  connectedCallback() {
    this.created && !this._created && this.created()
    this._created = true
    El.els[this._id] = this
    this._update()
    this.mounted && this.mounted()
    if (El.tags[this.tagName] && !this.getAttribute('key'))
      console.warn(`Each ${this.tagName} should have a unique \`key\` attribute`);
    El.tags[this.tagName] = true;
  }
  disconnectedCallback() {
    this.unmounted && this.unmounted()
  }
  _update() {
    El._contextId = this._id
    this._unstash()
    const html = this.render(this.$html);
    const shadow = this.shadowRoot || this.attachShadow({mode: 'open'})
    El.styles[this.tagName] = El.styles[this.tagName] ||
      `<link rel="stylesheet" href="data:text/css;base64,${btoa(El.style + (this.css && El.zcss(this.css())) || '')}">`
    El.morph(shadow, document.createRange().createContextualFragment(El.styles[this.tagName] + html))
    this._unstash()
    El._contextId = null
  }
  _unstash() {
    for (const el of [...(this.shadowRoot||this).querySelectorAll('*'), this])
      for (const attr of el.attributes)
        if (attr.value in El.stash) el[attr.name] = El.stash[attr.value]
  }
  get $refs() {
    return new Proxy({}, { get: (obj, key) => this.shadowRoot.querySelector(`[ref="${key}"]`)
  }
  $watch(_, fn) {
    if (!El.dep._path) return;
    El.deps[El.dep._path] = El.deps[El.dep._path] || {};
    El.deps[El.dep._path][Math.random()] = fn;
    El.dep._path = null;
  }
  $observable() {
    return El.observable(...arguments);
  }
  $html(strings, ...vals) {
    for (const [i] of strings.entries()) {
      if (vals[i] instanceof Array) vals[i] = vals[i].join('')
      if ((typeof vals[i]).match(/object|function/) && strings[i].endsWith('=')) {
        vals[i] = typeof vals[i] == 'function' ? vals[i].bind(this) : vals[i]
        const key = El.keys.get(vals[i].__target__ || vals[i]) || 'el:' + Math.random().toString(36).slice(2)
        El.keys.set(vals[i].__target__ || vals[i], key)
        El.stash[key] = vals[i]
        vals[i] = JSON.stringify(key)
      }
    }
    function v(x) { return x || x === 0 ? x : '' }
    return strings.map((s, i) => [s, v(vals[i])].join``).join``
  }
  static importStyle() {
    let src = ''
    for (const el of document.querySelectorAll('style, link[rel="stylesheet"]'))
      src += el.tagName == 'STYLE' ? el.innerHTML : `\n@import url(${el.href});\n`
    return src;
  }
  static notify(path) {
    for (const id in El.deps[path] || {})
      setTimeout(_ => El.deps[path][id]())
  }
  static dep(path) {
    El.deps = El.deps || {};
    El.dep._path = !El._contextId && path
    if (!El._contextId) return
    const contextId = El._contextId
    El.deps[path] = El.deps[path] || {}
    El.deps[path][El._contextId] = _ => El.els[contextId]._update()
    return true
  }
  static observable(x, path=Math.random().toString(36).slice(2)) {
    if (typeof x != 'object') {
      El.dep(path);
      return x;
    }
    return new Proxy(x, {
      set(x, key) {
        setTimeout(El.notify(path + '/' + key));
        return Reflect.set(...arguments);
      },
      get(x, key) {
        return x.__target__ ? x[key]
          : typeof key == "symbol" ? Reflect.get(...arguments)
          : (key in x.constructor.prototype && El.dep(path + '/' + key)) ? x[key]
          : (key == '__target__') ? x
          : El.observable(x[key], path + '/' + key);
      }
    });
  }
  static morph(l, r) {
    let ls = 0, rs = 0, le = l.childNodes.length, re = r.childNodes.length
    const lc = [...l.childNodes], rc = [...r.childNodes]
    const content = e => e.nodeType == 3 ? e.textContent : e.nodeType == 1 ? e.outerHTML : ''
    const key = e => e.nodeType == 1 && customElements.get(e.tagName.toLowerCase()) && e.getAttribute('key') || NaN

    for (const a of r.attributes || [])
      if (l.getAttribute(a.name) != a.value) l.setAttribute(a.name, a.value)
    for (const a of l.attributes || [])
      if (!r.hasAttribute(a.name)) l.removeAttribute(a.name)

    while (ls < le || rs < re) {
      if (ls == le) l.insertBefore(lc.find(l => key(l) == key(rc[rs])) || rc[rs], lc[ls]) && rs++
      else if (rs == re) l.removeChild(lc[ls++])
      else if (content(lc[ls]) == content(rc[rs])) ls++ & rs++
      else if (content(lc[le-1]) == content(rc[re-1])) le-- & re--
      else if (lc[ls] && rc[rs].children) El.morph(lc[ls++], rc[rs++])
      else lc[ls++].replaceWith(rc[rs++])
    }
  }
  static zcss(src) {
    const lines = [], stack = []
    let open, opened, close
    for (const line of src.split('\n')) {
      if (line.match(/^\s*@[msdk].*\{/)) {
        opened && lines.push('}');
        opened = open = close = false;
        lines.push(line)
      } else if (line.match(/\{\s*$/)) {
        open = true
        stack.push(line.replace('{','').trim())
      } else if (line.match(/\s*\}\s*$/)) {
        close = true
        if (!stack.pop()) lines.push('}')
      } else {
        if (!line.trim()) continue
        if (opened && (open || close)) {
          opened = close = false
          lines.push('}')
        }
        if (open || close) {
          opened = true
          open = false
          lines.push(stack.join(' ').replace(' &', '') + '{')
        }
        lines.push(line)
      }
    }
    if (close) lines.push('}')
    return lines.join('\n')
  }
}

export default El;
