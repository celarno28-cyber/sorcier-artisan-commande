/**
 * CELARNO28 — Le Sorcier Artisan — Réception des commandes (v5)
 * ==============================================================
 * Les formulaires (festival.html, livraison.html et grimoire.html) sont hébergés sur GitHub Pages.
 * Les commandes du « grimoire du moment » (boules de Noël) arrivent dans l'onglet Livraison.
 * Ce script reçoit chaque commande (doPost) :
 *   1) envoie les photos dans l'album Google Photos "CELARNO28 - Photos reçues"
 *   2) ajoute une ligne dans l'onglet "Festival" ou "Livraison" de la Google Sheet
 *
 * Pour chaque modèle commandé, le client peut joindre une photo et/ou un texte à graver (facultatif).
 *
 * Suivi des délais :
 *   - colonne "Jours restants" = jours avant la date limite, en gardant 3 jours de marge pour l'envoi
 *     (livraison : délai souhaité − 3 jours ; festival : délai tel quel)
 *   - couleur de la ligne (onglet Livraison uniquement) : vert = plus de 7 jours, orange = de 4 à 7 jours,
 *     rouge = moins de 4 jours, gris = commande réalisée
 *   - chaque matin vers 8 h, un e-mail avec toutes les commandes en cours
 *
 * À FAIRE UNE FOIS (et après chaque mise à jour de ce code) : choisir "installer" en haut puis "Exécuter".
 */

// ================== RÉGLAGES ==================
var ALBUM_TITLE = "CELARNO28 - Photos reçues";
var ALERT_EMAIL = "celarno28@gmail.com";   // adresse qui reçoit le récapitulatif du matin
var MARGE_ENVOI = 3;                        // jours réservés à l'envoi postal (commandes livraison)
var SEUIL_VERT = 7;                         // plus de 7 jours restants = vert
var SEUIL_ROUGE = 4;                        // moins de 4 jours restants = rouge (entre les deux = orange)
var MAX_MODELES = 30;                       // modèles (et donc photos) maximum par commande

// Boules de Noël (grimoire du moment) : prix à l'unité et prix par lot de 2, toutes boules confondues
var BOULE_PRIX_UNE = 6;
var BOULE_PRIX_DEUX = 10;
var BOULE_MAX_CARACTERES = 12;

// Produits et prix (le prix null = "sur devis")
var CATALOGUE = {
  p10x10:      { label: "Gravure photo 10x10 cm", prix: 12 },
  p10x15:      { label: "Gravure photo 10x15 cm", prix: 15 },
  p13x18:      { label: "Gravure photo 13x18 cm", prix: 20 },
  formatDivers:{ label: "Gravure photo format sur mesure", prix: null, detail: true },
  porteCle:    { label: "Porte-clé", prix: 6 },
  marquePage:  { label: "Marque-page", prix: 6 },
  divers:      { label: "Autre création", prix: null, detail: true },
  bouleCerfSapin: { label: "Boule de Noël Cerf & sapin", prix: BOULE_PRIX_UNE, boule: true },
  bouleFlocons:   { label: "Boule de Noël Flocons",      prix: BOULE_PRIX_UNE, boule: true },
  bouleTeteCerf:  { label: "Boule de Noël Tête de cerf", prix: BOULE_PRIX_UNE, boule: true },
  bouleHoux:      { label: "Boule de Noël Houx",         prix: BOULE_PRIX_UNE, boule: true }
};
var PRODUITS_AUTORISES = {
  festival:  ['p10x10', 'p10x15', 'p13x18', 'porteCle'],
  livraison: ['p10x10', 'p10x15', 'p13x18', 'formatDivers', 'porteCle', 'marquePage', 'divers',
              'bouleCerfSapin', 'bouleFlocons', 'bouleTeteCerf', 'bouleHoux']
};

