// =====================================================================
//  DEBUG Friend ! - tests guidés, test de chauffe, « Décris le problème »
// =====================================================================
import { etat, h, ecran, tt, api, alerte, annoncer, attendre, dateLocale, journal } from './ui.js';
import { SYMPTOMES, conclure } from './symptomes.js';
import { normaliser } from './regles.js';

let nettoyage = null; // fonction qui arrete le test en cours (ecouteurs, camera, micro…)
function nettoyer() { if (nettoyage) { try { nettoyage(); } catch (e) { /* rien */ } nettoyage = null; } }

const TESTS = [
  ['clavier', 'Clavier et touchpad', 'Keyboard and touchpad', 'Chaque touche s\'allume quand on appuie dessus.', 'Each key lights up when pressed.'],
  ['ecran', 'Écran', 'Screen', 'Noir puis blanc en plein écran : pixels morts, taches, fuites de lumière.', 'Black then white full screen: dead pixels, spots, backlight bleed.'],
  ['son', 'Haut-parleurs', 'Speakers', 'Un son à gauche, puis à droite.', 'A sound on the left, then the right.'],
  ['micro', 'Micro', 'Microphone', 'Enregistrement de 5 secondes, puis réécoute.', '5-second recording, then playback.'],
  ['webcam', 'Webcam', 'Webcam', 'Affiche l\'image de la caméra.', 'Shows the camera picture.'],
  ['usb', 'Ports USB', 'USB ports', 'Un appareil branché sur chaque port.', 'A device plugged into each port.'],
  ['charge', 'Charge de la batterie', 'Battery charging', 'Chargeur débranché puis rebranché.', 'Charger unplugged then plugged back.']
];

export function ecranTests(ctx, direct) {
  nettoyer();
  ctx.menu('tests');
  if (direct) return lancerTest(ctx, direct);
  const faits = etat.testsGuides.filter((r) => r.type === 'test');
  ecran(
    h('h1', null, tt('Tests guidés', 'Guided tests')),
    h('p', null, tt('Pour ce que Windows ne peut pas voir tout seul. Le logiciel guide, toi ou le client constatez.', 'For what Windows cannot see by itself. The app guides, you or the customer observe.')),
    !etat.analyse ? h('p', { class: 'petit' }, tt('Astuce : lance d\'abord une analyse, pour que les résultats des tests soient rangés avec ce PC dans l\'historique.', 'Tip: run an analysis first, so test results are stored with this PC in the history.')) : null,
    h('div', { class: 'grille' }, TESTS.map(([id, fr, en, dfr, den]) => h('button', { type: 'button', class: 'tuile', onclick: () => lancerTest(ctx, id) }, h('b', null, tt(fr, en)), tt(dfr, den)))),
    faits.length ? [h('h2', null, tt('Déjà faits pendant cette session', 'Done in this session')),
      h('table', null, h('tbody', null, faits.map((r) => h('tr', null, h('td', null, dateLocale(r.date)), h('td', null, r.nom), h('td', null, r.resultat === 'ok' ? tt('OK', 'OK') : tt('Problème', 'Problem')), h('td', null, r.detail || '')))))] : null
  );
}

function lancerTest(ctx, id) {
  nettoyer();
  const f = { clavier: testClavier, ecran: testEcran, son: testSon, micro: testMicro, webcam: testWebcam, usb: testUsb, charge: testCharge }[id];
  if (f) f(ctx);
}

async function conclureTest(ctx, id, resultat, detail) {
  nettoyer();
  const t = TESTS.find((x) => x[0] === id);
  await ctx.enregistrerTest({ type: 'test', test: id, nom: t ? tt(t[1], t[2]) : id, date: new Date().toISOString(), resultat, detail: detail || '' });
  annoncer(tt('Résultat enregistré.', 'Result saved.'));
  ecranTests(ctx);
}

function boutonsResultat(ctx, id, detailOk, detailPb) {
  const note = h('input', { type: 'text', id: 'note', maxlength: '200', placeholder: tt('Note (facultatif)', 'Note (optional)') });
  return h('div', null,
    h('label', { for: 'note' }, tt('Ce que tu as constaté', 'What you observed')), note,
    h('div', { class: 'boutons' },
      h('button', { class: 'principal', onclick: () => conclureTest(ctx, id, 'ok', [typeof detailOk === 'function' ? detailOk() : detailOk, note.value].filter(Boolean).join(' — ')) }, tt('Tout fonctionne', 'Everything works')),
      h('button', { onclick: () => conclureTest(ctx, id, 'probleme', [typeof detailPb === 'function' ? detailPb() : detailPb, note.value].filter(Boolean).join(' — ')) }, tt('Il y a un problème', 'There is a problem')),
      h('button', { onclick: () => ecranTests(ctx) }, tt('Annuler', 'Cancel'))));
}

