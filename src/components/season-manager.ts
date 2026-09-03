import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Season } from '../types/models';

@customElement('season-manager')
export class SeasonManager extends LitElement {
  @property({ attribute: false }) season: Season | null = null;
  @property({ type: Boolean }) mutating = false;
  @state() private nextName = '';

  private onInput(event: Event): void {
    this.nextName = (event.target as HTMLInputElement).value;
  }

  private onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('end-season', {
        detail: { name: this.nextName },
        bubbles: true,
        composed: true
      })
    );
    this.nextName = '';
  }

  render() {
    if (!this.season) return html``;
    return html`
      <article>
        <h3>Temporada</h3>
        <p class="meta">${this.season.name} · ${this.season.matchCount} partidos registrados</p>
        ${this.season.status === 'active'
          ? html`
              <form @submit=${this.onSubmit}>
                <label for="next-season-name">Nombre de la siguiente temporada</label>
                <div class="form-row">
                  <input
                    id="next-season-name"
                    .value=${this.nextName}
                    placeholder="Temporada 2027"
                    maxlength="60"
                    required
                    @input=${this.onInput}
                  />
                  <button type="submit" ?disabled=${this.mutating}>Cerrar y comenzar</button>
                </div>
              </form>
            `
          : html`<p class="locked">Esta temporada es historica y no se puede editar.</p>`}
      </article>
    `;
  }

  static styles = css`
    article {
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      padding: 0.8rem;
      background: rgba(15, 23, 42, 0.45);
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      margin-bottom: 0.25rem;
      font-size: 0.9rem;
    }

    .meta,
    .locked,
    label {
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    form {
      display: grid;
      gap: 0.4rem;
      margin-top: 0.8rem;
    }

    .form-row {
      display: flex;
      gap: 0.45rem;
    }

    input,
    button {
      min-width: 0;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 0.5rem;
      background: #0f172a;
      color: var(--text);
      font-size: 0.82rem;
    }

    input {
      flex: 1;
    }

    button {
      cursor: pointer;
      font-weight: 700;
      white-space: nowrap;
    }

    button:disabled {
      cursor: wait;
      opacity: 0.6;
    }

    @media (max-width: 600px) {
      .form-row {
        display: grid;
      }
    }
  `;
}