// Onglets de la Sheet (colonnes numérotées à partir de 1)
var ONGLETS = {
  festival: {
    nom: 'Festival',
    marge: 0,
    couleurs: false,   // pas de couleurs sur les commandes festival
    entetes: ['Date', 'Prénom', 'Téléphone', 'Commande', 'Total (€)', 'Photos',
              'Répondu', 'Délai', 'Jours restants', 'Réalisé', 'Statut'],
    largeurs: [130, 110, 120, 360, 80, 170, 80, 100, 90, 100, 160],
    col: { date: 1, prenom: 2, commande: 4, total: 5, photos: 6, repondu: 7, delai: 8, jours: 9, realise: 10, statut: 11 },
    noteJours: 'Jours restants avant le délai (si tu en indiques un).'
  },
  livraison: {
    nom: 'Livraison',
    marge: MARGE_ENVOI,
    couleurs: true,
    entetes: ['Date', 'Prénom', 'Nom', 'Téléphone', 'E-mail', 'Adresse', 'Code postal', 'Ville',
              'Commande', 'Total (€)', 'Précisions', 'Photos', 'Répondu', 'Délai', 'Jours restants', 'Réalisé', 'Statut'],
    largeurs: [130, 100, 110, 120, 190, 220, 90, 130, 360, 80, 220, 170, 80, 100, 90, 100, 160],
    col: { date: 1, prenom: 2, nom: 3, commande: 9, total: 10, photos: 12, repondu: 13, delai: 14, jours: 15, realise: 16, statut: 17 },
    noteJours: 'Jours restants avant d\'EXPÉDIER : délai souhaité par le client − ' + MARGE_ENVOI + ' jours de marge pour l\'envoi.\n' +
               'Vert : plus de 7 j · Orange : 4 à 7 j · Rouge : moins de 4 j · Gris : réalisé.'
  }
};

// ================== WEB APP ==================

function doGet(e) {
  return jsonOut_({ ok: true, service: 'CELARNO28 commandes', version: 5 });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut_({ success: false, error: 'Données illisibles.' });
  }
  if (data.ping) return jsonOut_({ success: true, pong: true });
  return jsonOut_(enregistrerCommande_(data));
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================== COMMANDE ==================

function enregistrerCommande_(data) {
  var c = null;
  try {
    data = normaliserAncienFormat_(data || {});
    c = lireCommande_(data);          // vérifie et met en forme (lance une erreur si incomplet)
  } catch (err) {
    return { success: false, error: err.message };
  }

  var liens = [];
  var statut = 'OK';
  try {
    if (c.photos.length) {
      var albumId = getOrCreateAlbumId_(ALBUM_TITLE);
      var description = [c.prenom, c.nom, c.telephone].filter(String).join(' - ');
      liens = uploadToGooglePhotos_(c.photos, albumId, description);   // un lien par photo, dans le même ordre
    }
  } catch (err) {
    statut = 'ERREUR photo : ' + err.message;
  }

  try {
    ecrireLigne_(c, liens, statut);
  } catch (err) {
    return { success: false, error: 'Commande non enregistrée : ' + err.message };
  }

  // La commande est enregistrée même si une photo a échoué : on prévient le client sans lui faire renvoyer
  return { success: true, total: c.total, devis: c.devis, photoKo: statut !== 'OK' };
}

/** Compatibilité avec les anciens formulaires (une seule photo + un format). */
function normaliserAncienFormat_(d) {
  if (!d.type) d.type = 'festival';
  if (!d.photos && d.base64) {
    d.photos = [{ base64: d.base64, mimeType: d.mimeType, fileName: d.fileName, label: d.format || '' }];
  }
  if (!d.items && d.format) {
    var map = { '10x10': 'p10x10', '10x15': 'p10x15', '13x18': 'p13x18' };
    d.items = [{ id: map[d.format] || 'p10x10', qty: 1 }];
  }
  return d;
}

function texte_(v, max) {
  return String(v == null ? '' : v).trim().substring(0, max || 300);
}

