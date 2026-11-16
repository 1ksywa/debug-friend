// =====================================================================
//  DEBUG Friend ! - base de solutions
//  Chaque fiche : detection, gravite, place dans l'ordre de reparation,
//  explication simple, details techniques, etapes, modules a relire
//  pour la reverification. Textes en francais et en anglais.
// =====================================================================

export const GRAVITES = ['critique', 'important', 'conseil', 'info'];

export const ETAPES_ORDRE = {
  1: ['Mettre les données à l\'abri', 'Protect the data'],
  2: ['Sécurité', 'Security'],
  3: ['Windows', 'Windows'],
  4: ['BIOS et pilotes', 'BIOS and drivers'],
  5: ['Réglages et matériel', 'Settings and hardware'],
  6: ['Confort', 'Comfort']
};

export const FAMILLES = {
  disques: ['Disques', 'Disks'],
  securite: ['Sécurité', 'Security'],
  virus: ['Virus, pubs, navigateurs', 'Malware, ads, browsers'],
  windows: ['Windows et mises à jour', 'Windows and updates'],
  plantages: ['Plantages', 'Crashes'],
  pilotes: ['Pilotes et BIOS', 'Drivers and BIOS'],
  reseau: ['Internet et Wi-Fi', 'Internet and Wi-Fi'],
  son: ['Son, micro, webcam', 'Sound, mic, webcam'],
  bluetooth: ['Bluetooth et manettes', 'Bluetooth and controllers'],
  imprimantes: ['Imprimantes', 'Printers'],
  ecrans: ['Écrans', 'Displays'],
  jeux: ['Jeux', 'Gaming'],
  lenteurs: ['Lenteurs', 'Slowness'],
  demarrage: ['Démarrage et arrêt', 'Startup and shutdown'],
  batterie: ['Batterie', 'Battery'],
  materiel: ['Matériel', 'Hardware'],
  comptes: ['Comptes', 'Accounts'],
  marque: ['Outils du fabricant', 'Manufacturer tools']
};

// ------------------------------------------------------------- outils
const L = (c) => (c && c.langue === 'en' ? 1 : 0);
const jours = (iso, maintenant) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  return Math.floor((maintenant.getTime() - t) / 86400000);
};
const liste = (x) => (Array.isArray(x) ? x : x && Array.isArray(x.value) ? x.value : x ? [x] : []);
const nb = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
const go = (x) => (x >= 1000 ? (x / 1000).toFixed(x % 1000 === 0 ? 0 : 1).replace('.', ',') + ' To' : Math.round(x) + ' Go');
const dateFr = (iso) => {
  if (!iso) return '?';
  const d = new Date(iso);
  return isNaN(d) ? '?' : d.toLocaleDateString('fr-FR');
};

export function normaliser(donnees) {
  // Corrige le format "{value:[...],Count:n}" que Windows PowerShell 5.1 produit parfois.
  const fix = (o) => {
    if (Array.isArray(o)) return o.map(fix);
    if (o && typeof o === 'object') {
      const k = Object.keys(o);
      if (k.length === 2 && k.includes('value') && k.includes('Count') && Array.isArray(o.value)) return o.value.map(fix);
      const r = {};
      for (const c of k) r[c] = fix(o[c]);
      return r;
    }
    return o;
  };
  return fix(donnees || {});
}

// ------------------------------------------------------------- nom du PC
const GENERIQUES = /to be filled|system manufacturer|system product|default string|o\.?e\.?m\.?|not applicable|not specified|^none$|^\s*$|^x+$|^1\.0$|^0+$/i;
const MARQUES = [
  [/lenovo/i, 'Lenovo'], [/hewlett|^hp\b|hp inc/i, 'HP'], [/dell/i, 'Dell'], [/asus/i, 'Asus'], [/acer/i, 'Acer'],
  [/micro-star|^msi\b/i, 'MSI'], [/gigabyte|aorus/i, 'Gigabyte'], [/microsoft/i, 'Microsoft'], [/samsung/i, 'Samsung'],
  [/huawei/i, 'Huawei'], [/razer/i, 'Razer'], [/apple/i, 'Apple'], [/toshiba|dynabook/i, 'Dynabook'], [/fujitsu/i, 'Fujitsu'],
  [/medion/i, 'Medion'], [/xiaomi/i, 'Xiaomi'], [/honor/i, 'Honor'], [/asrock/i, 'ASRock'], [/schenker|xmg/i, 'Schenker'], [/clevo/i, 'Clevo']
];

export function marqueCourte(f) {
  for (const [re, nom] of MARQUES) if (re.test(f || '')) return nom;
  return (f || '').replace(/,? ?(inc\.?|corporation|co\.?,? ?ltd\.?|computer|technology|international|gmbh|s\.a\.)/gi, '').trim();
}