// ------------------------------------------------------------- clavier et touchpad
const AZERTY = [
  [['Escape', 'Échap'], ['F1'], ['F2'], ['F3'], ['F4'], ['F5'], ['F6'], ['F7'], ['F8'], ['F9'], ['F10'], ['F11'], ['F12'], ['Insert', 'Inser'], ['Delete', 'Suppr']],
  [['Backquote', '²'], ['Digit1', '&1'], ['Digit2', 'é2'], ['Digit3', '"3'], ['Digit4', '\'4'], ['Digit5', '(5'], ['Digit6', '-6'], ['Digit7', 'è7'], ['Digit8', '_8'], ['Digit9', 'ç9'], ['Digit0', 'à0'], ['Minus', ')°'], ['Equal', '=+'], ['Backspace', '⌫']],
  [['Tab', 'Tab'], ['KeyQ', 'A'], ['KeyW', 'Z'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'], ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'], ['BracketLeft', '^'], ['BracketRight', '$'], ['Enter', 'Entrée']],
  [['CapsLock', 'Verr.Maj'], ['KeyA', 'Q'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', 'M'], ['Quote', 'ù'], ['Backslash', '*']],
  [['ShiftLeft', 'Maj'], ['IntlBackslash', '<'], ['KeyZ', 'W'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'], ['KeyM', ','], ['Comma', ';'], ['Period', ':'], ['Slash', '!'], ['ShiftRight', 'Maj']],
  [['ControlLeft', 'Ctrl'], ['MetaLeft', 'Win'], ['AltLeft', 'Alt'], ['Space', 'Espace'], ['AltRight', 'Alt Gr'], ['ContextMenu', 'Menu'], ['ControlRight', 'Ctrl'], ['ArrowLeft', '←'], ['ArrowUp', '↑'], ['ArrowDown', '↓'], ['ArrowRight', '→']],
  [['Home', 'Début'], ['End', 'Fin'], ['PageUp', 'Pg.Préc'], ['PageDown', 'Pg.Suiv'], ['NumLock', 'Verr.Num'], ['Numpad0', 'Pavé 0'], ['Numpad1', '1'], ['Numpad2', '2'], ['Numpad3', '3'], ['Numpad4', '4'], ['Numpad5', '5'], ['Numpad6', '6'], ['Numpad7', '7'], ['Numpad8', '8'], ['Numpad9', '9'], ['NumpadEnter', 'Entrée pavé']]
];

function testClavier(ctx) {
  const touches = {};
  const vues = new Set();
  const autres = h('p', { class: 'petit' });
  const rangees = AZERTY.map((r) => h('div', { class: 'rangee' }, r.map(([code, label]) => (touches[code] = h('span', { class: 'touche', 'data-code': code }, label || code)))));
  const pad = { bouge: false, gauche: false, droit: false, defile: false };
  const etatPad = h('p', { role: 'status' });
  const majPad = () => {
    etatPad.textContent = [
      (pad.bouge ? '✓ ' : '○ ') + tt('déplacement', 'movement'), (pad.gauche ? '✓ ' : '○ ') + tt('clic gauche', 'left click'),
      (pad.droit ? '✓ ' : '○ ') + tt('clic droit', 'right click'), (pad.defile ? '✓ ' : '○ ') + tt('défilement à deux doigts', 'two-finger scroll')
    ].join('   ');
  };
  const zone = h('div', { class: 'zone-touchpad', tabindex: '0' }, tt('Bouge le doigt ici, fais un clic gauche, un clic droit, puis fais défiler avec deux doigts.', 'Move your finger here, left-click, right-click, then scroll with two fingers.'));
  zone.addEventListener('mousemove', () => { if (!pad.bouge) { pad.bouge = true; majPad(); } });
  zone.addEventListener('click', () => { pad.gauche = true; majPad(); });
  zone.addEventListener('contextmenu', (e) => { e.preventDefault(); pad.droit = true; majPad(); });
  zone.addEventListener('wheel', (e) => { e.preventDefault(); pad.defile = true; majPad(); }, { passive: false });
  majPad();
  const ecoute = (e) => {
    if (e.target && e.target.id === 'note') return;
    e.preventDefault();
    const el = touches[e.code];
    if (el) el.classList.add('ok');
    else if (e.code) { vues.add(e.code); autres.textContent = tt('Autres touches reconnues : ', 'Other keys detected: ') + Array.from(vues).join(', '); }
    if (!vues.has(e.code)) vues.add(e.code);
  };
  document.addEventListener('keydown', ecoute, true);
  nettoyage = () => document.removeEventListener('keydown', ecoute, true);
  const manquantes = () => Object.keys(touches).filter((c) => !touches[c].classList.contains('ok')).map((c) => touches[c].textContent);
  ecran(
    h('h1', null, tt('Test du clavier et du touchpad', 'Keyboard and touchpad test')),
    h('p', null, tt('Appuie sur chaque touche une par une : elle passe en blanc quand elle répond. Les touches Fn, Windows + L et Alt + F4 ne peuvent pas être testées ici.', 'Press each key one at a time: it turns white when it responds. Fn, Windows + L and Alt + F4 cannot be tested here.')),
    h('p', { class: 'petit' }, tt('Disposition française (AZERTY). Sur un portable sans pavé numérique, ignore la dernière ligne.', 'French layout (AZERTY). On a laptop without a number pad, ignore the last row.')),
    h('div', { class: 'clavier' }, rangees), autres,
    h('h2', null, tt('Touchpad ou souris', 'Touchpad or mouse')), zone, etatPad,
    boutonsResultat(ctx, 'clavier',
      () => tt('Touches non pressées : ', 'Keys not pressed: ') + (manquantes().join(' ') || tt('aucune', 'none')),
      () => tt('Touches sans réponse : ', 'Unresponsive keys: ') + (manquantes().join(' ') || '?') + ' | ' + etatPad.textContent)
  );
}

// ------------------------------------------------------------- ecran
function testEcran(ctx) {
  ecran(
    h('h1', null, tt('Test de l\'écran', 'Screen test')),
    h('ol', null,
      h('li', null, tt('Clique sur « Commencer » : l\'écran devient entièrement noir.', 'Click "Start": the screen turns fully black.')),
      h('li', null, tt('Sur le noir, cherche les points allumés et les fuites de lumière sur les bords.', 'On black, look for lit dots and light bleeding at the edges.')),
      h('li', null, tt('Clique pour passer au blanc : cherche les points noirs et les taches.', 'Click to switch to white: look for black dots and spots.')),
      h('li', null, tt('Clique encore (ou Échap) pour sortir.', 'Click again (or Esc) to leave.'))),
    h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: () => pleinEcran(ctx) }, tt('Commencer', 'Start'))),
    boutonsResultat(ctx, 'ecran', tt('Aucun défaut vu sur noir et sur blanc', 'No defect seen on black and white'), tt('Défaut vu à l\'écran', 'Defect seen on screen'))
  );
}

function pleinEcran() {
  const z = h('div', { class: 'plein-ecran noir', role: 'button', 'aria-label': tt('Écran de test', 'Test screen') }, h('span', { class: 'petit' }, tt('Clique pour passer au blanc', 'Click to switch to white')));
  let etape = 0;
  const sortir = () => { document.removeEventListener('keydown', echap, true); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); z.remove(); };
  const echap = (e) => { if (e.key === 'Escape') sortir(); };
  z.addEventListener('click', () => {
    etape++;
    if (etape === 1) { z.className = 'plein-ecran blanc'; z.firstChild.textContent = tt('Clique pour terminer', 'Click to finish'); }
    else sortir();
  });
  document.addEventListener('keydown', echap, true);
  document.body.appendChild(z);
  if (z.requestFullscreen) z.requestFullscreen().catch(() => {});
}