function lireCommande_(d) {
  var type = d.type === 'livraison' ? 'livraison' : 'festival';
  var c = {
    type: type,
    prenom: texte_(d.prenom, 80),
    nom: texte_(d.nom, 80),
    telephone: texte_(d.telephone, 30),
    email: texte_(d.email, 120),
    adresse: texte_(d.adresse, 200),
    cp: texte_(d.cp, 15),
    ville: texte_(d.ville, 80),
    precisions: texte_(d.precisions, 1000),
    delai: null,
    lignes: [],
    total: 0,
    devis: false,
    photos: []
  };

  if (!c.prenom || !c.telephone) throw new Error('Prénom et téléphone sont obligatoires.');
  if (type === 'livraison') {
    if (!c.nom) throw new Error('Le nom est obligatoire.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new Error("L'adresse e-mail n'est pas valide.");
    if (!c.adresse || !c.cp || !c.ville) throw new Error("L'adresse de livraison est incomplète.");
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte_(d.delai, 10));
    if (!m) throw new Error('Indique la date souhaitée.');
    c.delai = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  // Produits : pour chaque modèle (unité), une photo et/ou un texte à graver
  var unites = 0, photosAnnoncees = 0, ancienFormat = false, nbBoules = 0;
  var autorises = PRODUITS_AUTORISES[type];
  var items = Array.isArray(d.items) ? d.items : [];
  items.forEach(function (it) {
    var id = String(it && it.id || '');
    var qty = Math.floor(Number(it && it.qty));
    if (autorises.indexOf(id) < 0 || !(qty >= 1)) return;
    qty = Math.min(qty, MAX_MODELES);
    unites += qty;
    var p = CATALOGUE[id];
    var detail = texte_(it.detail, 200);
    if (p.detail && !detail) {
      throw new Error('Précise ta demande pour « ' + p.label + ' ».');
    }
    var txt = qty + '× ' + p.label + (detail ? ' (' + detail + ')' : '');
    if (p.prix == null) {
      txt += ' – sur devis';
      c.devis = true;
    } else if (p.boule) {
      nbBoules += qty;              // prix calculé plus bas : 2 boules = BOULE_PRIX_DEUX €
    } else {
      txt += ' – ' + p.prix + ' €';
      c.total += p.prix * qty;
    }

    if (Array.isArray(it.units)) {
      var desc = [];
      for (var k = 0; k < qty; k++) {
        var u = it.units[k] || {};
        var t = texte_(u.texte, p.boule ? BOULE_MAX_CARACTERES : 200);
        var aPhoto = !!u.photo;
        if (aPhoto) photosAnnoncees++;
        var quoi = (aPhoto ? 'photo' : '') + (aPhoto && t ? ' + ' : '') + (t ? (p.boule ? '« ' + t + ' »' : 'texte « ' + t + ' »') : '');
        if (!quoi) quoi = 'à préciser';   // photo et texte sont facultatifs
        desc.push((qty > 1 ? 'n°' + (k + 1) + ' : ' : '') + quoi);
      }
      txt += ' → ' + desc.join(' | ');
    } else {
      ancienFormat = true;
    }
    c.lignes.push(txt);
  });
  if (!c.lignes.length) throw new Error('Choisis au moins un produit.');
  if (nbBoules) {
    var prixBoules = Math.floor(nbBoules / 2) * BOULE_PRIX_DEUX + (nbBoules % 2) * BOULE_PRIX_UNE;
    c.total += prixBoules;
    c.lignes.push('🎄 ' + nbBoules + ' boule(s) de Noël = ' + prixBoules + ' € (' +
                  BOULE_PRIX_UNE + ' € la boule, ' + BOULE_PRIX_DEUX + ' € les 2)');
  }
  if (unites > MAX_MODELES) throw new Error(MAX_MODELES + ' modèles maximum par commande.');
  c.resume = c.lignes.join('\n');

  // Photos, chacune avec son étiquette (ex. "13x18", "Porte-clé n°2")
  var photos = Array.isArray(d.photos) ? d.photos.slice(0, MAX_MODELES) : [];
  photos.forEach(function (ph, i) {
    if (!ph || !ph.base64) return;
    c.photos.push({
      blob: Utilities.newBlob(
        Utilities.base64Decode(ph.base64),
        ph.mimeType || 'image/jpeg',
        ph.fileName || ('photo' + (i + 1) + '.jpg')
      ),
      label: texte_(ph.label, 60) || ('Photo ' + (i + 1))
    });
  });
  if (ancienFormat && c.photos.length < Math.min(unites, MAX_MODELES)) {
    throw new Error('Il faut une photo pour chaque modèle commandé.');
  }
  if (c.photos.length < photosAnnoncees) {
    throw new Error('Une photo ne nous est pas parvenue, réessaie.');
  }
  return c;
}

// ================== GOOGLE SHEET ==================

function getOnglet_(type) {
  var conf = ONGLETS[type];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(conf.nom);
  if (!sh) {
    sh = ss.insertSheet(conf.nom);
    preparerOnglet_(sh, conf);
  }
  return sh;
}

function ecrireLigne_(c, liens, statut) {
  var conf = ONGLETS[c.type];
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = getOnglet_(c.type);
    var tel = "'" + c.telephone;   // l'apostrophe garde le + et le 0
    var total = (c.devis && !c.total) ? 'devis' : c.total;
    var ligne;
    if (c.type === 'livraison') {
      ligne = [new Date(), c.prenom, c.nom, tel, c.email, c.adresse, "'" + c.cp, c.ville,
               c.resume, total, c.precisions, '', false, c.delai, joursRestants_(c.delai, '', conf.marge), '', statut];
    } else {
      ligne = [new Date(), c.prenom, tel, c.resume, total, '', false, '', '', '', statut];
    }
    sh.appendRow(ligne);
    var r = sh.getLastRow();
    sh.getRange(r, conf.col.repondu).insertCheckboxes();
    if (liens.length) {
      sh.getRange(r, conf.col.photos).setRichTextValue(lienPhotos_(liens, c.photos));
    }
  } finally {
    lock.releaseLock();
  }
}

