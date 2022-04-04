import assert from 'assert'
import { suite } from './index.js'
import { parseHTML } from 'linkedom'

const { document, HTMLElement, customElements } = parseHTML(`<html><body></body></html>`)

global.document = document;
global.HTMLElement = HTMLElement;

const { default: El } = await import('../index.js');

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
    customElements.define('event-el', EventEl);
    const eventEl = document.createElement('event-el')
    document.body.appendChild(eventEl);
    eventEl.shadowRoot.querySelector('button').click();
    await new Promise(r => setTimeout(r))
    assert.equal(clicked, true, 'button click set clicked ot true');
  })

  test('refs', async () => {
    let clicked = false
    class RefEl extends El {
      handleClick() { clicked = true }
      render(html) { return html`<h1 ref="heading">Hello, World!</h1>` }
    }
    customElements.define('ref-el', RefEl);
    const refEl = document.createElement('ref-el')
    document.body.appendChild(refEl);
    assert.equal(refEl.$refs.heading.tagName, 'H1');
  })

  test('lifecycle', async () => {

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
    const css = atob(cssEl.shadowRoot.querySelector('link').href.split(',')[1]);
    assert.equal(css.replace(/\s+/g, ' '), 'ul li{ color: red; }');
  })
})

