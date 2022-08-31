# El

Minimal JavaScript application framework inspired by React, Vue, and lit-element. See a working todo list [example](https://frameable.github.io/el/example.html) and [source](https://github.com/frameable/el/blob/main/example.html)


### Introduction

El is based on [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components), and provides a friendly interface to these features:

- Built-in observable store
- Reactive templates with one-way binding
- Fast differential DOM updates
- Scoped styles via shadow DOM
- CSS preprocessing for implicit nesting and ampersands
- Watch expressions
- Component lifecycle methods
- Just ~150 lines of source code (~2kb gzipped)
- Minimal surface area with easy learning curve
- No dependencies on any other libraries
- No need for build tools like Webpack or Rollup

```html
<my-counter></my-counter>

<script>
  class MyCounter extends El {
    created() {
      this.state = this.$observable({ count: 0 });
    }
    increment() {
      this.state.count += 1;
    }
    render(html) {
      return html`
        <span>Count: ${this.state.count}</span>
        <button onclick=${this.increment}>Increment</button>
      `
    }
  }
  customElements.define('my-counter', MyCounter);
</script>
```

## Installation

El consists of a single source JavaScript file, [`el.js`](https://raw.githubusercontent.com/frameable/el/main/el.js). You can drop it into your project directly, and import:

```html
<script type="module">
  import { El } from './el.js'
  /* ... */
</script>
```

Or else install from the npm registry:

```
npm install @frameable/el
```


## Components

El serves as a base class for custom elements / Web Components.  Inherit from `El` and then register with `customElements.define`:

```html
<my-element></my-element>

<script>
  class MyElement extends El {
    /* ... */
  }
  customElements.define(MyElement, 'my-element');
</script>
```

If you are new to custom elements, some tips per the spec:

- Element tag names must be lowercase with at least one hyphen
- `customElements.define` takes the given class and registers with the tag name
- In the markup, custom elements cannot be self-closing

#### Lifecycle methods

If lifecycle methods are defined on the component, they will fire at the appropriate time:

- `created()` - componenent has been created but not yet mounted
- `mounted()` - component has been attached to the DOM
- `unmounted()` - component has been removed from the DOM

## Observable

Use `El.observable` to create an observable store which will allow components to update when the store changes.  El keeps track of which components depend on which parts of the store, and only performs the necessary updates.

```javascript
const store = El.observable({ items: [] });
```

A component may wish to have its own observable state:

```javascript
class TodoItem extends El {
  created() {
    this.state = this.$observable({
      status: 'new'
    });
  }
}
```

A component can also subscribe to changes with `$watch`.

```javascript
class TodoItems extends El {
  created() {
    this.$watch(store.items.length, () => console.log("length changed!"));
  }
}
```

> Observable stores are implemented as recursive [proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).  When a component is rendered, as properties are accessed from observable stores, El keeps track of which components are dependent on which properties.  When those properties later change, the components that depend on them are rendered again.

## Templates

Templates are rendered through the `render` function, which accepts a `html` tag function.  Element attributes like class names and event handlers can be assigned expressions directly, or interpolated.

```javascript
class TodoItem extends El {
  render(html) {
    return html`
      <div class="title ${this.done && 'title--done'}">
        ${this.title}
      </div>
      <button onclick=${this.edit}>Edit</button>
    `
  }
}
```

> Component rendering templates are implemented using [tag functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates). When the `html` tag function comes across a value to be interpolated, if the value is a complex value like an array or object being passed as a property, or if the value is a function being assigned as an event handler, the tag function stashes the value and interpolates into the template a key that El uses later to refer back to the original complex value.

#### Looping

Iterate through items with `map`, and make sure to add a unique `key` attribute:

```javascript
class TodoItems extends El {
  render(html) {
    return html`
      <div class="todo-items">
        ${this.items.map, item => html`
          <todo-item item=${item} key=${item.id}></todo-item>
        `}
      </div>
    `
  }
}
```

#### Conditional logic

Within a render function, you can use short-circuit (`&&`) or ternary syntax (`condition ? then : else`).

```javascript
class TodoItem extends El {
  render(html) {
    return html`
      <div class="title ${this.done && 'title--done'}">
        ${this.title}
      </div>
      ${this.editable
        ? html`<button onclick=${this.edit}>Edit</button>`
        : html`<span>Archived</span>
      `}
    `
  }
}
```

> Once a template is rendered to html, it then needs to find its way into the DOM.  El renders first to a [DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment), then traverses the fragment and its corresponding component in the actual DOM, and selectively alters the real DOM only where the two structures diverge.

#### Refs

Refer to elements within a component by the name specified by their `ref` attribute.

```javascript
class TodoItemDescription extends El {
  save() {
    store.setDescription(this.itemId, this.$refs.descriptionInput.value);
  }
  render(html) {
    return html`
      <input ref="descriptionInput">
      <button onclick=${this.save}>Save</button>`
    `
  }
}
```

> Refs are implemented as a dynamic getter via Proxy.  When the property is read, the proxy handler runs a `querySelector` query on the component root, so these properties will yield "live" results but may not be ideal in a tight loop where performance is critical.


#### Computed properties

Properties accessed via getters will be computed just once per render cycle.  In the following example, the `dependents` property invokes the getter just once, even though it is referred to multiple times in template.

```javascript
class TodoItem extends El {

