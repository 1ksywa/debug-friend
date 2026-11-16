// =====================================================================
//  DEBUG Friend ! - interface principale
// =====================================================================
import { cyr } from './cyrillique.js';
import { etat, h, ecran, tt, api, lireFichier, ecrireFichier, listeFichiers, journal, action, alerte, annoncer, dateLocale, masquer, attendre, LANGUES } from './ui.js';
import * as C from './coffre.js';
import { qrEnSvg } from './qr.js';
import { analyser, reverifier, resume, normaliser, ETAPES_ORDRE, FAMILLES, regle } from './regles.js';
import { ecranTests, ecranChauffe, ecranSymptomes } from './tests.js';

const VERSION = '1.0.4';
// Langue unique du logiciel : 'cy' = français écrit en cyrillique.
// Mettre null pour retrouver le choix Français / English / cyrillique.
const LANGUE_UNIQUE = 'cy';

export const MODULES = [
  ['systeme', 'Système', 'System'],
  ['cpu_ram', 'Processeur et mémoire', 'CPU and memory'],
  ['gpu_ecrans', 'Carte graphique et écrans', 'Graphics and displays'],
  ['batterie', 'Batterie', 'Battery'],
  ['disques', 'Disques', 'Disks'],
  ['appareils', 'Appareils et pilotes', 'Devices and drivers'],
  ['evenements', 'Plantages et erreurs matérielles', 'Crashes and hardware errors'],
  ['applis', 'Applications et fiabilité', 'Apps and reliability'],
  ['maj', 'Windows Update', 'Windows Update'],
  ['securite', 'Sécurité', 'Security'],
  ['demarrage', 'Démarrage et alimentation', 'Startup and power'],
  ['reseau', 'Réseau', 'Network'],
  ['logiciels', 'Logiciels et extensions', 'Software and extensions'],
  ['temperatures', 'Températures au repos', 'Idle temperatures'],
  ['fichiers_windows', 'Fichiers de Windows (5 à 15 min)', 'Windows files (5 to 15 min)']
];
const nomModule = (id) => { const m = MODULES.find((x) => x[0] === id); return m ? tt(m[1], m[2]) : id; };

const ACTIONS = {
  'maj': ['Ouvrir Windows Update', 'Open Windows Update'], 'securite': ['Ouvrir la Sécurité Windows', 'Open Windows Security'],
  'demarrage': ['Ouvrir les applis au démarrage', 'Open startup apps'], 'affichage': ['Ouvrir l\'affichage', 'Open display settings'],
  'affichage-avance': ['Ouvrir l\'affichage avancé', 'Open advanced display'], 'graphismes': ['Ouvrir les réglages graphiques', 'Open graphics settings'],
  'son': ['Ouvrir le son', 'Open sound settings'], 'bluetooth': ['Ouvrir le Bluetooth', 'Open Bluetooth'], 'imprimantes': ['Ouvrir les imprimantes', 'Open printers'],
  'wifi': ['Ouvrir le Wi-Fi', 'Open Wi-Fi'], 'reseau': ['Ouvrir l\'état du réseau', 'Open network status'], 'webcam': ['Ouvrir la confidentialité caméra', 'Open camera privacy'],
  'micro': ['Ouvrir la confidentialité micro', 'Open microphone privacy'], 'alimentation': ['Ouvrir l\'alimentation', 'Open power settings'],
  'stockage': ['Ouvrir le stockage', 'Open storage'], 'applis': ['Ouvrir les applications', 'Open apps'], 'capture': ['Ouvrir les captures', 'Open captures'],
  'modejeu': ['Ouvrir le mode jeu', 'Open Game Mode'], 'activation': ['Ouvrir l\'activation', 'Open activation'], 'chiffrement': ['Ouvrir le chiffrement de l\'appareil', 'Open device encryption'],
  'gestionnaire': ['Ouvrir le Gestionnaire de périphériques', 'Open Device Manager'], 'nettoyage': ['Ouvrir le Nettoyage de disque', 'Open Disk Cleanup'],
  'test-memoire': ['Lancer le test de mémoire', 'Start the memory test'], 'pare-feu': ['Ouvrir le pare-feu', 'Open the firewall'],
  'internet': ['Ouvrir les options Internet', 'Open Internet options'], 'sfc': ['Lancer sfc /scannow', 'Run sfc /scannow'], 'dism': ['Lancer la réparation DISM', 'Run the DISM repair'],
  'chkdsk': ['Analyser le disque C:', 'Scan drive C:'], 'chkdsk-reparer': ['Réparer le disque C:', 'Repair drive C:'], 'dns': ['Vider le cache DNS', 'Flush the DNS cache'],
  'spouleur': ['Redémarrer le service d\'impression', 'Restart the print service'], 'rapport-batterie': ['Ouvrir le rapport de batterie', 'Open the battery report']
};
// Actions qui modifient quelque chose : interdites en lecture seule, et confirmees avant.
const ACTIONS_MODIFIENT = ['sfc', 'dism', 'chkdsk-reparer', 'dns', 'spouleur', 'test-memoire'];

// ------------------------------------------------------------- demarrage
async function demarrer() {
  const p = new URLSearchParams(location.search);
  if (p.get('j')) {
    sessionStorage.setItem('jeton', p.get('j'));
    history.replaceState(null, '', '/');
  }
  etat.jeton = sessionStorage.getItem('jeton') || '';
  try { const l = localStorage.getItem('langue'); etat.langue = LANGUES.includes(l) ? l : 'fr'; } catch (e) { /* rien */ }
  if (LANGUE_UNIQUE) etat.langue = LANGUE_UNIQUE;
  document.documentElement.lang = codeLangue(etat.langue);
  if (!etat.jeton) {
    ecran(h('h1', null, tt('Lance DEBUG Friend ! depuis la clé', 'Start DEBUG Friend ! from the USB drive')),
      h('p', null, tt('Cette page s\'ouvre toute seule quand tu double-cliques sur « Lancer DEBUG Friend » sur la clé.', 'This page opens by itself when you double-click "Lancer DEBUG Friend" on the drive.')));
    return;
  }
  try {
    etat.infos = await api('/api/infos');
  } catch (e) {
    ecran(h('h1', null, tt('Connexion impossible', 'Cannot connect')), h('p', null, e.message));
    return;
  }
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { etat.derniereActivite = Date.now(); }, { passive: true }));
  setInterval(surveiller, 30000);
  window.addEventListener('error', (e) => journal('Erreur JS : ' + e.message + ' (' + e.filename + ':' + e.lineno + ')'));
  window.addEventListener('unhandledrejection', (e) => journal('Promesse rejetée : ' + (e.reason && e.reason.message ? e.reason.message : e.reason)));
  const compte = await lireFichier('compte.json');
  if (!compte) return ecranCreation();
  try { etat.compte = JSON.parse(compte); } catch (e) {
    ecran(h('h1', null, tt('Fichier du compte abîmé', 'Account file damaged')), h('p', null, tt('Le fichier donnees\\compte.json est illisible. Restaure-le depuis une sauvegarde (clé DEBUG-SECOURS ou Google Drive).', 'The file donnees\\compte.json is unreadable. Restore it from a backup.')));
    return;
  }
  ecranConnexion();
}

function surveiller() {
  if (etat.cle) {
    const minutes = (etat.reglages && etat.reglages.verrouMinutes) || 15;
    if (Date.now() - etat.derniereActivite > minutes * 60000 && !etat.travailEnCours) verrouiller(true);
  }
  api('/api/ping').catch(() => { /* le message d'erreur apparaitra a la prochaine action */ });
}

function verrouiller(auto) {
  etat.cle = null;
  etat.reglages = null;
  document.getElementById('menu').hidden = true;
  ecranConnexion(auto ? tt('Verrouillé automatiquement après une période sans activité.', 'Locked automatically after a period of inactivity.') : null);
}

// ------------------------------------------------------------- menu
function menu(courant) {
  const n = document.getElementById('menu');
  const items = [
    ['accueil', tt('Accueil', 'Home'), ecranAccueil],
    ['analyse', tt('Analyser', 'Analyse'), ecranNouvelleAnalyse],
    ['resultats', tt('Résultats', 'Results'), () => (etat.analyse ? ecranResultats() : ecranNouvelleAnalyse())],
    ['historique', tt('Historique', 'History'), ecranHistorique],
    ['tests', tt('Tests guidés', 'Guided tests'), () => ecranTests(contexteTests())],
    ['symptomes', tt('Décris le problème', 'Describe the problem'), () => ecranSymptomes(contexteTests())],
    ['chauffe', tt('Chauffe', 'Heat test'), () => ecranChauffe(contexteTests())],
    ['reglages', tt('Réglages', 'Settings'), ecranReglages],
    ['verrou', tt('Verrouiller', 'Lock'), () => verrouiller(false)],
    ['quitter', tt('Quitter', 'Quit'), quitter]
  ];
  n.replaceChildren(...items.map(([id, nom, f]) => h('button', { type: 'button', 'aria-current': id === courant ? 'page' : null, onclick: () => { if (etat.travailEnCours) { alerte(tt('Attends la fin de l\'opération en cours.', 'Wait for the current operation to finish.')); return; } f(); } }, nom)));
  n.hidden = false;
}

