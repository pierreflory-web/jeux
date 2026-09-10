/* Mes Jeux — les 7 jeux-minute quotidiens.
   Un jeu par jour de la semaine ; le tirage du jour est le même pour tous les joueurs
   (graine = la date), pour comparer les chronos en famille. */
(function () {
  const style = document.createElement("style");
  style.textContent = `
  .mj-head { text-align:center; color:var(--muted); font-size:16px; margin:4px 0 16px; min-height:24px; }
  .mj-grid { display:grid; gap:10px; width:100%; max-width:420px; margin:0 auto; }
  .mj-carte {
    border:2px solid #5c3a18; border-radius:12px; background:#8a5a2b;
    color:#e8d9b8; font-size:34px; aspect-ratio:3/3.6; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition: transform .15s;
  }
  .mj-carte:active { transform: scale(.95); }
  .mj-carte.vue { background:#2b1d52; border-color:#8a76b8; }
  .mj-carte.ok { background:#153c30; border-color:#2ee6a8; }
  .mj-cell {
    border:1px solid var(--border); border-radius:12px; background:var(--bg-card);
    font-size:30px; padding:10px 0; cursor:pointer;
  }
  .mj-cell:active { transform: scale(.93); }
  .mj-simon { width:120px; height:120px; border-radius:22px; border:3px solid #00000055; cursor:pointer; opacity:.55; }
  .mj-simon.allume { opacity:1; transform:scale(1.06); box-shadow:0 0 26px #ffffff88; }
  .mj-clavier { display:flex; flex-wrap:wrap; gap:7px; justify-content:center; max-width:420px; margin:14px auto 0; }
  .mj-clavier button {
    width:40px; height:46px; border-radius:9px; border:1px solid var(--border);
    background:var(--bg-card); color:var(--cream); font-family:inherit; font-size:18px; cursor:pointer;
  }
  .mj-clavier button:disabled { opacity:.3; }
  .mj-mot { text-align:center; font-size:34px; letter-spacing:10px; color:var(--gold); margin:18px 0; font-weight:bold; }
  .mj-champ { position:relative; width:100%; max-width:420px; height:400px; margin:0 auto;
    border:1px solid var(--border); border-radius:16px; background:#22103a; overflow:hidden; }
  .mj-cible { position:absolute; font-size:44px; cursor:pointer; user-select:none; line-height:1; }
  .mj-fin {
    margin:18px auto 0; padding:14px; border-radius:14px; max-width:420px;
    background:#153c30; border:1px solid #2ee6a8; color:#2ee6a8;
    font-size:17px; font-weight:bold; text-align:center;
  }
  .mj-fin.rate { background:#3d1f2e; border-color:#ff9db0; color:#ff9db0; }
  .mj-roue-zone { text-align:center; }
  .mj-roue { transition: transform 4s cubic-bezier(.15,.6,.15,1); }
  .mj-shake { animation: chestshake .4s; }
  `;
  document.head.appendChild(style);

  // ——— Aléatoire commun du jour (mulberry32) ———
  function rngDuJour(sel) {
    let a = (window.MesJeux ? MesJeux.daySeed() : 20260101) + (sel || 0);
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function melange(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const JEUX = {
    1: { id: "memory",  nom: "Le Mémory du Saloon",    emoji: "🃏" },
    2: { id: "intrus",  nom: "L'Intrus",               emoji: "🕵️" },
    3: { id: "simon",   nom: "Le Simon du Télégraphe", emoji: "🚦" },
    4: { id: "pendu",   nom: "Le Pendu du Far West",   emoji: "🤠" },
    5: { id: "calcul",  nom: "Calcul au Comptoir",     emoji: "🧮" },
    6: { id: "reflexe", nom: "Tir au Réflexe",         emoji: "🎯" },
    0: { id: "roue",    nom: "La Roue de la Fortune",  emoji: "🎡" }
  };
  function jeuDuJour() { return JEUX[new Date().getDay()]; }

  function fin(zone, texte, rate, onRetry) {
    const d = document.createElement("div");
    d.className = "mj-fin" + (rate ? " rate" : "");
    d.innerHTML = texte + (onRetry ? "<br><button class='btn' style='margin-top:10px;font-size:16px;padding:10px;' id='mjRetry'>Réessayer</button>" : "");
    zone.appendChild(d);
    if (onRetry) d.querySelector("#mjRetry").onclick = onRetry;
    d.scrollIntoView({ block: "nearest" });
  }

  // ——— 1. Mémory ———
  function memory(zone, onFini) {
    const POOL = ["🤠","🐴","🌵","⭐","🎩","🐍","🦅","💰","🔫","🚂","🃏","🥃","🐄","🌪️","🏜️","🪕"];
    const rnd = rngDuJour(1);
    const paires = melange(POOL, rnd).slice(0, 6);
    const cartes = melange(paires.concat(paires), rnd);
    zone.innerHTML = `<p class="mj-head" id="mjInfo">Retrouve les 6 paires ! ⏱ <span id="mjT">0</span> s</p>
      <div class="mj-grid" style="grid-template-columns:repeat(4,1fr);" id="mjG"></div>`;
    const g = zone.querySelector("#mjG");
    let ouverte = null, verrou = false, trouvees = 0, secs = 0;
    const timer = setInterval(() => { secs++; zone.querySelector("#mjT").textContent = secs; }, 1000);
    cartes.forEach((em, i) => {
      const b = document.createElement("button");
      b.className = "mj-carte";
      b.textContent = "★";
      b.onclick = () => {
        if (verrou || b.classList.contains("vue") || b.classList.contains("ok")) return;
        b.textContent = em; b.classList.add("vue");
        if (!ouverte) { ouverte = b; return; }
        const a = ouverte; ouverte = null;
        if (a.textContent === em) {
          a.classList.replace("vue", "ok"); b.classList.replace("vue", "ok");
          if (++trouvees === 6) {
            clearInterval(timer);
            fin(zone, `Bravo ! Toutes les paires en ${secs} s`);
            onFini(true);
          }
        } else {
          verrou = true;
          setTimeout(() => { a.textContent = b.textContent = "★"; a.classList.remove("vue"); b.classList.remove("vue"); verrou = false; }, 750);
        }
      };
      g.appendChild(b);
    });
  }

  // ——— 2. L'Intrus ———
  function intrus(zone, onFini) {
    const PAIRES = [["🍏","🍐"],["🌛","🌜"],["😀","😄"],["🐢","🐊"],["🌷","🌹"],["⭐","🌟"],["🐶","🐺"],["🍩","🍪"],["🐤","🐥"],["🌝","🌕"]];
    const rnd = rngDuJour(2);
    const manches = melange(PAIRES, rnd).slice(0, 3);
    const tailles = [12, 16, 20];
    let m = 0;
    function manche() {
      const [base, lintrus] = rnd() < 0.5 ? manches[m] : [manches[m][1], manches[m][0]];
      const n = tailles[m];
      const pos = Math.floor(rnd() * n);
      zone.innerHTML = `<p class="mj-head">Manche ${m + 1}/3 — trouve l'intrus !</p>
        <div class="mj-grid" style="grid-template-columns:repeat(4,1fr);" id="mjG"></div>`;
      const g = zone.querySelector("#mjG");
      for (let i = 0; i < n; i++) {
        const b = document.createElement("button");
        b.className = "mj-cell";
        b.textContent = i === pos ? lintrus : base;
        b.onclick = () => {
          if (i === pos) {
            if (++m === 3) { fin(zone, "Œil de lynx ! Les 3 intrus démasqués !"); onFini(true); }
            else manche();
          } else {
            b.classList.add("mj-shake");
            setTimeout(() => b.classList.remove("mj-shake"), 400);
          }
        };
        g.appendChild(b);
      }
    }
    manche();
  }

  // ——— 3. Simon ———
  function simon(zone, onFini) {
    const COULEURS = ["#d94f3d", "#2ee6a8", "#4f8fd9", "#ffd27a"];
    const rnd = rngDuJour(3);
    const seq = Array.from({ length: 5 }, () => Math.floor(rnd() * 4));
    zone.innerHTML = `<p class="mj-head" id="mjInfo">Regarde bien la séquence…</p>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:270px;margin:0 auto;" id="mjG"></div>`;
    const g = zone.querySelector("#mjG");
    const info = zone.querySelector("#mjInfo");
    const btns = COULEURS.map((c, i) => {
      const b = document.createElement("button");
      b.className = "mj-simon";
      b.style.background = c;
      b.onclick = () => taper(i);
      g.appendChild(b);
      return b;
    });
    let niveau = 1, attendu = [], enLecture = true;
    function allume(i, ms) {
      return new Promise(res => {
        btns[i].classList.add("allume");
        setTimeout(() => { btns[i].classList.remove("allume"); setTimeout(res, 160); }, ms);
      });
    }
    async function montre() {
      enLecture = true;
      info.textContent = `Niveau ${niveau}/5 — regarde…`;
      await new Promise(r => setTimeout(r, 700));
      for (let i = 0; i < niveau; i++) await allume(seq[i], 480);
      attendu = seq.slice(0, niveau);
      enLecture = false;
      info.textContent = `Niveau ${niveau}/5 — à toi !`;
    }
    async function taper(i) {
      if (enLecture) return;
      await allume(i, 180);
      if (i === attendu.shift()) {
        if (!attendu.length) {
          if (niveau === 5) { fin(zone, "Mémoire de télégraphiste — niveau 5 atteint !"); onFini(true); return; }
          niveau++; montre();
        }
      } else {
        info.textContent = "Raté ! On reprend au niveau 1…";
        niveau = 1;
        setTimeout(montre, 900);
      }
    }
    montre();
  }

  // ——— 4. Pendu ———
  function pendu(zone, onFini) {
    const MOTS = ["CACTUS","SHERIF","SALOON","COWBOY","LASSO","PEPITE","BANDIT","PRAIRIE","BISON","RANCH",
      "DILIGENCE","CANYON","CHEVAL","CHAPEAU","BOTTES","TRESOR","COFFRE","ETOILE","FUSEE","ROBOT",
      "ENQUETE","INDICE","AVATAR","LICORNE","DRAGON","PIRATE","MAGICIEN","VAMPIRE","FANTOME","GALAXIE",
      "PLANETE","COMETE","DESERT","RODEO","TIPI","TOTEM","WAGON","MUSTANG","PONCHO","HARMONICA"];
    const mot = MOTS[MesJeux.daySeed() % MOTS.length];
    const ETAPES = ["", "🌵", "🌵🐍", "🌵🐍🦅", "🌵🐍🦅🌪️", "🌵🐍🦅🌪️💀"];
    let erreurs = 0, trouvees = new Set();
    zone.innerHTML = `<p class="mj-head" id="mjInfo">Devine le mot du jour !</p>
      <div style="text-align:center;font-size:30px;min-height:40px;" id="mjE"></div>
      <div class="mj-mot" id="mjMot"></div>
      <div class="mj-clavier" id="mjK"></div>`;
    const affiche = () => {
      zone.querySelector("#mjMot").textContent = [...mot].map(l => trouvees.has(l) ? l : "_").join(" ");
      zone.querySelector("#mjE").textContent = ETAPES[erreurs];
      zone.querySelector("#mjInfo").textContent = erreurs ? `Attention : ${5 - erreurs} essai${5 - erreurs > 1 ? "s" : ""} restant !` : "Devine le mot du jour !";
    };
    const k = zone.querySelector("#mjK");
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(l => {
      const b = document.createElement("button");
      b.textContent = l;
      b.onclick = () => {
        b.disabled = true;
        if (mot.includes(l)) {
          trouvees.add(l);
          affiche();
          if ([...mot].every(c => trouvees.has(c))) { fin(zone, `Le mot était ${mot} — bien joué, shérif !`); onFini(true); }
        } else {
          erreurs++;
          affiche();
          if (erreurs === 5) {
            fin(zone, `Perdu ! Le mot était ${mot}…`, true, () => pendu(zone, onFini));
          }
        }
      };
      k.appendChild(b);
    });
    affiche();
  }

  // ——— 5. Calcul ———
  function calcul(zone, onFini) {
    const rnd = rngDuJour(5);
    const questions = [];
    for (let i = 0; i < 5; i++) {
      const t = Math.floor(rnd() * 3);
      let a, b, rep, txt;
      if (t === 0) { a = 3 + Math.floor(rnd() * 40); b = 2 + Math.floor(rnd() * 30); rep = a + b; txt = `${a} + ${b}`; }
      else if (t === 1) { a = 15 + Math.floor(rnd() * 40); b = 2 + Math.floor(rnd() * (a - 5)); rep = a - b; txt = `${a} − ${b}`; }
      else { a = 2 + Math.floor(rnd() * 5); b = 2 + Math.floor(rnd() * 9); rep = a * b; txt = `${a} × ${b}`; }
      questions.push({ txt, rep });
    }
    let q = 0, saisie = "";
    zone.innerHTML = `<p class="mj-head" id="mjInfo"></p>
      <div class="mj-mot" id="mjQ" style="letter-spacing:3px;"></div>
      <div class="mj-mot" id="mjR" style="color:var(--cream);min-height:44px;">&nbsp;</div>
      <div class="pad" id="mjPad" style="margin:0 auto;"></div>`;
    const pad = zone.querySelector("#mjPad");
    ["1","2","3","4","5","6","7","8","9","⌫","0","✓"].forEach(t => {
      const b = document.createElement("button");
      b.textContent = t;
      b.onclick = () => {
        if (t === "⌫") saisie = saisie.slice(0, -1);
        else if (t === "✓") {
          if (parseInt(saisie || "-1", 10) === questions[q].rep) {
            saisie = "";
            if (++q === 5) { fin(zone, "Le compte est bon — la caisse est à toi !"); onFini(true); return; }
          } else {
            saisie = "";
            const r = zone.querySelector("#mjR");
            r.classList.add("mj-shake");
            setTimeout(() => r.classList.remove("mj-shake"), 400);
          }
        }
        else if (saisie.length < 4) saisie += t;
        affiche();
      };
      pad.appendChild(b);
    });
    const affiche = () => {
      zone.querySelector("#mjInfo").textContent = `Addition au comptoir — ${q + 1}/5`;
      zone.querySelector("#mjQ").textContent = questions[q].txt + " = ?";
      zone.querySelector("#mjR").innerHTML = saisie || "&nbsp;";
    };
    affiche();
  }

  // ——— 6. Réflexe ———
  function reflexe(zone, onFini) {
    const rnd = rngDuJour(6);
    zone.innerHTML = `<p class="mj-head" id="mjInfo">Touche les 🎯, évite les 💣 ! Prêt ?</p>
      <div class="mj-champ" id="mjC"></div>`;
    const champ = zone.querySelector("#mjC");
    const info = zone.querySelector("#mjInfo");
    let score = 0, restant = 30, fini = false;
    const go = document.createElement("button");
    go.className = "btn";
    go.textContent = "C'est parti !";
    go.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:auto;padding:14px 30px;";
    champ.appendChild(go);
    go.onclick = () => {
      go.remove();
      const tic = setInterval(() => {
        if (--restant <= 0) {
          clearInterval(tic); clearInterval(spawn); fini = true;
          champ.innerHTML = "";
          if (score >= 10) { fin(zone, `Gâchette d'or : ${score} points !`); onFini(true); }
          else fin(zone, `Seulement ${score}/10… entraîne-toi !`, true, () => reflexe(zone, onFini));
        }
        maj();
      }, 1000);
      const spawn = setInterval(() => {
        if (fini) return;
        const bombe = rnd() < 0.22;
        const c = document.createElement("span");
        c.className = "mj-cible";
        c.textContent = bombe ? "💣" : "🎯";
        c.style.left = 6 + rnd() * 78 + "%";
        c.style.top = 6 + rnd() * 80 + "%";
        c.onclick = () => { score += bombe ? -2 : 1; c.remove(); maj(); };
        champ.appendChild(c);
        setTimeout(() => c.remove(), 1300);
      }, 800);
      maj();
    };
    const maj = () => { info.textContent = `⏱ ${restant} s — Score : ${score} (objectif 10)`; };
  }

  // ——— 7. La Roue ———
  function roue(zone, onFini) {
    const SEGMENTS = [[20, "#d94f3d"], [5, "#4f8fd9"], [15, "#2ee6a8"], [8, "#8a5cd9"], [25, "#ffd27a"], [10, "#4f8fd9"], [3, "#5c8a4f"], [12, "#ff9dd6"]];
    zone.innerHTML = `<div class="mj-roue-zone">
      <p class="mj-head">Tourne la roue — gain surprise du dimanche !</p>
      <div style="font-size:34px;line-height:0.6;">🔻</div>
      <svg viewBox="-105 -105 210 210" width="270" class="mj-roue" id="mjRoue">${
        SEGMENTS.map((s, i) => {
          const a0 = (i * 45 - 90) * Math.PI / 180, a1 = ((i + 1) * 45 - 90) * Math.PI / 180;
          const x0 = 100 * Math.cos(a0), y0 = 100 * Math.sin(a0), x1 = 100 * Math.cos(a1), y1 = 100 * Math.sin(a1);
          const am = (i + 0.5) * 45 - 90, xm = 64 * Math.cos(am * Math.PI / 180), ym = 64 * Math.sin(am * Math.PI / 180);
          return `<path d="M0 0 L${x0.toFixed(1)} ${y0.toFixed(1)} A100 100 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${s[1]}" stroke="#2a1445" stroke-width="2"/>
            <text x="${xm.toFixed(1)}" y="${ym.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="17" font-weight="bold" fill="#2a1445" transform="rotate(${am + 90} ${xm.toFixed(1)} ${ym.toFixed(1)})">${s[0]}</text>`;
        }).join("")
      }<circle r="14" fill="#2a1445" stroke="#ffd27a" stroke-width="3"/></svg><br>
      <button class="btn" id="mjGo" style="max-width:220px;margin:16px auto 0;">Tourner !</button></div>`;
    zone.querySelector("#mjGo").onclick = function () {
      this.disabled = true;
      const seg = Math.floor(Math.random() * 8);
      const deg = 5 * 360 + (360 - (seg * 45 + 22.5));
      const r = zone.querySelector("#mjRoue");
      r.style.transform = `rotate(${deg}deg)`;
      setTimeout(() => {
        const pts = SEGMENTS[seg][0];
        fin(zone, pts <= 3 ? `Le cactus 🌵… ${pts} points de consolation !` : `La roue te donne ${pts} points !`);
        onFini(true, [[pts, "Roue de la fortune du dimanche"]]);
      }, 4300);
    };
  }

  const MOTEURS = { memory, intrus, simon, pendu, calcul, reflexe, roue };
  window.MiniJeux = {
    jeuDuJour,
    lancer(zone, onFini) { MOTEURS[jeuDuJour().id](zone, onFini); },
    lancerJeu(id, zone, onFini) { MOTEURS[id](zone, onFini); }
  };
})();