// ------------------------------------------------------------- haut-parleurs
function testSon(ctx) {
  let ac = null;
  const jouer = async (pan) => {
    if (!ac) ac = new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    const p = ac.createStereoPanner();
    o.frequency.value = 440;
    g.gain.value = 0.25;
    p.pan.value = pan;
    o.connect(g).connect(p).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 1.2);
  };
  nettoyage = () => { if (ac) ac.close().catch(() => {}); };
  ecran(
    h('h1', null, tt('Test des haut-parleurs', 'Speaker test')),
    h('p', null, tt('Monte un peu le volume. Chaque bouton joue un son de 1 seconde.', 'Turn the volume up a little. Each button plays a 1-second sound.')),
    h('div', { class: 'boutons' },
      h('button', { onclick: () => jouer(-1) }, tt('Son à gauche', 'Left sound')),
      h('button', { onclick: () => jouer(1) }, tt('Son à droite', 'Right sound')),
      h('button', { onclick: () => jouer(0) }, tt('Les deux', 'Both'))),
    h('p', { class: 'petit' }, tt('Le son vient du bon côté, sans grésillement ? Teste aussi la prise casque si besoin.', 'Does the sound come from the right side, without crackling? Also test the headphone jack if needed.')),
    boutonsResultat(ctx, 'son', tt('Gauche et droite corrects', 'Left and right correct'), tt('Problème de son', 'Sound problem'))
  );
}