// Ce que les tests guides, la chauffe et les symptomes peuvent utiliser
function contexteTests() {
  return {
    menu,
    lectureSeule: !!(etat.analyse && etat.analyse.lectureSeule),
    lancerAnalyse: ecranNouvelleAnalyse,
    enregistrerTest: async (resultat) => {
      etat.testsGuides.push(resultat);
      if (etat.analyse) {
        etat.analyse.tests = etat.analyse.tests || [];
        etat.analyse.tests.push(resultat);
        await enregistrerHistorique().catch((e) => journal('Historique : ' + e.message));
      }
    },
    autoriserLhm: () => demanderLhm()
  };
}

// ------------------------------------------------------------- creation du compte
function ecranCreation() {
  const blocRecuperer = h('div', { id: 'recuperer' });
  const mdp1 = h('input', { type: 'password', id: 'mdp1', autocomplete: 'new-password' });
  const mdp2 = h('input', { type: 'password', id: 'mdp2', autocomplete: 'new-password' });
  const btn = h('button', { class: 'principal', type: 'submit' }, tt('Créer mon accès', 'Create my access'));
  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    if (mdp1.value.length < 12) return alerte(tt('Le mot de passe doit faire au moins 12 caractères. Une phrase de 4 ou 5 mots est idéale.', 'The password must be at least 12 characters. A 4- or 5-word phrase is ideal.'));
    if (mdp1.value !== mdp2.value) return alerte(tt('Les deux mots de passe ne sont pas identiques.', 'The two passwords do not match.'));
    btn.disabled = true;
    btn.textContent = tt('Création…', 'Creating…');
    try {
      const r = await C.creerCompte(mdp1.value);
      ecranEnrolement(r.compte, r.cle, r.secretTotp, r.codeSecours, true);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = tt('Créer mon accès', 'Create my access');
      alerte(err.message);
    }
  } },
  h('label', { for: 'mdp1' }, tt('Choisis ton mot de passe (12 caractères minimum)', 'Choose your password (at least 12 characters)')),
  mdp1,
  h('p', { class: 'petit' }, tt('Conseil : une phrase de 4 ou 5 mots, facile à retenir, difficile à deviner.', 'Tip: a 4- or 5-word phrase, easy to remember, hard to guess.')),
  h('label', { for: 'mdp2' }, tt('Retape-le', 'Type it again')),
  mdp2,
  h('div', { class: 'boutons' }, btn));
  ecran(
    h('h1', null, tt('Bienvenue dans DEBUG Friend !', 'Welcome to DEBUG Friend !')),
    h('p', null, tt('Première utilisation dans ce dossier : crée ton accès. Il protège tes données par chiffrement, et il faudra aussi le code de ton appli à codes pour ouvrir le logiciel.', 'First use in this folder: create your access. It encrypts your data, and the code from your authenticator app will also be needed to open the app.')),
    blocRecuperer,
    form,
    choixLangue()
  );
  chercherSauvegarde(blocRecuperer);
}

// Compte deja cree sur un autre PC : on le recupere depuis Google Drive (ou la cle DEBUG-SECOURS)
async function chercherSauvegarde(bloc) {
  let info = null;
  try { info = await api('/api/restaurer'); } catch (e) { return; }
  if (!info || info.compteIci) return;
  if (!info.disponible) {
    bloc.replaceChildren(h('p', { class: 'petit' }, tt('Tu as déjà un compte sur un autre PC ? Installe Google Drive pour ordinateur sur ce PC, connecte-toi, attends la synchronisation puis relance DEBUG Friend ! : tu pourras récupérer ton compte au lieu d\'en créer un.', 'Already have an account on another PC? Install Google Drive for desktop here, sign in, wait for it to sync, then restart DEBUG Friend ! to get your account back.')));
    return;
  }
  const quand = String(info.date || '').replace(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2}).*$/, '$3/$2/$1 $4:$5');
  const ou = info.source === 'drive' ? 'Google Drive' : tt('la clé DEBUG-SECOURS', 'the DEBUG-SECOURS drive');
  const btn = h('button', { class: 'principal', type: 'button', onclick: async () => {
    btn.disabled = true;
    try {
      await api('/api/restaurer', { corps: {} });
      annoncer(tt('Compte récupéré.', 'Account restored.'));
      location.reload();
    } catch (e) { btn.disabled = false; alerte(e.message); }
  } }, tt('Récupérer mon compte', 'Restore my account'));
  bloc.replaceChildren(h('div', { class: 'cadre' },
    h('h2', null, tt('Tu as déjà un compte ?', 'Already have an account?')),
    h('p', null, tt('Une sauvegarde de ton compte a été trouvée sur ', 'A backup of your account was found on ') + ou + ' (' + quand + tt('). Récupère-la pour garder ton mot de passe, ton appli à codes et ton historique.', '). Restore it to keep your password, authenticator app and history.')),
    h('div', { class: 'boutons' }, btn)));
}

