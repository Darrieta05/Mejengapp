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
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      gap: 0.5rem;
      margin-top: 0.8rem;
      margin-bottom: 0.8rem;
      padding-bottom: 0.25rem;
      scrollbar-width: none;
    }

    nav::-webkit-scrollbar {
      display: none;
    }

    button {
      flex-shrink: 0;
      border: 1px solid var(--surface-border);
      background: var(--surface-muted);
      color: var(--text-muted);
      border-radius: 10px;
      padding: 0.5rem 0.85rem;
      font-weight: 700;
      font-size: 0.86rem;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: all 0.18s ease;
      white-space: nowrap;
    }

    button:hover {
      color: var(--text);
      transform: translateY(-1px);
    }

    .active {
      color: #fff;
      border-color: var(--league-color, #2dd4bf);
      background: linear-gradient(120deg, var(--league-color, #0f766e), #0f172a);
      box-shadow: 0 8px 20px var(--league-color-glow, rgba(15, 118, 110, 0.3));
    }
  `;
}
