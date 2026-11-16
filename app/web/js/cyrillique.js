// =====================================================================
//  DEBUG Friend ! - « Français cyrillique » : le français ecrit en
//  alphabet cyrillique (langue perso d'Arsene).
//  Pour changer une lettre : modifie seulement les tableaux ci-dessous.
//  Les noms de marques, sigles, commandes, chemins et nombres restent
//  en alphabet latin (sinon on ne pourrait plus les taper).
// =====================================================================

// Groupes de lettres, du plus long au plus court (l'ordre compte).
const GROUPES = [
  ['eaux', 'о'], ['eau', 'о'],
  ['ouill', 'уй'], ['aill', 'ай'], ['eill', 'эй'],
  ['ch', 'ш'], ['gn', 'нь'], ['ph', 'ф'], ['th', 'т'], ['qu', 'к'],
  ['où', 'у'], ['oû', 'у'], ['ou', 'у'],
  ['oi', 'уа'], ['oî', 'уа'],
  ['au', 'о'], ['ai', 'э'], ['aî', 'э'], ['ei', 'э'],
  ['œu', 'ё'], ['eu', 'ё'], ['œ', 'ё'],
  ['ss', 'сс'], ['x', 'кс']
];

// Lettres seules
const LETTRES = {
  a: 'а', à: 'а', â: 'а', b: 'б', d: 'д', e: 'е', é: 'э', è: 'е', ê: 'е', ë: 'е',
  f: 'ф', h: '', i: 'и', î: 'и', ï: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н',
  o: 'о', ô: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т', u: 'у', ù: 'у', û: 'у', ü: 'у',
  v: 'в', w: 'в', y: 'и', ÿ: 'и', z: 'з', ç: 'с'
};

const DOUCES_TXT = 'eiyéèêëîï';     // apres c / g : c = с, g = ж
const VOYELLES_TXT = 'aeiouyàâéèêëîïôùûüœ';
// (attention : 'texte'.includes('') vaut true, d'ou ces petites fonctions)
const douce = (x) => !!x && DOUCES_TXT.includes(x);
const voyelle = (x) => !!x && VOYELLES_TXT.includes(x);

// Mots qui restent en alphabet latin
const GARDER = new Set(('Windows Microsoft Google Drive Chrome Edge Brave Firefox Intel Lenovo Vantage Xbox Game Bar BitLocker ' +
  'Defender OneDrive Friend Authenticator PowerShell LibreHardwareMonitor Bluetooth Wero PayPal Inter Consolas Store Office Steam ' +
  'Discord Realtek Dell Samsung Lexar Radeon GeForce Ryzen Core Apex Gigabyte Acer Asus Armoury Crate Legion Omen Alienware Razer ' +
  'Logitech Corsair Kingston Crucial Seagate Western Digital Toshiba Sandisk SanDisk Adobe Acrobat Reader Avast Norton McAfee Kaspersky ' +
  'Bitdefender Malwarebytes Opera Spotify Teams Outlook Word Excel Zoom Skype Epic Games Battle Ubisoft Riot Vanguard Roblox Valorant ' +
  'Fortnite Minecraft Wi Fi Ethernet Secure Boot Smart App Control Re Size Resizable Above Decoding Expo Settings Update Insider Home Pro Famille ' +
  'Authenticator Easy Anti Cheat Thunderbolt DisplayPort Snapdragon Qualcomm Mediatek Killer Wireless Precision Touchpad Hello Copilot Edge ' +
  'Claude GitHub Gmail Orange Free Bouygues Livebox Freebox Sagemcom Go To Mo Ko Hz MHz GHz min Mb Gb').split(/\s+/));

function translitMot(mot) {
  const bas = mot.toLowerCase();
  let r = '';
  let i = 0;
  while (i < bas.length) {
    let fait = false;
    // gu devant e/i : g dur
    if (bas[i] === 'g' && bas[i + 1] === 'u' && douce(bas[i + 2])) { r += 'г'; i += 2; continue; }
    // ge devant a/o/u : on garde le son « j » (mangeons)
    if (bas[i] === 'g' && bas[i + 1] === 'e' && !!bas[i + 2] && 'aoâôu'.includes(bas[i + 2])) { r += 'ж'; i += 2; continue; }
    for (const [g, c] of GROUPES) {
      if (bas.startsWith(g, i)) { r += c; i += g.length; fait = true; break; }
    }
    if (fait) continue;
    const l = bas[i];
    const suiv = bas[i + 1] || '';
    if (l === 'c') r += douce(suiv) ? 'с' : 'к';
    else if (l === 'g') r += douce(suiv) ? 'ж' : 'г';
    else if (l === 's' && i > 0 && voyelle(bas[i - 1]) && voyelle(suiv)) r += 'з';
    else if (l === 'y' && voyelle(suiv)) r += 'й';
    else if (l in LETTRES) r += LETTRES[l];
    else r += mot[i];
    i++;
  }
  // Majuscule au debut si le mot en avait une
  if (mot[0] !== bas[0] && r) r = r[0].toUpperCase() + r.slice(1);
  return r;
}

// Un « morceau » sans espace : on decide s'il est technique (garde en latin)
function technique(m) {
  const coeur = m.replace(/^[«»"'’(\[]+|[«»"'’)\].,;!?…]+$/g, '');
  if (!coeur) return true;
  if (/\d/.test(coeur)) return true;                        // F2, 0x116, 26H2...
  if (/^[A-Z]:/.test(coeur)) return true;                   // C:
  if (/[\\/@_{}<>=|#$%&*+]/.test(coeur)) return true;       // chemins, {n}, adresses
  if (/^-\w/.test(coeur)) return true;                      // options de commande
  if (/\w\.\w/.test(coeur)) return true;                    // aka.ms, fichier.exe
  if (/^ms-settings|^https?:/i.test(coeur)) return true;
  const lettres = coeur.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (lettres.length >= 2 && lettres === lettres.toUpperCase()) return true;  // USB, BIOS, SSD
  if (/[a-z][A-Z]/.test(coeur)) return true;                // OneDrive, GeForce, iPhone
  return false;
}

function translitMorceau(m) {
  if (technique(m)) return m;
  // On transforme chaque suite de lettres, sauf les marques connues
  return m.replace(/[A-Za-zÀ-ÖØ-öø-ÿœŒ]+/g, (mot) => (GARDER.has(mot) ? mot : translitMot(mot)));
}

// Passage entre guillemets qui ressemble a une commande : on n'y touche pas
const COMMANDE = /(^|\s)-\w|\w\.\w|[\\/]|\w:(\s|$)|^\s*[a-z]+\s+\/\w/;

export function cyr(texte) {
  if (texte === null || texte === undefined) return texte;
  const s = String(texte);
  return s.split(/(«[^»]*»)/).map((bout) => {
    if (bout.startsWith('«') && COMMANDE.test(bout.slice(1, -1))) return bout;
    return bout.split(/(\s+)/).map((m) => (/^\s+$/.test(m) ? m : translitMorceau(m))).join('');
  }).join('');
}

// Une valeur inseree dans une phrase est-elle du texte (a transformer) ou une donnee (nom d'appareil...) ?
export function estPhrase(v) {
  return typeof v === 'string' && /(^|[\s'’(])[a-zàâçéèêëîïôûùüÿœ]{3,}(?=[\s,.;:!?)]|$)/.test(v);
}