// Etape QR code + verification du code + code de secours
function ecranEnrolement(compte, cle, secretB32, codeSecours, premiereFois) {
  const lien = C.lienAppliCodes(secretB32, 'Atelier DEBUG');
  const qr = h('div', { class: 'qr', html: qrEnSvg(lien, 260) });
  const code = h('input', { type: 'text', id: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}' });
  const groupes = secretB32.match(/.{1,4}/g).join(' ');
  ecran(
    h('h1', null, tt('Relie ton appli à codes', 'Link your authenticator app')),
    h('ol', null,
      h('li', null, tt('Sur ton téléphone, ouvre Google Authenticator ou Microsoft Authenticator.', 'On your phone, open Google Authenticator or Microsoft Authenticator.')),
      h('li', null, tt('Ajoute un compte, puis scanne ce QR code.', 'Add an account, then scan this QR code.')),
      h('li', null, tt('Tape le code à 6 chiffres affiché par l\'appli.', 'Type the 6-digit code shown by the app.'))),
    qr,
    h('p', { class: 'petit' }, tt('Le scan ne marche pas ? Choisis « Saisir une clé » dans l\'appli et tape : ', 'Scan not working? Choose "Enter a setup key" in the app and type: '), h('span', { class: 'mono' }, groupes)),
    h('form', { onsubmit: async (e) => {
      e.preventDefault();
      const ok = await C.verifierTotp(C.deB32(secretB32), code.value);
      if (!ok) return alerte(tt('Code incorrect. Vérifie que l\'heure du téléphone et du PC est juste, puis tape le code affiché maintenant.', 'Wrong code. Check the phone and PC clocks are correct, then type the code shown now.'));
      if (premiereFois) ecranCodeSecours(compte, cle, codeSecours);
      else { await ecrireFichier('compte.json', JSON.stringify(compte)); etat.compte = compte; annoncer(tt('Appli à codes enregistrée.', 'Authenticator app saved.')); await ouvrirSession(cle); }
    } },
    h('label', { for: 'code' }, tt('Code à 6 chiffres', '6-digit code')), code,
    h('div', { class: 'boutons' }, h('button', { class: 'principal', type: 'submit' }, tt('Vérifier', 'Verify'))))
  );
}

function ecranCodeSecours(compte, cle, codeSecours) {
  const coche = h('input', { type: 'checkbox', id: 'note' });
  ecran(
    h('h1', null, tt('Ta clé de secours', 'Your recovery key')),
    h('p', null, tt('Si tu oublies ton mot de passe ou perds ton téléphone, cette clé est le seul moyen de récupérer tes données. Imprime-la ou recopie-la, et range-la chez toi, pas avec la clé USB.', 'If you forget your password or lose your phone, this key is the only way to recover your data. Print it or copy it, and keep it at home, not with the USB drive.')),
    h('div', { class: 'cadre' }, h('p', { class: 'petit' }, 'DEBUG Friend ! — ' + tt('clé de secours', 'recovery key') + ' — ' + dateLocale(new Date().toISOString(), false)), h('div', { class: 'code-secours' }, codeSecours)),
    h('div', { class: 'boutons' }, h('button', { type: 'button', onclick: () => window.print() }, tt('Imprimer', 'Print'))),
    h('label', { class: 'choix' }, coche, tt('J\'ai imprimé ou recopié la clé de secours, et je la range en lieu sûr.', 'I printed or copied the recovery key and will keep it safe.')),
    h('div', { class: 'boutons' }, h('button', { class: 'principal', type: 'button', onclick: async () => {
      if (!coche.checked) return alerte(tt('Coche la case pour confirmer que tu as gardé la clé de secours.', 'Tick the box to confirm you kept the recovery key.'));
      await ecrireFichier('compte.json', JSON.stringify(compte));
      await ecrireFichier('essais.json', JSON.stringify({ echecs: 0, dernier: 0 }));
      etat.compte = compte;
      await ouvrirSession(cle);
    } }, tt('Terminer', 'Finish')))
  );
}

// ------------------------------------------------------------- connexion
async function lireEssais() {
  try { const t = await lireFichier('essais.json'); return t ? JSON.parse(t) : { echecs: 0, dernier: 0 }; } catch (e) { return { echecs: 0, dernier: 0 }; }
}

function ecranConnexion(message) {
  document.getElementById('menu').hidden = true;
  const mdp = h('input', { type: 'password', id: 'mdp', autocomplete: 'current-password' });
  const code = h('input', { type: 'text', id: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6' });
  const btn = h('button', { class: 'principal', type: 'submit' }, tt('Ouvrir', 'Open'));
  ecran(
    h('h1', null, tt('Connexion', 'Sign in')),
    message ? h('p', { class: 'petit' }, message) : null,
    h('form', { onsubmit: async (e) => {
      e.preventDefault();
      const essais = await lireEssais();
      const delai = C.delaiApresEchecs(essais.echecs) * 1000 - (Date.now() - (essais.dernier || 0));
      if (delai > 0) return alerte(tt('Trop d\'essais ratés. Attends ', 'Too many failed attempts. Wait ') + Math.ceil(delai / 1000) + tt(' secondes.', ' seconds.'));
      btn.disabled = true;
      btn.textContent = tt('Vérification…', 'Checking…');
      const echec = async (texte) => {
        await ecrireFichier('essais.json', JSON.stringify({ echecs: (essais.echecs || 0) + 1, dernier: Date.now() }));
        btn.disabled = false;
        btn.textContent = tt('Ouvrir', 'Open');
        alerte(texte);
      };
      let cle;
      try { cle = await C.ouvrirAvecMotDePasse(etat.compte, mdp.value); } catch (err) { return echec(tt('Mot de passe incorrect.', 'Wrong password.')); }
      const secret = await C.lireSecretTotp(etat.compte, cle);
      if (!(await C.verifierTotp(secret, code.value))) return echec(tt('Code de l\'appli incorrect. Vérifie l\'heure du PC et du téléphone.', 'Wrong app code. Check the PC and phone clocks.'));
      await ecrireFichier('essais.json', JSON.stringify({ echecs: 0, dernier: 0 }));
      await ouvrirSession(cle);
    } },
    h('label', { for: 'mdp' }, tt('Mot de passe', 'Password')), mdp,
    h('label', { for: 'code' }, tt('Code de l\'appli (6 chiffres)', 'App code (6 digits)')), code,
    h('div', { class: 'boutons' }, btn, h('button', { type: 'button', onclick: ecranRecuperation }, tt('Mot de passe oublié ou téléphone perdu', 'Forgot password or lost phone')))),
    choixLangue()
  );
  mdp.focus();
}

function ecranRecuperation() {
  const code = h('input', { type: 'text', id: 'secours', autocomplete: 'off', class: 'mono' });
  const mdp1 = h('input', { type: 'password', id: 'n1', autocomplete: 'new-password' });
  const mdp2 = h('input', { type: 'password', id: 'n2', autocomplete: 'new-password' });
  ecran(
    h('h1', null, tt('Récupérer l\'accès', 'Recover access')),
    h('p', null, tt('Tape la clé de secours imprimée lors de la création, puis choisis un nouveau mot de passe. Tu relieras ensuite ton appli à codes.', 'Type the recovery key printed at setup, then choose a new password. You will then link your authenticator app again.')),
    h('form', { onsubmit: async (e) => {
      e.preventDefault();
      if (mdp1.value.length < 12 || mdp1.value !== mdp2.value) return alerte(tt('Nouveau mot de passe : 12 caractères minimum, tapé deux fois à l\'identique.', 'New password: at least 12 characters, typed twice the same.'));
      const essais = await lireEssais();
      const delai = C.delaiApresEchecs(essais.echecs) * 1000 - (Date.now() - (essais.dernier || 0));
      if (delai > 0) return alerte(tt('Trop d\'essais ratés. Attends ', 'Too many failed attempts. Wait ') + Math.ceil(delai / 1000) + tt(' secondes.', ' seconds.'));
      let maitre;
      try { ({ maitre } = await C.ouvrirAvecSecours(etat.compte, code.value)); } catch (err) {
        await ecrireFichier('essais.json', JSON.stringify({ echecs: (essais.echecs || 0) + 1, dernier: Date.now() }));
        return alerte(tt('Clé de secours incorrecte.', 'Wrong recovery key.'));
      }
      const compte = await C.changerMotDePasse(etat.compte, maitre, mdp1.value);
      const cle = await C.cleDepuisMaitre(maitre);
      maitre.fill(0);
      const r = await C.nouveauSecretTotp(compte, cle);
      await ecrireFichier('essais.json', JSON.stringify({ echecs: 0, dernier: 0 }));
      ecranEnrolement(r.compte, cle, r.secretTotp, null, false);
    } },
    h('label', { for: 'secours' }, tt('Clé de secours', 'Recovery key')), code,
    h('label', { for: 'n1' }, tt('Nouveau mot de passe', 'New password')), mdp1,
    h('label', { for: 'n2' }, tt('Retape-le', 'Type it again')), mdp2,
    h('div', { class: 'boutons' }, h('button', { class: 'principal', type: 'submit' }, tt('Valider', 'Confirm')), h('button', { type: 'button', onclick: () => ecranConnexion() }, tt('Retour', 'Back'))))
  );
}

function choixLangue() {
  if (LANGUE_UNIQUE) return null;
  return h('p', { class: 'petit' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); changerLangue(etat.langue === 'en' ? 'fr' : 'en'); } }, etat.langue === 'en' ? 'Français' : 'English'));
}

// Code de langue pour le navigateur (lecteurs d'écran, césure)
const codeLangue = (l) => (l === 'cy' ? 'fr-Cyrl' : l);

function changerLangue(l) {
  etat.langue = LANGUES.includes(l) ? l : 'fr';
  document.documentElement.lang = codeLangue(etat.langue);
  try { localStorage.setItem('langue', l); } catch (e) { /* rien */ }
  if (etat.reglages) { etat.reglages.langue = l; enregistrerReglages(); }
  if (etat.cle) { menu('reglages'); ecranReglages(); } else if (etat.compte) ecranConnexion(); else ecranCreation();
}

async function ouvrirSession(cle) {
  etat.cle = cle;
  etat.derniereActivite = Date.now();
  etat.reglages = { langue: etat.langue, verrouMinutes: 15, pcDrive: [], derniereSauvegarde: null };
  try {
    const t = await lireFichier('reglages.dfx');
    if (t) etat.reglages = { ...etat.reglages, ...(await C.dechiffrerObjet(cle, t)) };
  } catch (e) { journal('Réglages illisibles : ' + e.message); }
  if (LANGUE_UNIQUE) etat.reglages.langue = LANGUE_UNIQUE;
  if (LANGUES.includes(etat.reglages.langue) && etat.reglages.langue !== etat.langue) {
    etat.langue = etat.reglages.langue;
    document.documentElement.lang = codeLangue(etat.langue);
    try { localStorage.setItem('langue', etat.langue); } catch (e) { /* rien */ }
  }
  ecranAccueil();
}

async function enregistrerReglages() {
  if (!etat.cle) return;
  await ecrireFichier('reglages.dfx', await C.chiffrerObjet(etat.cle, etat.reglages));
}

