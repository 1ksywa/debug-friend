// =====================================================================
//  DEBUG Friend ! - coffre chiffre, mot de passe, appli a codes (TOTP)
//  Tout le chiffrement se fait ici, dans le navigateur, avec la
//  cryptographie integree (WebCrypto) : AES-256-GCM et PBKDF2-SHA-256.
// =====================================================================

const sub = globalThis.crypto.subtle;
const ITERATIONS = 600000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function aleatoire(n) {
  const a = new Uint8Array(n);
  globalThis.crypto.getRandomValues(a);
  return a;
}

export function enB64(octets) {
  let s = '';
  const a = new Uint8Array(octets);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}

export function deB64(texte) {
  const s = atob(texte);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function enB32(octets) {
  let bits = 0, valeur = 0, sortie = '';
  for (const o of octets) {
    valeur = (valeur << 8) | o;
    bits += 8;
    while (bits >= 5) {
      sortie += B32[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) sortie += B32[(valeur << (5 - bits)) & 31];
  return sortie;
}

export function deB32(texte) {
  const t = texte.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, valeur = 0;
  const sortie = [];
  for (const c of t) {
    valeur = (valeur << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      sortie.push((valeur >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(sortie);
}

async function deriver(secret, sel, iterations) {
  const base = await sub.importKey('raw', enc.encode(secret.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return sub.deriveKey(
    { name: 'PBKDF2', salt: sel, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function chiffrerOctets(cle, octets) {
  const iv = aleatoire(12);
  const ct = await sub.encrypt({ name: 'AES-GCM', iv }, cle, octets);
  return { iv: enB64(iv), ct: enB64(ct) };
}

async function dechiffrerOctets(cle, boite) {
  const pt = await sub.decrypt({ name: 'AES-GCM', iv: deB64(boite.iv) }, cle, deB64(boite.ct));
  return new Uint8Array(pt);
}

function importerMaitre(brut) {
  return sub.importKey('raw', brut, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// Code de secours : 20 octets aleatoires, ecrits en 4 groupes de 8 caracteres.
export function nouveauCodeSecours() {
  const b = enB32(aleatoire(20));
  return b.match(/.{8}/g).join('-');
}

export function normaliserCodeSecours(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
}

// Cree le compte : renvoie le fichier compte (a enregistrer), la cle ouverte,
// le secret de l'appli a codes et le code de secours a imprimer.
export async function creerCompte(motDePasse) {
  if (!motDePasse || motDePasse.length < 12) throw new Error('mot-de-passe-court');
  const maitre = aleatoire(32);
  const selMdp = aleatoire(16);
  const selSecours = aleatoire(16);
  const codeSecours = nouveauCodeSecours();
  const secretTotp = aleatoire(20);
  const kek = await deriver(motDePasse, selMdp, ITERATIONS);
  const kekSecours = await deriver(normaliserCodeSecours(codeSecours), selSecours, ITERATIONS);
  const cle = await importerMaitre(maitre);
  const compte = {
    v: 1,
    cree: new Date().toISOString(),
    iterations: ITERATIONS,
    mdp: { sel: enB64(selMdp), boite: await chiffrerOctets(kek, maitre) },
    secours: { sel: enB64(selSecours), boite: await chiffrerOctets(kekSecours, maitre) },
    totp: await chiffrerOctets(cle, secretTotp)
  };
  maitre.fill(0);
  return { compte, cle, secretTotp: enB32(secretTotp), codeSecours };
}

// Ouvre le coffre avec le mot de passe. Erreur 'mauvais-mot-de-passe' sinon.
export async function ouvrirAvecMotDePasse(compte, motDePasse) {
  try {
    const kek = await deriver(motDePasse, deB64(compte.mdp.sel), compte.iterations || ITERATIONS);
    const maitre = await dechiffrerOctets(kek, compte.mdp.boite);
    const cle = await importerMaitre(maitre);
    maitre.fill(0);
    return cle;
  } catch (e) {
    throw new Error('mauvais-mot-de-passe');
  }
}

// Cle maitresse brute (pour changer de mot de passe). A effacer apres usage.
export async function maitreAvecMotDePasse(compte, motDePasse) {
  try {
    const kek = await deriver(motDePasse, deB64(compte.mdp.sel), compte.iterations || ITERATIONS);
    return await dechiffrerOctets(kek, compte.mdp.boite);
  } catch (e) {
    throw new Error('mauvais-mot-de-passe');
  }
}

export async function ouvrirAvecSecours(compte, code) {
  try {
    const kek = await deriver(normaliserCodeSecours(code), deB64(compte.secours.sel), compte.iterations || ITERATIONS);
    const maitre = await dechiffrerOctets(kek, compte.secours.boite);
    return { maitre };
  } catch (e) {
    throw new Error('mauvais-code-secours');
  }
}

// Apres une recuperation : nouveau mot de passe (la cle maitresse ne change pas,
// donc toutes les donnees restent lisibles).
export async function changerMotDePasse(compte, maitre, nouveauMdp) {
  if (!nouveauMdp || nouveauMdp.length < 12) throw new Error('mot-de-passe-court');
  const sel = aleatoire(16);
  const kek = await deriver(nouveauMdp, sel, ITERATIONS);
  const copie = JSON.parse(JSON.stringify(compte));
  copie.iterations = ITERATIONS;
  copie.mdp = { sel: enB64(sel), boite: await chiffrerOctets(kek, maitre) };
  return copie;
}

// Remplace le secret de l'appli a codes (nouveau telephone par exemple).
export async function nouveauSecretTotp(compte, cle) {
  const secret = aleatoire(20);
  const copie = JSON.parse(JSON.stringify(compte));
  copie.totp = await chiffrerOctets(cle, secret);
  return { compte: copie, secretTotp: enB32(secret) };
}

export async function lireSecretTotp(compte, cle) {
  return dechiffrerOctets(cle, compte.totp);
}

export async function cleDepuisMaitre(maitre) {
  return importerMaitre(maitre);
}

// ------------------------------------------------------------- TOTP (RFC 6238)
export async function codeTotp(secretOctets, tempsMs, chiffres = 6, pas = 30) {
  const compteur = Math.floor(tempsMs / 1000 / pas);
  const msg = new Uint8Array(8);
  let c = compteur;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 255;
    c = Math.floor(c / 256);
  }
  const cle = await sub.importKey('raw', secretOctets, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await sub.sign('HMAC', cle, msg));
  const o = h[h.length - 1] & 15;
  const bin = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** chiffres).padStart(chiffres, '0');
}

// Accepte le code de la periode actuelle, d'avant et d'apres (horloges decalees).
export async function verifierTotp(secretOctets, code, tempsMs = Date.now()) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  for (const d of [0, -1, 1]) {
    if ((await codeTotp(secretOctets, tempsMs + d * 30000)) === c) return true;
  }
  return false;
}

export function lienAppliCodes(secretB32, compteNom) {
  const emetteur = 'DEBUG Friend';
  const etiquette = encodeURIComponent(emetteur + ':' + (compteNom || 'Atelier DEBUG'));
  return 'otpauth://totp/' + etiquette + '?secret=' + secretB32 + '&issuer=' + encodeURIComponent(emetteur) + '&algorithm=SHA1&digits=6&period=30';
}

// ------------------------------------------------------------- donnees
export async function chiffrerObjet(cle, objet) {
  const boite = await chiffrerOctets(cle, enc.encode(JSON.stringify(objet)));
  return 'DF1:' + boite.iv + ':' + boite.ct;
}

export async function dechiffrerObjet(cle, texte) {
  const p = String(texte).trim().split(':');
  if (p.length !== 3 || p[0] !== 'DF1') throw new Error('format-inconnu');
  const pt = await dechiffrerOctets(cle, { iv: p[1], ct: p[2] });
  return JSON.parse(dec.decode(pt));
}

// Empreinte (pour nommer les fichiers sans reveler le numero de serie)
export async function empreinte(texte) {
  const h = new Uint8Array(await sub.digest('SHA-256', enc.encode(texte)));
  return Array.from(h.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Delai impose apres plusieurs mauvais essais (en secondes)
export function delaiApresEchecs(echecs) {
  if (echecs < 3) return 0;
  return Math.min(300, 2 ** (echecs - 2));
}