export function nomProcesseur(n) {
  return (n || '')
    .replace(/\(R\)|\(TM\)|®|™/gi, '')
    .replace(/\d+(th|rd|nd|st) Gen /i, '')
    .replace(/ CPU| Processor|\s+@.*$|\s+\d+-Core.*$|\s+with Radeon.*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TYPES_RAM = { 20: 'DDR', 21: 'DDR2', 24: 'DDR3', 26: 'DDR4', 30: 'LPDDR4', 34: 'DDR5', 35: 'LPDDR5' };

function estGpuDedie(nom) {
  return /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|arc a\d|arc b\d|radeon \d{3,4}m?\b/i.test(nom || '') && !/radeon\(tm\) graphics|radeon graphics$|vega \d+ graphics/i.test(nom || '');
}

export function nomDuPc(d) {
  const s = d.systeme || {};
  const fab = s.fabricant || '';
  const mod = s.modele || '';
  const generique = GENERIQUES.test(fab) || GENERIQUES.test(mod);
  const cmFab = marqueCourte(s.carteMereFabricant || '');
  const memeQueCarte = !s.portable && marqueCourte(fab) === cmFab && (mod === s.carteMereModele || /^(MS-\d|B\d{3}|Z\d{3}|X\d{3}|H\d{3}|A\d{3}|PRIME|ROG STRIX|TUF GAMING|MAG |MPG |MEG )/i.test(mod));
  if (!generique && !memeQueCarte && fab) {
    const marque = marqueCourte(fab);
    let modele = mod;
    if (marque === 'Lenovo' && s.nomCommercial && !GENERIQUES.test(s.nomCommercial)) modele = s.nomCommercial;
    modele = modele.replace(new RegExp('^' + marque + '\\s*', 'i'), '');
    return { custom: false, nom: (marque + ' ' + modele).trim() };
  }
  const parts = [];
  const cpu = d.cpu_ram || {};
  if (cpu.cpuNom) parts.push(nomProcesseur(cpu.cpuNom));
  const gpus = liste((d.gpu_ecrans || {}).gpus).map((g) => g.nom).filter(Boolean);
  const dedie = gpus.find(estGpuDedie);
  if (dedie) parts.push(dedie.replace(/\(R\)|\(TM\)/g, '').trim());
  else if (gpus[0]) parts.push(gpus[0]);
  const barrettes = liste(cpu.barrettes);
  const totalRam = barrettes.reduce((a, b) => a + (b.go || 0), 0) || Math.round(cpu.ramTotaleGo || s.ramTotaleGo || 0);
  if (totalRam) {
    const type = barrettes.length ? TYPES_RAM[barrettes[0].typeSmbios] || '' : '';
    parts.push((totalRam + ' Go ' + type).trim());
  }
  if (s.carteMereModele) parts.push((cmFab + ' ' + s.carteMereModele).trim());
  const sys = liste((d.disques || {}).physiques).find((p) => p.systeme) || liste((d.disques || {}).physiques).find((p) => p.bus !== 'USB');
  if (sys) parts.push(((sys.type === 'SSD' ? 'SSD ' : sys.type === 'HDD' ? 'Disque dur ' : '') + sys.nom + ' ' + go(sys.go || 0)).trim());
  return { custom: true, nom: 'PC custom — ' + parts.join(', ') };
}

// ------------------------------------------------------------- dates de fin de support de Windows
// Editions Famille et Pro (Home/Pro). Entreprise/Education : un an de plus pour Windows 11.
const FIN_SUPPORT = [
  { min: 0, max: 19044, nom: 'Windows 10 (ancienne version)', fin: '2023-06-13', fe: '2024-06-11' },
  { min: 19045, max: 19045, nom: 'Windows 10 22H2', fin: '2025-10-14', fe: '2025-10-14', w10: true },
  { min: 22000, max: 22000, nom: 'Windows 11 21H2', fin: '2023-10-10', fe: '2024-10-08' },
  { min: 22621, max: 22621, nom: 'Windows 11 22H2', fin: '2024-10-08', fe: '2025-10-14' },
  { min: 22631, max: 22631, nom: 'Windows 11 23H2', fin: '2025-11-11', fe: '2026-11-10' },
  { min: 26100, max: 26100, nom: 'Windows 11 24H2', fin: '2026-10-13', fe: '2027-10-12' },
  { min: 26200, max: 26200, nom: 'Windows 11 25H2', fin: '2027-10-12', fe: '2028-10-10' }
];

// ------------------------------------------------------------- codes d'ecran bleu
export const CODES_ECRAN_BLEU = {
  '0x0000000a': ['IRQL_NOT_LESS_OR_EQUAL', 'un pilote ou la mémoire (RAM)', 'a driver or the memory (RAM)'],
  '0x00000019': ['BAD_POOL_HEADER', 'un pilote ou la mémoire', 'a driver or the memory'],
  '0x0000001a': ['MEMORY_MANAGEMENT', 'la mémoire (RAM) ou un pilote', 'the memory (RAM) or a driver'],
  '0x0000001e': ['KMODE_EXCEPTION_NOT_HANDLED', 'un pilote', 'a driver'],
  '0x0000003b': ['SYSTEM_SERVICE_EXCEPTION', 'un pilote ou des fichiers de Windows abîmés', 'a driver or damaged Windows files'],
  '0x0000004e': ['PFN_LIST_CORRUPT', 'la mémoire (RAM) ou un pilote', 'the memory (RAM) or a driver'],
  '0x00000050': ['PAGE_FAULT_IN_NONPAGED_AREA', 'la mémoire, un pilote ou le disque', 'the memory, a driver or the disk'],
  '0x00000077': ['KERNEL_STACK_INPAGE_ERROR', 'le disque ou son câble', 'the disk or its cable'],
  '0x0000007a': ['KERNEL_DATA_INPAGE_ERROR', 'le disque ou son câble', 'the disk or its cable'],
  '0x0000007e': ['SYSTEM_THREAD_EXCEPTION_NOT_HANDLED', 'un pilote', 'a driver'],
  '0x0000009c': ['MACHINE_CHECK_EXCEPTION', 'le matériel (processeur, alimentation)', 'hardware (CPU, power supply)'],
  '0x0000009f': ['DRIVER_POWER_STATE_FAILURE', 'un pilote, souvent à la mise en veille', 'a driver, often when going to sleep'],
  '0x000000be': ['ATTEMPTED_WRITE_TO_READONLY_MEMORY', 'un pilote', 'a driver'],
  '0x000000c2': ['BAD_POOL_CALLER', 'un pilote', 'a driver'],
  '0x000000c5': ['DRIVER_CORRUPTED_EXPOOL', 'un pilote', 'a driver'],
  '0x000000d1': ['DRIVER_IRQL_NOT_LESS_OR_EQUAL', 'un pilote, souvent celui du réseau', 'a driver, often the network one'],
  '0x000000ef': ['CRITICAL_PROCESS_DIED', 'des fichiers de Windows abîmés ou le disque', 'damaged Windows files or the disk'],
  '0x000000f4': ['CRITICAL_OBJECT_TERMINATION', 'le disque', 'the disk'],
  '0x00000101': ['CLOCK_WATCHDOG_TIMEOUT', 'le processeur (overclocking, BIOS)', 'the CPU (overclocking, BIOS)'],
  '0x00000109': ['CRITICAL_STRUCTURE_CORRUPTION', 'la mémoire ou un pilote', 'the memory or a driver'],
  '0x00000116': ['VIDEO_TDR_FAILURE', 'la carte graphique ou son pilote', 'the graphics card or its driver'],
  '0x00000119': ['VIDEO_SCHEDULER_INTERNAL_ERROR', 'le pilote de la carte graphique', 'the graphics driver'],
  '0x00000124': ['WHEA_UNCORRECTABLE_ERROR', 'le matériel : processeur, mémoire, chauffe ou overclocking', 'hardware: CPU, memory, heat or overclocking'],
  '0x00000133': ['DPC_WATCHDOG_VIOLATION', 'un pilote ou le micrologiciel du SSD', 'a driver or the SSD firmware'],
  '0x00000139': ['KERNEL_SECURITY_CHECK_FAILURE', 'un pilote ou la mémoire', 'a driver or the memory'],
  '0x00000154': ['UNEXPECTED_STORE_EXCEPTION', 'le disque', 'the disk'],
  '0x000001a1': ['WIN32K_CALLOUT_WATCHDOG_BUGCHECK', 'un pilote', 'a driver']
};

const PUPS = /onelaunch|wave browser|webcompanion|web companion|bytefence|segurazo|santivirus|reimage|restoro|fortect|pc app store|driver support|driversupport|pc accelerate|search protect|mypc backup|ask toolbar|yahoo toolbar|outbyte|pc helpsoft|driver updater|winzip driver|advanced systemcare|iobit malware|pc cleaner pro|mechanic|smart pc cleaner|chromium \(|shift browser|cleanmypc|total av|totalav|pc health checker pro|opti ?pc|systweak|advanced system optimizer|zoompa|clario|kiwi browser/i;
const EXT_A_VERIFIER = /search|recherche|coupon|shopping|deal|weather|météo|meteo|pdf|convert|download|téléchar|video downloader|new ?tab|nouvel onglet|vpn free|free vpn|cashback|ads?\b|game|jeux/i;
const EXT_CONNUES = /ublock|adblock|adguard|bitwarden|lastpass|1password|dashlane|grammarly|google docs|google translate|traduction|dark reader|honey|keeper|nordpass|proton|privacy badger|ghostery|onetab|metamask|zotero|acrobat|office|outlook|teams|zoom|loom/i;

// ------------------------------------------------------------- fiches
const R = [];
function fiche(f) { R.push(f); }

// ===== 1. Donnees en danger : disques
fiche({
  id: 'disque-defaillant', famille: 'disques', gravite: 'critique', ordre: 1.0, modules: ['disques'],
  titre: ['Un disque est en train de lâcher', 'A disk is failing'],
  simple: ['Le disque « {nom} » signale lui-même qu\'il va tomber en panne. Les données peuvent disparaître à tout moment.',
    'The disk "{nom}" reports that it is about to fail. Data can be lost at any moment.'],
  etapes: [
    ['Avant toute autre réparation, copie les photos, documents et fichiers importants du client sur un autre support.', 'Before any other repair, copy the customer\'s photos, documents and important files to another drive.'],
    ['Ne lance pas de longue analyse ni de défragmentation : chaque heure d\'utilisation peut aggraver la panne.', 'Do not run long scans or defragmentation: every hour of use can make it worse.'],
    ['Prévois le remplacement du disque, puis la réinstallation de Windows ou un clonage.', 'Plan a disk replacement, then a Windows reinstall or a clone.']
  ],
  detecter(d) {
    const ds = d.disques; if (!ds) return null;
    const mauvais = liste(ds.physiques).filter((p) => /warning|unhealthy|avertissement|d.fectueux/i.test(p.sante || ''));
    const pred = liste(ds.predictions).filter((p) => p.panneProbable);
    if (!mauvais.length && !pred.length) return null;
    const nom = mauvais.length ? mauvais.map((p) => p.nom).join(', ') : 'disque SATA';
    return { vals: { nom }, tech: 'État Windows : ' + mauvais.map((p) => p.nom + ' = ' + p.sante).join(' ; ') + (pred.length ? ' | SMART : panne prévue sur ' + pred.length + ' disque(s)' : '') };
  }
});

fiche({
  id: 'ssd-use', famille: 'disques', gravite: 'important', ordre: 1.1, modules: ['disques'],
  titre: ['Le SSD est très usé', 'The SSD is heavily worn'],
  simple: ['Le SSD « {nom} » a utilisé {usure} % de sa durée de vie prévue. Au-delà de 100 %, il peut passer en lecture seule ou lâcher.',
    'The SSD "{nom}" has used {usure}% of its rated life. Past 100% it may become read-only or fail.'],
  etapes: [
    ['Fais une sauvegarde des données importantes dès maintenant.', 'Back up important data now.'],
    ['Prévois de remplacer le SSD.', 'Plan to replace the SSD.']
  ],
  detecter(d) {
    const p = liste((d.disques || {}).physiques).filter((x) => nb(x.usure) !== null && x.usure >= 70).sort((a, b) => b.usure - a.usure)[0];
    if (!p) return null;
    return { gravite: p.usure >= 90 ? 'critique' : 'important', vals: { nom: p.nom, usure: p.usure }, tech: 'Usure SMART (Wear) : ' + p.usure + ' %' };
  }
});

fiche({
  id: 'disque-erreurs', famille: 'disques', gravite: 'important', ordre: 1.2, modules: ['disques', 'evenements'],
  titre: ['Le disque a des erreurs de lecture', 'The disk has read errors'],
  simple: ['Windows a noté {n} erreurs du disque ces 30 derniers jours. Cela annonce souvent une panne du disque ou un mauvais contact.',
    'Windows logged {n} disk errors in the last 30 days. This often announces a disk failure or a bad connection.'],
  etapes: [
    ['Sauvegarde les données importantes.', 'Back up important data.'],
    ['Sur un PC fixe, vérifie le câble SATA et l\'alimentation du disque ; sur un SSD M.2, revisse-le correctement.', 'On a desktop, check the SATA and power cables; for an M.2 SSD, reseat it properly.'],
    ['Lance une analyse du disque C: (bouton ci-dessous), puis relance l\'analyse de DEBUG Friend.', 'Run a scan of drive C: (button below), then run DEBUG Friend again.']
  ],
  action: 'chkdsk',
  detecter(d) {
    const ev = d.evenements || {};
    const graves = liste(ev.disqueListe).filter((e) => /disk|stornvme|storahci/i.test(e.source || '')).length;
    const lect = liste((d.disques || {}).physiques).reduce((a, p) => a + (nb(p.erreursLecture) || 0), 0);
    const n = (ev.erreursDisque || 0);
    if (lect > 0) return { vals: { n: Math.max(n, lect) }, tech: 'Erreurs de lecture non corrigées (SMART) : ' + lect + ' | événements disque : ' + n };
    // Une seule rafale (toutes les erreurs dans la meme minute) = un incident ponctuel,
    // pas un disque qui lache : il faut au moins 2 moments differents.
    const incidents = ev.disqueIncidents === undefined ? 2 : (nb(ev.disqueIncidents) || 0);
    if (n >= 5 && graves >= 2 && incidents >= 2) return { vals: { n }, tech: 'Disque n° ' + (ev.disqueSysteme ?? '?') + ' (Windows), ' + incidents + ' moment(s) différent(s) | ' + liste(ev.disqueListe).slice(0, 4).map((e) => e.date + ' ' + e.source + ' ' + e.id).join(' ; ') };
    return null;
  }
});

fiche({
  id: 'disque-externe-erreurs', famille: 'disques', gravite: 'conseil', ordre: 1.25, modules: ['evenements', 'disques'],
  titre: ['Un autre disque ou une clé USB a eu des erreurs', 'Another disk or a USB drive had errors'],
  simple: ['{nom} a eu {n} erreur(s) en {i} fois ces 30 derniers jours. Ce n\'est PAS le disque de Windows. Souvent : une clé USB ou un disque externe retiré sans « Éjecter ».',
    '{nom} had {n} error(s) in {i} occurrence(s) in the last 30 days. This is NOT the Windows disk. Usually: a USB drive or external disk removed without "Eject".'],
  etapes: [
    ['Si c\'est une clé USB ou un disque externe : utilise toujours « Éjecter » avant de le retirer. Si les erreurs reviennent, teste-le sur un autre port puis sur un autre PC.', 'If it is a USB or external drive: always use "Eject" before removing it. If errors come back, try another port, then another PC.'],
    ['Si c\'est un deuxième disque interne : sauvegarde ses données et vérifie ses câbles.', 'If it is a second internal disk: back up its data and check its cables.']
  ],
  detecter(d, c) {
    const tt2 = (fr, en) => (L(c) ? en : fr);
    const ev = d.evenements || {};
    const n = nb(ev.erreursAutresDisques) || 0;
    if (n < 1) return null;
    const nums = liste(ev.autresDisquesNumeros).map(String);
    const phys = liste((d.disques || {}).physiques);
    const noms = nums.map((x) => { const p = phys.find((q) => String(q.numero) === x); return p ? '« ' + p.nom + ' » (' + tt2('disque n° ', 'disk #') + x + ')' : null; }).filter(Boolean);
    const nom = noms.length ? noms.join(', ') : (nums.length ? tt2('Le disque n° ', 'Disk #') + nums.join(', ') + tt2(' (plus branché en ce moment)', ' (not connected right now)') : tt2('Un autre disque', 'Another disk'));
    return { vals: { n, i: nb(ev.autresDisquesIncidents) || 1, nom }, tech: liste(ev.autresDisquesListe).map((e) => e.date + ' ' + e.source + ' ' + e.id + ' ' + (e.message || '')).join(' ; ') };
  }
});

fiche({
  id: 'disque-chaud', famille: 'disques', gravite: 'important', ordre: 1.3, modules: ['disques'],
  titre: ['Un disque chauffe trop', 'A disk runs too hot'],
  simple: ['Le disque « {nom} » est à {t} °C. Au-dessus de 70 °C pour un SSD (55 °C pour un disque dur), il ralentit et s\'use plus vite.',
    'The disk "{nom}" is at {t} °C. Above 70 °C for an SSD (55 °C for a hard drive) it slows down and wears faster.'],
  etapes: [
    ['Vérifie que l\'air circule : ventilateurs propres, aérations dégagées.', 'Make sure air flows: clean fans, unblocked vents.'],
    ['Sur un PC fixe, un dissipateur pour SSD M.2 aide beaucoup.', 'On a desktop, an M.2 SSD heatsink helps a lot.']
  ],
  detecter(d) {
    for (const p of liste((d.disques || {}).physiques)) {
      const t = nb(p.temperature); if (!t) continue;
      if ((p.type === 'HDD' && t >= 55) || (p.type !== 'HDD' && t >= 70)) return { vals: { nom: p.nom, t }, tech: 'Température ' + t + ' °C, maximum enregistré ' + (p.temperatureMax || '?') + ' °C' };
    }
    return null;
  }
});

fiche({
  id: 'disque-marque', famille: 'disques', gravite: 'important', ordre: 1.4, modules: ['disques'],
  titre: ['Le disque C: doit être réparé', 'Drive C: needs repairing'],
  simple: ['Windows a marqué le disque C: comme « à réparer » : des erreurs du système de fichiers ont été trouvées.',
    'Windows has flagged drive C: as needing repair: file system errors were found.'],
  etapes: [
    ['Ouvre la réparation du disque (bouton ci-dessous), réponds O (ou Y) puis redémarre le PC.', 'Open the disk repair (button below), answer Y, then restart the PC.'],
    ['La réparation se fait au démarrage et peut durer de quelques minutes à une heure. Ne coupe pas le PC.', 'The repair runs at startup and can take minutes to an hour. Do not turn the PC off.'],
    ['Relance ensuite l\'analyse.', 'Then run the analysis again.']
  ],
  action: 'chkdsk-reparer',
  detecter(d) {
    const ds = d.disques || {};
    if (ds.marqueurSaleC === true) return { vals: {}, tech: 'Bit « dirty » positionné sur C:' };
    if (ds.analyseC && !/noerrorsfound/i.test(ds.analyseC)) return { vals: {}, tech: 'Repair-Volume -Scan : ' + ds.analyseC };
    return null;
  }
});

// ===== 2. Securite
fiche({
  id: 'menace-active', famille: 'virus', gravite: 'critique', ordre: 2.0, modules: ['securite'],
  titre: ['Un virus est actif', 'Active malware found'],
  simple: ['L\'antivirus a trouvé {n} menace(s) toujours active(s) : {noms}.', 'The antivirus found {n} threat(s) still active: {noms}.'],
  etapes: [
    ['Ouvre la Sécurité Windows et lance une « Analyse Microsoft Defender (hors ligne) ».', 'Open Windows Security and run a "Microsoft Defender Offline scan".'],
    ['Après le redémarrage et l\'analyse, mets en quarantaine ou supprime ce qui est trouvé.', 'After the restart and scan, quarantine or remove what is found.'],
    ['Change ensuite les mots de passe importants du client (e-mail, banque) depuis un autre appareil.', 'Then change the customer\'s important passwords (email, bank) from another device.']
  ],
  action: 'securite',
  detecter(d) {
    const m = liste((d.securite || {}).menaces).filter((x) => x.active);
    if (!m.length) return null;
    return { vals: { n: m.length, noms: m.slice(0, 3).map((x) => x.nom).join(', ') }, tech: m.map((x) => x.nom + ' (gravité ' + x.gravite + ', exécutée : ' + x.executee + ')').join(' ; ') };
  }
});

fiche({
  id: 'antivirus-absent', famille: 'securite', gravite: 'critique', ordre: 2.1, modules: ['securite'],
  titre: ['Aucun antivirus ne protège le PC', 'No antivirus is protecting the PC'],
  simple: ['Ni Microsoft Defender ni un autre antivirus n\'est actif en ce moment.', 'Neither Microsoft Defender nor another antivirus is active right now.'],
  etapes: [
    ['Ouvre la Sécurité Windows et réactive la « Protection en temps réel ».', 'Open Windows Security and turn "Real-time protection" back on.'],
    ['Si un autre antivirus est installé mais expiré, désinstalle-le : Defender reprendra la main tout seul.', 'If another antivirus is installed but expired, uninstall it: Defender will take over by itself.']
  ],
  action: 'securite',
  detecter(d) {
    const s = d.securite; if (!s) return null;
    const autres = liste(s.antivirus).filter((a) => a.actif && !/defender/i.test(a.nom || ''));
    const def = s.defender;
    const defActif = def && def.tempsReel && def.antivirus;
    if (autres.length || defActif) return null;
    if (!def && !liste(s.antivirus).length) return null;
    return { vals: {}, tech: 'Antivirus déclarés : ' + (liste(s.antivirus).map((a) => a.nom + (a.actif ? ' (actif)' : ' (inactif)')).join(', ') || 'aucun') + ' | Defender temps réel : ' + (def ? def.tempsReel : '?') };
  }
});

fiche({
  id: 'antivirus-perime', famille: 'securite', gravite: 'important', ordre: 2.2, modules: ['securite'],
  titre: ['L\'antivirus n\'est pas à jour', 'The antivirus is out of date'],
  simple: ['Les définitions de virus ont {j} jours. Un antivirus pas à jour laisse passer les nouveaux virus.', 'Virus definitions are {j} days old. An outdated antivirus misses new threats.'],
  etapes: [
    ['Ouvre la Sécurité Windows, puis « Protection contre les virus et menaces » › « Rechercher des mises à jour ».', 'Open Windows Security, then "Virus & threat protection" › "Check for updates".'],
    ['Si la mise à jour échoue, vérifie Internet et Windows Update.', 'If the update fails, check the Internet connection and Windows Update.']
  ],
  action: 'securite',
  detecter(d) {
    const s = d.securite || {};
    const def = s.defender;
    if (def && def.tempsReel && nb(def.ageSignatures) !== null && def.ageSignatures > 7) return { vals: { j: def.ageSignatures }, tech: 'AntivirusSignatureAge = ' + def.ageSignatures + ' ; dernière mise à jour ' + dateFr(def.signatures) };
    const tiers = liste(s.antivirus).find((a) => a.actif && !a.aJour && !/defender/i.test(a.nom || ''));
    if (tiers) return { vals: { j: '?' }, tech: tiers.nom + ' signale des définitions périmées (productState ' + tiers.etat + ')' };
    return null;
  }
});

fiche({
  id: 'pare-feu', famille: 'securite', gravite: 'important', ordre: 2.3, modules: ['securite'],
  titre: ['Le pare-feu est coupé', 'The firewall is off'],
  simple: ['Le pare-feu de Windows est désactivé pour : {profils}. Le PC est plus exposé sur les réseaux publics.', 'The Windows firewall is off for: {profils}. The PC is more exposed on public networks.'],
  etapes: [['Ouvre les réglages du pare-feu et réactive-le pour tous les réseaux.', 'Open the firewall settings and turn it back on for all networks.']],
  action: 'pare-feu',
  detecter(d) {
    const off = liste((d.securite || {}).parefeu).filter((p) => p.actif === false);
    if (!off.length) return null;
    const autreAv = liste((d.securite || {}).antivirus).some((a) => a.actif && /norton|kaspersky|bitdefender|eset|avast|avg|mcafee|g data|f-secure/i.test(a.nom || ''));
    return { gravite: autreAv ? 'conseil' : 'important', vals: { profils: off.map((p) => p.profil).join(', ') }, tech: 'Profils désactivés : ' + off.map((p) => p.profil).join(', ') + (autreAv ? ' (une suite de sécurité tierce gère peut-être le pare-feu)' : '') };
  }
});

fiche({
  id: 'uac', famille: 'securite', gravite: 'important', ordre: 2.4, modules: ['securite'],
  titre: ['Le contrôle des comptes est désactivé', 'User Account Control is disabled'],
  simple: ['Les programmes peuvent modifier Windows sans rien demander. C\'est une porte ouverte aux virus.', 'Programs can change Windows without asking. That is an open door for malware.'],
  etapes: [
    ['Tape « UAC » dans le menu Démarrer › « Modifier les paramètres de contrôle de compte d\'utilisateur ».', 'Type "UAC" in the Start menu › "Change User Account Control settings".'],
    ['Remets le curseur sur le niveau par défaut, puis redémarre.', 'Set the slider back to the default level, then restart.']
  ],
  detecter(d) { return (d.securite || {}).uac === 0 ? { vals: {}, tech: 'EnableLUA = 0' } : null; }
});

fiche({
  id: 'chiffrement-non-protege', famille: 'securite', gravite: 'important', ordre: 2.5, modules: ['securite'],
  titre: ['Le disque est chiffré mais pas protégé', 'The disk is encrypted but not protected'],
  simple: ['Le disque C: est chiffré, mais la protection est suspendue : en cas de vol, les données restent lisibles. Windows attend souvent de sauvegarder la clé de récupération sur le compte Microsoft.',
    'Drive C: is encrypted, but protection is suspended: if stolen, the data can be read. Windows often waits to back up the recovery key to the Microsoft account.'],
  etapes: [
    ['Ouvre « Chiffrement de l\'appareil » dans les paramètres et suis ce que Windows demande (souvent : se connecter avec le compte Microsoft).', 'Open "Device encryption" in Settings and follow what Windows asks (often: sign in with the Microsoft account).'],
    ['Vérifie sur aka.ms/myrecoverykey que la clé de récupération apparaît dans le compte Microsoft du client.', 'Check on aka.ms/myrecoverykey that the recovery key appears in the customer\'s Microsoft account.'],
    ['Si rien ne bouge : dans une invite de commandes administrateur, « manage-bde -protectors -get C: » (note la clé de 48 chiffres), puis « manage-bde -protectors -add C: -TPM » et « manage-bde -protectors -enable C: ».', 'If nothing changes: in an admin command prompt, "manage-bde -protectors -get C:" (write down the 48-digit key), then "manage-bde -protectors -add C: -TPM" and "manage-bde -protectors -enable C:".'],
    ['Redémarre, puis relance l\'analyse.', 'Restart, then run the analysis again.']
  ],
  action: 'chiffrement',
  detecter(d) {
    const b = (d.securite || {}).bitlocker;
    if (!b) return null;
    if (/fullyencrypted|enti.rement chiffr/i.test(b.etat || '') && /off|d.sactiv/i.test(b.protection || '')) return { vals: {}, tech: 'VolumeStatus ' + b.etat + ' | ProtectionStatus ' + b.protection + ' | protecteurs : ' + liste(b.protecteurs).join(', ') };
    return null;
  }
});

fiche({
  id: 'proxy', famille: 'virus', gravite: 'important', ordre: 2.6, modules: ['securite'],
  titre: ['Un proxy détourne Internet', 'A proxy is redirecting the Internet'],
  simple: ['Internet passe par « {p} ». Hors entreprise, c\'est souvent un logiciel publicitaire ou malveillant qui espionne la navigation.', 'Internet traffic goes through "{p}". Outside a company, this is often adware or malware spying on browsing.'],
  etapes: [
    ['Demande au client s\'il connaît ce réglage (VPN, logiciel de son travail).', 'Ask the customer whether they know this setting (VPN, work software).'],
    ['Sinon, ouvre les options Internet › Connexions › Paramètres réseau, et décoche le proxy.', 'Otherwise open Internet Options › Connections › LAN settings and untick the proxy.'],
    ['Lance une analyse antivirus complète.', 'Run a full antivirus scan.']
  ],
  action: 'internet',
  detecter(d) {
    const s = d.securite || {};
    if (!s.proxyActif && !s.proxyScript) return null;
    const dom = (d.systeme || {}).domaine;
    return { gravite: dom ? 'info' : 'important', vals: { p: s.proxyServeur || s.proxyScript }, tech: 'ProxyEnable=' + (s.proxyActif ? 1 : 0) + ' ProxyServer=' + (s.proxyServeur || '') + ' AutoConfigURL=' + (s.proxyScript || '') };
  }
});

fiche({
  id: 'hosts', famille: 'virus', gravite: 'conseil', ordre: 2.7, modules: ['securite'],
  titre: ['Le fichier hosts a été modifié', 'The hosts file has been changed'],
  simple: ['{n} ligne(s) redirigent des sites. Cela peut bloquer des mises à jour ou envoyer vers de faux sites.', '{n} line(s) redirect websites. This can block updates or send to fake sites.'],
  etapes: [
    ['Regarde les lignes dans les détails techniques et demande au client s\'il les a ajoutées.', 'Look at the lines in the technical details and ask whether the customer added them.'],
    ['Sinon, ouvre C:\\Windows\\System32\\drivers\\etc\\hosts avec le Bloc-notes lancé en administrateur et supprime-les.', 'Otherwise open C:\\Windows\\System32\\drivers\\etc\\hosts in Notepad run as administrator and remove them.']
  ],
  detecter(d) {
    const l = liste((d.securite || {}).hosts).filter((x) => !/^(127\.0\.0\.1|::1)\s+localhost\s*$/i.test(x));
    if (!l.length) return null;
    const grave = l.some((x) => /microsoft|windowsupdate|google|facebook|paypal|banque|bank|credit|amazon|apple|steam/i.test(x) && !/^0\.0\.0\.0|^127\.0\.0\.1/.test(x));
    return { gravite: grave ? 'important' : 'conseil', vals: { n: l.length }, tech: l.slice(0, 10).join(' | ') };
  }
});

fiche({
  id: 'taches-suspectes', famille: 'virus', gravite: 'important', ordre: 2.8, modules: ['securite'],
  titre: ['Des tâches planifiées suspectes', 'Suspicious scheduled tasks'],
  simple: ['{n} tâche(s) lancent des commandes typiques des virus (commande cachée, script dans un dossier temporaire).', '{n} task(s) run commands typical of malware (hidden command, script in a temp folder).'],
  etapes: [
    ['Ouvre le Planificateur de tâches (taper « tâches » dans le menu Démarrer) et retrouve les tâches listées dans les détails.', 'Open Task Scheduler (type "task" in the Start menu) and find the tasks listed in the details.'],
    ['Si elles ne viennent pas d\'un logiciel connu, désactive-les puis lance une analyse antivirus complète.', 'If they do not come from known software, disable them and run a full antivirus scan.']
  ],
  detecter(d) {
    const t = liste((d.securite || {}).tachesSuspectes);
    return t.length ? { vals: { n: t.length }, tech: t.map((x) => x.chemin + x.nom + ' : ' + x.commande).join(' | ') } : null;
  }
});

fiche({
  id: 'programmes-indesirables', famille: 'virus', gravite: 'important', ordre: 2.9, modules: ['logiciels'],
  titre: ['Des programmes indésirables sont installés', 'Unwanted programs are installed'],
  simple: ['Ces programmes s\'installent souvent sans qu\'on le veuille et affichent des pubs ou ralentissent le PC : {noms}.', 'These programs often get installed by accident and show ads or slow the PC down: {noms}.'],
  etapes: [
    ['Demande au client s\'il les utilise vraiment.', 'Ask the customer whether they really use them.'],
    ['Sinon, désinstalle-les depuis Paramètres › Applications.', 'Otherwise uninstall them from Settings › Apps.'],
    ['Lance ensuite une analyse antivirus.', 'Then run an antivirus scan.']
  ],
  action: 'applis',
  detecter(d) {
    const p = liste((d.logiciels || {}).programmes).filter((x) => PUPS.test(x.nom || ''));
    return p.length ? { vals: { noms: p.slice(0, 5).map((x) => x.nom).join(', ') }, tech: p.map((x) => x.nom + ' ' + (x.version || '') + ' (' + (x.editeur || '?') + ')').join(' ; ') } : null;
  }
});

fiche({
  id: 'extensions', famille: 'virus', gravite: 'conseil', ordre: 2.95, modules: ['logiciels'],
  titre: ['Des extensions de navigateur à vérifier', 'Browser extensions to check'],
  simple: ['Ces extensions ressemblent à celles qui affichent des pubs ou changent le moteur de recherche : {noms}. Vérifie avec le client.', 'These extensions look like the ones that show ads or change the search engine: {noms}. Check with the customer.'],
  etapes: [
    ['Dans le navigateur, ouvre la page des extensions (chrome://extensions ou edge://extensions).', 'In the browser, open the extensions page (chrome://extensions or edge://extensions).'],
    ['Supprime celles que le client ne connaît pas, puis vérifie la page d\'accueil et le moteur de recherche.', 'Remove those the customer does not know, then check the home page and search engine.']
  ],
  detecter(d) {
    const e = liste((d.logiciels || {}).extensions).filter((x) => EXT_A_VERIFIER.test(x.nom || '') && !EXT_CONNUES.test(x.nom || ''));
    return e.length ? { vals: { noms: e.slice(0, 5).map((x) => x.nom).join(', ') }, tech: e.map((x) => x.navigateur + ' : ' + x.nom + ' [' + x.id + ']').join(' ; ') } : null;
  }
});

fiche({
  id: 'analyse-complete-ancienne', famille: 'securite', gravite: 'conseil', ordre: 2.96, modules: ['securite'],
  titre: ['Aucune analyse antivirus complète récente', 'No recent full antivirus scan'],
  simple: ['Microsoft Defender n\'a pas fait d\'analyse complète depuis longtemps.', 'Microsoft Defender has not done a full scan in a long time.'],
  etapes: [['Ouvre la Sécurité Windows › Protection contre les virus et menaces › Options d\'analyse › Analyse complète.', 'Open Windows Security › Virus & threat protection › Scan options › Full scan.']],
  action: 'securite',
  detecter(d) {
    const def = (d.securite || {}).defender;
    if (!def || !def.tempsReel) return null;
    const a = nb(def.ageComplete);
    if (a === null || (a > 90 && a < 4000)) return { vals: {}, tech: 'FullScanAge = ' + (a === null ? 'jamais' : a + ' jours') };
    return null;
  }
});

fiche({
  id: 'secure-boot', famille: 'securite', gravite: 'conseil', ordre: 2.97, modules: ['securite'],
  titre: ['Le démarrage sécurisé est désactivé', 'Secure Boot is off'],
  simple: ['Le démarrage sécurisé protège le PC contre des virus qui se lancent avant Windows. Il est aussi demandé par Windows 11 et certains jeux (anti-triche).', 'Secure Boot protects against malware that starts before Windows. Windows 11 and some games (anti-cheat) also require it.'],
  etapes: [
    ['Entre dans le BIOS (souvent F2 ou Suppr au démarrage) et active « Secure Boot ».', 'Enter the BIOS (often F2 or Del at startup) and enable "Secure Boot".'],
    ['Si le BIOS est en mode « Legacy/CSM », il faut d\'abord que le disque soit en GPT : ne change pas ce mode sans vérifier, sinon Windows ne démarre plus.', 'If the BIOS is in "Legacy/CSM" mode, the disk must be GPT first: do not change this mode without checking, or Windows will not boot.']
  ],
  detecter(d) {
    const sb = (d.securite || {}).secureBoot;
    if (sb === 'False') return { vals: {}, tech: 'Confirm-SecureBootUEFI = False (UEFI, démarrage sécurisé désactivé)' };
    if (sb === 'bios') return { vals: {}, tech: 'Démarrage en mode BIOS ancien (Legacy) : démarrage sécurisé impossible' };
    return null;
  }
});

fiche({
  id: 'antifalsification', famille: 'securite', gravite: 'conseil', ordre: 2.98, modules: ['securite'],
  titre: ['La protection anti-falsification est coupée', 'Tamper protection is off'],
  simple: ['Un virus peut désactiver Microsoft Defender sans que personne ne le voie.', 'Malware could turn Microsoft Defender off without anyone noticing.'],
  etapes: [['Sécurité Windows › Protection contre les virus et menaces › Gérer les paramètres › active « Protection contre les falsifications ».', 'Windows Security › Virus & threat protection › Manage settings › turn on "Tamper Protection".']],
  action: 'securite',
  detecter(d) {
    const def = (d.securite || {}).defender;
    return def && def.tempsReel && def.antiFalsif === false && !(d.systeme || {}).domaine ? { vals: {}, tech: 'IsTamperProtected = False' } : null;
  }
});

// ===== 3. Windows
fiche({
  id: 'espace-c', famille: 'windows', gravite: 'important', ordre: 3.0, modules: ['disques'],
  titre: ['Le disque C: est presque plein', 'Drive C: is almost full'],
  simple: ['Il reste {libre} libres sur {total}. Sans assez de place, Windows ralentit et les mises à jour échouent.', 'Only {libre} free out of {total}. Without enough space, Windows slows down and updates fail.'],
  etapes: [
    ['Lance le Nettoyage de disque, puis « Nettoyer les fichiers système ».', 'Run Disk Cleanup, then "Clean up system files".'],
    ['Vide le dossier Téléchargements et la corbeille avec l\'accord du client.', 'Empty the Downloads folder and the recycle bin with the customer\'s agreement.'],
    ['Désinstalle les programmes et jeux inutilisés.', 'Uninstall unused programs and games.']
  ],
  action: 'nettoyage',
  detecter(d) {
    const c = liste((d.disques || {}).volumes).find((v) => v.lettre === 'C');
    if (!c || !c.totalGo) return null;
    const pct = (100 * c.libreGo) / c.totalGo;
    if (c.libreGo >= 20 && !(pct < 10 && c.libreGo < 30)) return null;
    return { gravite: c.libreGo < 5 ? 'critique' : 'important', vals: { libre: go(c.libreGo), total: go(c.totalGo) }, tech: 'C: ' + c.libreGo + ' Go libres / ' + c.totalGo + ' Go (' + pct.toFixed(1) + ' %)' };
  }
});

fiche({
  id: 'windows-fin-support', famille: 'windows', gravite: 'important', ordre: 3.1, modules: ['systeme', 'maj'],
  titre: ['Cette version de Windows n\'est plus suivie', 'This Windows version is no longer supported'],
  simple: ['{nom} ne reçoit plus de correctifs de sécurité depuis le {fin}. {suite}', '{nom} stopped getting security fixes on {fin}. {suite}'],
  etapes: [
    ['Ouvre Windows Update et installe la dernière version proposée de Windows.', 'Open Windows Update and install the latest Windows version offered.'],
    ['Pour Windows 10 : vérifie si le PC peut passer à Windows 11 (détails techniques) ; sinon, l\'inscription au programme de sécurité prolongée (ESU) se fait dans Windows Update.', 'For Windows 10: check whether the PC can move to Windows 11 (technical details); otherwise, Extended Security Updates (ESU) enrolment is in Windows Update.']
  ],
  action: 'maj',
  detecter(d, c) {
    const s = d.systeme; if (!s || !s.build) return null;
    const ligne = FIN_SUPPORT.find((x) => s.build >= x.min && s.build <= x.max);
    if (!ligne) return null;
    const ent = /enterprise|education/i.test(s.edition || '');
    const fin = new Date(ent ? ligne.fe : ligne.fin);
    if (c.maintenant < fin) return null;
    const m = d.maj || {};
    const derniere = jours(m.derniereCumulative || m.derniereReussie, c.maintenant);
    if (ligne.w10 && derniere !== null && derniere <= 45) {
      return { gravite: 'info', vals: { nom: ligne.nom, fin: dateFr(fin.toISOString()), suite: L(c) ? 'It still gets fixes through the Extended Security Updates programme.' : 'Il reçoit encore des correctifs grâce au programme de sécurité prolongée (ESU).' }, tech: 'Build ' + s.build + ' ; dernier correctif cumulatif il y a ' + derniere + ' jours' + eligibiliteW11(d) };
    }
    return { vals: { nom: ligne.nom, fin: dateFr(fin.toISOString()), suite: L(c) ? 'It is exposed to new threats.' : 'Il est exposé aux nouvelles failles.' }, tech: 'Build ' + s.build + '.' + s.ubr + ' (' + (s.edition || '') + ')' + (derniere !== null ? ' ; dernier correctif il y a ' + derniere + ' jours' : '') + (ligne.w10 ? eligibiliteW11(d) : '') };
  }
});

function eligibiliteW11(d) {
  const s = d.securite || {};
  const cpu = (d.cpu_ram || {}).cpuNom || '';
  let gen = '?';
  const i = cpu.match(/i[3579]-(\d{4,5})/i);
  const r = cpu.match(/Ryzen \d (\d)\d{3}/i);
  if (i) gen = parseInt(i[1].length === 5 ? i[1].slice(0, 2) : i[1][0], 10) >= 8 ? 'oui' : 'non';
  else if (r) gen = parseInt(r[1], 10) >= 2 ? 'oui' : 'non';
  return ' | Windows 11 possible ? TPM 2.0 : ' + (s.tpm && s.tpm.version === '2.0' && s.tpm.pret ? 'oui' : 'non/inconnu') +
    ' ; démarrage UEFI : ' + (s.secureBoot === 'bios' ? 'non' : 'oui') + ' ; processeur assez récent : ' + gen +
    ' ; RAM ≥ 4 Go : ' + (((d.cpu_ram || {}).ramTotaleGo || 0) >= 3.8 ? 'oui' : 'non');
}

fiche({
  id: 'redemarrage-attente', famille: 'windows', gravite: 'conseil', ordre: 3.2, modules: ['maj'],
  titre: ['Un redémarrage est en attente', 'A restart is pending'],
  simple: ['Des mises à jour attendent un redémarrage pour se terminer. Tant que ce n\'est pas fait, d\'autres réparations peuvent échouer.', 'Updates are waiting for a restart to finish. Until then, other repairs may fail.'],
  etapes: [['Redémarre le PC (Démarrer › Marche/Arrêt › Redémarrer, pas « Arrêter »), puis relance DEBUG Friend.', 'Restart the PC (Start › Power › Restart, not "Shut down"), then run DEBUG Friend again.']],
  detecter(d) {
    const p = liste((d.maj || {}).redemarrageAttente);
    return p.length ? { vals: {}, tech: 'Sources : ' + p.join(', ') } : null;
  }
});

fiche({
  id: 'jamais-redemarre', famille: 'demarrage', gravite: 'conseil', ordre: 3.25, modules: ['systeme'],
  titre: ['Le PC n\'a pas redémarré depuis longtemps', 'The PC has not restarted in a long time'],
  simple: ['Il tourne depuis {j} jours. Avec le « démarrage rapide », « Arrêter » ne remet pas Windows à zéro : seul « Redémarrer » le fait.', 'It has been running for {j} days. With "Fast startup", "Shut down" does not reset Windows: only "Restart" does.'],
  etapes: [['Fais un vrai redémarrage (Démarrer › Marche/Arrêt › Redémarrer).', 'Do a real restart (Start › Power › Restart).']],
  detecter(d) {
    const h = nb((d.systeme || {}).heuresAllume);
    return h !== null && h > 24 * 10 ? { vals: { j: Math.floor(h / 24) }, tech: 'Dernier démarrage : ' + dateFr((d.systeme || {}).dernierDemarrage) + ' ; démarrage rapide : ' + ((d.systeme || {}).demarrageRapide ? 'oui' : 'non') } : null;
  }
});

fiche({
  id: 'fichiers-windows', famille: 'windows', gravite: 'important', ordre: 3.3, modules: ['fichiers_windows'],
  titre: ['Des fichiers de Windows sont abîmés', 'Some Windows files are damaged'],
  simple: ['La vérification de Windows a trouvé des fichiers abîmés. Ils peuvent causer plantages, bugs et mises à jour ratées.', 'Windows\' own check found damaged files. They can cause crashes, bugs and failed updates.'],
  etapes: [
    ['Lance d\'abord la réparation de l\'image (DISM, bouton ci-dessous). Il faut Internet. Compte 10 à 30 minutes.', 'First run the image repair (DISM, button below). Internet is needed. Allow 10 to 30 minutes.'],
    ['Quand c\'est fini, lance la réparation des fichiers (sfc /scannow).', 'When done, run the file repair (sfc /scannow).'],
    ['Redémarre, puis relance une analyse complète.', 'Restart, then run a full analysis again.']
  ],
  action: 'dism',
  action2: 'sfc',
  detecter(d) {
    const f = d.fichiers_windows; if (!f) return null;
    if (/nonrepairable/i.test(f.dism || '')) return { gravite: 'critique', vals: {}, tech: 'DISM : NonRepairable — réinstallation de Windows en conservant les fichiers à prévoir. SFC : ' + f.sfc };
    if (/repairable/i.test(f.dism || '') || f.sfc === 'violations') return { vals: {}, tech: 'DISM : ' + (f.dism || '?') + ' ; SFC : ' + f.sfc + ' — ' + (f.sfcTexte || '') };
    return null;
  }
});

fiche({
  id: 'maj-retard', famille: 'windows', gravite: 'important', ordre: 3.4, modules: ['maj'],
  titre: ['Windows n\'est plus mis à jour', 'Windows is not being updated'],
  simple: ['Le dernier correctif installé date de {j} jours. Les correctifs sortent chaque mois : le PC a pris du retard.', 'The last installed fix is {j} days old. Fixes come out every month: the PC is behind.'],
  etapes: [
    ['Ouvre Windows Update et clique sur « Rechercher des mises à jour ». Installe tout.', 'Open Windows Update and click "Check for updates". Install everything.'],
    ['Si une mise à jour échoue, note le code d\'erreur : la fiche « Mises à jour en échec » donne la suite.', 'If an update fails, note the error code: the "Failed updates" item gives the next steps.']
  ],
  action: 'maj',
  detecter(d, c) {
    const m = d.maj; if (!m) return null;
    if (/disabled|d.sactiv/i.test(m.serviceDemarrage || '')) return { vals: { j: '?' }, tech: 'Service wuauserv désactivé' };
    const j = jours(m.derniereCumulative || m.derniereReussie, c.maintenant);
    if (j === null || j <= 45) return null;
    const s = d.systeme || {};
    const ligne = FIN_SUPPORT.find((x) => s.build >= x.min && s.build <= x.max);
    if (ligne && c.maintenant >= new Date(ligne.fin) && !ligne.w10) return null;
    return { vals: { j }, tech: 'Dernier correctif cumulatif : ' + dateFr(m.derniereCumulative) + ' ; dernière réussite : ' + dateFr(m.derniereReussie) };
  }
});

fiche({
  id: 'maj-echecs', famille: 'windows', gravite: 'important', ordre: 3.5, modules: ['maj'],
  titre: ['Des mises à jour échouent', 'Updates are failing'],
  simple: ['{n} mises à jour ont échoué ces 60 derniers jours, dont « {titre} ».', '{n} updates failed in the last 60 days, including "{titre}".'],
  etapes: [
    ['Redémarre, puis relance Windows Update : beaucoup d\'échecs se règlent au deuxième essai.', 'Restart, then run Windows Update again: many failures fix themselves on the second try.'],
    ['Si la même mise à jour échoue encore : lance la réparation de l\'image (DISM) puis sfc /scannow.', 'If the same update fails again: run the image repair (DISM) then sfc /scannow.'],
    ['Si l\'échec continue, cherche le code d\'erreur (détails techniques) sur le site de Microsoft.', 'If it keeps failing, look up the error code (technical details) on Microsoft\'s website.']
  ],
  action: 'maj',
  action2: 'dism',
  detecter(d, c) {
    const m = d.maj; if (!m) return null;
    const ech = liste(m.echecs).filter((e) => !/KB890830|2267602|Defender/i.test(e.titre || ''));
    const reussies = liste(m.dernieres).filter((u) => u.resultat === 2).map((u) => u.titre);
    const encore = ech.filter((e) => !reussies.includes(e.titre));
    if (encore.length < 1 || (ech.length < 2 && encore.length < 1)) return null;
    return { vals: { n: encore.length, titre: encore[0].titre }, tech: encore.map((e) => dateFr(e.date) + ' ' + e.titre + ' (' + e.code + ')').join(' ; ') };
  }
});

fiche({
  id: 'maj-disponibles', famille: 'windows', gravite: 'conseil', ordre: 3.6, modules: ['maj'],
  titre: ['Des mises à jour attendent d\'être installées', 'Updates are waiting to be installed'],
  simple: ['{n} mise(s) à jour disponible(s) : {liste}.', '{n} update(s) available: {liste}.'],
  etapes: [['Ouvre Windows Update et installe-les, puis redémarre.', 'Open Windows Update and install them, then restart.']],
  action: 'maj',
  detecter(d) {
    const l = (d.maj || {}).disponibles;
    if (!Array.isArray(l) || !l.length) return null;
    return { vals: { n: l.length, liste: l.slice(0, 3).join(' ; ') }, tech: l.join(' ; ') };
  }
});

fiche({
  id: 'activation', famille: 'windows', gravite: 'important', ordre: 3.7, modules: ['systeme'],
  titre: ['Windows n\'est pas activé', 'Windows is not activated'],
  simple: ['Windows n\'est pas activé (licence absente ou non reconnue). Certaines fonctions sont limitées.', 'Windows is not activated (missing or unrecognised licence). Some features are limited.'],
  etapes: [
    ['Ouvre Paramètres › Activation et lis le message.', 'Open Settings › Activation and read the message.'],
    ['Après un changement de carte mère, utilise « Résolution des problèmes » avec le compte Microsoft du client.', 'After a motherboard change, use "Troubleshoot" with the customer\'s Microsoft account.']
  ],
  action: 'activation',
  detecter(d) {
    const s = d.systeme || {};
    return s.licenceStatut !== null && s.licenceStatut !== undefined && s.licenceStatut !== 1 ? { vals: {}, tech: 'LicenseStatus = ' + s.licenceStatut + ' (' + (s.licenceNom || '') + ')' } : null;
  }
});

// ===== Plantages
fiche({
  id: 'ecrans-bleus', famille: 'plantages', gravite: 'important', ordre: 3.8, modules: ['evenements'],
  titre: ['Le PC fait des écrans bleus', 'The PC has blue screens'],
  simple: ['{n} écran(s) bleu(s) en 30 jours. Cause la plus probable : {cause}.', '{n} blue screen(s) in 30 days. Most likely cause: {cause}.'],
  etapes: [
    ['Règle d\'abord les autres problèmes de la liste (disque, fichiers de Windows, pilotes) : ils sont souvent la vraie cause.', 'First fix the other items in the list (disk, Windows files, drivers): they are often the real cause.'],
    ['Si la cause est la mémoire : lance le test de mémoire de Windows (redémarrage nécessaire).', 'If the memory is the cause: run the Windows memory test (restart needed).'],
    ['Si c\'est un pilote : mets à jour le pilote concerné depuis le site du fabricant.', 'If it is a driver: update that driver from the manufacturer\'s website.'],
    ['Si tu as overclocké la RAM ou le processeur, remets les réglages par défaut dans le BIOS.', 'If the RAM or CPU is overclocked, restore default settings in the BIOS.']
  ],
  action: 'test-memoire',
  detecter(d, c) {
    const e = d.evenements; if (!e || !e.ecransBleus) return null;
    const codes = liste(e.codesEcransBleus);
    const compte = {};
    for (const x of codes) compte[x] = (compte[x] || 0) + 1;
    const principal = Object.keys(compte).sort((a, b) => compte[b] - compte[a])[0];
    const info = CODES_ECRAN_BLEU[principal];
    const cause = info ? info[1 + L(c)] : (L(c) ? 'unknown (see the code in the technical details)' : 'inconnue (voir le code dans les détails techniques)');
    return { gravite: e.ecransBleus >= 3 ? 'critique' : 'important', vals: { n: e.ecransBleus, cause }, tech: Object.keys(compte).map((k) => k + (CODES_ECRAN_BLEU[k] ? ' ' + CODES_ECRAN_BLEU[k][0] : '') + ' ×' + compte[k]).join(' ; ') + ' | fichiers de plantage (minidumps) : ' + (e.minidumps30j || 0) };
  }
});

fiche({
  id: 'arrets-brutaux', famille: 'plantages', gravite: 'important', ordre: 3.85, modules: ['evenements'],
  titre: ['Le PC s\'éteint ou redémarre tout seul', 'The PC turns off or restarts by itself'],
  simple: ['{n} arrêts brutaux en 30 jours, sans écran bleu. Les causes habituelles : alimentation ou chargeur, surchauffe, ou batterie.', '{n} sudden shutdowns in 30 days, without a blue screen. Usual causes: power supply or charger, overheating, or battery.'],
  etapes: [
    ['Demande au client ce qu\'il faisait à ce moment-là (jeu, veille, coupure de courant ?).', 'Ask the customer what they were doing (gaming, sleep, power cut?).'],
    ['Fais le test de chauffe de 2 minutes : si le PC s\'éteint, c\'est la chauffe ou l\'alimentation.', 'Run the 2-minute heat test: if the PC turns off, it is heat or the power supply.'],
    ['Sur un PC fixe, vérifie l\'alimentation (puissance, âge, câbles) ; sur un portable, le chargeur d\'origine.', 'On a desktop, check the power supply (wattage, age, cables); on a laptop, the original charger.']
  ],
  detecter(d) {
    const e = d.evenements; if (!e) return null;
    const sansCode = liste(e.codesArretsBrutaux).filter((x) => !x).length || (liste(e.codesArretsBrutaux).length ? 0 : e.arretsBrutaux || 0);
    if (sansCode < 2) return null;
    return { gravite: sansCode >= 5 ? 'critique' : 'important', vals: { n: sansCode }, tech: 'Kernel-Power 41 : ' + e.arretsBrutaux + ' ; événements 6008 : ' + (e.arretsInattendus || 0) + ' | ' + liste(e.arretsBrutauxListe).slice(0, 5).map((x) => x.date).join(', ') };
  }
});

fiche({
  id: 'whea', famille: 'materiel', gravite: 'critique', ordre: 1.5, modules: ['evenements'],
  titre: ['Le matériel signale des erreurs', 'The hardware reports errors'],
  simple: ['Le processeur a signalé {n} erreur(s) matérielle(s) en 30 jours. Causes possibles : surchauffe, overclocking, mémoire, carte graphique ou alimentation.', 'The CPU reported {n} hardware error(s) in 30 days. Possible causes: overheating, overclocking, memory, graphics card or power supply.'],
  etapes: [
    ['Remets le BIOS en réglages par défaut si quelque chose a été overclocké (RAM comprise).', 'Restore BIOS defaults if anything is overclocked (RAM included).'],
    ['Fais le test de chauffe de 2 minutes et le test de mémoire de Windows.', 'Run the 2-minute heat test and the Windows memory test.'],
    ['Si les erreurs mentionnent « PCI Express », vérifie que la carte graphique ou le SSD est bien enfoncé.', 'If the errors mention "PCI Express", check the graphics card or SSD is seated properly.']
  ],
  action: 'test-memoire',
  detecter(d) {
    const e = d.evenements; if (!e) return null;
    if (e.wheaGraves > 0) return { vals: { n: e.wheaGraves }, tech: liste(e.wheaListe).slice(0, 5).map((x) => x.date + ' id ' + x.id + ' : ' + x.message).join(' | ') };
    if (e.whea >= 10) return { gravite: 'important', vals: { n: e.whea }, tech: 'Erreurs corrigées (avertissements) : ' + e.whea + ' | ' + liste(e.wheaListe).slice(0, 3).map((x) => x.message).join(' | ') };
    return null;
  }
});

fiche({
  id: 'test-memoire-erreurs', famille: 'materiel', gravite: 'critique', ordre: 1.6, modules: ['evenements'],
  titre: ['Le test de mémoire a trouvé des erreurs', 'The memory test found errors'],
  simple: ['Le test de mémoire de Windows du {date} a trouvé des erreurs : une barrette de RAM est probablement défectueuse.', 'The Windows memory test of {date} found errors: a RAM stick is probably faulty.'],
  etapes: [
    ['S\'il y a plusieurs barrettes, teste-les une par une pour trouver la mauvaise.', 'If there are several sticks, test them one at a time to find the bad one.'],
    ['Si la RAM est overclockée (XMP/EXPO), remets la vitesse par défaut et refais le test.', 'If the RAM is overclocked (XMP/EXPO), restore default speed and test again.'],
    ['Remplace la barrette défectueuse.', 'Replace the faulty stick.']
  ],
  action: 'test-memoire',
  detecter(d) {
    const t = (d.evenements || {}).testMemoire;
    return t && t.erreurs ? { vals: { date: dateFr(t.date) }, tech: t.message || '' } : null;
  }
});

fiche({
  id: 'pilote-graphique-plante', famille: 'plantages', gravite: 'important', ordre: 4.3, modules: ['evenements', 'gpu_ecrans'],
  titre: ['Le pilote de la carte graphique plante', 'The graphics driver crashes'],
  simple: ['{n} plantage(s) du pilote graphique en 30 jours (écran noir quelques secondes, jeu qui se ferme).', '{n} graphics driver crash(es) in 30 days (black screen for a few seconds, game closing).'],
  etapes: [
    ['Désinstalle complètement le pilote avec DDU (Display Driver Uninstaller, wagnardsoft.com), en mode sans échec.', 'Fully uninstall the driver with DDU (Display Driver Uninstaller, wagnardsoft.com), in Safe Mode.'],
    ['Installe le dernier pilote depuis le site du fabricant (NVIDIA, AMD ou Intel), en installation propre.', 'Install the latest driver from the manufacturer\'s website (NVIDIA, AMD or Intel), as a clean install.'],
    ['Si la carte est overclockée, remets-la d\'origine. Sur un PC fixe, vérifie les câbles d\'alimentation de la carte.', 'If the card is overclocked, restore stock settings. On a desktop, check the card\'s power cables.'],
    ['Fais ensuite le test de chauffe de 2 minutes.', 'Then run the 2-minute heat test.']
  ],
  detecter(d) {
    const e = d.evenements; if (!e) return null;
    const n = (e.pilotesGraphiques || 0);
    const r = e.rapportsNoyau30j || 0;
    if (n < 3 && r < 2) return null;
    return { vals: { n: Math.max(n, r) }, tech: 'Événements pilote graphique : ' + n + ' ; rapports noyau (LiveKernelReports) : ' + r + ' | ' + liste(e.gpuListe).slice(0, 3).map((x) => x.date + ' ' + x.source + ' ' + x.id).join(' ; ') };
  }
});

fiche({
  id: 'bridage-cpu', famille: 'materiel', gravite: 'conseil', ordre: 5.0, modules: ['evenements', 'systeme'],
  titre: ['Le processeur est souvent ralenti par le PC', 'The CPU is often throttled by the PC'],
  simple: ['Le PC a bridé le processeur {n} fois en 14 jours, à cause de la chaleur ou de l\'alimentation.', 'The PC throttled the CPU {n} times in 14 days, because of heat or power.'],
  etapes: [
    ['Fais le test de chauffe de 2 minutes pour voir les températures.', 'Run the 2-minute heat test to see temperatures.'],
    ['Nettoie les ventilateurs et les aérations ; sur un vieux PC, change la pâte thermique.', 'Clean the fans and vents; on an older PC, replace the thermal paste.'],
    ['Sur un portable, utilise le chargeur d\'origine et vérifie le mode de performance dans l\'outil du fabricant.', 'On a laptop, use the original charger and check the performance mode in the manufacturer\'s tool.']
  ],
  detecter(d) {
    const n = (d.evenements || {}).bridageCpu14j || 0;
    const portable = (d.systeme || {}).portable;
    if ((portable && n >= 50) || (!portable && n >= 5)) return { gravite: !portable && n >= 20 ? 'important' : 'conseil', vals: { n }, tech: 'Kernel-Processor-Power 37 : ' + n + ' en 14 jours (fréquent et souvent sans gravité sur un portable en mode économie)' };
    return null;
  }
});

fiche({
  id: 'applis-plantent', famille: 'plantages', gravite: 'conseil', ordre: 6.0, modules: ['applis'],
  titre: ['Des applications plantent souvent', 'Some apps crash often'],
  simple: ['« {appli} » a planté {n} fois en 30 jours.', '"{appli}" crashed {n} times in 30 days.'],
  etapes: [
    ['Mets cette application à jour, ou désinstalle-la puis réinstalle-la.', 'Update the app, or uninstall and reinstall it.'],
    ['Si plusieurs applications plantent, règle d\'abord les fichiers de Windows et la mémoire.', 'If several apps crash, fix Windows files and memory first.']
  ],
  detecter(d) {
    const p = liste((d.applis || {}).plantages).filter((x) => x.nombre >= 3);
    if (!p.length) return null;
    return { gravite: p[0].nombre >= 10 ? 'important' : 'conseil', vals: { appli: p[0].appli, n: p[0].nombre }, tech: p.map((x) => x.appli + ' ×' + x.nombre).join(' ; ') };
  }
});

fiche({
  id: 'applis-figent', famille: 'plantages', gravite: 'conseil', ordre: 6.05, modules: ['applis'],
  titre: ['Des applications se figent', 'Some apps freeze'],
  simple: ['« {appli} » s\'est figée {n} fois en 30 jours.', '"{appli}" froze {n} times in 30 days.'],
  etapes: [['Mets l\'application à jour. Si elle se fige surtout quand le PC est chargé, regarde la mémoire et le disque.', 'Update the app. If it mostly freezes when the PC is busy, look at memory and disk.']],
  detecter(d) {
    const p = liste((d.applis || {}).blocages).filter((x) => x.nombre >= 5);
    return p.length ? { vals: { appli: p[0].appli, n: p[0].nombre }, tech: p.map((x) => x.appli + ' ×' + x.nombre).join(' ; ') } : null;
  }
});

fiche({
  id: 'services-plantent', famille: 'plantages', gravite: 'conseil', ordre: 6.1, modules: ['applis'],
  titre: ['Des erreurs se répètent dans Windows', 'Errors keep repeating in Windows'],
  simple: ['Une erreur revient souvent : {quoi}.', 'An error keeps coming back: {quoi}.'],
  etapes: [
    ['Lis la piste donnée dans les détails techniques.', 'Read the hint in the technical details.'],
    ['Pour un programme précis (exemple : Google Drive), désinstalle-le puis réinstalle sa dernière version.', 'For a specific program (e.g. Google Drive), uninstall it, then reinstall its latest version.']
  ],
  detecter(d, c) {
    const e = liste((d.applis || {}).erreursSysteme);
    const gdrive = e.find((x) => /googledrivefs/i.test(x.source || '') && x.nombre >= 5);
    if (gdrive) return { vals: { quoi: L(c) ? 'Google Drive (driver version mismatch): reinstall the latest Google Drive' : 'Google Drive (version du pilote incohérente) : réinstalle la dernière version de Google Drive' }, tech: gdrive.source + ' ×' + gdrive.nombre + ' : ' + gdrive.exemple };
    const svc = e.filter((x) => /Service Control Manager, (7031|7034)/.test(x.source || '')).reduce((a, x) => a + x.nombre, 0);
    if (svc >= 5) return { vals: { quoi: L(c) ? 'services stopping unexpectedly' : 'des services qui s\'arrêtent tout seuls' }, tech: e.filter((x) => /Service Control Manager/.test(x.source)).map((x) => x.source + ' ×' + x.nombre + ' : ' + x.exemple).join(' | ') };
    return null;
  }
});

// ===== 4. BIOS et pilotes
const CODES_GESTIONNAIRE = { 1: 'mal configuré', 3: 'pilote abîmé', 10: 'ne peut pas démarrer', 12: 'conflit de ressources', 14: 'redémarrage nécessaire', 18: 'pilote à réinstaller', 19: 'registre abîmé', 21: 'en cours de suppression', 22: 'désactivé', 24: 'absent ou mal branché', 28: 'pilote manquant', 31: 'ne fonctionne pas correctement', 32: 'service du pilote désactivé', 37: 'échec du pilote', 39: 'pilote abîmé ou manquant', 41: 'matériel introuvable', 43: 'arrêté par Windows : il a signalé un problème', 48: 'pilote bloqué', 52: 'signature du pilote invalide' };

fiche({
  id: 'appareils-erreur', famille: 'pilotes', gravite: 'important', ordre: 4.0, modules: ['appareils'],
  titre: ['Des appareils ne fonctionnent pas', 'Some devices are not working'],
  simple: ['{n} appareil(s) en erreur : {liste}.', '{n} device(s) with errors: {liste}.'],
  etapes: [
    ['Ouvre le Gestionnaire de périphériques : les appareils en erreur ont un point d\'exclamation.', 'Open Device Manager: devices with errors show an exclamation mark.'],
    ['Pilote manquant (code 28) : installe-le depuis le site du fabricant du PC, avec l\'identifiant du matériel (détails techniques).', 'Missing driver (code 28): install it from the PC maker\'s website, using the hardware ID (technical details).'],
    ['Code 43 ou 10 : débranche/rebranche l\'appareil, désinstalle-le dans le gestionnaire puis redémarre.', 'Code 43 or 10: unplug/replug the device, uninstall it in Device Manager, then restart.'],
    ['Code 22 : l\'appareil est désactivé, clic droit › Activer.', 'Code 22: the device is disabled, right-click › Enable.']
  ],
  action: 'gestionnaire',
  detecter(d) {
    const l = liste((d.appareils || {}).enErreur).filter((x) => x.code !== 45 && x.code !== 24);
    if (!l.length) return null;
    const seulDesactive = l.every((x) => x.code === 22);
    return { gravite: seulDesactive ? 'conseil' : 'important', vals: { n: l.length, liste: l.slice(0, 3).map((x) => x.nom || x.classe).join(', ') }, tech: l.map((x) => (x.nom || '?') + ' [' + (x.classe || '') + '] code ' + x.code + ' (' + (CODES_GESTIONNAIRE[x.code] || '?') + ') ' + (x.idMat || x.id)).join(' | ') };
  }
});

fiche({
  id: 'gpu-sans-pilote', famille: 'pilotes', gravite: 'important', ordre: 4.1, modules: ['gpu_ecrans'],
  titre: ['La carte graphique n\'a pas de pilote', 'The graphics card has no driver'],
  simple: ['Windows utilise son pilote d\'affichage de base : image lente, pas de jeux, parfois mauvaise résolution.', 'Windows is using its basic display driver: slow graphics, no games, sometimes wrong resolution.'],
  etapes: [
    ['Repère le modèle de la carte graphique (NVIDIA, AMD ou Intel) et installe son pilote depuis le site du fabricant.', 'Identify the graphics card (NVIDIA, AMD or Intel) and install its driver from the manufacturer\'s website.'],
    ['Sur un portable, prends plutôt le pilote sur le site du fabricant du PC.', 'On a laptop, prefer the driver from the PC maker\'s website.']
  ],
  detecter(d) {
    const g = liste((d.gpu_ecrans || {}).gpus).find((x) => /basic display|de base microsoft|carte graphique de base|basic render/i.test(x.nom || ''));
    return g ? { vals: {}, tech: g.nom + ' ' + (g.pnp || '') } : null;
  }
});

fiche({
  id: 'pilote-graphique-ancien', famille: 'pilotes', gravite: 'conseil', ordre: 4.2, modules: ['gpu_ecrans'],
  titre: ['Le pilote de la carte graphique est ancien', 'The graphics driver is old'],
  simple: ['Le pilote de « {nom} » date du {date}. Les nouveaux pilotes corrigent des bugs et améliorent les jeux.', 'The "{nom}" driver is from {date}. Newer drivers fix bugs and improve games.'],
  etapes: [['Installe le dernier pilote : NVIDIA App, AMD Software (Adrenalin) ou Intel Graphics, depuis le site officiel.', 'Install the latest driver: NVIDIA App, AMD Software (Adrenalin) or Intel Graphics, from the official website.']],
  detecter(d, c) {
    const g = liste((d.gpu_ecrans || {}).gpus).find((x) => estGpuDedie(x.nom) && (jours(x.datePilote, c.maintenant) || 0) > 540);
    return g ? { vals: { nom: g.nom, date: dateFr(g.datePilote) }, tech: g.nom + ' pilote ' + g.pilote + ' du ' + dateFr(g.datePilote) } : null;
  }
});

fiche({
  id: 'bios-ancien', famille: 'pilotes', gravite: 'conseil', ordre: 4.05, modules: ['systeme'],
  titre: ['Le BIOS est ancien', 'The BIOS is old'],
  simple: ['Le BIOS ({v}) date du {date}. Les mises à jour du BIOS corrigent des failles, des bugs de stabilité et la compatibilité.', 'The BIOS ({v}) is from {date}. BIOS updates fix security holes, stability bugs and compatibility.'],
  etapes: [
    ['Va sur la page d\'assistance du modèle exact (détails techniques) et compare avec la dernière version.', 'Go to the support page of the exact model (technical details) and compare with the latest version.'],
    ['Portable : utilise l\'outil du fabricant (Lenovo Vantage, MyASUS, HP Support Assistant…), chargeur branché.', 'Laptop: use the maker\'s tool (Lenovo Vantage, MyASUS, HP Support Assistant…), with the charger plugged in.'],
    ['PC fixe : utilise l\'outil intégré au BIOS (Q-Flash, EZ Flash, M-Flash) avec une clé USB en FAT32. Ne coupe jamais le courant pendant la mise à jour.', 'Desktop: use the BIOS built-in tool (Q-Flash, EZ Flash, M-Flash) with a FAT32 USB drive. Never cut the power during the update.']
  ],
  detecter(d, c) {
    const s = d.systeme || {};
    const j = jours(s.biosDate, c.maintenant);
    if (j === null || j < 3 * 365) return null;
    return { vals: { v: s.biosVersion, date: dateFr(s.biosDate) }, tech: 'BIOS ' + s.biosFabricant + ' ' + s.biosVersion + ' du ' + dateFr(s.biosDate) + ' | carte mère ' + s.carteMereFabricant + ' ' + s.carteMereModele + ' | modèle ' + s.fabricant + ' ' + (s.nomCommercial || s.modele) };
  }
});

fiche({
  id: 'pilotes-generiques', famille: 'pilotes', gravite: 'conseil', ordre: 4.4, modules: ['appareils'],
  titre: ['Des pilotes génériques de Microsoft sont utilisés', 'Generic Microsoft drivers are in use'],
  simple: ['Ces appareils utilisent un pilote générique : {liste}. Le pilote du fabricant donne souvent plus de fonctions et moins de bugs.', 'These devices use a generic driver: {liste}. The manufacturer\'s driver often gives more features and fewer bugs.'],
  etapes: [['Installe les pilotes depuis la page d\'assistance du fabricant du PC (ou de la carte mère pour un PC custom).', 'Install the drivers from the PC maker\'s support page (or the motherboard\'s for a custom PC).']],
  detecter(d) {
    const p = liste((d.appareils || {}).pilotes).filter((x) => /^microsoft$/i.test(x.fournisseur || '') && (/^(NET|BLUETOOTH)$/.test(x.classe) && /wi-?fi|wireless|802\.11|bluetooth/i.test(x.nom) && !/microsoft|virtual|enumerator|wi-fi direct|kernel debug/i.test(x.nom) || (x.classe === 'MEDIA' && /high definition audio|haute définition|audio haute/i.test(x.nom))));
    return p.length ? { vals: { liste: p.slice(0, 3).map((x) => x.nom).join(', ') }, tech: p.map((x) => x.classe + ' ' + x.nom + ' (' + x.fournisseur + ' ' + x.version + ')').join(' ; ') } : null;
  }
});

fiche({
  id: 'outil-fabricant', famille: 'marque', gravite: 'conseil', ordre: 4.6, modules: ['logiciels', 'systeme'],
  titre: ['L\'outil du fabricant n\'est pas installé', 'The manufacturer\'s tool is not installed'],
  simple: ['Pour ce {marque}, l\'outil « {outil} » sert à mettre à jour pilotes et BIOS, régler le mode de performance et protéger la batterie.', 'For this {marque}, the "{outil}" tool updates drivers and BIOS, sets the performance mode and protects the battery.'],
  etapes: [
    ['Installe « {outil} » depuis le Microsoft Store ou le site du fabricant.', 'Install "{outil}" from the Microsoft Store or the manufacturer\'s website.'],
    ['Lance la recherche de mises à jour, puis règle la protection de la batterie (charge limitée à 80 % si le portable reste branché).', 'Run the update check, then set battery protection (charge limited to 80% if the laptop stays plugged in).']
  ],
  detecter(d) {
    const s = d.systeme || {};
    if (!s.portable && !/lenovo|hp|dell|asus|acer|msi/i.test(marqueCourte(s.fabricant || ''))) return null;
    const m = marqueCourte(s.fabricant || '');
    const tout = liste((d.logiciels || {}).programmes).map((x) => x.nom).concat(liste((d.logiciels || {}).store).map((x) => x.nom)).join(' | ');
    if (!d.logiciels) return null;
    const outils = {
      Lenovo: [/LenovoCompanion|Vantage|Legion ?Space|LenovoSettings/i, /legion|loq/i.test((s.nomCommercial || '') + ' ' + (s.famille || '')) ? 'Lenovo Vantage ou Legion Space' : 'Lenovo Vantage'],
      HP: [/HP Support Assistant|HPSupportAssistant|OMEN|myHP|HPSystemInformation/i, /omen|victus/i.test(s.modele || '') ? 'OMEN Gaming Hub' : 'HP Support Assistant'],
      Dell: [/SupportAssist|Command \| Update|Dell Command|Alienware Command/i, 'Dell SupportAssist'],
      Asus: [/MyASUS|ASUSPCAssistant|Armoury ?Crate/i, /rog|tuf/i.test(s.modele || '') ? 'Armoury Crate' : 'MyASUS'],
      Acer: [/Care ?Center|NitroSense|PredatorSense|AcerCare|Acer ?Jumpstart/i, /nitro|predator/i.test(s.modele || '') ? 'NitroSense / PredatorSense' : 'Acer Care Center'],
      MSI: [/MSI ?Center|Dragon ?Center/i, 'MSI Center']
    };
    if (!outils[m]) return null;
    if (outils[m][0].test(tout)) return null;
    return { vals: { marque: m, outil: outils[m][1] }, tech: 'Aucun outil ' + m + ' trouvé parmi les programmes et applications du Store' };
  }
});

// ===== 5. Reseau
fiche({
  id: 'pas-internet', famille: 'reseau', gravite: 'important', ordre: 5.1, modules: ['reseau', 'securite'],
  titre: ['Pas d\'accès à Internet', 'No Internet access'],
  simple: ['Le PC est connecté à un réseau, mais Internet ne répond pas.', 'The PC is connected to a network, but the Internet does not respond.'],
  etapes: [
    ['Vérifie la box ou le partage de connexion sur un autre appareil.', 'Check the router or hotspot on another device.'],
    ['Vide le cache DNS (bouton ci-dessous) et regarde s\'il y a un proxy (fiche « proxy »).', 'Flush the DNS cache (button below) and check for a proxy ("proxy" item).'],
    ['Ouvre l\'état du réseau › « Utilitaire de résolution des problèmes réseau ».', 'Open Network status › "Network troubleshooter".']
  ],
  action: 'dns',
  action2: 'reseau',
  detecter(d) {
    const r = d.reseau; if (!r || r.internet !== false) return null;
    const up = liste(r.cartes).filter((x) => /^up$/i.test(x.statut || ''));
    if (!up.length) return null;
    return { vals: {}, tech: 'Cartes connectées : ' + up.map((x) => x.nom).join(', ') + ' | DNS : ' + liste(r.dns).map((x) => x.carte + ' ' + liste(x.serveurs).join(' ')).join(' ; ') };
  }
});

fiche({
  id: 'wifi-24', famille: 'reseau', gravite: 'conseil', ordre: 5.2, modules: ['reseau'],
  titre: ['Le Wi-Fi est en 2,4 GHz', 'Wi-Fi is on 2.4 GHz'],
  simple: ['La carte Wi-Fi sait faire du 5 GHz, mais elle est connectée en 2,4 GHz : jusqu\'à plusieurs fois plus lent.', 'The Wi-Fi card supports 5 GHz but is connected on 2.4 GHz: up to several times slower.'],
  etapes: [
    ['Sur la box (ou le partage de connexion du téléphone), active le 5 GHz.', 'On the router (or phone hotspot), turn on 5 GHz.'],
    ['Si la box donne le même nom aux deux bandes, rapproche-toi de la box ou sépare les noms (exemple : « Maison-5G »).', 'If the router uses the same name for both bands, move closer or split the names (e.g. "Home-5G").'],
    ['Reconnecte le PC au réseau 5 GHz.', 'Reconnect the PC to the 5 GHz network.']
  ],
  action: 'wifi',
  detecter(d) {
    const w = (d.reseau || {}).wifi;
    if (!w || !w.connecte) return null;
    const b24 = /2[,.]4/.test(w.bande || '') || (!w.bande && w.canal >= 1 && w.canal <= 14);
    if (!b24) return null;
    if (!/ac|ax|be/i.test(w.radio || '') && !/wi-?fi ?[67]|ax\d|ac\d/i.test(w.carte || '')) return null;
    return { vals: {}, tech: 'Bande ' + (w.bande || '?') + ', canal ' + w.canal + ', ' + (w.radio || '') + ', signal ' + w.signal + ' %, carte ' + (w.carte || '') };
  }
});

fiche({
  id: 'wifi-faible', famille: 'reseau', gravite: 'conseil', ordre: 5.3, modules: ['reseau'],
  titre: ['Le signal Wi-Fi est faible', 'Weak Wi-Fi signal'],
  simple: ['Signal à {s} % : connexion lente et coupures probables.', 'Signal at {s}%: slow connection and likely drops.'],
  etapes: [['Rapproche le PC de la box, évite les murs épais, ou ajoute un répéteur / un système Wi-Fi maillé.', 'Move the PC closer to the router, avoid thick walls, or add a repeater / mesh Wi-Fi.']],
  detecter(d) {
    const w = (d.reseau || {}).wifi;
    return w && w.connecte && nb(w.signal) !== null && w.signal < 40 ? { vals: { s: w.signal }, tech: 'Signal ' + w.signal + ' %, ' + (w.bande || '') + ' canal ' + w.canal } : null;
  }
});

fiche({
  id: 'wifi-coupures', famille: 'reseau', gravite: 'important', ordre: 5.4, modules: ['evenements', 'reseau'],
  titre: ['Le Wi-Fi se coupe souvent', 'Wi-Fi drops often'],
  simple: ['{n} déconnexions Wi-Fi en 7 jours.', '{n} Wi-Fi disconnections in 7 days.'],
  etapes: [
    ['Désactive l\'économie d\'énergie de la carte Wi-Fi : Gestionnaire de périphériques › carte Wi-Fi › Gestion de l\'alimentation › décoche « Autoriser l\'ordinateur à éteindre ce périphérique ».', 'Turn off Wi-Fi power saving: Device Manager › Wi-Fi card › Power Management › untick "Allow the computer to turn off this device".'],
    ['Installe le dernier pilote Wi-Fi depuis le site du fabricant du PC ou d\'Intel.', 'Install the latest Wi-Fi driver from the PC maker\'s or Intel\'s website.'],
    ['Si ça continue, regarde la box (redémarrage, mise à jour, canal encombré).', 'If it continues, check the router (restart, update, crowded channel).']
  ],
  action: 'gestionnaire',
  detecter(d) {
    const n = (d.evenements || {}).coupuresWifi7j || 0;
    if (n < 30) return null;
    const eco = liste((d.reseau || {}).cartes).find((x) => x.wifi && x.economie === true);
    return { vals: { n }, tech: 'WLAN-AutoConfig 8003 : ' + n + ' en 7 jours (inclut les mises en veille)' + (eco ? ' | économie d\'énergie active sur ' + eco.description : '') };
  }
});

fiche({
  id: 'ethernet-100', famille: 'reseau', gravite: 'conseil', ordre: 5.45, modules: ['reseau'],
  titre: ['Le câble réseau est limité à 100 Mb/s', 'The network cable is limited to 100 Mb/s'],
  simple: ['La carte Ethernet est connectée à 100 Mb/s au lieu de 1 Gb/s : câble abîmé, trop vieux ou mal branché.', 'The Ethernet card is linked at 100 Mb/s instead of 1 Gb/s: damaged, old or badly plugged cable.'],
  etapes: [['Change le câble (catégorie 5e ou mieux) et vérifie les prises des deux côtés.', 'Replace the cable (category 5e or better) and check both plugs.']],
  detecter(d) {
    const c = liste((d.reseau || {}).cartes).find((x) => !x.wifi && /^up$/i.test(x.statut || '') && /^100 ?Mbps/i.test(x.vitesse || '') && /gbe|gigabit|2\.5g|ethernet controller|i2\d\d|killer/i.test(x.description || ''));
    return c ? { vals: {}, tech: c.description + ' : ' + c.vitesse } : null;
  }
});

// ===== 5. Son, micro, webcam, bluetooth, imprimantes
fiche({
  id: 'pas-de-son', famille: 'son', gravite: 'important', ordre: 5.5, modules: ['appareils'],
  titre: ['Aucun appareil de son ne fonctionne', 'No sound device is working'],
  simple: ['Windows ne trouve aucune sortie ou entrée audio en état de marche.', 'Windows finds no working audio output or input.'],
  etapes: [
    ['Ouvre les paramètres de son et vérifie la sortie choisie.', 'Open sound settings and check the selected output.'],
    ['Dans le Gestionnaire de périphériques, réinstalle le pilote audio (Realtek, Intel SST…) depuis le site du fabricant.', 'In Device Manager, reinstall the audio driver (Realtek, Intel SST…) from the manufacturer\'s website.'],
    ['Fais le test guidé « Son, micro et webcam ».', 'Run the "Sound, mic and webcam" guided test.']
  ],
  action: 'son',
  detecter(d) {
    const a = d.appareils; if (!a) return null;
    const ok = liste(a.audio).filter((x) => /^ok$/i.test(x.statut || ''));
    return ok.length ? null : { vals: {}, tech: 'Points de terminaison audio : ' + (liste(a.audio).map((x) => x.nom + ' ' + x.statut).join(', ') || 'aucun') };
  }
});

fiche({
  id: 'micro-bloque', famille: 'son', gravite: 'important', ordre: 5.55, modules: ['appareils'],
  titre: ['Le micro est bloqué par Windows', 'The microphone is blocked by Windows'],
  simple: ['L\'accès au micro est interdit dans les paramètres de confidentialité : aucune appli ne peut l\'utiliser (Discord, Teams…).', 'Microphone access is turned off in privacy settings: no app can use it (Discord, Teams…).'],
  etapes: [['Ouvre Confidentialité › Microphone et active « Accès au microphone » et « Autoriser les applications de bureau ».', 'Open Privacy › Microphone and turn on "Microphone access" and "Let desktop apps access".']],
  action: 'micro',
  detecter(d) {
    const c = ((d.appareils || {}).confidentialite || {}).microphone || {};
    return c.utilisateur === 'Deny' || c.machine === 'Deny' ? { vals: {}, tech: 'ConsentStore microphone : utilisateur=' + c.utilisateur + ' machine=' + c.machine } : null;
  }
});

fiche({
  id: 'webcam-bloquee', famille: 'son', gravite: 'important', ordre: 5.56, modules: ['appareils'],
  titre: ['La webcam est bloquée par Windows', 'The webcam is blocked by Windows'],
  simple: ['L\'accès à la caméra est interdit dans les paramètres de confidentialité.', 'Camera access is turned off in privacy settings.'],
  etapes: [
    ['Ouvre Confidentialité › Caméra et active l\'accès.', 'Open Privacy › Camera and turn access on.'],
    ['Sur certains portables, la webcam a aussi un cache ou une touche (souvent F8 ou F10) qui la coupe.', 'On some laptops the webcam also has a shutter or a key (often F8 or F10) that turns it off.']
  ],
  action: 'webcam',
  detecter(d) {
    const c = ((d.appareils || {}).confidentialite || {}).webcam || {};
    return c.utilisateur === 'Deny' || c.machine === 'Deny' ? { vals: {}, tech: 'ConsentStore webcam : utilisateur=' + c.utilisateur + ' machine=' + c.machine } : null;
  }
});

fiche({
  id: 'bluetooth-service', famille: 'bluetooth', gravite: 'important', ordre: 5.6, modules: ['appareils'],
  titre: ['Le Bluetooth ne fonctionne pas', 'Bluetooth is not working'],
  simple: ['Le PC a du Bluetooth, mais {raison}.', 'The PC has Bluetooth, but {raison}.'],
  etapes: [
    ['Ouvre les paramètres Bluetooth et vérifie qu\'il est activé (et que le mode avion est coupé).', 'Open Bluetooth settings and check it is on (and airplane mode is off).'],
    ['Installe le pilote Bluetooth du fabricant du PC (souvent livré avec le pilote Wi-Fi).', 'Install the PC maker\'s Bluetooth driver (often bundled with the Wi-Fi driver).'],
    ['Pour une manette : supprime-la des appareils, puis réassocie-la.', 'For a controller: remove it from devices, then pair it again.']
  ],
  action: 'bluetooth',
  detecter(d, c) {
    const a = d.appareils; if (!a) return null;
    const radios = liste(a.bluetooth).filter((x) => x.present !== false);
    if (!radios.length) return null;
    if (a.serviceBluetooth && !/running|en cours/i.test(a.serviceBluetooth)) return { vals: { raison: L(c) ? 'its Windows service is stopped' : 'son service Windows est arrêté' }, tech: 'bthserv : ' + a.serviceBluetooth };
    const err = radios.filter((x) => /error|erreur/i.test(x.statut || ''));
    if (err.length) return { vals: { raison: L(c) ? 'the adapter reports an error' : 'l\'adaptateur est en erreur' }, tech: err.map((x) => x.nom + ' : ' + x.statut).join(' ; ') };
    return null;
  }
});

fiche({
  id: 'spouleur', famille: 'imprimantes', gravite: 'important', ordre: 5.7, modules: ['appareils'],
  titre: ['Le service d\'impression est arrêté', 'The print service is stopped'],
  simple: ['Sans ce service, aucune imprimante ne fonctionne.', 'Without this service, no printer works.'],
  etapes: [['Redémarre le service d\'impression (bouton ci-dessous). S\'il s\'arrête encore, réinstalle le pilote de l\'imprimante.', 'Restart the print service (button below). If it stops again, reinstall the printer driver.']],
  action: 'spouleur',
  detecter(d) {
    const a = d.appareils || {};
    return a.spouleur && !/running|en cours/i.test(a.spouleur) ? { vals: {}, tech: 'Spooler : ' + a.spouleur + ' (démarrage ' + a.spouleurDemarrage + ')' } : null;
  }
});

fiche({
  id: 'impression-bloquee', famille: 'imprimantes', gravite: 'conseil', ordre: 5.75, modules: ['appareils'],
  titre: ['Des impressions sont bloquées', 'Print jobs are stuck'],
  simple: ['{n} document(s) en attente sont en erreur : la file d\'impression est bloquée.', '{n} queued document(s) are in error: the print queue is stuck.'],
  etapes: [
    ['Redémarre le service d\'impression (bouton ci-dessous) : la file se débloque.', 'Restart the print service (button below): the queue gets unstuck.'],
    ['Vérifie que l\'imprimante est allumée, connectée au même réseau, et qu\'elle a du papier.', 'Check the printer is on, on the same network, and has paper.']
  ],
  action: 'spouleur',
  action2: 'imprimantes',
  detecter(d) {
    const a = d.appareils || {};
    return a.travauxEnErreur > 0 ? { vals: { n: a.travauxEnErreur }, tech: 'Travaux : ' + a.travauxImpression + ', en erreur : ' + a.travauxEnErreur } : null;
  }
});

// ===== 5. Ecrans et jeux
fiche({
  id: 'ecran-frequence', famille: 'ecrans', gravite: 'conseil', ordre: 5.8, modules: ['gpu_ecrans'],
  titre: ['Un écran ne tourne pas à sa fréquence maximale', 'A display is not at its maximum refresh rate'],
  simple: ['L\'écran {ecran} est réglé à {hz} Hz alors qu\'il peut aller jusqu\'à {max} Hz : l\'image est moins fluide.', 'Display {ecran} is set to {hz} Hz but can go up to {max} Hz: the picture is less smooth.'],
  etapes: [
    ['Paramètres › Affichage › Affichage avancé › choisis la fréquence la plus haute.', 'Settings › Display › Advanced display › pick the highest refresh rate.'],
    ['Si elle n\'apparaît pas : utilise un câble DisplayPort ou HDMI récent, branché sur la carte graphique.', 'If it is missing: use a DisplayPort or recent HDMI cable, plugged into the graphics card.']
  ],
  action: 'affichage-avance',
  detecter(d) {
    const e = liste((d.gpu_ecrans || {}).ecrans).find((x) => x.hzMax >= 75 && x.hz && x.hz < x.hzMax - 1);
    const jeu = liste((d.gpu_ecrans || {}).gpus).some((g) => estGpuDedie(g.nom));
    return e ? { gravite: jeu ? 'important' : 'conseil', vals: { ecran: e.nom.replace('\\\\.\\', ''), hz: e.hz, max: e.hzMax }, tech: e.nom + ' (' + e.adaptateur + ') ' + e.largeur + 'x' + e.hauteur + ' à ' + e.hz + ' Hz, max ' + e.hzMax + ' Hz' } : null;
  }
});

fiche({
  id: 'ecran-resolution', famille: 'ecrans', gravite: 'conseil', ordre: 5.81, modules: ['gpu_ecrans'],
  titre: ['Un écran n\'est pas à sa résolution native', 'A display is not at its native resolution'],
  simple: ['L\'écran {ecran} est en {res} au lieu de {max} : l\'image est floue.', 'Display {ecran} is at {res} instead of {max}: the picture is blurry.'],
  etapes: [['Paramètres › Affichage › Résolution d\'écran › choisis la valeur « (recommandé) ».', 'Settings › Display › Display resolution › pick the "(recommended)" value.']],
  action: 'affichage',
  detecter(d) {
    const e = liste((d.gpu_ecrans || {}).ecrans).find((x) => x.largeurMax && x.largeur * x.hauteur < x.largeurMax * x.hauteurMax && x.largeurMax <= 7680);
    return e ? { vals: { ecran: e.nom.replace('\\\\.\\', ''), res: e.largeur + '×' + e.hauteur, max: e.largeurMax + '×' + e.hauteurMax }, tech: e.nom + ' ' + e.largeur + 'x' + e.hauteur + ' (max ' + e.largeurMax + 'x' + e.hauteurMax + ')' } : null;
  }
});

function vitesseNominale(ref) {
  const r = (ref || '').toUpperCase();
  let m = r.match(/F[45]-(\d{4})C/) || r.match(/(\d{4})C\d{2}/) || r.match(/(\d{4})HC/) || r.match(/[-_](\d{4})(?:MHZ|-|$)/);
  if (m) return parseInt(m[1], 10);
  m = r.match(/KF[45](\d{2})C/) || r.match(/BL\d?K?\d+G(\d{2})C/) || r.match(/CT\d+G[45]\w*?(\d{2})\d?\.?/);
  if (m) return parseInt(m[1], 10) * 100;
  return null;
}

fiche({
  id: 'ram-xmp', famille: 'jeux', gravite: 'important', ordre: 4.5, modules: ['cpu_ram'],
  titre: ['La RAM ne tourne pas à sa vraie vitesse', 'The RAM is not running at its rated speed'],
  simple: ['La RAM est vendue pour {nominal} MHz mais tourne à {reel} MHz : le profil XMP (Intel) ou EXPO (AMD) n\'est pas activé. Les jeux perdent des images par seconde.', 'The RAM is rated {nominal} MHz but runs at {reel} MHz: the XMP (Intel) or EXPO (AMD) profile is off. Games lose frames per second.'],
  etapes: [
    ['Entre dans le BIOS et active le profil XMP ou EXPO (Gigabyte : Tweaker › X.M.P.).', 'Enter the BIOS and enable the XMP or EXPO profile (Gigabyte: Tweaker › X.M.P.).'],
    ['Si le PC devient instable, choisis une vitesse un peu plus basse (exemple : 3200 MHz), car tous les processeurs ne tiennent pas les kits très rapides.', 'If the PC becomes unstable, pick a slightly lower speed (e.g. 3200 MHz), because not every CPU handles very fast kits.'],
    ['Relance l\'analyse : la vitesse réelle doit avoir changé.', 'Run the analysis again: the real speed should have changed.']
  ],
  detecter(d) {
    if ((d.systeme || {}).portable) return null;
    const b = liste((d.cpu_ram || {}).barrettes);
    if (!b.length) return null;
    const reel = Math.min(...b.map((x) => x.vitesseReelle || 0).filter(Boolean));
    const nominal = Math.max(...b.map((x) => vitesseNominale(x.reference) || x.vitessePrevue || 0));
    if (!reel || !nominal || nominal <= reel * 1.08) return null;
    return { vals: { nominal, reel }, tech: b.map((x) => x.emplacement + ' ' + x.fabricant + ' ' + x.reference + ' ' + x.go + ' Go : prévue ' + x.vitessePrevue + ', réelle ' + x.vitesseReelle).join(' | ') };
  }
});

fiche({
  id: 'ram-simple-canal', famille: 'lenteurs', gravite: 'conseil', ordre: 5.85, modules: ['cpu_ram'],
  titre: ['Une seule barrette de RAM', 'Only one RAM stick'],
  simple: ['Le PC a {n} emplacements mais une seule barrette : la mémoire tourne en « simple canal », nettement moins vite, surtout en jeu.', 'The PC has {n} slots but only one stick: memory runs in single channel, noticeably slower, especially for games.'],
  etapes: [['Ajoute une deuxième barrette identique (même capacité et même vitesse), dans l\'emplacement indiqué par le manuel.', 'Add a second identical stick (same size and speed), in the slot shown in the manual.']],
  detecter(d) {
    const c = d.cpu_ram || {};
    const b = liste(c.barrettes);
    return b.length === 1 && (c.emplacements || 0) >= 2 ? { vals: { n: c.emplacements }, tech: '1 barrette sur ' + c.emplacements + ' emplacements : ' + b[0].reference } : null;
  }
});

fiche({
  id: 'rebar', famille: 'jeux', gravite: 'conseil', ordre: 4.55, modules: ['gpu_ecrans'],
  titre: ['Re-Size BAR semble désactivé', 'Re-Size BAR seems to be off'],
  simple: ['Re-Size BAR laisse le processeur accéder à toute la mémoire de la carte graphique : jusqu\'à 10 % d\'images par seconde en plus dans certains jeux. Il semble désactivé.', 'Re-Size BAR lets the CPU access all of the graphics memory: up to 10% more frames in some games. It seems to be off.'],
  etapes: [
    ['Dans le BIOS, active « Above 4G Decoding » puis « Re-Size BAR Support » (Gigabyte : Settings › IO Ports).', 'In the BIOS, enable "Above 4G Decoding" then "Re-Size BAR Support" (Gigabyte: Settings › IO Ports).'],
    ['Le mode CSM doit être désactivé (Windows installé en UEFI).', 'CSM must be disabled (Windows installed in UEFI mode).'],
    ['Confirme ensuite dans le logiciel de la carte graphique (AMD : « Smart Access Memory » ; NVIDIA : Informations système).', 'Then confirm in the graphics software (AMD: "Smart Access Memory"; NVIDIA: System Information).']
  ],
  detecter(d) {
    if ((d.systeme || {}).portable) return null;
    const g = liste((d.gpu_ecrans || {}).gpus).find((x) => /rtx [3-9]\d|rtx 50|rx [6-9]\d{3}|arc [ab]\d/i.test(x.nom || ''));
    if (!g || g.fenetreGo === null || g.fenetreGo === undefined) return null;
    return g.fenetreGo <= 0.3 ? { vals: {}, tech: g.nom + ' : plus grande fenêtre mémoire visible ' + g.fenetreGo + ' Go (au-dessus de 1 Go quand Re-Size BAR est actif)' } : null;
  }
});

fiche({
  id: 'pcie-bride', famille: 'jeux', gravite: 'important', ordre: 4.56, modules: ['gpu_ecrans'],
  titre: ['La carte graphique est bridée par son emplacement', 'The graphics card is limited by its slot'],
  simple: ['« {nom} » fonctionne en x{actuel} alors qu\'elle peut aller en x{max} : elle est sûrement branchée dans le mauvais emplacement PCIe.', '"{nom}" runs at x{actuel} but supports x{max}: it is probably in the wrong PCIe slot.'],
  etapes: [['Éteins le PC et place la carte graphique dans le premier emplacement PCIe x16, le plus proche du processeur.', 'Turn off the PC and move the graphics card to the first PCIe x16 slot, nearest the CPU.']],
  detecter(d) {
    if ((d.systeme || {}).portable) return null;
    const g = liste((d.gpu_ecrans || {}).gpus).find((x) => estGpuDedie(x.nom) && x.lien && x.lien.largeurActuelle && x.lien.largeurMax && x.lien.largeurActuelle < x.lien.largeurMax);
    return g ? { vals: { nom: g.nom, actuel: g.lien.largeurActuelle, max: g.lien.largeurMax }, tech: 'Lien PCIe : x' + g.lien.largeurActuelle + ' / x' + g.lien.largeurMax + ' ; génération ' + g.lien.vitesseActuelle + ' / ' + g.lien.vitesseMax } : null;
  }
});

fiche({
  id: 'ecran-carte-mere', famille: 'jeux', gravite: 'important', ordre: 4.57, modules: ['gpu_ecrans'],
  titre: ['Un écran est branché sur la carte mère', 'A display is plugged into the motherboard'],
  simple: ['L\'écran {ecran} est relié à « {adaptateur} » (la puce graphique du processeur) au lieu de la carte graphique : les jeux tournent beaucoup moins bien.', 'Display {ecran} is connected to "{adaptateur}" (the CPU\'s graphics) instead of the graphics card: games run much worse.'],
  etapes: [['Branche le câble de l\'écran sur la carte graphique (prises horizontales en bas du boîtier), pas sur la carte mère.', 'Plug the display cable into the graphics card (horizontal ports low on the case), not the motherboard.']],
  detecter(d) {
    if ((d.systeme || {}).portable) return null;
    const gpus = liste((d.gpu_ecrans || {}).gpus);
    if (!gpus.some((g) => estGpuDedie(g.nom))) return null;
    const e = liste((d.gpu_ecrans || {}).ecrans).find((x) => !estGpuDedie(x.adaptateur) && /intel|uhd|iris|radeon\(tm\) graphics|radeon graphics/i.test(x.adaptateur || ''));
    return e ? { vals: { ecran: e.nom.replace('\\\\.\\', ''), adaptateur: e.adaptateur }, tech: e.nom + ' → ' + e.adaptateur } : null;
  }
});

fiche({
  id: 'jeu-mauvaise-gpu', famille: 'jeux', gravite: 'conseil', ordre: 5.86, modules: ['gpu_ecrans'],
  titre: ['Des jeux sont réglés sur la petite puce graphique', 'Some games are set to the low-power graphics'],
  simple: ['Ces programmes sont forcés sur l\'« économie d\'énergie » : {liste}.', 'These programs are forced to "power saving": {liste}.'],
  etapes: [['Paramètres › Affichage › Graphiques : pour chaque jeu, choisis « Hautes performances ».', 'Settings › Display › Graphics: for each game, choose "High performance".']],
  action: 'graphismes',
  detecter(d) {
    const p = liste((d.gpu_ecrans || {}).prefsGpu).filter((x) => /GpuPreference=1;/.test(x.reglage || ''));
    return p.length ? { vals: { liste: p.slice(0, 3).map((x) => x.appli.split('\\').pop()).join(', ') }, tech: p.map((x) => x.appli + ' = ' + x.reglage).join(' ; ') } : null;
  }
});

fiche({
  id: 'capture-arriere-plan', famille: 'jeux', gravite: 'conseil', ordre: 5.87, modules: ['gpu_ecrans'],
  titre: ['La Xbox Game Bar enregistre en arrière-plan', 'Xbox Game Bar is recording in the background'],
  simple: ['L\'enregistrement en arrière-plan filme le jeu en permanence et coûte des images par seconde.', 'Background recording films the game all the time and costs frames per second.'],
  etapes: [['Paramètres › Jeux › Captures : désactive « Enregistrer ce qui s\'est passé ».', 'Settings › Gaming › Captures: turn off "Record what happened".']],
  action: 'capture',
  detecter(d) { return (d.gpu_ecrans || {}).captureArrierePlan === 1 ? { vals: {}, tech: 'HistoricalCaptureEnabled = 1' } : null; }
});

fiche({
  id: 'mode-jeu', famille: 'jeux', gravite: 'conseil', ordre: 5.88, modules: ['gpu_ecrans'],
  titre: ['Le mode jeu est désactivé', 'Game Mode is off'],
  simple: ['Le mode jeu donne la priorité au jeu en cours et évite les mises à jour pendant la partie.', 'Game Mode prioritises the running game and avoids updates during play.'],
  etapes: [['Paramètres › Jeux › Mode jeu : active-le.', 'Settings › Gaming › Game Mode: turn it on.']],
  action: 'modejeu',
  detecter(d) {
    const g = d.gpu_ecrans || {};
    return g.modeJeu === 0 && liste(g.gpus).some((x) => estGpuDedie(x.nom)) ? { vals: {}, tech: 'AutoGameModeEnabled = 0' } : null;
  }
});

fiche({
  id: 'alimentation-eco', famille: 'lenteurs', gravite: 'conseil', ordre: 5.9, modules: ['demarrage', 'systeme'],
  titre: ['Le PC est en mode économie d\'énergie', 'The PC is in power-saving mode'],
  simple: ['Le mode d\'alimentation « {mode} » bride le processeur, même branché sur secteur.', 'The "{mode}" power mode slows the CPU, even when plugged in.'],
  etapes: [['Paramètres › Système › Alimentation : choisis « Équilibré » ou « Meilleures performances » sur secteur.', 'Settings › System › Power: choose "Balanced" or "Best performance" when plugged in.']],
  action: 'alimentation',
  detecter(d) {
    const p = d.demarrage || {};
    const economie = p.schemaGuid === 'a1841308-3541-4fab-bc81-f71556f20b4a';
    const overlay = (p.modeSecteur || '').toLowerCase() === '961cc777-2547-4f9d-8174-7d86181b8a7a';
    if (!economie && !overlay) return null;
    return { vals: { mode: economie ? (p.schemaNom || 'Économie d\'énergie') : 'Meilleure efficacité énergétique' }, tech: 'Schéma ' + p.schemaGuid + ' (' + p.schemaNom + ') ; mode secteur ' + (p.modeSecteur || 'par défaut') };
  }
});

// ===== Batterie
fiche({
  id: 'batterie-usee', famille: 'batterie', gravite: 'conseil', ordre: 5.95, modules: ['batterie'],
  titre: ['La batterie est usée', 'The battery is worn'],
  simple: ['La batterie ne tient plus que {sante} % de sa capacité d\'origine ({cycles} cycles) : l\'autonomie a baissé d\'autant.', 'The battery holds only {sante}% of its original capacity ({cycles} cycles): battery life has dropped accordingly.'],
  etapes: [
    ['Sous 60 %, propose un remplacement (batterie d\'origine ou de bonne qualité).', 'Below 60%, offer a replacement (original or good-quality battery).'],
    ['Pour la préserver : active le mode « conservation » (charge limitée) dans l\'outil du fabricant si le portable reste souvent branché.', 'To preserve it: enable "conservation" mode (limited charge) in the maker\'s tool if the laptop is often plugged in.']
  ],
  action: 'rapport-batterie',
  detecter(d) {
    const b = d.batterie; if (!b || !b.presente || nb(b.sante) === null) return null;
    if (b.sante >= 80) return null;
    return { gravite: b.sante < 60 ? 'important' : 'conseil', vals: { sante: b.sante, cycles: b.cycles ?? '?' }, tech: 'Capacité d\'origine ' + b.capaciteOrigine + ' mWh, actuelle ' + b.capacitePleine + ' mWh, cycles ' + (b.cycles ?? '?') };
  }
});

fiche({
  id: 'batterie-charge-pas', famille: 'batterie', gravite: 'important', ordre: 5.96, modules: ['batterie'],
  titre: ['La batterie ne charge pas', 'The battery is not charging'],
  simple: ['Le chargeur est branché, mais la batterie reste à {c} % sans charger.', 'The charger is plugged in, but the battery stays at {c}% without charging.'],
  etapes: [
    ['Vérifie le chargeur (d\'origine, bonne puissance) et la prise.', 'Check the charger (original, right wattage) and the socket.'],
    ['Regarde si un mode de protection de la batterie est actif dans l\'outil du fabricant.', 'Check whether a battery protection mode is on in the maker\'s tool.'],
    ['Fais le test guidé « Ports USB et charge ».', 'Run the "USB ports and charging" guided test.']
  ],
  detecter(d) {
    const b = d.batterie;
    return b && b.presente && b.secteur === true && b.enCharge === false && nb(b.charge) !== null && b.charge < 50 ? { vals: { c: b.charge }, tech: 'PowerOnline=True, Charging=False, charge ' + b.charge + ' %' } : null;
  }
});

// ===== 6. Confort et lenteurs
fiche({
  id: 'demarrage-charge', famille: 'demarrage', gravite: 'conseil', ordre: 6.2, modules: ['demarrage'],
  titre: ['Trop de programmes se lancent au démarrage', 'Too many programs start with Windows'],
  simple: ['{n} programmes se lancent avec Windows. Chacun ralentit le démarrage et occupe de la mémoire.', '{n} programs start with Windows. Each one slows startup and uses memory.'],
  etapes: [['Paramètres › Applications › Démarrage : désactive ce dont le client n\'a pas besoin tout de suite (Discord, Steam, Spotify…). Garde l\'antivirus et les pilotes.', 'Settings › Apps › Startup: turn off what the customer does not need right away (Discord, Steam, Spotify…). Keep the antivirus and drivers.']],
  action: 'demarrage',
  detecter(d) {
    const p = d.demarrage || {};
    return (p.actifs || 0) >= 10 ? { vals: { n: p.actifs }, tech: liste(p.programmes).filter((x) => x.actif).map((x) => x.nom).join(', ') } : null;
  }
});

fiche({
  id: 'demarrage-lent', famille: 'demarrage', gravite: 'conseil', ordre: 6.3, modules: ['evenements'],
  titre: ['Le démarrage est lent', 'Startup is slow'],
  simple: ['Le dernier démarrage a pris {s} secondes.', 'The last startup took {s} seconds.'],
  etapes: [
    ['Réduis les programmes au démarrage.', 'Reduce startup programs.'],
    ['Sur un disque dur classique, le passage à un SSD change tout.', 'On a hard drive, moving to an SSD changes everything.']
  ],
  action: 'demarrage',
  detecter(d) {
    const l = liste((d.evenements || {}).demarrages);
    if (!l.length) return null;
    const ms = l[0].ms;
    return ms > 90000 ? { gravite: ms > 180000 ? 'important' : 'conseil', vals: { s: Math.round(ms / 1000) }, tech: l.map((x) => dateFr(x.date) + ' : ' + Math.round(x.ms / 1000) + ' s').join(' ; ') } : null;
  }
});

fiche({
  id: 'hdd-systeme', famille: 'lenteurs', gravite: 'conseil', ordre: 6.4, modules: ['disques'],
  titre: ['Windows est installé sur un disque dur classique', 'Windows is on a hard drive'],
  simple: ['Un disque dur mécanique rend tout lent. Un SSD rend le PC plusieurs fois plus rapide au démarrage et à l\'ouverture des programmes.', 'A mechanical hard drive makes everything slow. An SSD makes startup and app launches several times faster.'],
  etapes: [['Propose de remplacer le disque par un SSD (avec clonage du disque ou réinstallation de Windows).', 'Offer to replace the drive with an SSD (cloning the disk or reinstalling Windows).']],
  detecter(d) {
    const p = liste((d.disques || {}).physiques).find((x) => x.systeme && x.type === 'HDD');
    return p ? { vals: {}, tech: p.nom + ' (' + p.type + ', ' + p.bus + ')' } : null;
  }
});

fiche({
  id: 'ram-pleine', famille: 'lenteurs', gravite: 'conseil', ordre: 6.5, modules: ['cpu_ram'],
  titre: ['La mémoire est presque pleine', 'Memory is almost full'],
  simple: ['{pct} % de la mémoire est utilisée ({total} Go au total). Le PC doit utiliser le disque à la place : tout ralentit.', '{pct}% of memory is in use ({total} GB in total). The PC has to use the disk instead: everything slows down.'],
  etapes: [
    ['Ferme les onglets et programmes inutiles ; regarde le Gestionnaire des tâches pour voir qui consomme.', 'Close unneeded tabs and programs; check Task Manager to see what uses memory.'],
    ['Avec 8 Go ou moins, propose d\'ajouter de la RAM.', 'With 8 GB or less, offer to add RAM.']
  ],
  detecter(d) {
    const c = d.cpu_ram || {};
    if ((c.ramUtilisee || 0) >= 90) return { vals: { pct: c.ramUtilisee, total: c.ramTotaleGo }, tech: 'Libre : ' + c.ramLibreGo + ' Go / ' + c.ramTotaleGo + ' Go' };
    if (c.ramTotaleGo && c.ramTotaleGo < 7.5) return { vals: { pct: c.ramUtilisee ?? '?', total: c.ramTotaleGo }, tech: 'Seulement ' + c.ramTotaleGo + ' Go de RAM' };
    return null;
  }
});

fiche({
  id: 'temporaires', famille: 'lenteurs', gravite: 'conseil', ordre: 6.6, modules: ['disques'],
  titre: ['Beaucoup de fichiers temporaires', 'Lots of temporary files'],
  simple: ['{taille} de fichiers temporaires peuvent être supprimés.', '{taille} of temporary files can be deleted.'],
  etapes: [['Lance le Nettoyage de disque, puis « Nettoyer les fichiers système ».', 'Run Disk Cleanup, then "Clean up system files".']],
  action: 'nettoyage',
  detecter(d) {
    const t = liste((d.disques || {}).temporaires).reduce((a, x) => a + (x.go || 0), 0);
    return t >= 5 ? { vals: { taille: t.toFixed(1).replace('.', ',') + ' Go' }, tech: liste((d.disques || {}).temporaires).map((x) => x.dossier + ' : ' + x.go + ' Go').join(' ; ') } : null;
  }
});

fiche({
  id: 'chauffe-repos', famille: 'materiel', gravite: 'important', ordre: 5.97, modules: ['temperatures'],
  titre: ['Le processeur chauffe déjà au repos', 'The CPU is already hot at idle'],
  simple: ['Le processeur est à {t} °C sans rien faire de lourd. Poussière, ventilateur ou pâte thermique sont à vérifier.', 'The CPU is at {t} °C while idle. Check for dust, fan or thermal paste.'],
  etapes: [
    ['Nettoie les ventilateurs et aérations (bombe d\'air, ventilateur bloqué pendant le soufflage).', 'Clean fans and vents (compressed air, hold the fan still while blowing).'],
    ['Si ça ne suffit pas, change la pâte thermique.', 'If that is not enough, replace the thermal paste.']
  ],
  detecter(d) {
    const t = d.temperatures;
    if (!t || !t.lhm || nb(t.cpu) === null) return null;
    return t.cpu >= 75 && (t.chargeCpu || 0) < 30 ? { vals: { t: t.cpu }, tech: 'CPU ' + t.cpu + ' °C, charge ' + t.chargeCpu + ' % (source : ' + liste(t.sources).join(', ') + ')' } : null;
  }
});

fiche({
  id: 'profil-temporaire', famille: 'comptes', gravite: 'important', ordre: 3.05, modules: ['systeme'],
  titre: ['Windows a ouvert un profil temporaire', 'Windows opened a temporary profile'],
  simple: ['Le client est connecté sur un profil temporaire : ses fichiers et réglages n\'apparaissent pas, et tout ce qu\'il fait sera perdu à la déconnexion.', 'The customer is signed in to a temporary profile: their files and settings are missing, and anything they do will be lost at sign-out.'],
  etapes: [
    ['Ne travaille pas dans cette session. Redémarre une fois : parfois le vrai profil revient.', 'Do not work in this session. Restart once: sometimes the real profile comes back.'],
    ['Sinon, il faut réparer le profil dans le registre (ProfileList) : demande de l\'aide avant de toucher au registre.', 'Otherwise the profile must be repaired in the registry (ProfileList): get help before editing the registry.']
  ],
  detecter(d) { return (d.systeme || {}).profilTemporaire ? { vals: {}, tech: 'USERPROFILE pointe vers un dossier TEMP' } : null; }
});

export const REGLES = R;

// ------------------------------------------------------------- moteur
function remplir(modele, vals) {
  return String(modele).replace(/\{(\w+)\}/g, (m, k) => (vals && vals[k] !== undefined && vals[k] !== null ? String(vals[k]) : '?'));
}

// d = { systeme: {...}, cpu_ram: {...}, ... } ; ctx = { langue, maintenant, lectureSeule }
export function analyser(donnees, ctx = {}) {
  const d = normaliser(donnees);
  const c = { langue: 'fr', maintenant: new Date(), ...ctx };
  const l = L(c);
  const res = [];
  for (const r of R) {
    if (r.modules.some((m) => !d[m])) continue;
    let det = null;
    try { det = r.detecter(d, c); } catch (e) { det = null; }
    if (!det) continue;
    const gravite = det.gravite || r.gravite;
    res.push({
      id: r.id,
      famille: r.famille,
      gravite,
      ordre: r.ordre,
      etape: Math.floor(r.ordre),
      modules: r.modules,
      titre: remplir(r.titre[l], det.vals),
      simple: remplir(r.simple[l], det.vals),
      etapes: r.etapes.map((e) => remplir(e[l], det.vals)),
      technique: det.tech || '',
      action: r.action || null,
      action2: r.action2 || null
    });
  }
  const rang = { critique: 0, important: 1, conseil: 2, info: 3 };
  res.sort((a, b) => a.ordre - b.ordre || rang[a.gravite] - rang[b.gravite]);
  return res;
}

// Reverifie une seule fiche avec les nouvelles donnees
export function reverifier(id, donnees, ctx = {}) {
  return analyser(donnees, ctx).find((p) => p.id === id) || null;
}

export function regle(id) { return R.find((r) => r.id === id); }

// Resume du PC pour l'en-tete et le bilan
export function resume(donnees) {
  const d = normaliser(donnees);
  const s = d.systeme || {};
  const c = d.cpu_ram || {};
  const n = nomDuPc(d);
  const gpus = liste((d.gpu_ecrans || {}).gpus).map((g) => g.nom).filter(Boolean);
  const disques = liste((d.disques || {}).physiques).filter((p) => p.bus !== 'USB').map((p) => p.nom + ' (' + go(p.go || 0) + (nb(p.usure) !== null ? ', usure ' + p.usure + ' %' : '') + ')');
  const b = d.batterie || {};
  return {
    nom: n.nom,
    custom: n.custom,
    windows: (s.windowsNom || '') + (s.windowsVersion ? ' ' + s.windowsVersion : '') + (s.build ? ' (build ' + s.build + '.' + s.ubr + ')' : ''),
    processeur: nomProcesseur(c.cpuNom || ''),
    ram: c.ramTotaleGo ? c.ramTotaleGo + ' Go' : '',
    graphique: gpus.join(' + '),
    disques: disques.join(' ; '),
    batterie: b.presente ? (b.sante !== null && b.sante !== undefined ? b.sante + ' % de santé' : 'présente') + (b.cycles !== null && b.cycles !== undefined ? ', ' + b.cycles + ' cycles' : '') : '',
    stabilite: (d.applis || {}).stabilite,
    portable: !!s.portable,
    numeroSerie: s.numeroSerie || '',
    uuid: s.uuid || '',
    nomPC: s.nomPC || '',
    utilisateur: s.utilisateur || ''
  };
}