// ------------------------------------------------------------- accueil
function ecranAccueil() {
  menu('accueil');
  const tuile = (titre, texte, f) => h('button', { type: 'button', class: 'tuile', onclick: f }, h('b', null, titre), texte);
  ecran(
    h('h1', null, tt('Que veux-tu faire ?', 'What do you want to do?')),
    etat.analyse ? h('div', { class: 'cadre' }, h('p', null, tt('Analyse en cours sur ', 'Analysis in progress on ') , h('b', null, etat.analyse.resume.nom), ' — ' + dateLocale(etat.analyse.date)), h('button', { onclick: ecranResultats }, tt('Revenir aux résultats', 'Back to results'))) : null,
    h('div', { class: 'grille' },
      tuile(tt('Analyser ce PC', 'Analyse this PC'), tt('Rapide (1 à 2 min) ou complète (10 à 20 min).', 'Quick (1-2 min) or full (10-20 min).'), ecranNouvelleAnalyse),
      tuile(tt('Décris le problème', 'Describe the problem'), tt('Le client explique, le logiciel pose des questions.', 'The customer explains, the app asks questions.'), () => ecranSymptomes(contexteTests())),
      tuile(tt('Tests guidés', 'Guided tests'), tt('Clavier, écran, son, micro, webcam, ports USB, charge.', 'Keyboard, screen, sound, mic, webcam, USB ports, charging.'), () => ecranTests(contexteTests())),
      tuile(tt('Test de chauffe', 'Heat test'), tt('Températures au repos puis 2 minutes sous charge.', 'Temperatures at idle, then 2 minutes under load.'), () => ecranChauffe(contexteTests())),
      tuile(tt('Historique', 'History'), tt('Les PC déjà analysés et ce qui a changé.', 'PCs already analysed and what changed.'), ecranHistorique),
      tuile(tt('Réglages', 'Settings'), tt('Langue, verrouillage, sauvegardes, mot de passe.', 'Language, lock, backups, password.'), ecranReglages)
    ),
    h('p', { class: 'petit' }, 'DEBUG Friend ! ' + VERSION + ' — ' + tt('Atelier DEBUG', 'DEBUG workshop'))
  );
}

// ------------------------------------------------------------- nouvelle analyse
async function demanderLhm() {
  if (!etat.infos || !etat.infos.lhmPresent) return false;
  if (etat.lhmAccord !== undefined) return etat.lhmAccord;
  return new Promise((resolve) => {
    const zone = h('div', { class: 'cadre inverse', role: 'dialog', 'aria-label': tt('Pilote des températures', 'Temperature driver') },
      h('h3', null, tt('Lire les températures exactes ?', 'Read exact temperatures?')),
      h('p', null, tt('Pour lire la température exacte du processeur, il faut charger le petit pilote de LibreHardwareMonitor sur ce PC, le temps de l\'utilisation. Certains antivirus le signalent. Sur le PC d\'un client, demande-lui son accord.', 'To read the exact CPU temperature, LibreHardwareMonitor\'s small driver must be loaded on this PC while in use. Some antivirus tools flag it. On a customer\'s PC, ask for their agreement.')),
      h('div', { class: 'boutons' },
        h('button', { class: 'principal', onclick: () => { etat.lhmAccord = true; zone.remove(); resolve(true); } }, tt('Oui, charger le pilote', 'Yes, load the driver')),
        h('button', { onclick: () => { etat.lhmAccord = false; zone.remove(); resolve(false); } }, tt('Non, températures approximatives', 'No, approximate temperatures'))));
    document.getElementById('ecran').prepend(zone);
    window.scrollTo(0, 0);
  });
}

function ecranNouvelleAnalyse() {
  menu('analyse');
  const rapide = h('input', { type: 'radio', name: 'type', value: 'rapide', checked: true });
  const complete = h('input', { type: 'radio', name: 'type', value: 'complete' });
  const travail = h('input', { type: 'checkbox', id: 'travail' });
  const masque = h('input', { type: 'checkbox', id: 'masque' });
  const client = h('input', { type: 'text', id: 'etiquette', maxlength: '80', placeholder: tt('Exemple : Mme Martin', 'Example: Mrs Martin') });
  ecran(
    h('h1', null, tt('Analyser ce PC', 'Analyse this PC')),
    etat.analyse ? h('p', { class: 'petit' }, tt('Une nouvelle analyse remplace celle en cours (elle reste dans l\'historique).', 'A new analysis replaces the current one (it stays in the history).')) : null,
    h('fieldset', null, h('legend', null, tt('Type d\'analyse', 'Analysis type')),
      h('label', { class: 'choix' }, rapide, h('span', null, h('b', null, tt('Rapide', 'Quick')), ' — ', tt('1 à 2 minutes : l\'essentiel.', '1 to 2 minutes: the essentials.'))),
      h('label', { class: 'choix' }, complete, h('span', null, h('b', null, tt('Complète', 'Full')), ' — ', tt('10 à 20 minutes : tout, plus les fichiers de Windows, la recherche de mises à jour et l\'analyse du disque C:.', '10 to 20 minutes: everything, plus Windows files, the update search and a drive C: scan.')))),
    h('fieldset', null, h('legend', null, tt('Options', 'Options')),
      h('label', { class: 'choix' }, travail, h('span', null, h('b', null, tt('PC du travail : lecture seule', 'Work PC: read-only')), h('br'), h('span', { class: 'petit' }, tt('Aucune modification, aucun test de chauffe, aucun pilote chargé. Uniquement avec l\'accord du service informatique.', 'No changes, no heat test, no driver loaded. Only with the IT department\'s approval.')))),
      h('label', { class: 'choix' }, masque, h('span', null, h('b', null, tt('Masquer les informations personnelles', 'Hide personal information')), h('br'), h('span', { class: 'petit' }, tt('Nom d\'utilisateur, nom du PC, réseau Wi-Fi et numéros de série remplacés par •••.', 'User name, PC name, Wi-Fi network and serial numbers replaced by •••.')))),
      h('label', { for: 'etiquette' }, tt('À qui est ce PC ? (facultatif)', 'Whose PC is this? (optional)')), client),
    h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: async () => {
      const lect = travail.checked;
      let lhm = false;
      if (!lect && etat.infos && etat.infos.lhmPresent) lhm = await demanderLhm();
      lancerAnalyse({ type: complete.checked ? 'complete' : 'rapide', lectureSeule: lect, masque: masque.checked, etiquette: client.value.trim(), lhm });
    } }, tt('Lancer l\'analyse', 'Start the analysis')))
  );
}

function modulesPour(type) {
  return MODULES.map((m) => m[0]).filter((m) => (m === 'fichiers_windows' ? type === 'complete' : true));
}

async function collecter(modules, options, surProgres) {
  const donnees = {};
  const erreurs = [];
  for (const m of modules) {
    if (surProgres) surProgres(m, 'encours');
    try {
      const r = await api('/api/collecte', { corps: { module: m, complete: !!options.complete, lhm: !!options.lhm } });
      if (r && r.donnees) donnees[m] = normaliser(r.donnees);
      const err = Array.isArray(r.erreurs) ? r.erreurs : (r.erreurs && r.erreurs.value) || [];
      if (err.length) erreurs.push(...err.map((x) => nomModule(m) + ' : ' + x));
      if (surProgres) surProgres(m, r && r.donnees ? 'fait' : 'erreur');
    } catch (e) {
      erreurs.push(nomModule(m) + ' : ' + e.message);
      if (surProgres) surProgres(m, 'erreur');
      if (e.statut === 0 || e.statut === 401) throw e;
    }
  }
  return { donnees, erreurs };
}

async function lancerAnalyse(opt) {
  menu('analyse');
  const modules = modulesPour(opt.type);
  const li = {};
  const liste = h('ul', { class: 'progression' }, modules.map((m) => (li[m] = h('li', null, nomModule(m)))));
  const debut = Date.now();
  const chrono = h('p', { class: 'petit' }, '');
  const minuteur = setInterval(() => { chrono.textContent = tt('Temps écoulé : ', 'Elapsed: ') + Math.round((Date.now() - debut) / 1000) + ' s'; }, 1000);
  ecran(h('h1', null, tt('Analyse en cours…', 'Analysing…')), h('p', null, tt('Ne ferme pas la fenêtre « DEBUG Friend ! ». Le PC peut ralentir un peu pendant l\'analyse.', 'Do not close the "DEBUG Friend !" window. The PC may slow down a little during the analysis.')), liste, chrono);
  etat.travailEnCours = true;
  let r;
  try {
    r = await collecter(modules, { complete: opt.type === 'complete', lhm: opt.lhm && !opt.lectureSeule }, (m, s) => { li[m].className = s; if (s === 'encours') annoncer(nomModule(m)); });
  } catch (e) {
    clearInterval(minuteur);
    etat.travailEnCours = false;
    ecran(h('h1', null, tt('Analyse interrompue', 'Analysis interrupted')), h('p', null, e.message));
    return;
  }
  clearInterval(minuteur);
  etat.travailEnCours = false;
  const res = resume(r.donnees);
  res.ssid = ((r.donnees.reseau || {}).wifi || {}).ssid || '';
  const problemes = analyser(r.donnees, { langue: etat.langue, lectureSeule: opt.lectureSeule });
  const pcId = await identifiantPc(r.donnees);
  etat.analyse = {
    id: 'a' + Date.now(),
    date: new Date().toISOString(),
    type: opt.type,
    lectureSeule: opt.lectureSeule,
    masque: opt.masque,
    lhm: opt.lhm,
    etiquette: opt.etiquette,
    pcId,
    donnees: r.donnees,
    resume: res,
    erreurs: r.erreurs,
    duree: Math.round((Date.now() - debut) / 1000),
    problemes: problemes.map((p) => ({ ...p, etat: 'ouvert' })),
    tests: [],
    bilan: null
  };
  etat.precedente = await analysePrecedente(pcId, etat.analyse.id);
  try { await enregistrerHistorique(); } catch (e) { alerte(tt('Historique non enregistré : ', 'History not saved: ') + e.message); }
  ecranResultats();
}