/** "13x18 · Porte-clé n°1 · Porte-clé n°2" avec un lien cliquable vers chaque photo. */
function lienPhotos_(liens, photos) {
  var morceaux = liens.map(function (u, i) {
    return (photos && photos[i] && photos[i].label) || ('Photo ' + (i + 1));
  });
  var texte = morceaux.join(' · ');
  var b = SpreadsheetApp.newRichTextValue().setText(texte);
  var pos = 0;
  morceaux.forEach(function (m, i) {
    if (liens[i]) b.setLinkUrl(pos, pos + m.length, liens[i]);
    pos += m.length + 3;
  });
  return b.build();
}

// ---------- Jours restants ----------

function aujourdhui_() {
  var d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

/** Nombre de jours avant la date limite (délai − marge). Vide si pas de délai ou commande réalisée. */
function joursRestants_(delai, realise, marge) {
  if (!(delai instanceof Date) || realise !== '' && realise != null) return '';
  var d = new Date(delai); d.setHours(0, 0, 0, 0);
  return Math.round((d - aujourdhui_()) / 86400000) - (marge || 0);
}

/** Recalcule la colonne "Jours restants" d'un onglet (toutes les lignes ou seulement certaines). */
function majJoursOnglet_(sh, conf, premiere, nombre) {
  var last = sh.getLastRow();
  if (last < 2) return;
  premiere = Math.max(2, premiere || 2);
  nombre = Math.min(nombre || (last - 1), last - premiere + 1);
  if (nombre < 1) return;
  var delais = sh.getRange(premiere, conf.col.delai, nombre, 1).getValues();
  var realises = sh.getRange(premiere, conf.col.realise, nombre, 1).getValues();
  var jours = delais.map(function (v, i) { return [joursRestants_(v[0], realises[i][0], conf.marge)]; });
  sh.getRange(premiere, conf.col.jours, nombre, 1).setValues(jours);
}

/** Lancée chaque nuit : met à jour les jours restants de toutes les commandes. */
function majJours() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(ONGLETS).forEach(function (type) {
    var sh = ss.getSheetByName(ONGLETS[type].nom);
    if (sh) majJoursOnglet_(sh, ONGLETS[type]);
  });
}

