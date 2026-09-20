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
    voltigeuse:    ["🧹", "Voltigeuse", "Traverser 10 anneaux d'un vol (Witch)"],
    grande_voltige:["🥇", "Grande Voltige", "20 anneaux d'un vol — le cadre Or est offert"],
    cube_combo:    ["🔥", "Combo Max", "Multiplicateur x8 sur Cubix"],
    cube_survivant:["🛡️", "Survivant", "Atteindre la vague 5 de Cubix"],
    cube_millier:  ["🟦", "Millier", "1 000 points en une partie de Cubix"],
    postier:       ["📬", "Postier", "Attraper 10 lettres d'une course (Courrier Express)"],
    grand_galop:   ["🐎", "Grand Galop", "Parcourir 1 000 m d'une course (Courrier Express)"],
    messager:      ["📯", "Messager Légendaire", "2 000 m d'une course — le courrier est passé !"],
    fermier:       ["🌾", "Fermier", "S'occuper de son ranch"],
    eleveur:       ["🐮", "Grand éleveur", "8 animaux au ranch"],
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
    { game: "mini",   match: null,             label: "Réussis le mini-jeu du jour",                effet: 10,  texte: "+10 points !" },
    { game: "ranch",  match: null,             label: "Soigne tous les animaux de ton ranch",       effet: 10,  texte: "+10 points !" },
    { game: "witch",  match: "10 anneaux et plus", label: "Traverse 10 anneaux et plus d'un vol (Witch)", effet: "x2", texte: "pièces doublées !" },
    { game: "cubix",  match: "vague 5",          label: "Atteins la vague 5 sur Cubix",               effet: "x2", texte: "pièces doublées !" },
    { game: "courrier", match: "10 lettres",     label: "Attrape 10 lettres et plus d'une course (Courrier Express)", effet: "x2", texte: "pièces doublées !" }
  ];
  function defiDuJour() { return DEFIS[daySeed() % DEFIS.length]; }

  // ——— Journal des exploits (fil des nouvelles du Saloon) ———
  function evenement(emoji, texte) {
    // silencieux : si la table n'existe pas encore, tant pis
    sb("/events", { method: "POST", body: JSON.stringify({ emoji: emoji, texte: texte }) }).catch(function () {});
  }

  // ——— Attribution des gains ———
  async function award(gameId, lines, extra) {
    extra = extra || {};
    const s = session();
    if (!s) { toast(null, [], null, 0, 0, []); return; }
    try {
      const rows = await sb("/players?select=id,pseudo,points,coins,wins,badges,week_points,week_id,stats&id=eq." + s.id);
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
        if (gameId === "ranch") gagne("fermier");
        if (gameId === "ranch" && extra.animaux >= 8) gagne("eleveur");
      }
      // les badges de Witch dépendent du score du vol, même en repartie
      if (gameId === "witch" && extra.anneaux >= 10) gagne("voltigeuse");
      if (gameId === "witch" && extra.anneaux >= 20) gagne("grande_voltige");
      // les badges de Cubix dépendent de la partie, même en repartie
      if (gameId === "cubix" && extra.combo >= 8) gagne("cube_combo");
      if (gameId === "cubix" && extra.vague >= 5) gagne("cube_survivant");
      if (gameId === "cubix" && extra.score >= 1000) gagne("cube_millier");
      // les badges du Courrier Express dépendent de la course, même en repartie
      if (gameId === "courrier" && extra.lettres >= 10) gagne("postier");
      if (gameId === "courrier" && extra.m >= 1000) gagne("grand_galop");
      if (gameId === "courrier" && extra.m >= 2000) gagne("messager");
      // la Grande Voltige offre le cadre Or de la boutique
      let statsMaj = null;
      if (nouveaux.indexOf("grande_voltige") !== -1) {
        const st = row.stats || {};
        const cadres = (st.cadres || []).slice();
        if (cadres.indexOf("or") === -1) {
          cadres.push("or");
          statsMaj = Object.assign({}, st, { cadres: cadres });
        }
      }
      // chaque badge gagné rapporte 10 pièces
      let coinsApres = (row.coins || 0) + pieces + nouveaux.length * 10;
      if (coinsApres >= 100) gagne("econome");
      coinsApres = (row.coins || 0) + pieces + nouveaux.length * 10;

      const wk = weekId();
      const maj = {
        points: row.points + total,
        coins: coinsApres,
        wins: wins,
        badges: badges,
        week_points: (row.week_id === wk ? (row.week_points || 0) : 0) + total,
        week_id: wk
      };
      if (statsMaj) maj.stats = statsMaj;
      await sb("/players?id=eq." + s.id, {
        method: "PATCH",
        body: JSON.stringify(maj)
      });
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, s, { points: row.points + total })));
      } catch (e) {}
      toast(s.pseudo, detail, row.points + total, pieces, coinsApres, nouveaux);
      // le fil des exploits
      if (!repeat) {
        if (gameId === "cowboy") {
          const t = extra.secs != null ? " en " + Math.floor(extra.secs / 60) + " min " + (extra.secs % 60) + " s" : "";
          evenement("🤠", s.pseudo + " a capturé Mac Blain" + t + " !");
        }
        if (gameId === "quest") evenement("🔎", s.pseudo + " a résolu l'enquête Quest !");
        if (gameId === "ranch") {
          const n = extra.animaux || 0;
          evenement("🌾", s.pseudo + " a soigné " + (n > 1 ? "ses " + n + " animaux au ranch" : "son ranch") + " !");
        }
        if (gameId === "witch") {
          const n = extra.anneaux || 0;
          evenement("🧙", s.pseudo + " a traversé " + n + " anneau" + (n > 1 ? "x" : "") + " sur son balai !");
        }
        if (gameId === "cubix") {
          evenement("🟦", s.pseudo + " a marqué " + (extra.score || 0) + " points au canon de Cubix !");
        }
        if (gameId === "courrier") {
          evenement("📬", s.pseudo + " a galopé " + (extra.m || 0) + " m et livré " + (extra.lettres || 0) + " lettre" + ((extra.lettres || 0) > 1 ? "s" : "") + " !");
        }
        if (gameId === "saloon") evenement("📜", s.pseudo + " a livré la commande du saloon !");
      }
      nouveaux.forEach(function (b) {
        evenement("🎖️", s.pseudo + " a gagné le badge " + BADGES[b][0] + " " + BADGES[b][1] + " !");
      });
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
        ((nouveauxBadges || []).indexOf("grande_voltige") !== -1
          ? "<div style='color:#ffd27a;font-size:14px;'>🖼️ Le cadre <b>Or</b> est à toi — offert !</div>" : "") +
        "<div style='margin-top:6px;color:#ffd27a;'>🪙 +" + pieces + " pièce" + (pieces > 1 ? "s" : "") +
        " — Total : " + total + " pts · " + totalPieces + " pièce" + (totalPieces > 1 ? "s" : "") + "</div>";
    }
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 9000);
  }

  window.MesJeux = {
    award: award, session: session, defiDuJour: defiDuJour, evenement: evenement,
    BADGES: BADGES, weekId: weekId, daySeed: daySeed, today: today
  };
})();