async function identifiantPc(d) {
  const s = (d && d.systeme) || {};
  const gen = /to be filled|default|o\.?e\.?m|none|^0+$|^[\s0-]*$|^ffffffff/i;
  const parts = [s.uuid, s.numeroSerie, s.serieCarteMere].filter((x) => x && !gen.test(x));
  if (!parts.length) parts.push(s.nomPC || 'inconnu', s.carteMereModele || '');
  return C.empreinte(parts.join('|'));
}

// ------------------------------------------------------------- historique chiffre
const fichierPc = (id) => 'pc-' + id + '.dfx';

async function lirePc(id) {
  const t = await lireFichier(fichierPc(id));
  if (!t) return null;
  return C.dechiffrerObjet(etat.cle, t);
}

function valeursCles(d, problemes) {
  const n = normaliser(d);
  const phys = ((n.disques || {}).physiques || []).filter((p) => p.bus !== 'USB');
  const c = ((n.disques || {}).volumes || []).find((v) => v.lettre === 'C') || {};
  const ev = n.evenements || {};
  const s = n.systeme || {};
  const g = ((n.gpu_ecrans || {}).gpus || [])[0] || {};
  return {
    batterieSante: (n.batterie || {}).sante ?? null,
    batterieCycles: (n.batterie || {}).cycles ?? null,
    usureSsd: phys.reduce((m, p) => (typeof p.usure === 'number' ? Math.max(m ?? 0, p.usure) : m), null),
    libreC: c.libreGo ?? null,
    ecransBleus: ev.ecransBleus ?? null,
    arretsBrutaux: ev.arretsBrutaux ?? null,
    stabilite: (n.applis || {}).stabilite ?? null,
    bios: s.biosVersion || null,
    windows: s.build ? s.build + '.' + s.ubr : null,
    piloteGraphique: g.pilote || null,
    problemes: (problemes || []).length
  };
}

function versHistorique(a) {
  return {
    id: a.id, date: a.date, type: a.type, lectureSeule: a.lectureSeule, etiquette: a.etiquette, duree: a.duree,
    problemes: a.problemes.map((p) => ({ id: p.id, gravite: p.gravite, titre: p.titre, etat: p.etat })),
    valeurs: valeursCles(a.donnees, a.problemes),
    tests: a.tests || [],
    erreurs: a.erreurs || [],
    bilan: a.bilan
  };
}

async function enregistrerHistorique() {
  const a = etat.analyse;
  if (!a || !etat.cle) return;
  let fiche = null;
  try { fiche = await lirePc(a.pcId); } catch (e) { journal('Historique illisible pour ' + a.pcId + ' : ' + e.message); }
  if (!fiche) fiche = { v: 1, pcId: a.pcId, cree: a.date, analyses: [] };
  fiche.resume = a.resume;
  if (a.etiquette) fiche.etiquette = a.etiquette;
  const i = fiche.analyses.findIndex((x) => x.id === a.id);
  if (i >= 0) fiche.analyses[i] = versHistorique(a); else fiche.analyses.push(versHistorique(a));
  fiche.analyses = fiche.analyses.slice(-30);
  fiche.modifie = new Date().toISOString();
  await ecrireFichier(fichierPc(a.pcId), await C.chiffrerObjet(etat.cle, fiche));
  sauvegardeAuto();
}

async function analysePrecedente(pcId, sauf) {
  try {
    const f = await lirePc(pcId);
    if (!f || !f.analyses) return null;
    const avant = f.analyses.filter((x) => x.id !== sauf);
    return avant.length ? avant[avant.length - 1] : null;
  } catch (e) { return null; }
}

function comparer(avant, apresProblemes, apresValeurs) {
  const idsAvant = new Set(avant.problemes.map((p) => p.id));
  const idsApres = new Set(apresProblemes.map((p) => p.id));
  const libelles = {
    batterieSante: tt('Santé de la batterie (%)', 'Battery health (%)'), batterieCycles: tt('Cycles de la batterie', 'Battery cycles'),
    usureSsd: tt('Usure du SSD (%)', 'SSD wear (%)'), libreC: tt('Espace libre sur C: (Go)', 'Free space on C: (GB)'),
    ecransBleus: tt('Écrans bleus (30 jours)', 'Blue screens (30 days)'), arretsBrutaux: tt('Arrêts brutaux (30 jours)', 'Sudden shutdowns (30 days)'),
    stabilite: tt('Indice de stabilité (sur 10)', 'Stability index (out of 10)'), bios: 'BIOS', windows: 'Windows', piloteGraphique: tt('Pilote graphique', 'Graphics driver'),
    problemes: tt('Nombre de problèmes', 'Number of problems')
  };
  const valeurs = [];
  for (const k of Object.keys(libelles)) {
    const a = avant.valeurs ? avant.valeurs[k] : null;
    const b = apresValeurs[k];
    if (a !== null && a !== undefined && b !== null && b !== undefined && String(a) !== String(b)) valeurs.push([libelles[k], a, b]);
  }
  return {
    regles: avant.problemes.filter((p) => !idsApres.has(p.id)),
    nouveaux: apresProblemes.filter((p) => !idsAvant.has(p.id)),
    restants: apresProblemes.filter((p) => idsAvant.has(p.id)),
    valeurs
  };
}

// ------------------------------------------------------------- resultats
// Le résumé est écrit en français par regles.js : on l'adapte à la langue choisie
const txtResume = (x) => {
  const t = String(x || '');
  if (etat.langue === 'en') return t.replace(/usure/g, 'wear').replace(/% de santé/g, '% health').replace(/^présente/, 'present');
  return etat.langue === 'cy' ? cyr(t) : t;
};
const nombre = (x) => (etat.langue !== 'en' ? String(x || '').replace(/(\d)\.(\d)/g, '$1,$2') : String(x || ''));
function etiquetteGravite(g) {
  const noms = { critique: tt('Critique', 'Critical'), important: tt('Important', 'Important'), conseil: tt('Conseil', 'Advice'), info: tt('Info', 'Info') };
  return h('span', { class: 'etiquette ' + g }, noms[g] || g);
}

