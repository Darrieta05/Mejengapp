import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Match, Player, StandingRow } from '../types/models';

@customElement('player-profile-dialog')
export class PlayerProfileDialog extends LitElement {
  @property({ attribute: false }) player: Player | null = null;
  @property({ attribute: false }) standing: StandingRow | null = null;
  @property({ attribute: false }) matchList: Match[] = [];
  @property({ attribute: false }) allPlayers: Player[] = [];

  private close(): void {
    this.dispatchEvent(new CustomEvent('close-profile', { bubbles: true, composed: true }));
  }

  private onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  render() {
    if (!this.player) return html``;

    const playerMatches = this.matchList.filter(
      (m) => m.team1PlayerIds.includes(this.player!.id) || m.team2PlayerIds.includes(this.player!.id)
    );

    const pj = this.standing?.pj ?? playerMatches.length;
    const g = this.standing?.g ?? 0;
    const e = this.standing?.e ?? 0;
    const p = this.standing?.p ?? 0;
    const puntos = this.standing?.puntos ?? 0;
    const efectividad = this.standing?.efectividad ?? (pj > 0 ? Math.round(((g * 3 + e) / (pj * 3)) * 100) : 0);
    const mvp = this.standing?.mvp ?? playerMatches.filter((m) => m.mvpPlayerId === this.player!.id).length;

    const playersMap = new Map(this.allPlayers.map((item) => [item.id, item.nombre]));

    return html`
      <div class="backdrop" @click=${this.onBackdropClick}>
        <div class="card" role="dialog" aria-modal="true" aria-label="Perfil de ${this.player.nombre}">
          <header>
            <div class="avatar-row">
              <div class="avatar">${this.player.nombre.charAt(0).toUpperCase()}</div>
              <div>
                <h2>${this.player.nombre}</h2>
                ${this.player.email
                  ? html`<p class="email">✉ ${this.player.email}</p>`
                  : html`<p class="no-email">Sin correo vinculado</p>`}
              </div>
            </div>
            <button class="close-btn" @click=${this.close} aria-label="Cerrar">✕</button>
          </header>

          <div class="stats-grid">
            <div class="stat-box primary">
              <span class="value">${puntos}</span>
              <span class="label">Puntos</span>
            </div>
            <div class="stat-box">
              <span class="value">${pj}</span>
              <span class="label">Partidos</span>
            </div>
            <div class="stat-box">
              <span class="value">${g}</span>
              <span class="label">Victorias</span>
            </div>
            <div class="stat-box">
              <span class="value">${e}</span>
              <span class="label">Empates</span>
            </div>
            <div class="stat-box">
              <span class="value">${p}</span>
              <span class="label">Derrotas</span>
            </div>
            <div class="stat-box highlight">
              <span class="value">${efectividad}%</span>
              <span class="label">Efectividad</span>
            </div>
            <div class="stat-box star">
              <span class="value">${mvp}</span>
              <span class="label">MVPs ⭐</span>
            </div>
          </div>

          <section class="matches-history">
            <h3>Partidos en la temporada (${playerMatches.length})</h3>
            ${playerMatches.length === 0
              ? html`<p class="empty-matches">Aún no ha jugado partidos en esta temporada.</p>`
              : html`
                  <div class="history-list">
                    ${[...playerMatches].reverse().map((match) => {
                      const inTeam1 = match.team1PlayerIds.includes(this.player!.id);
                      let outcome = 'Empate';
                      let outcomeClass = 'draw';

                      if (match.resultado !== 'draw') {
                        const won = (match.resultado === 'team1' && inTeam1) || (match.resultado === 'team2' && !inTeam1);
                        outcome = won ? 'Victoria' : 'Derrota';
                        outcomeClass = won ? 'win' : 'loss';
                      }

                      const isMvp = match.mvpPlayerId === this.player!.id;

                      const teammateIds = inTeam1
                        ? match.team1PlayerIds.filter((id) => id !== this.player!.id)
                        : match.team2PlayerIds.filter((id) => id !== this.player!.id);
                      const rivalIds = inTeam1 ? match.team2PlayerIds : match.team1PlayerIds;

                      const teammates = teammateIds.map((id) => playersMap.get(id) ?? id).join(', ') || 'Solo';
                      const rivals = rivalIds.map((id) => playersMap.get(id) ?? id).join(', ') || 'Ninguno';

                      return html`
                        <div class="match-item ${outcomeClass}">
                          <div class="match-header">
                            <div>
                              <strong>${match.nombre}</strong>
                              <time>${match.fechaISO}</time>
                            </div>
                            <div class="badges">
                              ${isMvp ? html`<span class="badge mvp">⭐ MVP</span>` : null}
                              <span class="badge ${outcomeClass}">${outcome}</span>
                            </div>
                          </div>
                          <div class="match-details">
                            <p><span class="muted">Con:</span> ${teammates}</p>
                            <p><span class="muted">Vs:</span> ${rivals}</p>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </section>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host { display: contents; }
    .backdrop {
      position: fixed; inset: 0; background: rgba(4, 9, 20, 0.78);
      backdrop-filter: blur(4px); display: grid; place-items: center;
      padding: 1rem; z-index: 1000; overflow-y: auto;
    }
    .card {
      background: #0d1527; border: 1px solid var(--surface-border);
      border-radius: 18px; width: min(100%, 540px); max-height: 90vh;
      display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
      overflow: hidden; animation: appear 0.2s ease-out;
    }
    @keyframes appear {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.1rem; border-bottom: 1px solid var(--surface-border);
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
    }
    .avatar-row { display: flex; align-items: center; gap: 0.9rem; }
    .avatar {
      width: 46px; height: 46px; border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #10b981);
      color: #fff; font-weight: 800; font-size: 1.25rem;
      display: grid; place-items: center; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
    }
    h2 { margin: 0; font-size: 1.2rem; }
    .email { margin: 0.15rem 0 0; font-size: 0.82rem; color: #7dd3fc; }
    .no-email { margin: 0.15rem 0 0; font-size: 0.8rem; color: var(--text-muted); font-style: italic; }
    .close-btn {
      background: transparent; border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted); border-radius: 50%; width: 32px; height: 32px;
      display: grid; place-items: center; font-size: 1rem; cursor: pointer; transition: all 0.15s;
    }
    .close-btn:hover { color: #fff; border-color: rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.05); }
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(68px, 1fr));
      gap: 0.45rem; padding: 0.9rem 1.1rem; background: rgba(15, 23, 42, 0.4);
      border-bottom: 1px solid var(--surface-border);
    }
    .stat-box {
      background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px; padding: 0.55rem 0.35rem; display: flex;
      flex-direction: column; align-items: center; text-align: center;
    }
    .stat-box.primary { border-color: rgba(45, 212, 191, 0.4); background: rgba(15, 118, 110, 0.15); }
    .stat-box.highlight { border-color: rgba(56, 189, 248, 0.4); background: rgba(14, 165, 233, 0.15); }
    .stat-box.star { border-color: rgba(250, 204, 21, 0.4); background: rgba(234, 179, 8, 0.12); }
    .stat-box .value { font-size: 1.1rem; font-weight: 800; color: #f8fafc; }
    .stat-box.primary .value { color: #86efac; }
    .stat-box.highlight .value { color: #38bdf8; }
    .stat-box.star .value { color: #facc15; }
    .stat-box .label { font-size: 0.66rem; color: var(--text-muted); text-transform: uppercase; margin-top: 0.15rem; }
    .matches-history { padding: 1rem 1.1rem 1.1rem; overflow-y: auto; flex: 1; }
    h3 { margin: 0 0 0.75rem; font-size: 0.88rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .empty-matches { margin: 0; color: var(--text-muted); font-size: 0.86rem; text-align: center; padding: 1.5rem; }
    .history-list { display: grid; gap: 0.5rem; }
    .match-item {
      background: #111b33; border: 1px solid var(--surface-border);
      border-left: 4px solid var(--surface-border); border-radius: 10px; padding: 0.6rem 0.75rem;
    }
    .match-item.win { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.06); }
    .match-item.draw { border-left-color: #eab308; background: rgba(234, 179, 8, 0.06); }
    .match-item.loss { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.06); }
    .match-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .match-header strong { font-size: 0.88rem; }
    .match-header time { display: block; font-size: 0.74rem; color: var(--text-muted); }
    .badges { display: flex; gap: 0.35rem; align-items: center; }
    .badge { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 6px; text-transform: uppercase; }
    .badge.win { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .badge.draw { background: rgba(234, 179, 8, 0.2); color: #fde047; }
    .badge.loss { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .badge.mvp { background: rgba(234, 179, 8, 0.25); color: #fef08a; border: 1px solid rgba(250, 204, 21, 0.4); }
    .match-details { margin-top: 0.35rem; font-size: 0.78rem; display: grid; gap: 0.12rem; }
    .match-details p { margin: 0; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .match-details .muted { color: var(--text-muted); font-weight: 600; }
  `;
}