/** Automatique : quand tu modifies une date de Délai ou de Réalisé, les jours restants se recalculent. */
function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  Object.keys(ONGLETS).forEach(function (type) {
    var conf = ONGLETS[type];
    if (sh.getName() !== conf.nom) return;
    var c1 = e.range.getColumn(), c2 = e.range.getLastColumn();
    var touche = function (col) { return col >= c1 && col <= c2; };
    if (touche(conf.col.delai) || touche(conf.col.realise)) {
      majJoursOnglet_(sh, conf, e.range.getRow(), e.range.getNumRows());
    }
  });
}

// ---------- Mise en forme ----------

function preparerOnglet_(sh, conf) {
  var n = conf.entetes.length;
  migrerColonnes_(sh, conf);
  sh.getRange(1, 1, 1, n).setValues([conf.entetes]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, n)
    .setFontWeight('bold')
    .setBackground('#1b140d')
    .setFontColor('#ecdfc4')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sh.getRange(1, conf.col.jours).setNote(conf.noteJours);
  conf.largeurs.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  var max = sh.getMaxRows();
  sh.getRange(2, 1, max - 1, n).setVerticalAlignment('middle');
  sh.getRange(2, conf.col.date, max - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sh.getRange(2, conf.col.total, max - 1, 1).setNumberFormat('0 "€"');
  sh.getRange(2, conf.col.commande, max - 1, 1).setWrap(true);
  sh.getRange(2, conf.col.jours, max - 1, 1).setNumberFormat('0" j"').setHorizontalAlignment('center').setFontWeight('bold');

  // Délai et Réalisé : format date + calendrier quand on double-clique
  var regleDate = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .setHelpText('Double-clique pour choisir une date')
    .build();
  [conf.col.delai, conf.col.realise].forEach(function (col) {
    var plage = sh.getRange(2, col, max - 1, 1);
    plage.setNumberFormat('dd/mm/yyyy');
    plage.setDataValidation(regleDate);
    plage.setHorizontalAlignment('center');
  });
  sh.getRange(2, conf.col.repondu, max - 1, 1).setHorizontalAlignment('center');

  appliquerCouleurs_(sh, conf);
  majJoursOnglet_(sh, conf);
}

/** Ajoute la colonne "Jours restants" (après "Délai") dans un onglet créé par l'ancienne version. */
function migrerColonnes_(sh, conf) {
  if (sh.getLastRow() === 0) return;
  var largeur = Math.max(sh.getLastColumn(), 1);
  var entetes = sh.getRange(1, 1, 1, largeur).getValues()[0];
  if (entetes[conf.col.delai - 1] === 'Délai' && entetes[conf.col.jours - 1] !== 'Jours restants') {
    sh.insertColumnAfter(conf.col.delai);
    sh.getRange(2, conf.col.jours, sh.getMaxRows() - 1, 1).clearDataValidations().clearFormat();
  }
}

/** Couleurs (Livraison) : gris = réalisé, rouge = moins de 4 j, orange = 4 à 7 j, vert = plus de 7 j. */
function appliquerCouleurs_(sh, conf) {
  if (!conf.couleurs) {            // Festival : aucune couleur (on retire celles de l'ancienne version)
    sh.setConditionalFormatRules([]);
    return;
  }
  var plage = sh.getRange(2, 1, sh.getMaxRows() - 1, conf.entetes.length);
  var J = '$' + lettre_(conf.col.jours) + '2';
  var R = '$' + lettre_(conf.col.realise) + '2';
  // Formules sans virgule ni point-virgule pour fonctionner quelle que soit la langue de la Sheet
  var enCours = '(LEN(' + R + ')=0)*ISNUMBER(' + J + ')';
  var regles = [
    { f: '=LEN(' + R + ')>0', fond: '#e6e6e6', texte: '#777777' },
    { f: '=' + enCours + '*(' + J + '<' + SEUIL_ROUGE + ')>0', fond: '#f4c7c3', texte: '#a50e0e' },
    { f: '=' + enCours + '*(' + J + '>=' + SEUIL_ROUGE + ')*(' + J + '<=' + SEUIL_VERT + ')>0', fond: '#fce8b2', texte: null },
    { f: '=' + enCours + '*(' + J + '>' + SEUIL_VERT + ')>0', fond: '#d9ead3', texte: null }
  ].map(function (r) {
    var b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(r.f).setBackground(r.fond).setRanges([plage]);
    if (r.texte) b.setFontColor(r.texte);
    return b.build();
  });
  sh.setConditionalFormatRules(regles);   // remplace les anciennes règles de couleur de cet onglet
}

function lettre_(n) {
  var s = '';
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ================== RÉCAPITULATIF PAR E-MAIL ==================

/** Lancée chaque matin : envoie toutes les commandes en cours (non réalisées), les plus urgentes en premier. */
function alerteDelais() {
  majJours();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone();
  var lignes = [];

  Object.keys(ONGLETS).forEach(function (type) {
    var conf = ONGLETS[type];
    var sh = ss.getSheetByName(conf.nom);
    if (!sh || sh.getLastRow() < 2) return;
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, conf.entetes.length).getValues();
    vals.forEach(function (v, i) {
      if (!v[conf.col.prenom - 1] && !v[conf.col.commande - 1]) return;   // ligne vide
      if (v[conf.col.realise - 1] !== '') return;                          // déjà réalisée
      var jours = v[conf.col.jours - 1];
      var delai = v[conf.col.delai - 1];
      var couleur, etat;
      if (typeof jours !== 'number') { couleur = '#ffffff'; etat = 'sans délai'; }
      else if (!conf.couleurs) { couleur = '#ffffff'; etat = jours < 0 ? 'en retard (' + jours + ' j)' : jours + ' j'; }
      else if (jours < SEUIL_ROUGE) { couleur = '#f4c7c3'; etat = jours < 0 ? 'EN RETARD (' + jours + ' j)' : jours + ' j'; }
      else if (jours <= SEUIL_VERT) { couleur = '#fce8b2'; etat = jours + ' j'; }
      else { couleur = '#d9ead3'; etat = jours + ' j'; }
      var client = v[conf.col.prenom - 1] + (conf.col.nom ? ' ' + v[conf.col.nom - 1] : '');
      var td = '<td style="padding:5px 8px;border:1px solid #ccc;vertical-align:top">';
      lignes.push({
        tri: typeof jours === 'number' ? jours : 9999,
        rouge: conf.couleurs && typeof jours === 'number' && jours < SEUIL_ROUGE,
        html: '<tr style="background:' + couleur + '">' +
              td + '<b>' + etat + '</b></td>' +
              td + conf.nom + '<br><small>ligne ' + (i + 2) + '</small></td>' +
              td + echapper_(client) + '</td>' +
              td + echapper_(v[conf.col.commande - 1]).replace(/\n/g, '<br>') + '</td>' +
              td + (delai instanceof Date ? Utilities.formatDate(delai, tz, 'dd/MM/yyyy') : '') + '</td>' +
              td + (v[conf.col.repondu - 1] === true ? 'oui' : '<b>non</b>') + '</td></tr>'
      });
    });
  });

  if (!lignes.length) return;   // rien en cours : pas d'e-mail
  lignes.sort(function (a, b) { return a.tri - b.tri; });
  var urgentes = lignes.filter(function (l) { return l.rouge; }).length;
  var html = '<p>Bonjour Arno,</p>' +
    '<p>Voici tes <b>' + lignes.length + ' commande(s) en cours</b>, les plus urgentes en premier.<br>' +
    '<small>Jours restants = jours avant la date limite (pour les livraisons : délai du client − ' + MARGE_ENVOI + ' jours d\'envoi).</small></p>' +
    '<table style="border-collapse:collapse;font-family:Arial;font-size:13px">' +
    '<tr style="background:#1b140d;color:#ecdfc4"><th style="padding:6px 8px">Jours restants</th><th>Onglet</th><th>Client</th>' +
    '<th>Commande</th><th>Délai client</th><th>Répondu</th></tr>' +
    lignes.map(function (l) { return l.html; }).join('') + '</table>' +
    '<p>Livraisons : 🟥 moins de ' + SEUIL_ROUGE + ' j · 🟧 ' + SEUIL_ROUGE + ' à ' + SEUIL_VERT + ' j · 🟩 plus de ' + SEUIL_VERT + ' j</p>' +
    '<p><a href="' + ss.getUrl() + '">Ouvrir le suivi des commandes</a></p>' +
    '<p style="color:#888">Une commande sort de cette liste dès que la case « Réalisé » est remplie.</p>';
  MailApp.sendEmail({
    to: ALERT_EMAIL,
    subject: (urgentes ? '🟥 ' : '') + 'CELARNO28 – ' + lignes.length + ' commande(s) en cours' +
             (urgentes ? ' dont ' + urgentes + ' urgente(s)' : ''),
    htmlBody: html
  });
}

function echapper_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
  });
}