function ecranResultats() {
  const a = etat.analyse;
  if (!a) return ecranNouvelleAnalyse();
  menu('resultats');
  const r = a.resume;
  const m = (x) => masquer(x, r, a.masque);
  const comptes = { critique: 0, important: 0, conseil: 0, info: 0 };
  a.problemes.filter((p) => p.etat !== 'regle').forEach((p) => { comptes[p.gravite]++; });
  const enTete = h('div', { class: 'cadre' },
    h('h1', null, m(r.nom)),
    h('table', null, h('tbody', null,
      [[tt('Windows', 'Windows'), r.windows], [tt('Processeur', 'CPU'), r.processeur], [tt('Mémoire', 'Memory'), nombre(r.ram)], [tt('Graphique', 'Graphics'), r.graphique], [tt('Disques', 'Disks'), txtResume(r.disques)], r.batterie ? [tt('Batterie', 'Battery'), txtResume(r.batterie)] : null, r.stabilite !== null && r.stabilite !== undefined ? [tt('Stabilité', 'Stability'), nombre(String(r.stabilite)) + ' / 10'] : null, [tt('Numéro de série', 'Serial number'), m(r.numeroSerie)]]
        .filter(Boolean).map(([k, v]) => h('tr', null, h('th', { scope: 'row' }, k), h('td', null, v || '?'))))),
    h('p', { class: 'petit' }, tt('Analyse ', 'Analysis ') + (a.type === 'complete' ? tt('complète', 'full') : tt('rapide', 'quick')) + ' — ' + dateLocale(a.date) + ' — ' + a.duree + ' s' + (a.lectureSeule ? tt(' — lecture seule', ' — read-only') : '') + (a.etiquette ? ' — ' + a.etiquette : ''))
  );
  const compteurs = h('div', { class: 'compteurs' },
    h('span', { class: comptes.critique ? 'fort' : '' }, comptes.critique + ' ' + tt('critique(s)', 'critical')),
    h('span', null, comptes.important + ' ' + tt('important(s)', 'important')),
    h('span', null, comptes.conseil + ' ' + tt('conseil(s)', 'advice')),
    h('span', null, a.problemes.filter((p) => p.etat === 'regle').length + ' ' + tt('réglé(s)', 'fixed')));

  let bloc = null;
  if (etat.precedente) {
    const c = comparer(etat.precedente, a.problemes, valeursCles(a.donnees, a.problemes));
    bloc = h('div', { class: 'cadre' },
      h('h2', { style: 'margin-top:0' }, tt('Depuis la dernière analyse', 'Since the last analysis') + ' (' + dateLocale(etat.precedente.date) + ')'),
      h('p', null, c.regles.length + tt(' réglé(s), ', ' fixed, ') + c.nouveaux.length + tt(' nouveau(x), ', ' new, ') + c.restants.length + tt(' toujours là.', ' still there.')),
      c.regles.length ? h('p', null, h('b', null, tt('Réglés : ', 'Fixed: ')), c.regles.map((p) => p.titre).join(' ; ')) : null,
      c.nouveaux.length ? h('p', null, h('b', null, tt('Nouveaux : ', 'New: ')), c.nouveaux.map((p) => p.titre).join(' ; ')) : null,
      c.valeurs.length ? h('table', null, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, tt('Avant', 'Before')), h('th', null, tt('Maintenant', 'Now')))), h('tbody', null, c.valeurs.map(([k, x, y]) => h('tr', null, h('th', { scope: 'row' }, k), h('td', null, String(x)), h('td', null, String(y)))))) : null);
  }

  const parEtape = {};
  for (const p of a.problemes) (parEtape[p.etape] = parEtape[p.etape] || []).push(p);
  const sections = Object.keys(parEtape).sort().map((e) => [
    h('h2', { class: 'etape-titre' }, e + '. ' + tt(ETAPES_ORDRE[e][0], ETAPES_ORDRE[e][1])),
    parEtape[e].map((p) => carteProbleme(p))
  ]);
  ecran(
    enTete,
    compteurs,
    bloc,
    a.erreurs.length ? h('details', null, h('summary', null, a.erreurs.length + tt(' information(s) n\'ont pas pu être lues', ' item(s) could not be read')), h('div', { class: 'tech' }, m(a.erreurs.join('\n')))) : null,
    a.problemes.length ? h('p', null, tt('Règle les problèmes dans cet ordre. Après chaque réparation, clique sur « C\'est fait » : le logiciel revérifie.', 'Fix the problems in this order. After each repair, click "Done": the app checks again.'))
      : h('div', { class: 'cadre inverse' }, h('h2', { style: 'margin-top:0' }, tt('Aucun problème trouvé', 'No problem found')), h('p', null, tt('Rien à régler d\'après l\'analyse. Pense aux tests guidés si le client décrit un souci matériel.', 'Nothing to fix according to the analysis. Consider the guided tests if the customer describes a hardware issue.'))),
    sections,
    h('div', { class: 'boutons' },
      h('button', { class: 'principal', onclick: lancerBilan }, tt('Faire le bilan final', 'Run the final check')),
      h('button', { onclick: () => ecranTests(contexteTests()) }, tt('Tests guidés', 'Guided tests')),
      h('button', { onclick: () => ecranChauffe(contexteTests()) }, tt('Test de chauffe', 'Heat test'))),
    a.bilan ? blocBilan(a) : null
  );
}

function carteProbleme(p) {
  const a = etat.analyse;
  const statut = h('p', { class: 'etat', role: 'status' });
  const boutons = h('div', { class: 'boutons' });
  const boutonAction = (id) => {
    if (!id || !ACTIONS[id]) return null;
    if (a.lectureSeule && ACTIONS_MODIFIENT.includes(id)) return null;
    return h('button', { type: 'button', onclick: async () => {
      if (ACTIONS_MODIFIENT.includes(id) && !(await confirmer(tt('Cette action va modifier le PC (« ', 'This action will change the PC ("') + tt(ACTIONS[id][0], ACTIONS[id][1]) + tt(' »). Continuer ?', '"). Continue?')))) return;
      await action(id);
    } }, tt(ACTIONS[id][0], ACTIONS[id][1]));
  };
  if (p.etat !== 'regle' && p.etat !== 'ignore') {
    boutons.append(...[boutonAction(p.action), boutonAction(p.action2)].filter(Boolean));
    const fait = h('button', { class: 'principal', type: 'button', onclick: async () => {
      fait.disabled = true;
      statut.textContent = tt('Revérification…', 'Checking again…');
      try {
        const res = await reverifierProbleme(p);
        statut.textContent = res ? tt('Pas encore réglé : ', 'Not fixed yet: ') + res.simple : tt('Réglé !', 'Fixed!');
        if (!res) { p.etat = 'regle'; p.regleLe = new Date().toISOString(); }
        else Object.assign(p, { titre: res.titre, simple: res.simple, etapes: res.etapes, technique: res.technique, gravite: res.gravite });
        await enregistrerHistorique().catch((e) => journal('Historique : ' + e.message));
        if (!res) setTimeout(ecranResultats, 1200); else fait.disabled = false;
        annoncer(statut.textContent);
      } catch (e) {
        statut.textContent = tt('Revérification impossible : ', 'Check failed: ') + e.message;
        fait.disabled = false;
      }
    } }, tt('C\'est fait', 'Done'));
    boutons.append(fait, h('button', { type: 'button', onclick: async () => { p.etat = 'ignore'; await enregistrerHistorique().catch(() => {}); ecranResultats(); } }, tt('Laisser de côté', 'Leave aside')));
  } else if (p.etat === 'ignore') {
    boutons.append(h('button', { type: 'button', onclick: async () => { p.etat = 'ouvert'; await enregistrerHistorique().catch(() => {}); ecranResultats(); } }, tt('Reprendre', 'Resume')));
  }
  const m = (x) => masquer(x, a.resume, a.masque);
  return h('article', { class: 'probleme ' + p.gravite + (p.etat === 'regle' ? ' regle' : '') + (p.etat === 'ignore' ? ' ignore' : '') },
    h('h3', null, etiquetteGravite(p.gravite), p.titre),
    p.etat === 'regle' ? h('p', { class: 'etat' }, tt('Réglé', 'Fixed') + (p.regleLe ? ' — ' + dateLocale(p.regleLe) : '')) : null,
    p.etat === 'ignore' ? h('p', { class: 'petit' }, tt('Laissé de côté (le client ne souhaite pas, ou plus tard).', 'Left aside (customer declined, or later).')) : null,
    h('p', null, m(p.simple)),
    p.etat === 'regle' ? null : h('ol', null, p.etapes.map((e) => h('li', null, e))),
    h('details', null, h('summary', null, tt('Détails techniques', 'Technical details')), h('div', { class: 'tech' }, m(p.technique || '—') + '\n' + tt('Famille : ', 'Family: ') + tt(...(FAMILLES[p.famille] || [p.famille, p.famille])) + ' | id : ' + p.id)),
    boutons, statut);
}

async function reverifierProbleme(p) {
  const a = etat.analyse;
  const r0 = regle(p.id);
  const modules = r0 ? r0.modules : p.modules;
  const complete = modules.includes('fichiers_windows') || ['maj-disponibles', 'disque-marque'].includes(p.id);
  etat.travailEnCours = true;
  try {
    const r = await collecter(modules, { complete, lhm: a.lhm && !a.lectureSeule });
    Object.assign(a.donnees, r.donnees);
    return reverifier(p.id, a.donnees, { langue: etat.langue, lectureSeule: a.lectureSeule });
  } finally { etat.travailEnCours = false; }
}

