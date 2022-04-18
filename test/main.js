import assert from 'assert'
import { suite } from './index.js'
import { parseHTML } from 'linkedom'

function setup() {
  const { document, HTMLElement, customElements } = parseHTML(`<html><body></body></html>`)
  global.customElements = customElements
  global.document = document
  global.HTMLElement = HTMLElement
  global.btoa = str => Buffer.from(str).toString('base64')
  global.atob = str => Buffer.from(str, 'base64').toString()
  global.requestAnimationFrame = f => setTimeout(f, 16)
  try { El.tags = {} } catch {}
}

setup();

const { default: El } = await import('../index.js')

suite('main', test => {

  test('basic', async() => {
    class BasicEl extends El {}
    customElements.define('basic-element', BasicEl)
    const basicEl = document.createElement('basic-el')
    assert(basicEl instanceof HTMLElement, 'we have an HTMLElement instance')
  })

  test('events', async () => {
    let clicked = false
    class EventEl extends El {
      handleClick() { clicked = true }
      render(html) { return html`<button onclick=${this.handleClick}></button>` }
    }
    customElements.define('event-el', EventEl)
    const eventEl = document.createElement('event-el')
    document.body.appendChild(eventEl);
    eventEl.shadowRoot.querySelector('button').click()
    await new Promise(r => setTimeout(r))
    assert.equal(clicked, true, 'button click set clicked true')
  })

  test('attributes', async () => {
    setup();
    class ListEl extends El {
      created() {
        this.item = { price: 20, title: 'Desk' }
      }
      render(html) {
        return html`<item-el item=${this.item}></item-el>`
      }
    }
    class ItemEl extends El {
      render(html) {
        return html`<div>INSIDE</div>`
      }
    }
    customElements.define('list-el', ListEl)
    customElements.define('item-el', ItemEl)
    const listEl = document.createElement('list-el')
    document.body.appendChild(listEl)
    const itemEl = listEl.shadowRoot.querySelector('item-el')
    assert.deepEqual(itemEl.item, { price: 20, title: 'Desk' })
  })

  test('reactive attributes', async () => {
    setup();
    class ListEl extends El {
      created() {
        this.state = El.observable({ price: 20, title: 'Desk' })
      }
      get formattedPrice() {
        return '$' + this.state.price.toFixed(2);
      }
      render(html) {
        return html`
          <div>
            <span>${this.formattedPrice}</span>
            <span>${this.formattedPrice}</span>
            <item-el price=${this.formattedPrice}></item-el>
          </div>
        `;
      }
    }
    class ItemEl extends El {
      render(html) {
        return html`${this.price}`
      }
    }
    customElements.define('list-el', ListEl)
    customElements.define('item-el', ItemEl)
    const listEl = document.createElement('list-el')
    document.body.appendChild(listEl)
    const itemEl = listEl.shadowRoot.querySelector('item-el')
    listEl.state.price = 30
    await El.nextTick()
    assert(itemEl.shadowRoot.innerHTML.match(/30.00/))
  })

  test('refs', async () => {
    setup();
    let clicked = false
    class RefEl extends El {
      handleClick() { clicked = true }
      render(html) { return html`<h1 ref="heading">Hello, World!</h1>` }
    }
    customElements.define('ref-el', RefEl);
    const refEl = document.createElement('ref-el')
    document.body.appendChild(refEl);
    assert.equal(refEl.$refs.heading.tagName, 'H1')
  })

  test('memoized getters', async () => {
    setup()
    let c = 0;
    class GetterEl extends El {
      get count() { return c++ }
      render(html) { return html`
        <div>${this.count}|${this.count}</div>
      `};
    }
    customElements.define('getter-el', GetterEl);
    const getterEl = document.createElement('getter-el')
    document.body.appendChild(getterEl)
    await El.nextTick()
    assert.equal(c, 1)
    assert(getterEl.shadowRoot.innerHTML.match(/\b0\|0\b/), 'getter called just once')
    getterEl._queue()
    getterEl._queue()
    await El.nextTick()
    assert(getterEl.shadowRoot.innerHTML.match(/\b1\|1\b/), 'getter called just once more')
  })

  test('lifecycle', async () => {

    setup();
    let created = false
    let mounted = false
    let unmounted = false

    class MyComponent extends El {
      created() { created = true }
      mounted() { mounted = true }
      unmounted() { unmounted = true }
      render() {
        assert.equal(created, true, 'created ran before render')
        assert.equal(mounted, false, 'mounted not yet run during render')
      }
    }

    customElements.define('my-component', MyComponent)

    const component = document.createElement('my-component')

    assert.equal(created, false, 'created starts false')
    assert.equal(mounted, false, 'mounted starts false')
    assert.equal(mounted, false, 'unmounted starts false')

    document.body.appendChild(component)
    await new Promise(r => setTimeout(r))

    assert.equal(created, true, 'created becomes true')
    assert.equal(mounted, true, 'mounted becomes true')
    assert.equal(unmounted, false, 'unmounted still false')

    component.remove()

    assert.equal(unmounted, true, 'unmounted true after unmounting')
  })

  test('css', async () => {
    setup();
    class CssEl extends El {
      render(html) {
        return `<ul><li>Hello, World!</li></ul>`
      }
      css() {
        return `
          ul {
            li {
              color: red;
            }
          }
        `
      }
    }
    customElements.define('css-el', CssEl)
    const cssEl = document.createElement('css-el')
    document.body.appendChild(cssEl)
    const css = atob(cssEl.shadowRoot.querySelector('link').href.split(',')[1])
    assert.equal(css.replace(/\s+/g, ' '), 'ul li{ color: red; }')
  })
})