// ------------------------------------------------------------- micro
function testMicro(ctx) {
  const niveau = h('p', { class: 'mesures', role: 'status' }, '');
  const lecteur = h('audio', { controls: true });
  let flux = null;
  let ac = null;
  let anim = null;
  nettoyage = () => { if (flux) flux.getTracks().forEach((t) => t.stop()); if (ac) ac.close().catch(() => {}); if (anim) cancelAnimationFrame(anim); };
  const demarrer = async () => {
    try {
      flux = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return alerte(tt('Micro inaccessible : ', 'Microphone unavailable: ') + e.message + tt('. Vérifie la confidentialité du micro dans Windows et l\'autorisation demandée par le navigateur.', '. Check microphone privacy in Windows and the browser permission.'));
    }
    ac = new AudioContext();
    const src = ac.createMediaStreamSource(flux);
    const an = ac.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    let max = 0;
    const tic = () => {
      an.getByteTimeDomainData(buf);
      let pic = 0;
      for (const v of buf) pic = Math.max(pic, Math.abs(v - 128));
      max = Math.max(max, pic);
      niveau.textContent = tt('Niveau : ', 'Level: ') + '█'.repeat(Math.round(pic / 4)) + ' ' + Math.round((pic / 128) * 100) + ' %';
      anim = requestAnimationFrame(tic);
    };
    tic();
    const rec = new MediaRecorder(flux);
    const morceaux = [];
    rec.ondataavailable = (e) => morceaux.push(e.data);
    rec.onstop = () => { lecteur.src = URL.createObjectURL(new Blob(morceaux, { type: rec.mimeType })); annoncer(tt('Enregistrement terminé : écoute-le.', 'Recording finished: play it back.')); };
    rec.start();
    annoncer(tt('Parle maintenant pendant 5 secondes.', 'Speak now for 5 seconds.'));
    await attendre(5000);
    rec.stop();
  };
  ecran(
    h('h1', null, tt('Test du micro', 'Microphone test')),
    h('p', null, tt('Le navigateur va demander l\'accès au micro : accepte. Parle 5 secondes, puis réécoute.', 'The browser will ask for microphone access: allow it. Speak for 5 seconds, then play it back.')),
    h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: demarrer }, tt('Enregistrer 5 secondes', 'Record 5 seconds'))),
    niveau, lecteur,
    boutonsResultat(ctx, 'micro', tt('Voix enregistrée et claire', 'Voice recorded and clear'), tt('Micro muet ou voix déformée', 'Mic silent or voice distorted'))
  );
}

// ------------------------------------------------------------- webcam
function testWebcam(ctx) {
  const video = h('video', { autoplay: true, playsinline: true, muted: true, width: '480' });
  let flux = null;
  nettoyage = () => { if (flux) flux.getTracks().forEach((t) => t.stop()); };
  ecran(
    h('h1', null, tt('Test de la webcam', 'Webcam test')),
    h('p', null, tt('Le navigateur va demander l\'accès à la caméra : accepte. Vérifie l\'image : nette, pas noire, bonnes couleurs.', 'The browser will ask for camera access: allow it. Check the picture: sharp, not black, correct colours.')),
    h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: async () => {
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = flux;
      } catch (e) {
        alerte(tt('Caméra inaccessible : ', 'Camera unavailable: ') + e.message + tt('. Vérifie le cache ou la touche de la webcam, la confidentialité de la caméra dans Windows et l\'autorisation du navigateur.', '. Check the webcam shutter or key, camera privacy in Windows and the browser permission.'));
      }
    } }, tt('Allumer la caméra', 'Turn the camera on'))),
    video,
    boutonsResultat(ctx, 'webcam', tt('Image correcte', 'Picture correct'), tt('Pas d\'image ou image défectueuse', 'No picture or faulty picture'))
  );
}

// ------------------------------------------------------------- ports USB
async function appareilsUsb() {
  const r = await api('/api/collecte', { corps: { module: 'usb' } });
  const d = normaliser(r.donnees || {});
  return Array.isArray(d.appareils) ? d.appareils : [];
}