  get dependents() {
    // expensive execution is cached per render
    return store.items.filter(item => item.dependencies.includes(this.item.id));
  }

  render(html) {
    return html`
      <h1>${this.title}</h1>
      <h4>${this.dependents.length} dependent tasks</h4>
      <ul>
        ${this.dependents.map(d => html`
          <li>${d.title}</li>
        `)}
      </ul>
    `
  }
}
```

#### Escaping

Interpolated values are HTML-escaped by default. If you have sanitized markup that you would like to include as-is, use `html.raw`:

```javascript
class TodoItemDescription extends El {
  render(html) {
    return html`
      <div class="description">
        ${html.raw(this.sanitizedDescriptionHTML)}
      </div>
    `
  }
}
```


## Style

Specify CSS via the `styles` method and `css` tag function. Styles are scoped so that they only apply to elements in this component.  Neither ancestors nor descendants of this component will be affected by these styles. The built-in preprocessor adds support for implicit nesting and ampersand selectors.

```javascript
class TodoItem extends El {
  styles(css) {
    return css`
      .item {
        margin: 16px;
        padding: 16px;

        &:hover {
          background: whitesmoke;
        }

        .title {
          font-weight: 500;
        }
      }
    `
  }
  render(html) {
    return html`
      <div class="item">
        <div class="title ${this.done && 'title--done'}">
          ${this.title}
        </div>
      </item>
    `
  }
}
```

> The shadow DOM provides scoped CSS so that styles defined within a component don't leak either up to parents or down to children.  By default, global styles will also not be applied within components, which is great when you're building abstract components to be used across projects, but a hinderance when you want different components within a single application to have consistent fonts, colors, spacing, etc.  El clones global styles and applies those styles to each component via `link` tag with a data URI, so components will be affected by application-wide stylesheets.

> El runs a stack-based line-by-line [zcss](https://github.com/dchester/zcss.js) source filter on CSS in order to implement nesting CSS and the ampersand selector, popularized by SCSS and other tools, now a W3C working draft [CSS Nesting](https://www.w3.org/TR/css-nesting-1/).


## Resources

El Starter app template \
https://github.com/frameable/el-starter

MDN on Web Components \
https://developer.mozilla.org/en-US/docs/Web/Web_Components

Editor syntax highlighting \
https://github.com/jonsmithers/vim-html-template-literals (Vim) \
https://github.com/0x00000001A/es6-string-html (VS Code)

zcss preprocessor \
https://github.com/dchester/zcss.js

