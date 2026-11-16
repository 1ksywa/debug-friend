// Charge un coeur du processeur pendant le test de chauffe (calculs inutiles).
// S'arrete au message 'stop' ou a la duree demandee.
let fin = 0;
self.onmessage = (e) => {
  if (e.data && e.data.type === 'start') {
    fin = Date.now() + (e.data.duree || 120000);
    let x = 0;
    while (Date.now() < fin) {
      for (let i = 0; i < 200000; i++) x = Math.sqrt(x + i) * 1.000001;
      if (x > 1e12) x = 0;
    }
    self.postMessage({ type: 'fini' });
  }
};