function testUsb(ctx) {
  const ports = [];
  const liste = h('ol');
  const statut = h('p', { role: 'status', class: 'etat' });
  let actif = true;
  nettoyage = () => { actif = false; };
  const attendrePort = async () => {
    statut.textContent = tt('Lecture des appareils branchés…', 'Reading connected devices…');
    let base;
    try { base = new Set((await appareilsUsb()).map((a) => a.id)); } catch (e) { statut.textContent = e.message; return; }
    statut.textContent = tt('Branche maintenant un appareil USB (clé, souris, téléphone) sur le port à tester. J\'attends jusqu\'à 60 secondes…', 'Now plug a USB device (drive, mouse, phone) into the port to test. Waiting up to 60 seconds…');
    annoncer(statut.textContent);
    const fin = Date.now() + 60000;
    while (actif && Date.now() < fin) {
      await attendre(1500);
      let l;
      try { l = await appareilsUsb(); } catch (e) { continue; }
      const neuf = l.find((a) => !base.has(a.id));
      if (neuf) {
        ports.push({ ok: true, nom: neuf.nom });
        liste.append(h('li', null, tt('Port OK : ', 'Port OK: ') + (neuf.nom || neuf.id)));
        statut.textContent = tt('Port OK. Débranche l\'appareil, puis teste le port suivant.', 'Port OK. Unplug the device, then test the next port.');
        annoncer(statut.textContent);
        return;
      }
    }
    if (actif) {
      ports.push({ ok: false });
      liste.append(h('li', null, tt('Rien détecté sur ce port', 'Nothing detected on this port')));
      statut.textContent = tt('Rien détecté en 60 secondes : ce port, ou l\'appareil, ne répond pas. Réessaie avec un autre appareil pour être sûr.', 'Nothing detected in 60 seconds: this port, or the device, does not respond. Try another device to be sure.');
    }
  };
  ecran(
    h('h1', null, tt('Test des ports USB', 'USB port test')),
    h('p', null, tt('Garde la clé DEBUG Friend branchée. Pour chaque port libre : clique sur « Tester un port », puis branche un appareil USB.', 'Keep the DEBUG Friend drive plugged in. For each free port: click "Test a port", then plug in a USB device.')),
    h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: attendrePort }, tt('Tester un port', 'Test a port'))),
    statut, liste,
    boutonsResultat(ctx, 'usb',
      () => ports.filter((p) => p.ok).length + tt(' port(s) OK sur ', ' port(s) OK out of ') + ports.length,
      () => ports.filter((p) => !p.ok).length + tt(' port(s) sans réponse sur ', ' port(s) not responding out of ') + ports.length)
  );
}

// ------------------------------------------------------------- charge
function testCharge(ctx) {
  const mesure = h('p', { class: 'mesures', role: 'status' }, '…');
  const journalCharge = [];
  let actif = true;
  nettoyage = () => { actif = false; };
  const boucle = async () => {
    while (actif) {
      try {
        const r = await api('/api/collecte', { corps: { module: 'batterie' } });
        const b = normaliser(r.donnees || {});
        if (!b.presente) { mesure.textContent = tt('Aucune batterie : test inutile sur ce PC.', 'No battery: test not needed on this PC.'); return; }
        const ligne = b.charge + ' % — ' + (b.secteur ? tt('secteur branché', 'plugged in') : tt('sur batterie', 'on battery')) + ' — ' + (b.enCharge ? tt('en charge', 'charging') : tt('ne charge pas', 'not charging')) + (b.debitCharge ? ' — ' + (b.debitCharge / 1000).toFixed(1) + ' W' : '') + (b.debitDecharge && !b.secteur ? ' — ' + (b.debitDecharge / 1000).toFixed(1) + ' W ' + tt('consommés', 'used') : '');
        mesure.textContent = ligne;
        const prec = journalCharge[journalCharge.length - 1];
        if (!prec || prec.secteur !== b.secteur || prec.enCharge !== b.enCharge) journalCharge.push({ secteur: b.secteur, enCharge: b.enCharge, charge: b.charge });
      } catch (e) { mesure.textContent = e.message; }
      await attendre(3000);
    }
  };
  boucle();
  ecran(
    h('h1', null, tt('Test de la charge', 'Charging test')),
    h('ol', null,
      h('li', null, tt('Regarde la ligne ci-dessous (mise à jour toutes les 3 secondes).', 'Watch the line below (updated every 3 seconds).')),
      h('li', null, tt('Débranche le chargeur : elle doit passer à « sur batterie ».', 'Unplug the charger: it should switch to "on battery".')),
      h('li', null, tt('Rebranche-le : elle doit repasser à « secteur branché », et « en charge » si la batterie n\'est pas pleine (ou si aucun mode de protection ne limite la charge).', 'Plug it back: it should switch to "plugged in", and "charging" if the battery is not full (or no protection mode limits charging).'))),
    mesure,
    boutonsResultat(ctx, 'charge',
      () => tt('Changements vus : ', 'Changes seen: ') + journalCharge.map((x) => (x.secteur ? tt('secteur', 'AC') : tt('batterie', 'battery')) + (x.enCharge ? '+' : '') + ' ' + x.charge + '%').join(' → '),
      () => tt('Problème de charge. Changements vus : ', 'Charging problem. Changes seen: ') + journalCharge.map((x) => (x.secteur ? tt('secteur', 'AC') : tt('batterie', 'battery')) + ' ' + x.charge + '%').join(' → '))
  );
}

