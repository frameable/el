import assert from 'assert'
import { suite } from './index.js'
import { parseHTML } from 'linkedom'

let debug = { updates: [] };

function setup() {
  const { document, HTMLElement, HTMLInputElement, customElements } = parseHTML(`<html><body></body></html>`)
  global.customElements = customElements
  global.document = document
  global.HTMLElement = HTMLElement
  global.btoa = str => Buffer.from(str).toString('base64')
  global.atob = str => Buffer.from(str, 'base64').toString()
  global.requestAnimationFrame = f => setTimeout(f, 16)
  try { ElBase.tags = {} } catch {}
  debug.updates = []
  HTMLInputElement.prototype.checked = false
}

setup();

const { El: ElBase } = await import('../el.js')

class El extends ElBase {
  _update(...args) {
    super._update(...args)
    debug.updates.push([this.tagName, this._id])
  }
}

suite('main', async test => {

  await test('basic', async () => {
    class BasicEl extends El {}
    customElements.define('basic-element', BasicEl)
    const basicEl = document.createElement('basic-el')
    assert(basicEl instanceof HTMLElement, 'we have an HTMLElement instance')
  })

  await test('events', async () => {
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

  await test('object attributes', async () => {
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

  await test('array attributes', async () => {
    setup();
    class ListEl extends El {
      created() {
        this.items = [{ price: 20, title: 'Desk' }]
      }
      render(html) {
        return html`<item-el items=${this.items}></item-el>`
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
    assert.deepEqual(itemEl.items, [{ price: 20, title: 'Desk' }])
  })

  await test('reactive attributes', async () => {
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
    await El.nextTick()
    assert(itemEl.shadowRoot.innerHTML.match(/30.00/))
  })

  await test('reactive attribute objects', async () => {
    setup();
    class ListEl extends El {
      created() {
        this.state = El.observable({ price: 20, title: 'Desk', sellers: [0, 1] })
      }
      get formattedPrice() {
        return '$' + this.state.price.toFixed(2);
      }
      render(html) {
        return html`
          <div>
            <span>${this.formattedPrice}</span>
            <span>${this.formattedPrice}</span>
            <sellers-el sellers=${this.state.sellers}></sellers-el>
          </div>
        `;
      }
    }
    class SellersEl extends El {
      render(html) {
        return html`${this.sellers.length}`
      }
    }
    customElements.define('list-el', ListEl)
    customElements.define('sellers-el', SellersEl)
    const listEl = document.createElement('list-el')
    document.body.appendChild(listEl)
    const sellersEl = listEl.shadowRoot.querySelector('sellers-el')
    assert(sellersEl.shadowRoot.innerHTML.match(/>2/))
    listEl.state.sellers.push(2);
    await El.nextTick()
    assert(sellersEl.shadowRoot.innerHTML.match(/>3/))
  })

  await test('dashboard', async () => {
    setup();
    class DashboardEl extends El {
      created() {
        this.state = El.observable({
          items: [
            { id: 1, price: 20, title: 'Desk' },
            { id: 2, price: 30, title: 'Chair' },
            { id: 3, price: 10, title: 'Book' }
          ],
          showSummary: false,
        })
      }
      render(html) {
        return html`
          <div>
            <list-el items=${this.state.items}></list-el>
            ${this.state.showSummary && html`
              <div>${this.state.items.length} items</div>
            `}
          </div>
        `;
      }
    }
    class ListEl extends El {
      render(html) {
        return html`
          ${this.items.map(i => html`<item-el key="item-${i.id}" item=${i}></item-el>`)}
        `;
      }
    }
    class ItemEl extends El {
      render(html) {
        return html`
          <div>
            <span>${this.item.id}</span>
            <h4>${this.item.title}</h4>
            <span>${this.item.price}</span>
          </div>
        `;
      }
    }

    customElements.define('dashboard-el', DashboardEl)
    customElements.define('list-el', ListEl)
    customElements.define('item-el', ItemEl)

    const dashboardEl = document.createElement('dashboard-el')
    document.body.appendChild(dashboardEl)

    dashboardEl.state.showSummary = true

    debug.updates = [];
    await dashboardEl.$nextTick()
    assert.equal(debug.updates.length, 1)
  })

  await test('refs', async () => {
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

  await test('memoized getters', async () => {
    setup()
    let c = 0;
    class GetterEl extends El {
      get count() { return c++ }
      render(html) { return html`
        <div>${this.count}|${this.count}</div>
      `}
    }
    customElements.define('getter-el', GetterEl);
    const getterEl = document.createElement('getter-el')
    document.body.appendChild(getterEl)
    await El.nextTick()
    assert.equal(c, 1)
    assert(getterEl.shadowRoot.innerHTML.match(/\b0\|0\b/), 'getter called just once')
    getterEl.$update()
    getterEl.$update()
    await El.nextTick()
    assert(getterEl.shadowRoot.innerHTML.match(/\b1\|1\b/), 'getter called just once more')
  })

  await test('render queue', async () => {
    setup()
    class RenderEl extends El {
      count = 0
      render(html) { 
        this.count++;
        return html`<div>${this.count}</div>`
      }
    }
    customElements.define('render-el', RenderEl);
    const renderEl = document.createElement('render-el')
    document.body.appendChild(renderEl)
    await El.nextTick()
    assert.equal(renderEl.count, 1)
    renderEl.$update()
    renderEl.$update()
    await El.nextTick()
    assert.equal(renderEl.count, 2, 'render called just once more')
  })

  await test('lifecycle', async () => {

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

  await test('adjacent', async () => {

    setup();
    class AdjEl extends El {
      toggle = true;
      render(html) {
        return html`
          <div ref="toggle">
            ${this.toggle
              ? html`<i>ON</i>`
              : html`<b>OFF</b>`
            }
          </div>
        `;
      }
    }

    customElements.define('adj-el', AdjEl)
    const adjEl = document.createElement('adj-el')
    document.body.appendChild(adjEl)
    assert.equal(adjEl.$refs.toggle.innerHTML.trim(), '<i>ON</i>');
    adjEl.toggle = false;
    adjEl._update();
    await adjEl.$nextTick();
    assert.equal(adjEl.$refs.toggle.innerHTML.trim(), '<b>OFF</b>');
  });

  await test('escape html', async () => {

    setup();
    class TitleEl extends El {
      title = '<i>test</i>'
      render(html) {
        return html`
          <h1 ref="esc">${this.title}</h1>
          <div ref="raw">${html.raw(this.title)}</div>
        `;
      }
    }

    customElements.define('title-el', TitleEl)
    const titleEl = document.createElement('title-el')
    document.body.appendChild(titleEl)
    assert.equal(titleEl.$refs.esc.innerHTML.trim(), '&lt;i&gt;test&lt;/i&gt;');
    assert.equal(titleEl.$refs.raw.innerHTML.trim(), '<i>test</i>');
  });

  await test('key missing warning', async () => {

    setup();

    let warnings = [];
    const _warn = console.warn
    console.warn = msg => warnings.push(msg)

    class ItemEl extends El {
      title = '<i>test</i>'
      render(html) {
        return html`<h1>${this.title}</h1>`;
      }
    }

    customElements.define('item-el', ItemEl)

    for (const i of Array(2).keys()) {
      const itemEl = document.createElement('item-el')
      document.body.appendChild(itemEl)
    }

    assert.equal(warnings.length, 1, "we logged when we didn't have keys")
    console.warn = _warn;

  })

  await test('checkbox', async () => {
    setup();

    class FormEl extends El {
      created() {
        this.state = El.observable({ checked: false })
      }
      render(html) {
        return html`
          <form>
            <input type="checkbox" ${this.state.checked && 'checked'}>
          </form>
        `
      }
    }
    customElements.define('form-el', FormEl)
    const formEl = document.createElement('form-el')
    document.body.appendChild(formEl)
    const input = formEl.shadowRoot.querySelector('input')
    assert.equal(input.hasAttribute('checked'), false, "checkbox has no checked attr")
    assert.equal(input.checked, false, "checked property not set")
    formEl.state.checked = true
    await formEl.$nextTick()
    assert.equal(input.hasAttribute('checked'), true, "checked attribute present")
    assert.equal(input.checked, true, "checked property is set")
  })

  await test('css', async () => {
    setup();
    class CssEl extends El {
      render(html) {
        return `<ul><li>Hello, World!</li></ul>`
      }
      styles(css) {
        return css`
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

