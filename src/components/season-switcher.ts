import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Season } from '../types/models';

@customElement('season-switcher')
export class SeasonSwitcher extends LitElement {
  @property({ attribute: false }) seasons: Season[] = [];
  @property({ type: String }) currentSeasonId = '';
  @property({ type: Boolean }) disabled = false;

  private onChange(event: Event): void {
    this.dispatchEvent(
      new CustomEvent('season-change', {
        detail: { seasonId: (event.target as HTMLSelectElement).value },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <label>
        <span>Temporada</span>
        <select .value=${this.currentSeasonId} ?disabled=${this.disabled} @change=${this.onChange}>
          ${this.seasons.map(
            (season) => html`<option value=${season.id}>${season.name}${season.status === 'ended' ? ' · Cerrada' : ''}</option>`
          )}
        </select>
      </label>
    `;
  }

  static styles = css`
    label {
      display: grid;
      gap: 0.15rem;
      color: var(--text-muted);
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    select {
      max-width: 190px;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 0.4rem 0.55rem;
      background: #0f172a;
      color: var(--text);
      font-size: 0.8rem;
      font-weight: 700;
    }

    @media (max-width: 760px) {
      select {
        max-width: 100%;
      }
    }
  `;
}