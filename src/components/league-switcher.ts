import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { UserLeague } from '../types/models';

@customElement('league-switcher')
export class LeagueSwitcher extends LitElement {
  @property({ attribute: false }) leagues: UserLeague[] = [];
  @property({ type: String }) currentLeagueId = '';
  @property({ type: Boolean }) disabled = false;

  private selectLeague(event: Event): void {
    const leagueId = (event.target as HTMLSelectElement).value;
    if (leagueId === '__add__') {
      this.dispatchEvent(new CustomEvent('open-chooser', { bubbles: true, composed: true }));
      return;
    }
    if (leagueId) {
      this.dispatchEvent(
        new CustomEvent('league-change', {
          detail: { leagueId },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  render() {
    return html`
      <label>
        <span>Liga</span>
        <select
          aria-label="Seleccionar liga"
          .value=${this.currentLeagueId}
          ?disabled=${this.disabled}
          @change=${this.selectLeague}
        >
          ${this.leagues.map(
            ({ league }) => html`<option value=${league.id}>${league.name} · ${league.code}</option>`
          )}
          <option value="__add__">+ Agregar liga</option>
        </select>
      </label>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    label {
      display: grid;
      gap: 0.2rem;
    }

    span {
      color: var(--text-muted);
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    select {
      max-width: 230px;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 0.4rem 0.55rem;
      background: #0f172a;
      color: var(--text);
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
    }

    select:disabled {
      opacity: 0.65;
    }
  `;
}