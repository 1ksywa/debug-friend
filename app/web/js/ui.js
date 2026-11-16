// =====================================================================
//  DEBUG Friend ! - outils communs de l'interface
// =====================================================================
import { cyr } from './cyrillique.js';

export const etat = {
  jeton: '',
  langue: 'fr',
  cle: null,            // cle du coffre (en memoire seulement)
  compte: null,
  reglages: null,
  infos: null,
  pc: null,             // { id, donnees, resume } du PC en cours
  analyse: null,        // analyse en cours
  testsGuides: [],      // resultats des tests guides de la session
  derniereActivite: Date.now()
};

// ------------------------------------------------------------- textes
const T = {
  fr: {},
  en: {
    'Chargement…': 'Loading…', 'Analyser': 'Analyse', 'Historique': 'History', 'Tests guidés': 'Guided tests',
    'Décris le problème': 'Describe the problem', 'Chauffe': 'Heat test', 'Réglages': 'Settings', 'Quitter': 'Quit',
    'Verrouiller': 'Lock', 'Résultats': 'Results'
  }
};
export function t(fr) {
  if (etat.langue === 'en' && T.en[fr]) return T.en[fr];
  return etat.langue === 'cy' ? cyr(fr) : fr;
}
// Texte bilingue en ligne : tt('français', 'english')
// 'cy' = français écrit en cyrillique (transformé automatiquement)
export function tt(fr, en) { return etat.langue === 'en' ? en : etat.langue === 'cy' ? cyr(fr) : fr; }
export const LANGUES = ['fr', 'en', 'cy'];

// ------------------------------------------------------------- DOM
export function h(tag, attrs, ...enfants) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  for (const e of enfants.flat(Infinity)) {
    if (e === null || e === undefined || e === false) continue;
    el.appendChild(e instanceof Node ? e : document.createTextNode(String(e)));
  }
  return el;
}

export function ecran(...enfants) {
  const m = document.getElementById('ecran');
  m.replaceChildren(...enfants.flat(Infinity).filter(Boolean));
  window.scrollTo(0, 0);
  m.focus({ preventScroll: true });
  return m;
}

export function annoncer(texte) {
  const a = document.getElementById('annonce');
  a.textContent = '';
  setTimeout(() => { a.textContent = texte; }, 50);
}

export function attendre(ms) { return new Promise((r) => setTimeout(r, ms)); }

export function dateLocale(iso, avecHeure = true) {
  if (!iso) return '?';
  const d = new Date(iso);
  if (isNaN(d)) return '?';
  const o = avecHeure ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' };
  return d.toLocaleString(etat.langue === 'en' ? 'en-GB' : 'fr-FR', o);
}

// ------------------------------------------------------------- serveur local
export class ErreurServeur extends Error {
  constructor(statut, message) { super(message); this.statut = statut; }
}

export async function api(chemin, options = {}) {
  const init = { method: options.methode || 'GET', headers: { 'X-Jeton': etat.jeton } };
  if (options.corps !== undefined) {
    init.method = options.methode || 'POST';
    init.body = typeof options.corps === 'string' ? options.corps : JSON.stringify(options.corps);
    init.headers['Content-Type'] = typeof options.corps === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8';
  }
  let rep;
  try {
    rep = await fetch(chemin, init);
  } catch (e) {
    throw new ErreurServeur(0, tt('Le logiciel ne répond plus. La fenêtre « DEBUG Friend ! » a peut-être été fermée : relance le logiciel depuis la clé.', 'The app is not responding. The "DEBUG Friend !" window may have been closed: start the app again from the USB drive.'));
  }
  if (!rep.ok) {
    let msg = rep.statusText;
    try { const j = await rep.json(); msg = j.erreur || msg; } catch (e) { try { msg = await rep.text(); } catch (e2) { /* rien */ } }
    throw new ErreurServeur(rep.status, msg);
  }
  const type = rep.headers.get('Content-Type') || '';
  return type.includes('application/json') ? rep.json() : rep.text();
}

export async function lireFichier(nom) {
  try { return await api('/api/fichier?nom=' + encodeURIComponent(nom)); } catch (e) { if (e.statut === 404) return null; throw e; }
}
export async function ecrireFichier(nom, texte) {
  return api('/api/fichier?nom=' + encodeURIComponent(nom), { corps: String(texte), methode: 'POST' });
}
export async function supprimerFichier(nom) {
  return api('/api/fichier?nom=' + encodeURIComponent(nom), { methode: 'DELETE' });
}
export async function listeFichiers() {
  const r = await api('/api/liste');
  return Array.isArray(r.fichiers) ? r.fichiers : (r.fichiers && r.fichiers.value) || [];
}

export async function journal(message) {
  try { await api('/api/journal', { corps: { message: String(message).slice(0, 500) } }); } catch (e) { /* rien */ }
}

export async function action(id) {
  try {
    await api('/api/action', { corps: { id } });
    annoncer(tt('Fenêtre ouverte.', 'Window opened.'));
    return true;
  } catch (e) {
    alerte(tt('Impossible d\'ouvrir : ', 'Could not open: ') + e.message);
    return false;
  }
}

// Message d'erreur visible en haut de l'ecran (pas de boite de dialogue du navigateur)
export function alerte(texte) {
  const m = document.getElementById('ecran');
  const a = h('div', { class: 'cadre inverse', role: 'alert' }, h('p', null, texte), h('button', { onclick: () => a.remove() }, tt('Fermer', 'Close')));
  m.prepend(a);
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------- masquage
export function masquer(texte, resume, actif) {
  if (!actif || !texte) return texte;
  let r = String(texte);
  for (const v of [resume && resume.utilisateur, resume && resume.nomPC, resume && resume.numeroSerie, resume && resume.ssid]) {
    if (v && String(v).length >= 3) r = r.split(String(v)).join('•••');
  }
  return r;
}
