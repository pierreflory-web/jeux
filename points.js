/* Mes Jeux — module partagé : points, pièces, défi du jour, semaine, badges.
   Chargé par les jeux et le lanceur :
   <script src="https://pierreflory-web.github.io/jeux/points.js"></script>
   À la victoire : MesJeux.award('cowboy', [[50,'Victoire'],...], {secs: 312})
   Règle : première victoire du jour = plein tarif ; les suivantes = 10 points. */
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

  function fmt(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function today() { return fmt(new Date()); }
  function weekId() { // le lundi de la semaine en cours
    const d = new Date();
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return fmt(d);
  }
  function daySeed() { // même graine pour tous les joueurs un jour donné
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  // ——— Badges ———
  const BADGES = {
    premiere:      ["🥇", "Première victoire", "Gagner une première partie"],
    chasseur:      ["🤠", "Chasseur de prime", "Capturer Mac Blain"],
    detective:     ["🔎", "Détective", "Résoudre l'enquête Quest"],
    eclair:        ["⚡", "Éclair", "Mac Blain en moins de 5 min"],
    sansfaute:     ["🧠", "Sans-faute", "Quest juste du premier coup"],
    fidele:        ["📅", "Fidèle", "7 jours de jeu"],
    veteran:       ["🗓️", "Vétéran", "30 jours de jeu"],
    habitue:       ["🃏", "Habitué du saloon", "10 mini-jeux réussis"],
    collectionneur:["🦁", "Collectionneur", "10 avatars possédés"],
    econome:       ["💰", "Économe", "100 pièces en poche"],
    genereux:      ["🎁", "Généreux", "Offrir un cadeau"],
    champion:      ["🏆", "Champion", "1ᵉʳ du classement de la semaine"]
  };

  // ——— Défi du jour ———
  const DEFIS = [
    { game: "cowboy", match: "évasion",        label: "Capture Mac Blain sans le laisser s'évader", effet: "x2", texte: "pièces doublées !" },
    { game: "cowboy", match: "moins de 8",     label: "Capture Mac Blain en moins de 8 minutes",    effet: 15,  texte: "+15 points !" },
    { game: "quest",  match: "premier coup",   label: "Résous Quest en accusant juste du premier coup", effet: "x2", texte: "pièces doublées !" },
    { game: "quest",  match: "Tous les indices", label: "Résous Quest avec tous les indices",       effet: 15,  texte: "+15 points !" },
    { game: "mini",   match: null,             label: "Réussis le mini-jeu du jour",                effet: 10,  texte: "+10 points !" }
  ];
  function defiDuJour() { return DEFIS[daySeed() % DEFIS.length]; }

  // ——— Attribution des gains ———
  async function award(gameId, lines, extra) {
    extra = extra || {};
    const s = session();
    if (!s) { toast(null, [], null, 0, 0, []); return; }
    try {
      const rows = await sb("/players?select=id,pseudo,points,coins,wins,badges,week_points,week_id&id=eq." + s.id);
      const row = rows[0];
      if (!row) return;
      const wins = row.wins || {};
      const aucuneVictoireAvant = Object.keys(wins).length === 0;
      const repeat = wins[gameId] === today();
      let detail, total;
      if (repeat) {
        detail = [[10, "Déjà vainqueur aujourd'hui"]];
        total = 10;
      } else {
        detail = lines.slice();
        total = lines.reduce(function (a, l) { return a + l[0]; }, 0);
        wins[gameId] = today();
      }
      let pieces = Math.max(1, Math.round(total / 10));

      // défi du jour
      const defi = defiDuJour();
      if (!repeat && defi.game === gameId && (!defi.match || lines.some(function (l) { return l[1].indexOf(defi.match) !== -1; }))) {
        if (defi.effet === "x2") { pieces *= 2; detail.push([0, "🎯 Défi du jour réussi — pièces doublées !"]); }
        else { total += defi.effet; detail.push([defi.effet, "🎯 Défi du jour réussi !"]); }
      }

      // badges gagnés pendant une partie
      const badges = (row.badges || []).slice();
      const nouveaux = [];
      function gagne(id) { if (badges.indexOf(id) === -1) { badges.push(id); nouveaux.push(id); } }
      if (!repeat) {
        if (aucuneVictoireAvant) gagne("premiere");
        if (gameId === "cowboy") gagne("chasseur");
        if (gameId === "quest") gagne("detective");
        if (gameId === "cowboy" && extra.secs != null && extra.secs < 300) gagne("eclair");
        if (gameId === "quest" && lines.some(function (l) { return l[1].indexOf("premier coup") !== -1; })) gagne("sansfaute");
      }
      // chaque badge gagné rapporte 10 pièces
      let coinsApres = (row.coins || 0) + pieces + nouveaux.length * 10;
      if (coinsApres >= 100) gagne("econome");
      coinsApres = (row.coins || 0) + pieces + nouveaux.length * 10;

      const wk = weekId();
      await sb("/players?id=eq." + s.id, {
        method: "PATCH",
        body: JSON.stringify({
          points: row.points + total,
          coins: coinsApres,
          wins: wins,
          badges: badges,
          week_points: (row.week_id === wk ? (row.week_points || 0) : 0) + total,
          week_id: wk
        })
      });
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, s, { points: row.points + total })));
      } catch (e) {}
      toast(s.pseudo, detail, row.points + total, pieces, coinsApres, nouveaux);
      return { total: total, pieces: pieces, nouveauxBadges: nouveaux };
    } catch (e) { /* pas de réseau : la victoire reste, les points attendront */ }
  }

  function toast(pseudo, detail, total, pieces, totalPieces, nouveauxBadges) {
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
        detail.map(function (l) {
          return "<div style='color:" + (l[1].indexOf("🎯") !== -1 ? "#ff9dd6" : "#c9b3e8") + ";font-size:14px;'>" +
            (l[0] ? "+" + l[0] + " — " : "") + l[1] + "</div>";
        }).join("") +
        (nouveauxBadges || []).map(function (b) {
          return "<div style='color:#2ee6a8;font-size:14px;'>🎖️ Nouveau badge : " + BADGES[b][0] + " " + BADGES[b][1] + " ! (+10 🪙)</div>";
        }).join("") +
        "<div style='margin-top:6px;color:#ffd27a;'>🪙 +" + pieces + " pièce" + (pieces > 1 ? "s" : "") +
        " — Total : " + total + " pts · " + totalPieces + " pièce" + (totalPieces > 1 ? "s" : "") + "</div>";
    }
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 9000);
  }

  window.MesJeux = {
    award: award, session: session, defiDuJour: defiDuJour,
    BADGES: BADGES, weekId: weekId, daySeed: daySeed, today: today
  };
})();
