# El

Minimal JavaScript application framework inspired by React and Vue

### Introduction

El is based on WebComponents, and provides a friendly interface to these features:

- Built-in observable store
- Reactive templates with one-way binding
- Fast differential DOM updates
- Scoped CSS via shadow DOM
- Preprocessing to support SCSS subset: implicit nesting and ampersands
- Watch expressions
- Component lifecycle methods
- Just ~150 lines of source code (~1.7kb gzipped)
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

## Components

El serves as a base class for custom elements / WebComponents.  Inherit from `El` and then register with `customElements.define`:

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

- element tag names must be lowercase with at least one hyphen
- `customElements` takes the given class and registers with the tag name
- in the markup, custom elements cannot be self-closing

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

A component can also subscribe to changes with `$watch`.

```javascript
class TodoItems extends El {
  created() {
    this.$watch(store.items.length, () => console.log("length changed!"));
  }
}
```

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
    `;
  }
}
```

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
    `;
  }
}
```

#### Conditional logic

Within a render function, you can use short-circuit (`&&`) or ternary syntax (`condition ? then : else`).

```javascript
class TodoItem extends El {
  render(html) {
    return html`
      <div class="title ${this.done && 'title--done'">
        ${this.title}
      </div>
      ${this.editable
        ? html`<button onclick=${this.edit}>Edit</button>`
        : html`<span>Archived</span>
      `}
    `;
  }
}
```

## Style

Specify CSS via the `css` method. Styles are scoped so that they only apply to elements in this component.  Neither ancestors nor descendants of this component will be affected by these styles.The built-in preprocessor adds support for implicit nesting and ampersand selectors.

```javascript
class TodoItem extends El {
  css() {
    return `
      .item {
        margin: 16px;
        padding: 16px;

        .title {
          font-weight: 500;
        }
        &:hover {
          background: whitesmoke;
        }
      }
    `
  }
  render(html) {
    return html`
      <div class="item">
        <div class="title ${this.done && 'title--done'">
          ${this.title}
        </div>
        <button onclick=${this.edit}>Edit</button>
      </item>
    `
  }
}
```

