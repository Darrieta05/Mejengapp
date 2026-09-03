import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('league-chooser')
export class LeagueChooser extends LitElement {
  @property({ type: Boolean }) busy = false;
  @property({ type: Boolean }) canClose = false;
  @property({ type: String }) error = '';

  @state() private leagueName = '';
  @state() private leagueCode = '';

  private createLeague(event: Event): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('create-league', {
        detail: { name: this.leagueName },
        bubbles: true,
        composed: true
      })
    );
  }

  private joinLeague(event: Event): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('join-league', {
        detail: { code: this.leagueCode },
        bubbles: true,
        composed: true
      })
    );
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('close-chooser', { bubbles: true, composed: true }));
  }

  private logout(): void {
    this.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <main class="chooser">
        <section>
          <header>
            <div>
              <p class="eyebrow">Tu espacio de juego</p>
              <h1>Elige una liga</h1>
              <p class="intro">Crea una liga nueva o usa el codigo que te compartieron.</p>
            </div>
            ${this.canClose
              ? html`<button class="quiet" ?disabled=${this.busy} @click=${this.close}>Cerrar</button>`
              : null}
          </header>

          ${this.error ? html`<p class="error">${this.error}</p>` : null}

          <div class="options">
            <form @submit=${this.createLeague}>
              <h2>Crear liga</h2>
              <label for="league-name">Nombre de la liga</label>
              <input
                id="league-name"
                required
                maxlength="60"
                .value=${this.leagueName}
                @input=${(event: Event) =>
                  (this.leagueName = (event.target as HTMLInputElement).value)}
                placeholder="Ej. Martes 7pm"
              />
              <button ?disabled=${this.busy} type="submit">Crear liga</button>
            </form>

            <form @submit=${this.joinLeague}>
              <h2>Unirse a una liga</h2>
              <label for="league-code">Codigo de la liga</label>
              <input
                id="league-code"
                required
                minlength="6"
                maxlength="6"
                .value=${this.leagueCode}
                @input=${(event: Event) =>
                  (this.leagueCode = (event.target as HTMLInputElement).value.toUpperCase())}
                placeholder="ABC234"
              />
              <button ?disabled=${this.busy} type="submit">Unirse a una liga</button>
            </form>
          </div>

          <button class="logout" ?disabled=${this.busy} @click=${this.logout}>Cerrar sesion</button>
        </section>
      </main>
    `;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
    }

    .chooser {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    section {
      width: min(100%, 760px);
      padding: 1.5rem;
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      background: var(--surface);
      box-shadow: 0 20px 60px rgba(2, 7, 20, 0.4);
    }

    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .eyebrow {
      margin: 0;
      color: #7dd3fc;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1,
    h2 {
      margin: 0;
    }

    h1 {
      margin-top: 0.4rem;
      font-size: 1.8rem;
    }

    h2 {
      margin-bottom: 0.8rem;
      font-size: 1rem;
    }

    .intro {
      margin: 0.45rem 0 0;
      color: var(--text-muted);
    }

    .error {
      margin: 1rem 0 0;
      color: #fecaca;
    }

    .options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin-top: 1.4rem;
    }

    form {
      display: grid;
      gap: 0.55rem;
      padding: 1rem;
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      background: var(--surface-muted);
    }

    label {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    input,
    button {
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 0.6rem 0.7rem;
      font: inherit;
    }

    input,
    .quiet,
    .logout {
      background: #0f172a;
      color: var(--text);
    }

    form button {
      margin-top: 0.35rem;
      background: #0ea5e9;
      color: #082f49;
      cursor: pointer;
      font-weight: 800;
    }

    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    .quiet,
    .logout {
      cursor: pointer;
      font-weight: 700;
    }

    .logout {
      margin-top: 1.2rem;
      border: 0;
      padding-left: 0;
      color: var(--text-muted);
    }

    @media (max-width: 640px) {
      section {
        padding: 1rem;
      }

      .options {
        grid-template-columns: 1fr;
      }
    }
  `;
}