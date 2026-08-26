import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type AppTab = 'tabla' | 'h2h' | 'evolucion' | 'curiosos' | 'partidos';

interface TabItem {
  id: AppTab;
  label: string;
}

const tabs: TabItem[] = [
  { id: 'tabla', label: 'Posiciones' },
  { id: 'h2h', label: 'H2H' },
  { id: 'evolucion', label: 'Evolucion' },
  { id: 'curiosos', label: 'Curiosos' },
  { id: 'partidos', label: 'Partidos' }
];

@customElement('tab-nav')
export class TabNav extends LitElement {
  @property({ type: String })
  current: AppTab = 'tabla';

  private emitChange(tab: AppTab): void {
    this.dispatchEvent(
      new CustomEvent('tab-change', {
        detail: { tab },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <nav>
        ${tabs.map(
          (tab) => html`
            <button
              class=${tab.id === this.current ? 'active' : ''}
              @click=${() => this.emitChange(tab.id)}
            >
              ${tab.label}
            </button>
          `
        )}
      </nav>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin-top: 1rem;
      margin-bottom: 1rem;
    }

    button {
      border: 1px solid var(--surface-border);
      background: var(--surface-muted);
      color: var(--text-muted);
      border-radius: 10px;
      padding: 0.45rem 0.75rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    button:hover {
      color: var(--text);
      transform: translateY(-1px);
    }

    .active {
      color: #fff;
      border-color: #2dd4bf;
      background: linear-gradient(120deg, #0f766e, #0f172a);
      box-shadow: 0 10px 25px rgba(15, 118, 110, 0.3);
    }
  `;
}