// ------------------------------------------------------------- test de chauffe
const VERTEX = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
const FRAGMENT = 'precision highp float; uniform float t; void main(){ vec2 u = gl_FragCoord.xy / 300.0; float v = 0.0; for (int i = 0; i < 400; i++) { v += sin(u.x * float(i) + t) * cos(u.y * float(i) - t) / float(i + 1); } gl_FragColor = vec4(vec3(step(0.0, v)), 1.0); }';

function chargeGraphique(canvas) {
  const gl = canvas.getContext('webgl', { powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const ut = gl.getUniformLocation(pr, 't');
  let actif = true;
  let n = 0;
  const image = () => {
    if (!actif) return;
    for (let k = 0; k < 4; k++) { gl.uniform1f(ut, (n++) * 0.01); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    requestAnimationFrame(image);
  };
  image();
  return () => { actif = false; const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); };
}

async function mesurerTemperatures(lhm) {
  const r = await api('/api/collecte', { corps: { module: 'temperatures', lhm } });
  return normaliser(r.donnees || {});
}

export async function ecranChauffe(ctx) {
  nettoyer();
  ctx.menu('chauffe');
  if (ctx.lectureSeule) {
    return ecran(h('h1', null, tt('Test de chauffe', 'Heat test')), h('p', null, tt('Désactivé en mode « lecture seule » (PC du travail) : un test de charge peut perturber un PC qui pilote une installation.', 'Disabled in read-only mode (work PC): a load test could disturb a PC that controls equipment.')));
  }
  ecran(
    h('h1', null, tt('Test de chauffe', 'Heat test')),
    h('p', null, tt('Mesure au repos, puis 2 minutes de charge maximale du processeur et de la carte graphique. Le test s\'arrête tout seul si une température devient dangereuse.', 'Measures at idle, then 2 minutes of full CPU and graphics load. The test stops by itself if a temperature becomes dangerous.')),
    h('ul', null,
      h('li', null, tt('Branche le chargeur si c\'est un portable.', 'Plug in the charger if it is a laptop.')),
      h('li', null, tt('Ferme les autres programmes.', 'Close other programs.')),
      h('li', null, tt('Ne lance pas ce test sur un PC qui chauffe déjà anormalement fort ou qui sent le brûlé.', 'Do not run this test on a PC that already runs abnormally hot or smells burnt.'))),
    h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: () => lancerChauffe(ctx) }, tt('Lancer le test (2 min 30)', 'Start the test (2 min 30)')))
  );
}

