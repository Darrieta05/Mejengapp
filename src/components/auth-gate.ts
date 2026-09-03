import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('auth-gate')
export class AuthGate extends LitElement {
  @property({ type: Boolean }) busy = false;
  @property({ type: String }) error = '';

  private signIn(): void {
    this.dispatchEvent(new CustomEvent('sign-in', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <main class="gate">
        <section>
          <p class="eyebrow">Mejengas Martes</p>
          <h1>Entra a tus ligas</h1>
          <p class="intro">Inicia sesion con Google para crear o unirte a una liga.</p>
          ${this.error ? html`<p class="error">${this.error}</p>` : null}
          <button ?disabled=${this.busy} @click=${this.signIn}>
            ${this.busy ? 'Conectando...' : 'Iniciar sesion con Google'}
          </button>
        </section>
      </main>
    `;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
    }

    .gate {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    section {
      width: min(100%, 460px);
      padding: 2rem;
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      background: var(--surface);
      box-shadow: 0 20px 60px rgba(2, 7, 20, 0.4);
    }

    .eyebrow {
      margin: 0;
      color: #7dd3fc;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0.5rem 0;
      font-size: clamp(1.7rem, 6vw, 2.5rem);
    }

    .intro {
      margin: 0 0 1.4rem;
      color: var(--text-muted);
    }

    button {
      width: 100%;
      border: 1px solid #7dd3fc;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      background: #0ea5e9;
      color: #082f49;
      font-weight: 800;
      cursor: pointer;
    }

    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    .error {
      margin: 0 0 1rem;
      color: #fecaca;
    }
  `;
}