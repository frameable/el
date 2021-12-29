class El extends HTMLElement {
  constructor() {
    super();
    this._id = Math.random().toString(36).slice(2);
    El.els = El.els || {};
    El.els[this._id] = this;
    El.stash = El.stash || {};
    El.adoptableSheet = El.adoptableSheet || El.importStyle();
    this.created && this.created();
    this.tmpl = this.tmpl.bind(this);
    this.tmpl.each = (arr, fn) => [...arr].map(i => fn(i)).join('');
  }

  connectedCallback() {
    this.update();
    this.mounted && this.mounted();
  }

  disconnectedCallback() {
    this.unmounted && this.unmounted();
  }

  static importStyle() {
    let src = '';
    for (const el of document.querySelectorAll('style, link[rel="stylesheet"]')) {
      src += el.tagName == 'STYLE' ? el.innerHTML : `\n@import url(${el.href});\n`;
    }
    const sheet = new CSSStyleSheet();
    sheet.replace(src);
    return sheet;
  }

  update() {
    El._contextId = this._id;
    this.unstash();
    const html = this.render(this.tmpl);
    if (this._html != html) {
      const shadow = this.shadowRoot || this.attachShadow({mode: 'open'});
      const sheet = new CSSStyleSheet();
      sheet.replace((this.css && El.zcss(this.css())) || '');
      shadow.adoptedStyleSheets = [El.adoptableSheet, sheet];
      shadow.innerHTML = html;
      this._html = html;
    }
    this.unstash();
    El._contextId = null;
  }

  unstash() {
    for (const el of [...(this.shadowRoot||this).querySelectorAll('*'), this])
      for (const attr of el.attributes)
        if (attr.value in El.stash) el[attr.name] = El.stash[attr.value];
  }

  get $refs() {
    return new Proxy({}, { get: (obj, key) => this.querySelector(`[ref="${key}"]`) });
  }

  $watch(_, fn) {
    if (!El.dep._path) return;
    El.deps[El.dep._path] = El.deps[El.dep._path] || {};
    El.deps[El.dep._path][Math.random()] = fn;
    El.dep._path = null;
  }

  tmpl(strings, ...vals) {
    for (const [i] of strings.entries()) {
      if ((typeof vals[i]).match(/object|function/)) {
        const key = 'el:' + Math.random().toString(36).slice(2);
        El.stash[key] = typeof vals[i] == 'function' ? vals[i].bind(this) : vals[i];
        vals[i] = JSON.stringify(key);
      }
    }
    function v(x) { return x || x === 0 ? x : '' }
    return strings.map((s, i) => [s, v(vals[i])].join``).join``;
  }

  static notify(path) {
    for (const id in El.deps[path] || {})
      setTimeout(_ => El.deps[path][id]())
  }

  static dep(path) {
    El.deps = El.deps || {};
    El.dep._path = !El._contextId && path;
    if (!El._contextId) return;
    const contextId = El._contextId;
    El.deps[path] = El.deps[path] || {};
    El.deps[path][El._contextId] = _ => El.els[contextId].update()
    return true;
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
        return typeof key == "symbol" ? Reflect.get(...arguments) :
          key in x.constructor.prototype && El.dep(path + '/' + key) ? x[key] :
          El.observable(x[key], path + '/' + key);
      }
    });
  }

  static zcss(src) {
    const lines = [], stack = [];
    let open, opened, close;
    for (const line of src.split('\n')) {
      if (line.match(/^\s*@[msdk].*\{/)) {
        lines.push(line);
        stack.push('');
      } else if (line.match(/\{\s*$/)) {
        open = true;
        stack.push(line.replace('{','').trim());
      } else if (line.match(/\s*\}\s*$/)) {
        close = true;
        if (!stack.pop()) lines.push('}');
      } else {
        if (!line.trim()) continue;
        if (opened && (open || close)) {
          opened = close = false;
          lines.push('}');
        }
        if (open || close) {
          opened = true;
          open = false;
          lines.push(stack.join(' ').replace(' &', '') + '{');
        }
        lines.push(line);
      }
    }
    if (close) lines.push('}');
    return lines.join('\n');
  }
}