async function lancerChauffe(ctx) {
  const lhm = await ctx.autoriserLhm();
  const ligne = h('p', { class: 'mesures', role: 'status' }, '…');
  const phase = h('h2', null, tt('Mesure au repos…', 'Measuring at idle…'));
  const canvas = h('canvas', { class: 'charge-gpu', width: '640', height: '360', 'aria-hidden': 'true' });
  const tableau = h('tbody');
  let stop = false;
  const btnStop = h('button', { onclick: () => { stop = true; } }, tt('Arrêter', 'Stop'));
  ecran(h('h1', null, tt('Test de chauffe', 'Heat test')), phase, ligne, canvas, h('div', { class: 'boutons' }, btnStop),
    h('table', null, h('thead', null, h('tr', null, h('th', null, tt('Temps', 'Time')), h('th', null, 'CPU °C'), h('th', null, 'GPU °C'), h('th', null, tt('Charge CPU', 'CPU load')), h('th', null, tt('Vitesse CPU', 'CPU speed')))), tableau));
  const mesures = [];
  const noter = (m, tps) => {
    mesures.push({ ...m, t: tps });
    ligne.textContent = 'CPU ' + (m.cpu ?? '—') + ' °C   GPU ' + (m.gpu ?? '—') + ' °C   ' + tt('charge ', 'load ') + (m.chargeCpu ?? '—') + ' %   ' + tt('vitesse ', 'speed ') + (m.perfCpu ?? '—') + ' %';
    tableau.prepend(h('tr', null, h('td', null, typeof tps === 'number' ? tps + ' s' : tps), h('td', null, String(m.cpu ?? '—')), h('td', null, String(m.gpu ?? '—')), h('td', null, (m.chargeCpu ?? '—') + ' %'), h('td', null, (m.perfCpu ?? '—') + ' %')));
  };
  let workers = [];
  let arretGpu = null;
  const arreter = () => { workers.forEach((w) => w.terminate()); workers = []; if (arretGpu) arretGpu(); arretGpu = null; };
  nettoyage = () => { stop = true; arreter(); };
  let raisonArret = null;
  try {
    const repos = [];
    for (let i = 0; i < 3 && !stop; i++) { const m = await mesurerTemperatures(lhm); repos.push(m); noter(m, tt('repos ', 'idle ') + (i + 1)); await attendre(2000); }
    phase.textContent = tt('Charge maximale… (2 minutes)', 'Full load… (2 minutes)');
    const n = Math.max(1, navigator.hardwareConcurrency || 4);
    for (let i = 0; i < n; i++) { const w = new Worker('js/charge-worker.js'); w.postMessage({ type: 'start', duree: 125000 }); workers.push(w); }
    arretGpu = chargeGraphique(canvas);
    const debut = Date.now();
    while (!stop && Date.now() - debut < 120000) {
      await attendre(3000);
      const m = await mesurerTemperatures(lhm);
      noter(m, Math.round((Date.now() - debut) / 1000));
      if ((m.cpu ?? 0) >= 95) { raisonArret = tt('processeur à ', 'CPU at ') + m.cpu + ' °C'; break; }
      if ((m.gpu ?? 0) >= 92) { raisonArret = tt('carte graphique à ', 'graphics card at ') + m.gpu + ' °C'; break; }
    }
    arreter();
    phase.textContent = tt('Refroidissement… (15 s)', 'Cooling down… (15 s)');
    await attendre(15000);
    const apres = await mesurerTemperatures(lhm);
    noter(apres, tt('après', 'after'));
    canvas.remove();
    const repos0 = repos.filter((m) => m.cpu !== null && m.cpu !== undefined);
    const charge = mesures.filter((m) => typeof m.t === 'number' && m.t >= 0);
    const max = (k) => charge.reduce((a, m) => (typeof m[k] === 'number' ? Math.max(a ?? -1, m[k]) : a), null);
    const min = (k) => charge.reduce((a, m) => (typeof m[k] === 'number' ? Math.min(a ?? 1e9, m[k]) : a), null);
    const cpuMax = max('cpu'), gpuMax = max('gpu'), perfMin = min('perfCpu'), perfMax = max('perfCpu');
    const sources = (apres.sources || []).join(', ') || tt('aucune', 'none');
    const avis = [];
    if (raisonArret) avis.push(tt('Test arrêté pour sécurité : ', 'Test stopped for safety: ') + raisonArret + tt('. Surchauffe : nettoyage, pâte thermique ou ventilateur à vérifier en priorité.', '. Overheating: check cleaning, thermal paste or fan first.'));
    if (cpuMax === null) avis.push(tt('Température du processeur non disponible sur ce PC. Pour la lire, mets LibreHardwareMonitor dans le dossier « outils » de la clé (voir LISEZ-MOI).', 'CPU temperature not available on this PC. To read it, put LibreHardwareMonitor in the drive\'s "outils" folder (see LISEZ-MOI).'));
    else if (cpuMax >= 95) avis.push(tt('Le processeur atteint sa limite de température : il va ralentir en usage intensif.', 'The CPU reaches its temperature limit: it will slow down under heavy use.'));
    else if (cpuMax >= 85) avis.push(tt('Processeur chaud sous charge : dans les limites de beaucoup de processeurs, mais un nettoyage est conseillé.', 'CPU hot under load: within limits for many CPUs, but cleaning is advised.'));
    else avis.push(tt('Températures du processeur correctes.', 'CPU temperatures are fine.'));
    if (gpuMax !== null) avis.push(gpuMax >= 87 ? tt('Carte graphique chaude sous charge : vérifie la ventilation.', 'Graphics card hot under load: check airflow.') : tt('Températures de la carte graphique correctes.', 'Graphics card temperatures are fine.'));
    if (perfMax !== null && perfMin !== null && perfMax > 0 && perfMin < perfMax * 0.6) avis.push(tt('La vitesse du processeur a fortement baissé pendant la charge (de ', 'CPU speed dropped sharply under load (from ') + perfMax + tt(' % à ', '% to ') + perfMin + tt(' %) : bridage par la chaleur ou l\'alimentation.', '%): throttling from heat or power.'));
    if (!lhm && cpuMax !== null) avis.push(tt('Mesure approximative (zone thermique de Windows).', 'Approximate measurement (Windows thermal zone).'));
    const detail = 'CPU ' + tt('repos ', 'idle ') + (repos0.length ? repos0[repos0.length - 1].cpu : '—') + ' °C, max ' + (cpuMax ?? '—') + ' °C ; GPU max ' + (gpuMax ?? '—') + ' °C ; ' + tt('vitesse CPU ', 'CPU speed ') + (perfMin ?? '—') + '–' + (perfMax ?? '—') + ' % ; ' + tt('sources : ', 'sources: ') + sources;
    phase.textContent = tt('Terminé', 'Finished');
    btnStop.remove();
    const probleme = !!raisonArret || (cpuMax !== null && cpuMax >= 95) || (perfMax && perfMin !== null && perfMin < perfMax * 0.6);
    document.getElementById('ecran').append(
      h('div', { class: 'cadre' + (probleme ? ' inverse' : '') }, h('h2', { style: 'margin-top:0' }, tt('Résultat', 'Result')), h('ul', null, avis.map((a) => h('li', null, a))), h('p', { class: 'petit' }, detail)),
      h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: async () => { await ctx.enregistrerTest({ type: 'test', test: 'chauffe', nom: tt('Test de chauffe', 'Heat test'), date: new Date().toISOString(), resultat: probleme ? 'probleme' : 'ok', detail: avis.join(' ') + ' | ' + detail }); annoncer(tt('Résultat enregistré.', 'Result saved.')); ecranChauffe(ctx); } }, tt('Enregistrer le résultat', 'Save the result'))));
  } catch (e) {
    arreter();
    canvas.remove();
    journal('Chauffe : ' + e.message);
    alerte(tt('Test interrompu : ', 'Test interrupted: ') + e.message);
  } finally {
    nettoyage = null;
  }
}

