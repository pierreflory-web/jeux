/* Mes Jeux — module de points partagé.
   Chargé par les jeux : <script src="https://pierreflory-web.github.io/jeux/points.js"></script>
   Usage à la victoire : MesJeux.award('cowboy', [[50,'Victoire'],[20,'Capturé en moins de 8 min']])
   Règle : première victoire du jour = plein tarif ; les suivantes le même jour = 10 points. */
(function () {
  const SB_URL = "https://xmuohrglecqtpoyzssfj.supabase.co/rest/v1";
  const SB_KEY = "sb_publishable_Y9EMQFz64Vt0n1GAs9wv1A_ciDRgNVz";
  const SESSION_KEY = "mesjeux_session";

  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }

  async function sb(path, options) {
    const res = await fetch(SB_URL + path, Object.assign({}, options, {
      headers: {
        "apikey": SB_KEY,
        "Authorization": "Bearer " + SB_KEY,
        "Content-Type": "application/json"
      }
    }));
    if (!res.ok) throw new Error("supabase " + res.status);
    return res.status === 204 ? null : res.json();
  }

  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  async function award(gameId, lines) {
    const s = session();
    if (!s) { toast(null, [], null, 0, 0); return; }
    try {
      const rows = await sb("/players?select=id,pseudo,points,coins,wins&id=eq." + s.id);
      const row = rows[0];
      if (!row) return;
      const wins = row.wins || {};
      const repeat = wins[gameId] === today();
      let detail, total;
      if (repeat) {
        detail = [[10, "Déjà vainqueur aujourd'hui"]];
        total = 10;
      } else {
        detail = lines;
        total = lines.reduce(function (a, l) { return a + l[0]; }, 0);
        wins[gameId] = today();
      }
      const pieces = Math.max(1, Math.round(total / 10));
      await sb("/players?id=eq." + s.id, {
        method: "PATCH",
        body: JSON.stringify({ points: row.points + total, coins: (row.coins || 0) + pieces, wins: wins })
      });
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, s, { points: row.points + total })));
      } catch (e) {}
      toast(s.pseudo, detail, row.points + total, pieces, (row.coins || 0) + pieces);
    } catch (e) { /* pas de réseau : la victoire reste, les points attendront */ }
  }

  function toast(pseudo, detail, total, pieces, totalPieces) {
    const old = document.getElementById("mesjeux-toast");
    if (old) old.remove();
    const el = document.createElement("div");
    el.id = "mesjeux-toast";
    el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;" +
      "background:#2a1445;color:#f0eaff;border:2px solid #ffd27a;border-radius:16px;" +
      "padding:14px 22px;font-family:Georgia,serif;font-size:16px;text-align:center;" +
      "box-shadow:0 8px 30px rgba(0,0,0,.5);max-width:88vw;line-height:1.5;";
    if (!pseudo) {
      el.innerHTML = "⭐ <b>Connecte-toi sur « Mes Jeux »</b> pour gagner des points la prochaine fois !";
    } else {
      const gained = detail.reduce(function (a, l) { return a + l[0]; }, 0);
      el.innerHTML =
        "<div style='font-size:22px;color:#ffd27a;font-weight:bold;'>⭐ +" + gained + " points, " + pseudo + " !</div>" +
        detail.map(function (l) { return "<div style='color:#c9b3e8;font-size:14px;'>+" + l[0] + " — " + l[1] + "</div>"; }).join("") +
        "<div style='margin-top:6px;color:#ffd27a;'>🪙 +" + pieces + " pièce" + (pieces > 1 ? "s" : "") +
        " — Total : " + total + " pts · " + totalPieces + " pièce" + (totalPieces > 1 ? "s" : "") + "</div>";
    }
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 9000);
  }

  window.MesJeux = { award: award, session: session };
})();