function confirmer(texte) {
  return new Promise((resolve) => {
    const z = h('div', { class: 'cadre inverse', role: 'alertdialog' }, h('p', null, texte),
      h('div', { class: 'boutons' }, h('button', { class: 'principal', onclick: () => { z.remove(); resolve(true); } }, tt('Oui', 'Yes')), h('button', { onclick: () => { z.remove(); resolve(false); } }, tt('Non', 'No'))));
    document.getElementById('ecran').prepend(z);
    window.scrollTo(0, 0);
    z.querySelector('button').focus();
  });
}

// ------------------------------------------------------------- bilan final
async function lancerBilan() {
  const a = etat.analyse;
  const modules = modulesPour(a.type);
  const li = {};
  const liste = h('ul', { class: 'progression' }, modules.map((m) => (li[m] = h('li', null, nomModule(m)))));
  ecran(h('h1', null, tt('Bilan final…', 'Final check…')), h('p', null, tt('Nouvelle analyse complète de ce PC pour vérifier que tout est réglé.', 'A new analysis of this PC to confirm everything is fixed.')), liste);
  etat.travailEnCours = true;
  let r;
  try {
    r = await collecter(modules, { complete: a.type === 'complete', lhm: a.lhm && !a.lectureSeule }, (m, s) => { li[m].className = s; });
  } catch (e) {
    etat.travailEnCours = false;
    alerte(e.message);
    return ecranResultats();
  }
  etat.travailEnCours = false;
  const apres = analyser(r.donnees, { langue: etat.langue, lectureSeule: a.lectureSeule });
  const ids = new Set(apres.map((p) => p.id));
  for (const p of a.problemes) {
    if (!ids.has(p.id) && p.etat !== 'regle') { p.etat = 'regle'; p.regleLe = new Date().toISOString(); }
    if (ids.has(p.id) && p.etat === 'regle') p.etat = 'ouvert';
  }
  const idsAvant = new Set(a.problemes.map((p) => p.id));
  const nouveaux = apres.filter((p) => !idsAvant.has(p.id));
  const restants = a.problemes.filter((p) => p.etat !== 'regle');
  const graves = restants.filter((p) => p.etat !== 'ignore' && (p.gravite === 'critique' || p.gravite === 'important')).length + nouveaux.filter((p) => p.gravite === 'critique' || p.gravite === 'important').length;
  a.bilan = {
    date: new Date().toISOString(),
    regles: a.problemes.filter((p) => p.etat === 'regle').map((p) => p.titre),
    restants: restants.map((p) => ({ titre: p.titre, gravite: p.gravite, ignore: p.etat === 'ignore' })),
    nouveaux: nouveaux.map((p) => ({ titre: p.titre, gravite: p.gravite })),
    repare: graves === 0,
    valeursApres: valeursCles(r.donnees, apres)
  };
  a.donneesApres = r.donnees;
  try { await enregistrerHistorique(); } catch (e) { alerte(tt('Historique non enregistré : ', 'History not saved: ') + e.message); }
  ecranResultats();
  setTimeout(() => { const b = document.getElementById('bilan'); if (b) b.scrollIntoView(); }, 50);
}

function blocBilan(a) {
  const b = a.bilan;
  return h('section', { id: 'bilan', class: 'cadre' + (b.repare ? ' inverse' : '') },
    h('h2', { style: 'margin-top:0' }, tt('Bilan final', 'Final check') + ' — ' + dateLocale(b.date)),
    h('p', null, h('b', null, b.repare ? tt('Le PC est réparé : plus aucun problème critique ou important.', 'The PC is fixed: no critical or important problem left.') : tt('Le PC n\'est pas entièrement réparé.', 'The PC is not fully fixed.'))),
    h('p', null, b.regles.length + tt(' problème(s) réglé(s).', ' problem(s) fixed.')),
    b.regles.length ? h('ul', null, b.regles.map((x) => h('li', null, '✓ ' + x))) : null,
    b.restants.length ? [h('p', null, h('b', null, tt('Restent :', 'Remaining:'))), h('ul', null, b.restants.map((x) => h('li', null, x.titre + (x.ignore ? tt(' (laissé de côté)', ' (left aside)') : ''))))] : null,
    b.nouveaux.length ? [h('p', null, h('b', null, tt('Apparus pendant l\'intervention :', 'Appeared during the repair:'))), h('ul', null, b.nouveaux.map((x) => h('li', null, x.titre)))] : null);
}

// ------------------------------------------------------------- historique
async function ecranHistorique() {
  menu('historique');
  ecran(h('h1', null, tt('Historique', 'History')), h('p', { class: 'petit' }, tt('Lecture…', 'Reading…')));
  let fiches = [];
  try {
    const noms = (await listeFichiers()).filter((n) => /^pc-[0-9a-f]+\.dfx$/.test(n));
    for (const n of noms) {
      try { fiches.push(await C.dechiffrerObjet(etat.cle, await lireFichier(n))); } catch (e) { journal('Fiche illisible : ' + n); }
    }
  } catch (e) { return alerte(e.message); }
  fiches.sort((x, y) => String(y.modifie || '').localeCompare(String(x.modifie || '')));
  if (!fiches.length) return ecran(h('h1', null, tt('Historique', 'History')), h('p', null, tt('Aucun PC analysé pour l\'instant.', 'No PC analysed yet.')));
  ecran(h('h1', null, tt('Historique', 'History')),
    h('p', null, fiches.length + tt(' PC analysé(s).', ' PC(s) analysed.')),
    fiches.map((f) => {
      const der = f.analyses[f.analyses.length - 1] || {};
      return h('div', { class: 'cadre' },
        h('h3', null, (f.resume || {}).nom || '?'),
        f.etiquette ? h('p', null, f.etiquette) : null,
        h('p', { class: 'petit' }, f.analyses.length + tt(' analyse(s) ; dernière le ', ' analysis(es); last on ') + dateLocale(der.date) + ' — ' + (der.problemes || []).filter((p) => p.etat !== 'regle').length + tt(' problème(s) restant(s)', ' problem(s) remaining')),
        h('details', null, h('summary', null, tt('Voir les analyses', 'See analyses')),
          h('table', null, h('thead', null, h('tr', null, h('th', null, tt('Date', 'Date')), h('th', null, tt('Type', 'Type')), h('th', null, tt('Problèmes', 'Problems')), h('th', null, tt('Réglés', 'Fixed')), h('th', null, tt('Bilan', 'Check')))),
            h('tbody', null, f.analyses.slice().reverse().map((x) => h('tr', null,
              h('td', null, dateLocale(x.date)), h('td', null, x.type === 'complete' ? tt('complète', 'full') : tt('rapide', 'quick')),
              h('td', null, String((x.problemes || []).length)), h('td', null, String((x.problemes || []).filter((p) => p.etat === 'regle').length)),
              h('td', null, x.bilan ? (x.bilan.repare ? tt('réparé', 'fixed') : tt('incomplet', 'incomplete')) : '—'))))),
          f.analyses.length >= 2 ? blocComparaison(f.analyses[f.analyses.length - 2], f.analyses[f.analyses.length - 1]) : null));
    }));
}

function blocComparaison(avant, apres) {
  const c = comparer(avant, apres.problemes || [], apres.valeurs || {});
  return h('div', null, h('h3', null, tt('Entre les deux dernières analyses', 'Between the last two analyses')),
    h('p', null, c.regles.length + tt(' réglé(s), ', ' fixed, ') + c.nouveaux.length + tt(' nouveau(x), ', ' new, ') + c.restants.length + tt(' toujours là.', ' still there.')),
    c.valeurs.length ? h('table', null, h('tbody', null, c.valeurs.map(([k, x, y]) => h('tr', null, h('th', { scope: 'row' }, k), h('td', null, String(x)), h('td', null, String(y)))))) : null);
}

// ------------------------------------------------------------- sauvegardes
async function sauvegardeAuto(manuel) {
  if (!etat.reglages) return null;
  const versDrive = !!(etat.analyse && etat.reglages.pcDrive.includes(etat.analyse.pcId)) || !!(etat.pcCourantId && etat.reglages.pcDrive.includes(etat.pcCourantId));
  try {
    const r = await api('/api/sauvegarde', { corps: { drive: versDrive } });
    if (r.cle || r.drive) {
      etat.reglages.derniereSauvegarde = new Date().toISOString();
      await enregistrerReglages();
    }
    return r;
  } catch (e) {
    if (manuel) alerte(e.message);
    return null;
  }
}

