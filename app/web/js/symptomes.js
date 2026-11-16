// =====================================================================
//  DEBUG Friend ! - mode « Décris le problème »
//  Le client décrit ce qu'il constate ; quelques questions simples
//  orientent vers la cause probable, le test à faire et la pièce à suspecter.
//  Chaque question : [texte FR, texte EN], et la piste ajoutée si « oui ».
//  tests possibles : analyse, chauffe, clavier, ecran, son, usb, charge
// =====================================================================

const P = (fr, en, test, piece) => ({ fr, en, test: test || null, piece: piece || null });

export const SYMPTOMES = [
  {
    id: 'lent', titre: ['Le PC est lent', 'The PC is slow'],
    questions: [
      { q: ['C\'est lent surtout au démarrage ?', 'Is it slow mostly at startup?'], oui: P('Trop de programmes au démarrage, ou disque dur classique.', 'Too many startup programs, or a mechanical hard drive.', 'analyse') },
      { q: ['Le ventilateur souffle fort quand ça rame ?', 'Does the fan get loud when it lags?'], oui: P('Chauffe : le processeur ralentit pour se protéger.', 'Heat: the CPU slows down to protect itself.', 'chauffe', ['Ventilateur', 'Fan']) },
      { q: ['Des publicités ou fenêtres bizarres apparaissent ?', 'Do ads or strange windows appear?'], oui: P('Programmes indésirables ou virus.', 'Unwanted programs or malware.', 'analyse') },
      { q: ['Le PC a plus de 5 ans ou moins de 8 Go de RAM ?', 'Is the PC over 5 years old or under 8 GB of RAM?'], oui: P('Matériel dépassé : un SSD et plus de RAM changent souvent tout.', 'Outdated hardware: an SSD and more RAM often change everything.', 'analyse', ['SSD ou RAM', 'SSD or RAM']) }
    ],
    defaut: P('Lance l\'analyse complète : disque plein, fichiers abîmés et lenteurs y sont cherchés.', 'Run the full analysis: full disk, damaged files and slowness are checked.', 'analyse')
  },
  {
    id: 'bruit', titre: ['Le PC fait un bruit bizarre', 'The PC makes a strange noise'],
    questions: [
      { q: ['C\'est un souffle qui monte et descend ?', 'Is it a whoosh that goes up and down?'], oui: P('Ventilateur qui force : poussière ou chauffe.', 'Fan working hard: dust or heat.', 'chauffe', ['Ventilateur', 'Fan']) },
      { q: ['C\'est un frottement ou un grattement régulier ?', 'Is it a rubbing or grinding sound?'], oui: P('Ventilateur usé ou un câble qui touche les pales.', 'Worn fan or a cable touching the blades.', null, ['Ventilateur', 'Fan']) },
      { q: ['Ce sont des « clics » répétés ?', 'Is it repeated clicking?'], oui: P('Disque dur mécanique en fin de vie : sauvegarde les données tout de suite.', 'Mechanical hard drive failing: back up the data now.', 'analyse', ['Disque dur', 'Hard drive']) },
      { q: ['C\'est un sifflement aigu en jeu ?', 'Is it a high-pitched whine while gaming?'], oui: P('« Coil whine » de la carte graphique ou de l\'alimentation : bruyant mais sans danger.', 'Coil whine from the graphics card or power supply: noisy but harmless.', null, ['Carte graphique ou alimentation', 'Graphics card or power supply']) }
    ],
    defaut: P('Ouvre le PC et localise l\'origine du bruit à l\'oreille, PC allumé, sans rien toucher à l\'intérieur.', 'Open the case and locate the noise by ear, PC on, without touching anything inside.')
  },
  {
    id: 'chaud', titre: ['Le PC chauffe ou sent le chaud', 'The PC gets hot or smells hot'],
    questions: [
      { q: ['Il y a une odeur de brûlé ou de plastique ?', 'Is there a burning or plastic smell?'], oui: P('Composant qui brûle : éteins et débranche le PC tout de suite. Ne le rallume pas avant d\'avoir trouvé la pièce.', 'A component is burning: turn off and unplug now. Do not power on until the part is found.', null, ['Alimentation ou carte mère', 'Power supply or motherboard']) },
      { q: ['Le PC est posé sur un lit, un canapé ou un tissu ?', 'Is the PC on a bed, sofa or fabric?'], oui: P('Aérations bouchées : pose-le sur une surface dure.', 'Blocked vents: put it on a hard surface.') },
      { q: ['Le PC a plus de 3 ans sans nettoyage ?', 'Is the PC over 3 years old without cleaning?'], oui: P('Poussière et pâte thermique sèche.', 'Dust and dried thermal paste.', 'chauffe', ['Pâte thermique', 'Thermal paste']) }
    ],
    defaut: P('Fais le test de chauffe de 2 minutes pour mesurer les températures.', 'Run the 2-minute heat test to measure temperatures.', 'chauffe')
  },
  {
    id: 'eteint', titre: ['Le PC s\'éteint ou redémarre tout seul', 'The PC turns off or restarts by itself'],
    questions: [
      { q: ['Ça arrive surtout en jeu ou sous forte charge ?', 'Does it happen mostly while gaming or under load?'], oui: P('Chauffe ou alimentation trop faible.', 'Heat or a weak power supply.', 'chauffe', ['Alimentation', 'Power supply']) },
      { q: ['Il y a un écran bleu avant ?', 'Is there a blue screen first?'], oui: P('Plantage de Windows : le code de l\'écran bleu donne la cause.', 'Windows crash: the blue screen code gives the cause.', 'analyse') },
      { q: ['C\'est un portable qui s\'éteint sur batterie ?', 'Is it a laptop shutting down on battery?'], oui: P('Batterie usée qui ne tient plus la charge.', 'Worn battery that no longer holds charge.', 'charge', ['Batterie', 'Battery']) }
    ],
    defaut: P('Lance l\'analyse : les arrêts brutaux et leurs codes y sont relevés.', 'Run the analysis: sudden shutdowns and their codes are recorded.', 'analyse')
  },
  {
    id: 'ecran', titre: ['L\'écran clignote, a des lignes ou reste noir', 'The screen flickers, has lines or stays black'],
    questions: [
      { q: ['Les lignes ou taches restent même dans le BIOS ?', 'Do lines or spots remain even in the BIOS?'], oui: P('Défaut physique de l\'écran ou de sa nappe.', 'Physical fault of the screen or its cable.', 'ecran', ['Écran ou nappe', 'Screen or ribbon cable']) },
      { q: ['Sur un PC fixe : l\'image revient avec un autre câble ou une autre prise ?', 'On a desktop: does the picture come back with another cable or port?'], oui: P('Câble ou prise défectueux.', 'Faulty cable or port.', null, ['Câble', 'Cable']) },
      { q: ['Ça arrive en jeu, avec un retour au bureau ?', 'Does it happen while gaming, dropping back to the desktop?'], oui: P('Pilote graphique qui plante.', 'Graphics driver crashing.', 'analyse') },
      { q: ['L\'écran est noir mais le PC fait du bruit et les voyants sont allumés ?', 'Is the screen black but the PC is running with lights on?'], oui: P('Écran branché sur la carte mère au lieu de la carte graphique, ou RAM mal enfoncée.', 'Display plugged into the motherboard instead of the graphics card, or RAM not seated.', null, ['RAM ou carte graphique', 'RAM or graphics card']) }
    ],
    defaut: P('Fais le test d\'écran (noir puis blanc) et l\'analyse.', 'Run the screen test (black then white) and the analysis.', 'ecran')
  },
  {
    id: 'bleu', titre: ['Écrans bleus', 'Blue screens'],
    questions: [
      { q: ['Une pièce a été ajoutée ou changée récemment ?', 'Was a part added or changed recently?'], oui: P('Pièce mal installée ou incompatible : commence par elle.', 'Badly installed or incompatible part: start there.', null, ['Pièce récente', 'Recent part']) },
      { q: ['La RAM ou le processeur sont overclockés (XMP, EXPO) ?', 'Is the RAM or CPU overclocked (XMP, EXPO)?'], oui: P('Overclocking instable : teste avec les réglages par défaut.', 'Unstable overclock: test with default settings.', 'analyse', ['RAM', 'RAM']) }
    ],
    defaut: P('Lance l\'analyse : chaque code d\'écran bleu est traduit avec sa cause probable.', 'Run the analysis: each blue screen code is explained with its likely cause.', 'analyse')
  },
  {
    id: 'son', titre: ['Pas de son ou micro qui ne marche pas', 'No sound or mic not working'],
    questions: [
      { q: ['Le son marche avec un casque mais pas avec les haut-parleurs ?', 'Does sound work with headphones but not speakers?'], oui: P('Haut-parleurs ou leur connexion.', 'Speakers or their connection.', 'son', ['Haut-parleurs', 'Speakers']) },
      { q: ['Le micro marche dans certaines applis seulement ?', 'Does the mic work only in some apps?'], oui: P('Autorisations de confidentialité ou mauvais micro choisi dans l\'appli.', 'Privacy permissions or wrong mic chosen in the app.', 'analyse') }
    ],
    defaut: P('Fais le test guidé « Son, micro et webcam » et l\'analyse.', 'Run the "Sound, mic and webcam" guided test and the analysis.', 'son')
  },
  {
    id: 'wifi', titre: ['Internet ou le Wi-Fi coupe', 'Internet or Wi-Fi keeps dropping'],
    questions: [
      { q: ['Les autres appareils coupent aussi ?', 'Do other devices drop too?'], oui: P('Le problème vient de la box ou de la ligne, pas du PC.', 'The problem is the router or the line, not the PC.') },
      { q: ['Ça coupe surtout après la mise en veille ?', 'Does it drop mostly after sleep?'], oui: P('Économie d\'énergie de la carte Wi-Fi.', 'Wi-Fi card power saving.', 'analyse') },
      { q: ['Le PC est loin de la box ou derrière plusieurs murs ?', 'Is the PC far from the router or behind several walls?'], oui: P('Signal trop faible : répéteur ou Wi-Fi maillé.', 'Signal too weak: repeater or mesh Wi-Fi.') }
    ],
    defaut: P('Lance l\'analyse : bande, signal, coupures et pilote y sont vérifiés.', 'Run the analysis: band, signal, drops and driver are checked.', 'analyse')
  },
  {
    id: 'clavier', titre: ['Des touches ou le touchpad ne marchent pas', 'Keys or the touchpad do not work'],
    questions: [
      { q: ['Du liquide a été renversé sur le clavier ?', 'Was liquid spilled on the keyboard?'], oui: P('Clavier abîmé par le liquide : remplacement probable.', 'Keyboard damaged by liquid: replacement likely.', 'clavier', ['Clavier', 'Keyboard']) },
      { q: ['Les touches marchent dans le BIOS mais pas dans Windows ?', 'Do the keys work in the BIOS but not in Windows?'], oui: P('Pilote ou réglage Windows (touches rémanentes, disposition).', 'Driver or Windows setting (sticky keys, layout).', 'analyse') }
    ],
    defaut: P('Fais le test du clavier et du touchpad.', 'Run the keyboard and touchpad test.', 'clavier')
  },
  {
    id: 'batterie', titre: ['La batterie se vide vite ou ne charge pas', 'The battery drains fast or does not charge'],
    questions: [
      { q: ['La batterie a gonflé (coque qui bombe, touchpad qui se soulève) ?', 'Has the battery swollen (bulging case, lifting touchpad)?'], oui: P('Batterie gonflée : danger. Ne plus charger, la remplacer rapidement.', 'Swollen battery: dangerous. Stop charging and replace it soon.', null, ['Batterie', 'Battery']) },
      { q: ['Le chargeur utilisé n\'est pas celui d\'origine ?', 'Is the charger not the original one?'], oui: P('Chargeur trop faible ou incompatible.', 'Charger too weak or incompatible.', 'charge', ['Chargeur', 'Charger']) },
      { q: ['La charge s\'arrête toujours vers 60 % ou 80 % ?', 'Does charging always stop around 60% or 80%?'], oui: P('Mode de protection de la batterie actif : c\'est voulu, pas une panne.', 'Battery protection mode is on: it is intended, not a fault.') }
    ],
    defaut: P('Lance l\'analyse (santé de la batterie) et le test de charge.', 'Run the analysis (battery health) and the charging test.', 'charge')
  },
  {
    id: 'usb', titre: ['Un port USB ou un appareil n\'est pas reconnu', 'A USB port or device is not recognised'],
    questions: [
      { q: ['L\'appareil marche sur un autre PC ?', 'Does the device work on another PC?'], oui: P('Port USB ou pilote du PC.', 'The PC\'s USB port or driver.', 'usb', ['Port USB', 'USB port']) },
      { q: ['Le port bouge ou il faut tenir le câble ?', 'Is the port loose or must the cable be held?'], oui: P('Port physiquement abîmé : réparation sur la carte mère ou carte fille.', 'Physically damaged port: repair on the motherboard or daughterboard.', 'usb', ['Port USB', 'USB port']) }
    ],
    defaut: P('Fais le test des ports USB.', 'Run the USB port test.', 'usb')
  },
  {
    id: 'pubs', titre: ['Publicités, page d\'accueil changée, recherche bizarre', 'Ads, changed home page, odd search engine'],
    questions: [
      { q: ['Un logiciel gratuit a été installé récemment ?', 'Was free software installed recently?'], oui: P('Programme indésirable installé avec lui.', 'Unwanted program installed alongside it.', 'analyse') },
      { q: ['Les pubs apparaissent aussi hors du navigateur ?', 'Do ads appear outside the browser too?'], oui: P('Logiciel publicitaire installé dans Windows.', 'Adware installed in Windows.', 'analyse') }
    ],
    defaut: P('Lance l\'analyse : programmes indésirables, extensions, proxy et tâches suspectes y sont cherchés.', 'Run the analysis: unwanted programs, extensions, proxy and suspicious tasks are checked.', 'analyse')
  },
  {
    id: 'jeux', titre: ['Les jeux saccadent', 'Games stutter'],
    questions: [
      { q: ['Les saccades arrivent après quelques minutes de jeu ?', 'Does stutter start after a few minutes of play?'], oui: P('Chauffe : la carte graphique ou le processeur ralentit.', 'Heat: the graphics card or CPU slows down.', 'chauffe') },
      { q: ['C\'est un PC fixe monté à la main ?', 'Is it a self-built desktop?'], oui: P('Réglages souvent oubliés : XMP/EXPO, Re-Size BAR, écran sur la carte mère, fréquence de l\'écran.', 'Often-missed settings: XMP/EXPO, Re-Size BAR, display on the motherboard, refresh rate.', 'analyse') },
      { q: ['C\'est un portable qui joue sur batterie ?', 'Is it a laptop gaming on battery?'], oui: P('Sur batterie, la carte graphique est bridée : jouer branché.', 'On battery the graphics card is limited: play plugged in.') }
    ],
    defaut: P('Lance l\'analyse : la partie jeux vérifie tous les réglages qui font perdre des images.', 'Run the analysis: the gaming section checks every setting that costs frames.', 'analyse')
  },
  {
    id: 'imprimante', titre: ['L\'imprimante ne marche pas', 'The printer does not work'],
    questions: [
      { q: ['L\'imprimante est en Wi-Fi ?', 'Is the printer on Wi-Fi?'], oui: P('Imprimante et PC pas sur le même réseau, ou adresse de l\'imprimante changée.', 'Printer and PC on different networks, or the printer\'s address changed.') },
      { q: ['Des documents restent coincés dans la file d\'attente ?', 'Are documents stuck in the queue?'], oui: P('File d\'impression bloquée : redémarrer le service d\'impression.', 'Print queue stuck: restart the print service.', 'analyse') }
    ],
    defaut: P('Lance l\'analyse : service d\'impression, files et imprimantes y sont vérifiés.', 'Run the analysis: print service, queues and printers are checked.', 'analyse')
  }
];

// Rassemble les pistes selon les réponses : reponses = { indexQuestion: true/false }
export function conclure(symptome, reponses) {
  const pistes = [];
  symptome.questions.forEach((q, i) => { if (reponses[i] === true) pistes.push(q.oui); });
  pistes.push(symptome.defaut);
  return pistes;
}
