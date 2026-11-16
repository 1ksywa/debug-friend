// =====================================================================
//  DEBUG Friend ! - generateur de QR code (mode octets, correction M,
//  versions 1 a 10). Ecrit pour fonctionner sans Internet.
//  Methode standard (ISO/IEC 18004), dans l'esprit de "qrcodegen".
// =====================================================================

const ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const NIVEAU_M = 0; // bits du niveau M dans les infos de format

function modulesBruts(v) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const n = Math.floor(v / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (v >= 7) r -= 36;
  }
  return r;
}

function motsDonnees(v) {
  return Math.floor(modulesBruts(v) / 8) - ECC_M[v] * BLOCS_M[v];
}

function mul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 255;
}

function diviseur(degre) {
  const r = new Array(degre).fill(0);
  r[degre - 1] = 1;
  let racine = 1;
  for (let i = 0; i < degre; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = mul(r[j], racine);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    racine = mul(racine, 2);
  }
  return r;
}

function reste(donnees, div) {
  const r = new Array(div.length).fill(0);
  for (const b of donnees) {
    const f = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => { r[i] ^= mul(c, f); });
  }
  return r;
}

function positionsAlignement(v, taille) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2;
  const pas = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const r = [6];
  for (let pos = taille - 7; r.length < n; pos -= pas) r.splice(1, 0, pos);
  return r;
}

function bit(x, i) { return ((x >>> i) & 1) !== 0; }

export function creerQr(texte, masqueForce) {
  const octets = Array.from(new TextEncoder().encode(texte));
  let v = 1;
  for (; v <= 10; v++) {
    const bitsCompte = v <= 9 ? 8 : 16;
    if (4 + bitsCompte + octets.length * 8 <= motsDonnees(v) * 8) break;
  }
  if (v > 10) throw new Error('texte trop long pour le QR code');
  const taille = v * 4 + 17;
  const capacite = motsDonnees(v) * 8;

  // --- flux de bits
  const bits = [];
  const ajouter = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  ajouter(4, 4);
  ajouter(octets.length, v <= 9 ? 8 : 16);
  for (const o of octets) ajouter(o, 8);
  ajouter(0, Math.min(4, capacite - bits.length));
  ajouter(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacite; pad ^= 0xec ^ 0x11) ajouter(pad, 8);
  const donnees = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    donnees.push(b);
  }

  // --- correction d'erreurs et entrelacement
  const nbBlocs = BLOCS_M[v];
  const eccLong = ECC_M[v];
  const brut = Math.floor(modulesBruts(v) / 8);
  const nbCourts = nbBlocs - (brut % nbBlocs);
  const longCourt = Math.floor(brut / nbBlocs);
  const div = diviseur(eccLong);
  const blocs = [];
  for (let i = 0, k = 0; i < nbBlocs; i++) {
    const d = donnees.slice(k, k + longCourt - eccLong + (i < nbCourts ? 0 : 1));
    k += d.length;
    const e = reste(d, div);
    if (i < nbCourts) d.push(0);
    blocs.push(d.concat(e));
  }
  const final = [];
  for (let i = 0; i < blocs[0].length; i++) {
    for (let j = 0; j < blocs.length; j++) {
      if (i !== longCourt - eccLong || j >= nbCourts) final.push(blocs[j][i]);
    }
  }

  // --- grille
  const mod = Array.from({ length: taille }, () => new Array(taille).fill(false));
  const fonc = Array.from({ length: taille }, () => new Array(taille).fill(false));
  const poser = (x, y, noir) => { mod[y][x] = noir; fonc[y][x] = true; };

  for (let i = 0; i < taille; i++) { poser(6, i, i % 2 === 0); poser(i, 6, i % 2 === 0); }
  const reperes = [[3, 3], [taille - 4, 3], [3, taille - 4]];
  for (const [cx, cy] of reperes) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && xx < taille && yy >= 0 && yy < taille) poser(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  }
  const al = positionsAlignement(v, taille);
  for (let i = 0; i < al.length; i++) {
    for (let j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) poser(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }
  const format = (masque) => {
    const d = (NIVEAU_M << 3) | masque;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) poser(8, i, bit(b, i));
    poser(8, 7, bit(b, 6));
    poser(8, 8, bit(b, 7));
    poser(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) poser(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) poser(taille - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) poser(8, taille - 15 + i, bit(b, i));
    poser(8, taille - 8, true);
  };
  format(0);
  if (v >= 7) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) {
      const n = bit(b, i);
      const a = taille - 11 + (i % 3), c = Math.floor(i / 3);
      poser(a, c, n);
      poser(c, a, n);
    }
  }

  // --- placement des donnees
  let i = 0;
  for (let droite = taille - 1; droite >= 1; droite -= 2) {
    if (droite === 6) droite = 5;
    for (let vert = 0; vert < taille; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = droite - j;
        const monte = ((droite + 1) & 2) === 0;
        const y = monte ? taille - 1 - vert : vert;
        if (!fonc[y][x] && i < final.length * 8) {
          mod[y][x] = bit(final[i >>> 3], 7 - (i & 7));
          i++;
        }
      }
    }
  }

  // --- masques : on garde celui qui donne le motif le plus lisible
  const condition = (m, x, y) => {
    switch (m) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  };
  const appliquer = (m) => {
    for (let y = 0; y < taille; y++) for (let x = 0; x < taille; x++) if (!fonc[y][x] && condition(m, x, y)) mod[y][x] = !mod[y][x];
  };
  const penalite = () => {
    let p = 0, noirs = 0;
    for (let y = 0; y < taille; y++) {
      for (const sens of [0, 1]) {
        let suite = 1;
        for (let k = 1; k < taille; k++) {
          const a = sens ? mod[k][y] : mod[y][k];
          const b = sens ? mod[k - 1][y] : mod[y][k - 1];
          if (a === b) { suite++; if (suite === 5) p += 3; else if (suite > 5) p++; } else suite = 1;
        }
      }
      for (let x = 0; x < taille; x++) {
        if (mod[y][x]) noirs++;
        if (x < taille - 1 && y < taille - 1 && mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) p += 3;
      }
    }
    const total = taille * taille;
    p += Math.floor(Math.abs(noirs * 20 - total * 10) / total) * 10;
    return p;
  };
  let meilleur = 0, minP = Infinity;
  for (let m = 0; m < 8; m++) {
    appliquer(m);
    format(m);
    const p = penalite();
    if (p < minP) { minP = p; meilleur = m; }
    appliquer(m);
  }
  if (masqueForce !== undefined) meilleur = masqueForce;
  appliquer(meilleur);
  format(meilleur);
  return { taille, modules: mod, version: v };
}

// Dessin SVG noir sur blanc, avec la marge blanche obligatoire de 4 modules.
// La taille en pixels est un multiple exact du nombre de modules : plus net, plus facile a lire.
export function qrEnSvg(texte, pixelsVises = 260, masqueForce) {
  const q = creerQr(texte, masqueForce);
  const t = q.taille + 8;
  const pixels = Math.max(2, Math.round(pixelsVises / t)) * t;
  let d = '';
  for (let y = 0; y < q.taille; y++) {
    for (let x = 0; x < q.taille; x++) if (q.modules[y][x]) d += 'M' + (x + 4) + ',' + (y + 4) + 'h1v1h-1z';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + pixels + '" height="' + pixels + '" viewBox="0 0 ' + t + ' ' + t +
    '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="' + t + '" height="' + t + '" fill="#FFFFFF"/><path d="' + d + '" fill="#000000"/></svg>';
}