// ================== INSTALLATION ==================

/** À relancer après chaque mise à jour du code : prépare les onglets, les couleurs et les rappels. */
function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(ONGLETS).forEach(function (type) {
    var conf = ONGLETS[type];
    var sh = ss.getSheetByName(conf.nom) || ss.insertSheet(conf.nom);
    preparerOnglet_(sh, conf);
  });

  // Rappels automatiques (on supprime les anciens pour éviter les doublons)
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'alerteDelais' || f === 'majJours') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('majJours').timeBased().everyDays(1).atHour(1).create();      // vers 1 h : jours restants
  ScriptApp.newTrigger('alerteDelais').timeBased().everyDays(1).atHour(8).create();  // vers 8 h : e-mail

  Logger.log('Installation terminée : colonnes "Jours restants" et couleurs prêtes, ' +
             'mise à jour chaque nuit et e-mail chaque matin vers 8 h. ' +
             'E-mails restants aujourd\'hui : ' + MailApp.getRemainingDailyQuota());
}

/** Pour tester l'e-mail tout de suite : choisir "envoyerRecapMaintenant" puis Exécuter. */
function envoyerRecapMaintenant() {
  alerteDelais();
}

// ================== GOOGLE PHOTOS ==================

function getOrCreateAlbumId_(title) {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('ALBUM_ID');
  if (cached) return cached;

  var token = ScriptApp.getOAuthToken();
  var listResp = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  var listJson = JSON.parse(listResp.getContentText() || '{}');
  if (listJson.albums) {
    for (var i = 0; i < listJson.albums.length; i++) {
      if (listJson.albums[i].title === title) {
        props.setProperty('ALBUM_ID', listJson.albums[i].id);
        return listJson.albums[i].id;
      }
    }
  }
  var createResp = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/albums', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ album: { title: title } }),
    muteHttpExceptions: true
  });
  var createJson = JSON.parse(createResp.getContentText() || '{}');
  if (createJson.id) {
    props.setProperty('ALBUM_ID', createJson.id);
    return createJson.id;
  }
  return null; // la photo ira quand même dans la bibliothèque
}

