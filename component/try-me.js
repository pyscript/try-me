// @ts-check

// @ts-ignore
import el from 'https://cdn.jsdelivr.net/npm/@webreflection/element@0.2.4/index.min.js';

const PY_SCRIPT_VERSION = '2026.3.1';

/** @typedef {{ title: string, config: any, code: string, setup: any }} Example */

if (!customElements.get('try-me')) {
  let id = 0;
  customElements.define('try-me', class extends HTMLElement {

    /** @type {WeakMap<HTMLElement, Example>} */
    #examples = new WeakMap;

    async connectedCallback() {
      // TODO: handle package attribute not found
      // @ts-ignore
      const pkg = this.getAttribute('package');

      const response = await fetch(`https://packages.pyscript.net/api/package/${pkg}.json`);

      // TODO: handle bad request
      if (!response.ok) return;

      const container = document.createElement('div');

      const { examples } = /** @type {{ examples: Example[] }} */(await response.json());
      const { length } = examples;

      /** @type {HTMLElement[]} */
      const tabs = [];

      // bootstrap the select per each example
      const select = el(
        'select',
        {
          disabled: length < 2,
          onchange: () => {
            const tab = tabs[select.selectedIndex];
            container.replaceChildren(tab);
            this.#show(tab);
          }
        },
        ...examples.map(
          (example, i) => {
            tabs[i] = el('div');
            this.#examples.set(tabs[i], example);
            return el('option', { value: i, selected: i < 1 }, example.title);
          }
        )
      );

      this.replaceChildren(select, container);
      select.onchange();
    }

    disconnectedCallback() {
      for (const script of this.querySelectorAll('script[type^="py-editor"]')) {
        // @ts-ignore
        script.xworker?.terminate();
      }

      this.replaceChildren();
    }

    /**
     * @param {HTMLElement} tab
     */
    #show(tab) {
      if (tab.hasChildNodes()) return;
      const tmid = `try-me-${id++}`;
      const { title, config, code: textContent, setup } = /** @type {Example} */(this.#examples.get(tab));
      const env = `${this.getAttribute('package')}: ${title}`;
      const target = el('div', { id: tmid });
      if (setup) {
        tab.append(
          el(
            'script',
            {
              // ⚠️ works with setup but *NOT* with lazy py-editors (lazy bootstrap doesn't notify)
              //   ['@py-editor']: [
              //     ({ currentTarget }) => this.#workers.push(currentTarget.xworker),
              //     { once: true }
              //   ],
              type: 'py-editor',
              setup: true,
              textContent: `__pyscript_display_target__ = "${tmid}"\n${setup}`,
              config,
              env
            }
          ),
          el('script', { type: 'py-editor', textContent, env }),
          target,
        );
      }
      else {
        tab.append(
          el('script', { type: 'py-editor', textContent, config, env }),
          target,
        );
      }
    }
  });

  document.head.prepend(
    el(
      'link',
      {
        rel: 'stylesheet',
        href: `https://pyscript.net/releases/${PY_SCRIPT_VERSION}/core.css`,
      }
    )
  );

  import(`https://pyscript.net/releases/${PY_SCRIPT_VERSION}/core.js`);
}