// ------------------------------------------------------------- reglages
async function ecranReglages() {
  menu('reglages');
  const r = etat.reglages;
  if (!etat.pcCourantId) {
    try { const s = await api('/api/collecte', { corps: { module: 'systeme' } }); etat.pcCourantId = await identifiantPc({ systeme: normaliser(s.donnees) }); } catch (e) { /* rien */ }
  }
  const ceDrive = etat.pcCourantId && r.pcDrive.includes(etat.pcCourantId);
  const minutes = h('select', { id: 'verrou' }, [5, 10, 15, 30, 60].map((v) => h('option', { value: String(v), selected: v === r.verrouMinutes }, v + ' min')));
  minutes.addEventListener('change', async () => { r.verrouMinutes = parseInt(minutes.value, 10); await enregistrerReglages(); annoncer(tt('Enregistré.', 'Saved.')); });
  const resultatSauv = h('p', { role: 'status' });
  ecran(
    h('h1', null, tt('Réglages', 'Settings')),
    LANGUE_UNIQUE ? null : h('h2', null, tt('Langue', 'Language')),
    LANGUE_UNIQUE ? null : h('div', { class: 'boutons' }, h('button', { class: etat.langue === 'fr' ? 'principal' : '', onclick: () => changerLangue('fr') }, 'Français'), h('button', { class: etat.langue === 'en' ? 'principal' : '', onclick: () => changerLangue('en') }, 'English'), h('button', { class: etat.langue === 'cy' ? 'principal' : '', onclick: () => changerLangue('cy') }, 'Франсэс (сириллике)')),
    h('h2', null, tt('Verrouillage automatique', 'Automatic lock')),
    h('label', { for: 'verrou' }, tt('Verrouiller après', 'Lock after')), minutes,
    h('h2', null, tt('Sauvegardes chiffrées', 'Encrypted backups')),
    h('p', null, tt('À chaque enregistrement, DEBUG Friend ! copie tes données chiffrées sur la clé USB nommée « DEBUG-SECOURS » si elle est branchée, et dans ton Google Drive si le PC est un des tiens. Il garde les 10 dernières copies.', 'On every save, DEBUG Friend ! copies your encrypted data to the USB drive named "DEBUG-SECOURS" if plugged in, and to your Google Drive if this PC is one of yours. It keeps the last 10 copies.')),
    h('p', { class: 'petit' }, tt('Dernière sauvegarde : ', 'Last backup: ') + (r.derniereSauvegarde ? dateLocale(r.derniereSauvegarde) : tt('jamais', 'never'))),
    h('p', null, ceDrive ? tt('Ce PC est marqué comme à toi : sauvegarde Google Drive active ici.', 'This PC is marked as yours: Google Drive backup is on here.') : tt('Ce PC n\'est pas marqué comme à toi : pas de copie vers Google Drive ici.', 'This PC is not marked as yours: no copy to Google Drive here.')),
    h('div', { class: 'boutons' },
      etat.pcCourantId ? h('button', { onclick: async () => {
        if (ceDrive) r.pcDrive = r.pcDrive.filter((x) => x !== etat.pcCourantId); else r.pcDrive.push(etat.pcCourantId);
        await enregistrerReglages(); ecranReglages();
      } }, ceDrive ? tt('Ce PC n\'est pas à moi', 'This PC is not mine') : tt('Ce PC est à moi (Google Drive)', 'This PC is mine (Google Drive)')) : null,
      h('button', { class: 'principal', onclick: async () => {
        resultatSauv.textContent = tt('Sauvegarde…', 'Backing up…');
        const s = await sauvegardeAuto(true);
        if (!s) { resultatSauv.textContent = ''; return; }
        const err = Array.isArray(s.erreurs) ? s.erreurs : (s.erreurs && s.erreurs.value) || [];
        resultatSauv.textContent = [s.cle ? tt('Clé de secours : ', 'Backup drive: ') + s.cle : null, s.drive ? 'Google Drive : ' + s.drive : null, ...err].filter(Boolean).join(' — ');
      } }, tt('Sauvegarder maintenant', 'Back up now'))),
    resultatSauv,
    h('h2', null, tt('Accès', 'Access')),
    h('div', { class: 'boutons' }, h('button', { onclick: ecranChangerMdp }, tt('Changer de mot de passe', 'Change password')), h('button', { onclick: async () => {
      if (!(await confirmer(tt('Relier une nouvelle appli à codes ? L\'ancienne ne marchera plus.', 'Link a new authenticator app? The old one will stop working.')))) return;
      const n = await C.nouveauSecretTotp(etat.compte, etat.cle);
      ecranEnrolement(n.compte, etat.cle, n.secretTotp, null, false);
    } }, tt('Nouvelle appli à codes', 'New authenticator app'))),
    h('h2', null, tt('À propos', 'About')),
    h('p', null, 'DEBUG Friend ! ' + VERSION + ' — ' + tt('Atelier DEBUG, EMPEREUR Arsène', 'DEBUG workshop, EMPEREUR Arsène')),
    h('p', { class: 'petit' }, tt('Températures exactes : ', 'Exact temperatures: ') + (etat.infos && etat.infos.lhmPresent ? tt('LibreHardwareMonitor présent sur la clé.', 'LibreHardwareMonitor found on the drive.') : tt('LibreHardwareMonitor absent (voir LISEZ-MOI : dossier outils).', 'LibreHardwareMonitor missing (see LISEZ-MOI: outils folder).'))),
    h('p', { class: 'petit' }, tt('Polices Inter (licence OFL). Chiffrement AES-256-GCM, mot de passe dérivé par PBKDF2-SHA-256 (600 000 tours).', 'Inter fonts (OFL licence). AES-256-GCM encryption, password derived with PBKDF2-SHA-256 (600,000 rounds).'))
  );
}

function ecranChangerMdp() {
  const ancien = h('input', { type: 'password', id: 'a', autocomplete: 'current-password' });
  const n1 = h('input', { type: 'password', id: 'b', autocomplete: 'new-password' });
  const n2 = h('input', { type: 'password', id: 'c', autocomplete: 'new-password' });
  ecran(h('h1', null, tt('Changer de mot de passe', 'Change password')),
    h('form', { onsubmit: async (e) => {
      e.preventDefault();
      if (n1.value.length < 12 || n1.value !== n2.value) return alerte(tt('Nouveau mot de passe : 12 caractères minimum, tapé deux fois à l\'identique.', 'New password: at least 12 characters, typed twice the same.'));
      try { await C.ouvrirAvecMotDePasse(etat.compte, ancien.value); } catch (err) { return alerte(tt('Mot de passe actuel incorrect.', 'Current password is wrong.')); }
      // On reutilise la cle de secours pour reecrire la boite du mot de passe sans exposer la cle maitresse :
      // la cle maitresse brute est recuperee en dechiffrant avec l'ancien mot de passe.
      const maitre = await maitreDepuisMdp(etat.compte, ancien.value);
      const compte = await C.changerMotDePasse(etat.compte, maitre, n1.value);
      maitre.fill(0);
      await ecrireFichier('compte.json', JSON.stringify(compte));
      etat.compte = compte;
      alerte(tt('Mot de passe changé.', 'Password changed.'));
      ecranReglages();
    } },
    h('label', { for: 'a' }, tt('Mot de passe actuel', 'Current password')), ancien,
    h('label', { for: 'b' }, tt('Nouveau mot de passe', 'New password')), n1,
    h('label', { for: 'c' }, tt('Retape-le', 'Type it again')), n2,
    h('div', { class: 'boutons' }, h('button', { class: 'principal', type: 'submit' }, tt('Changer', 'Change')), h('button', { type: 'button', onclick: ecranReglages }, tt('Retour', 'Back')))));
}

async function maitreDepuisMdp(compte, mdp) {
  return C.maitreAvecMotDePasse(compte, mdp);
}

// ------------------------------------------------------------- quitter
async function quitter() {
  if (!(await confirmer(tt('Quitter DEBUG Friend ! ? Seuls les fichiers temporaires créés par DEBUG Friend ! sont effacés de ce PC (tes analyses et ton compte restent sur la clé).', 'Quit DEBUG Friend !? Only the temporary files created by DEBUG Friend ! are removed from this PC (your analyses and account stay on the drive).')))) return;
  try { await api('/api/quitter', { corps: {} }); } catch (e) { /* deja arrete */ }
  etat.cle = null;
  document.getElementById('menu').hidden = true;
  ecran(h('h1', null, tt('DEBUG Friend ! est fermé', 'DEBUG Friend ! is closed')), h('p', null, tt('Tu peux fermer cet onglet et retirer la clé USB (bouton « Éjecter » de Windows).', 'You can close this tab and remove the USB drive ("Eject" in Windows).')));
}

demarrer().catch((e) => { journal('Démarrage : ' + e.message); ecran(h('h1', null, 'Erreur'), h('p', null, e.message)); });