/** Envoie plusieurs photos ({blob, label}) et renvoie la liste de leurs liens Google Photos. */
function uploadToGooglePhotos_(photos, albumId, description) {
  var token = ScriptApp.getOAuthToken();
  var nouveaux = photos.map(function (ph) {
    var blob = ph.blob;
    var up = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/uploads', {
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-type': 'application/octet-stream',
        'X-Goog-Upload-Content-Type': blob.getContentType(),
        'X-Goog-Upload-Protocol': 'raw'
      },
      payload: blob.getBytes(),
      muteHttpExceptions: true
    });
    if (up.getResponseCode() !== 200) {
      throw new Error('envoi refusé par Google Photos : ' + up.getContentText().substring(0, 200));
    }
    return {
      description: ((ph.label ? ph.label + ' - ' : '') + (description || '')).substring(0, 900),
      simpleMediaItem: { uploadToken: up.getContentText(), fileName: blob.getName() }
    };
  });

  var body = { newMediaItems: nouveaux };
  if (albumId) body.albumId = albumId;
  var resp = UrlFetchApp.fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var json = JSON.parse(resp.getContentText() || '{}');
  var res = json.newMediaItemResults || [];
  if (!res.length) throw new Error('création impossible : ' + resp.getContentText().substring(0, 200));
  return res.map(function (r) {
    return (r.mediaItem && r.mediaItem.productUrl) || '';
  });
}