// ------------------------------------------------------------- decris le probleme
export function ecranSymptomes(ctx) {
  nettoyer();
  ctx.menu('symptomes');
  ecran(
    h('h1', null, tt('Décris le problème', 'Describe the problem')),
    h('p', null, tt('Choisis ce que le client constate. Quelques questions simples orientent vers la cause.', 'Choose what the customer notices. A few simple questions point to the cause.')),
    h('div', { class: 'grille' }, SYMPTOMES.map((s) => h('button', { type: 'button', class: 'tuile', onclick: () => questions(ctx, s, 0, {}) }, h('b', null, tt(s.titre[0], s.titre[1])))))
  );
}

function questions(ctx, s, i, reponses) {
  if (i >= s.questions.length) return conclusion(ctx, s, reponses);
  const q = s.questions[i];
  const suite = (v) => { const r = { ...reponses, [i]: v }; questions(ctx, s, i + 1, r); };
  ecran(
    h('p', { class: 'petit' }, tt(s.titre[0], s.titre[1]) + ' — ' + tt('question ', 'question ') + (i + 1) + ' / ' + s.questions.length),
    h('h1', null, tt(q.q[0], q.q[1])),
    h('div', { class: 'boutons' },
      h('button', { class: 'principal', onclick: () => suite(true) }, tt('Oui', 'Yes')),
      h('button', { onclick: () => suite(false) }, tt('Non', 'No')),
      h('button', { onclick: () => suite(null) }, tt('Je ne sais pas', 'I don\'t know'))),
    h('p', null, h('a', { href: '#', onclick: (e) => { e.preventDefault(); ecranSymptomes(ctx); } }, tt('Revenir à la liste', 'Back to the list')))
  );
}

const NOMS_TESTS = {
  analyse: ['Lancer l\'analyse', 'Run the analysis'], chauffe: ['Test de chauffe', 'Heat test'], clavier: ['Test du clavier', 'Keyboard test'],
  ecran: ['Test de l\'écran', 'Screen test'], son: ['Test du son', 'Sound test'], usb: ['Test des ports USB', 'USB port test'], charge: ['Test de la charge', 'Charging test']
};

function conclusion(ctx, s, reponses) {
  const pistes = conclure(s, reponses);
  const lancer = (test) => {
    if (test === 'analyse') return ctx.lancerAnalyse();
    if (test === 'chauffe') return ecranChauffe(ctx);
    return ecranTests(ctx, test);
  };
  ctx.enregistrerTest({ type: 'symptome', test: 'symptome-' + s.id, nom: tt(s.titre[0], s.titre[1]), date: new Date().toISOString(), resultat: 'info', detail: pistes.map((p) => tt(p.fr, p.en)).join(' | ') }).catch(() => {});
  ecran(
    h('h1', null, tt(s.titre[0], s.titre[1])),
    h('h2', null, tt('Pistes, de la plus probable à la plus générale', 'Leads, from most likely to most general')),
    h('ol', null, pistes.map((p) => h('li', null,
      h('p', null, tt(p.fr, p.en)),
      p.piece ? h('p', { class: 'petit' }, tt('Pièce à suspecter : ', 'Part to suspect: ') + tt(p.piece[0], p.piece[1])) : null,
      p.test ? h('button', { type: 'button', onclick: () => lancer(p.test) }, tt(NOMS_TESTS[p.test][0], NOMS_TESTS[p.test][1])) : null))),
    h('div', { class: 'boutons' }, h('button', { onclick: () => ecranSymptomes(ctx) }, tt('Autre problème', 'Another problem')))
  );
}
