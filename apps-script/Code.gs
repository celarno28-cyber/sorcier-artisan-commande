/**
 * CELARNO28 — Le Sorcier Artisan — Réception des commandes (v9)
 * ==============================================================
 * Les formulaires (festival.html, livraison.html et grimoire.html) sont hébergés sur GitHub Pages.
 * Les commandes du « grimoire du moment » (boules de Noël) arrivent dans l'onglet Livraison.
 * Ce script reçoit chaque commande (doPost) :
 *   1) envoie les photos dans l'album Google Photos "CELARNO28 - Photos reçues"
 *   2) ajoute une ligne dans l'onglet "Festival" ou "Livraison" de la Google Sheet
 *   3) envoie au client un e-mail de confirmation (commandes livraison et boules, qui ont une adresse e-mail)
 *   4) commandes pour une association partenaire (ex. Bouge nos écoles) : e-mail à l'association,
 *      colonnes « Association » et « Reversé » dans l'onglet Livraison, suivi dans l'onglet « Associations »
 *
 * Pour chaque modèle commandé, le client peut joindre une photo et/ou un texte à graver (facultatif).
 * Gravures photo (cadres) : jusqu'à 4 photos par gravure, à réunir sur une seule gravure.
 *
 * Suivi des délais :
 *   - colonne "Jours restants" = jours avant la date limite, en gardant 3 jours de marge pour l'envoi
 *     (livraison : délai souhaité − 3 jours ; festival : délai tel quel)
 *   - couleur de la ligne (onglet Livraison uniquement) : vert = plus de 7 jours, orange = de 4 à 7 jours,
 *     rouge = moins de 4 jours, gris = commande réalisée
 *   - chaque matin vers 8 h, un e-mail avec toutes les commandes en cours
 *     (envoyé même s'il n'y en a aucune : s'il n'arrive pas, c'est que le script a un problème)
 *
 * À FAIRE UNE FOIS (et après chaque mise à jour de ce code) : choisir "installer" en haut puis "Exécuter".
 */

// ================== RÉGLAGES ==================
var ALBUM_TITLE = "CELARNO28 - Photos reçues";
var ALERT_EMAIL = "celarno28@gmail.com";   // adresse qui reçoit le récapitulatif du matin
var MARGE_ENVOI = 3;                        // jours réservés à l'envoi postal (commandes livraison)
var SEUIL_VERT = 7;                         // plus de 7 jours restants = vert
var SEUIL_ROUGE = 4;                        // moins de 4 jours restants = rouge (entre les deux = orange)
var MAX_MODELES = 30;                       // modèles maximum par commande
var MAX_PHOTOS_GRAVURE = 4;                 // photos maximum sur une même gravure photo (cadre), réunies en une seule
var MAX_PHOTOS = 40;                        // photos maximum par commande

// Boules de Noël (grimoire du moment) : prix à l'unité et prix par lot de 2, toutes boules confondues
var BOULE_PRIX_UNE = 6;
var BOULE_PRIX_DEUX = 10;
var BOULE_MAX_CARACTERES = 12;

// Lien du formulaire, utilisé pour le rappel « commande test » du lundi dans l'e-mail du matin
var LIEN_FORMULAIRE = "https://www.celarno28.fr/commande";

// Planning du « grimoire du moment » (mêmes dates que collection.js sur GitHub) :
// l'e-mail du matin rappelle de préparer chaque collection 3 semaines avant, et annonce la dernière semaine.
var PLANNING_GRIMOIRE = [
  { nom: 'Boules de Noël',        debut: '2026-11-07', fin: '2026-12-19' },
  { nom: 'Saint-Valentin',        debut: '2027-01-04', fin: '2027-02-07' },
  { nom: 'Fête des grands-mères', debut: '2027-02-08', fin: '2027-02-28' },
  { nom: 'Fête des mères',        debut: '2027-04-26', fin: '2027-05-23' },
  { nom: 'Fête des pères',        debut: '2027-05-24', fin: '2027-06-13' },
  { nom: 'Cadeaux de maîtresse',  debut: '2027-06-14', fin: '2027-06-27' },
  { nom: 'Boules de Noël',        debut: '2027-11-02', fin: '2027-12-19' }
];
var PREPA_JOURS = 21;     // rappel de préparation à partir de 3 semaines avant le lancement
var FIN_JOURS = 7;        // rappel « dernière semaine » avant la date limite

// Associations partenaires du grimoire (mêmes réglages que associations.js sur GitHub ; ici, c'est le script qui fait foi)
// reverseUne / reverseDeux : somme reversée pour 1 pièce / pour un lot de 2. dateLimite incluse.
var ASSOCIATIONS = {
  'bouge-nos-ecoles': {
    nom: 'Bouge nos écoles',
    email: 'bougenosecoles@gmail.com',
    reverseUne: 3, reverseDeux: 5,
    dateLimite: '2026-12-16',
    paiement: 'https://www.helloasso.com/associations/bouge-nos-ecoles/boutiques/vente-de-boule-de-noel',
    livraisons: {
      marche: { texte: 'Retrait au marché de Noël, samedi 5 décembre, salle des fêtes de Bazoches-en-Dunois (commande réglée avant le 4 décembre)', date: '2026-12-05', jusquau: '2026-12-03' },
      ecole:  { texte: 'Retrait au périscolaire les 17 et 18 décembre, en venant chercher vos enfants', date: '2026-12-17' }
    }
  }
};
var ONGLET_ASSOS = 'Associations';

// E-mail de confirmation envoyé au client
var CONFIRMATION_CLIENT = true;              // false pour ne plus envoyer de confirmation
var NOM_EXPEDITEUR = "Le Sorcier Artisan – CELARNO28";
var TELEPHONE_CONTACT = "06 26 74 42 85";
var LIEN_CONFIDENTIALITE = "https://www.celarno28.fr/confidentialite";

// Produits et prix (le prix null = "sur devis")
var CATALOGUE = {
  p10x10:      { label: "Gravure photo 10x10 cm", prix: 12, multi: true },
  p10x15:      { label: "Gravure photo 10x15 cm", prix: 15, multi: true },
  p13x18:      { label: "Gravure photo 13x18 cm", prix: 20, multi: true },
  formatDivers:{ label: "Gravure photo format sur mesure", prix: null, detail: true, multi: true },
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
              'Commande', 'Total (€)', 'Précisions', 'Photos', 'Répondu', 'Délai', 'Jours restants', 'Réalisé', 'Statut',
              'Association', 'Reversé (€)'],
    largeurs: [130, 100, 110, 120, 190, 220, 90, 130, 360, 80, 220, 170, 80, 100, 90, 100, 160, 140, 90],
    col: { date: 1, prenom: 2, nom: 3, commande: 9, total: 10, photos: 12, repondu: 13, delai: 14, jours: 15, realise: 16, statut: 17,
           asso: 18, reverse: 19 },
    noteJours: 'Jours restants avant d\'EXPÉDIER : délai souhaité par le client − ' + MARGE_ENVOI + ' jours de marge pour l\'envoi.\n' +
               'Vert : plus de 7 j · Orange : 4 à 7 j · Rouge : moins de 4 j · Gris : réalisé.'
  }
};

// ================== WEB APP ==================

function doGet(e) {
  return jsonOut_({ ok: true, service: 'CELARNO28 commandes', version: 8 });
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

  // E-mail de confirmation au client (un échec ici n'annule pas la commande)
  var mailOk = false;
  try {
    mailOk = envoyerConfirmation_(c, statut !== 'OK');
  } catch (err) {
    console.error('Confirmation client non envoyée : ' + err.message);
  }

  // Commande pour une association : on la prévient par e-mail
  var assoMailOk = false;
  if (c.asso) {
    try {
      assoMailOk = envoyerAvisAsso_(c);
    } catch (err) {
      console.error('Avis association non envoyé : ' + err.message);
    }
  }

  // La commande est enregistrée même si une photo a échoué : on prévient le client sans lui faire renvoyer
  return { success: true, total: c.total, devis: c.devis, photoKo: statut !== 'OK', mailOk: mailOk,
           reverse: c.reverse || 0, assoMailOk: assoMailOk };
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
    grimoire: !!d.grimoire,
    prenom: texte_(d.prenom, 80),
    nom: texte_(d.nom, 80),
    telephone: texte_(d.telephone, 30),
    email: texte_(d.email, 120),
    adresse: texte_(d.adresse, 200),
    cp: texte_(d.cp, 15),
    ville: texte_(d.ville, 80),
    precisions: texte_(d.precisions, 1000),
    delai: null,
    asso: null, assoId: '', enfant: '', classe: '', livraisonAsso: null, reverse: 0,
    lignes: [],
    total: 0,
    devis: false,
    photos: []
  };

  if (!c.prenom || !c.telephone) throw new Error('Prénom et téléphone sont obligatoires.');

  // Commande au profit d'une association partenaire
  if (d.asso) {
    var a = ASSOCIATIONS[String(d.asso)];
    if (!a || type !== 'livraison') throw new Error('Association inconnue.');
    if (aujourdhui_() > dateIso_(a.dateLimite)) throw new Error('Les commandes pour ' + a.nom + ' sont closes.');
    var liv = a.livraisons[String(d.livraisonAsso || '')];
    if (!liv) throw new Error('Choisis le mode de livraison.');
    if (liv.jusquau && aujourdhui_() > dateIso_(liv.jusquau)) throw new Error('Ce mode de livraison n\'est plus disponible, choisis-en un autre.');
    c.asso = a; c.assoId = String(d.asso); c.livraisonAsso = liv;
    c.enfant = texte_(d.enfant, 60); c.classe = texte_(d.classe, 30);
    if (!c.enfant || !c.classe) throw new Error("Indique le prénom et la classe de l'enfant.");
    c.adresse = a.nom + ' – ' + liv.texte; c.cp = ''; c.ville = '';
    c.delai = liv.date ? dateIso_(liv.date) : null;
  }

  if (type === 'livraison') {
    if (!c.nom) throw new Error('Le nom est obligatoire.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new Error("L'adresse e-mail n'est pas valide.");
  }
  if (type === 'livraison' && !c.asso) {
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
    if (c.asso && !p.boule) return;   // une commande association ne contient que des pièces du grimoire
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
        var nbPh = Math.floor(Number(u.photos)) || (u.photo ? 1 : 0);
        nbPh = Math.max(0, Math.min(nbPh, p.multi ? MAX_PHOTOS_GRAVURE : 1));
        photosAnnoncees += nbPh;
        var quoi = (nbPh > 1 ? nbPh + ' photos à réunir' : nbPh ? 'photo' : '') + (nbPh && t ? ' + ' : '') + (t ? (p.boule ? '« ' + t + ' »' : 'texte « ' + t + ' »') : '');
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
  if (c.asso) {
    if (!nbBoules) throw new Error('Choisis au moins une boule.');
    c.reverse = Math.floor(nbBoules / 2) * c.asso.reverseDeux + (nbBoules % 2) * c.asso.reverseUne;
    c.lignes.push('🏫 ' + c.asso.nom + ' : ' + c.reverse + ' € reversés · enfant : ' + c.enfant + ' (' + c.classe + ')' +
                  ' · ' + c.livraisonAsso.texte);
  }
  if (unites > MAX_MODELES) throw new Error(MAX_MODELES + ' modèles maximum par commande.');
  c.resume = c.lignes.join('\n');

  // Photos, chacune avec son étiquette (ex. "13x18", "Porte-clé n°2", "13x18 n°1 – photo 2/3")
  var photos = Array.isArray(d.photos) ? d.photos.slice(0, MAX_PHOTOS) : [];
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

// ================== CONFIRMATION CLIENT ==================

/** Envoie au client le récapitulatif de sa commande. Renvoie true si l'e-mail est parti. */
function envoyerConfirmation_(c, photoKo) {
  if (!CONFIRMATION_CLIENT) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '')) return false;   // pas d'e-mail (ex. festival)
  if (MailApp.getRemainingDailyQuota() < 5) return false;               // on garde de quoi envoyer le récap du matin

  var tz = Session.getScriptTimeZone();
  var bleu = '#8a6a2f';
  var lignes = c.lignes.map(function (l) {
    l = l.replace(/ → à préciser$/, '');            // rien à afficher au client pour un modèle sans photo ni texte
    return '<li style="margin:4px 0">' + echapper_(l).replace(/ → /, '<br><span style="color:#555">→ ') +
           (l.indexOf(' → ') >= 0 ? '</span>' : '') + '</li>';
  }).join('');
  var total = c.total ? c.total + ' €' : '';
  if (c.devis) total += (total ? ' + ' : '') + 'partie sur devis (je te recontacte avec un prix)';
  var objet = c.grimoire ? 'Ta commande de boules de Noël 🎄 – Le Sorcier Artisan'
                         : 'Ta commande est bien reçue – Le Sorcier Artisan';

  var html =
    '<div style="font-family:Georgia,serif;font-size:15px;color:#2a1f14;max-width:560px">' +
    '<p>Bonjour ' + echapper_(c.prenom) + ',</p>' +
    '<p>Merci pour ta commande ! Je l\'ai bien reçue et je te recontacte rapidement pour la valider avec toi.</p>' +
    '<h3 style="color:' + bleu + ';margin:18px 0 6px">Ta commande</h3>' +
    '<ul style="padding-left:18px;margin:0">' + lignes + '</ul>' +
    (total ? '<p style="font-size:17px"><b>Total : ' + echapper_(total) + '</b>' +
             (c.type === 'livraison' && !c.asso ? ' <span style="color:#555">(frais d\'envoi compris)</span>' : '') + '</p>' : '') +
    (c.asso ? '<p style="font-size:16px">🏫 Dont <b>' + c.reverse + ' €</b> reversés à <b>' + echapper_(c.asso.nom) + '</b>. Merci pour l\'école !</p>' : '') +
    (c.asso && c.asso.paiement
      ? '<p style="font-size:16px;color:#a50e0e"><b>⚠️ Dernière étape obligatoire :</b> règle ta commande sur HelloAsso, sinon elle ne pourra pas être réalisée.</p>' +
        '<p><a href="' + c.asso.paiement + '" style="display:inline-block;padding:10px 18px;background:#c9974b;color:#1a120b;border-radius:6px;text-decoration:none;font-weight:bold">Payer ma commande sur HelloAsso</a></p>'
      : '') +
    (c.photos.length ? '<p>📷 ' + c.photos.length + ' photo' + (c.photos.length > 1 ? 's reçues' : ' reçue') + '.</p>' : '') +
    (photoKo ? '<p style="color:#a50e0e"><b>Attention :</b> une photo n\'a pas pu être enregistrée, je te recontacte pour la récupérer.</p>' : '') +
    (c.asso
      ? '<h3 style="color:' + bleu + ';margin:18px 0 6px">Livraison</h3><p style="margin:0">' + echapper_(c.livraisonAsso.texte) +
        '</p><p>Pour : ' + echapper_(c.enfant) + ' (' + echapper_(c.classe) + ')</p>'
      : '') +
    (c.type === 'livraison' && !c.asso
      ? '<h3 style="color:' + bleu + ';margin:18px 0 6px">Livraison</h3><p style="margin:0">' +
        echapper_(c.prenom + ' ' + c.nom) + '<br>' + echapper_(c.adresse) + '<br>' + echapper_(c.cp + ' ' + c.ville) + '</p>' +
        (c.delai ? '<p>Date souhaitée : <b>' + Utilities.formatDate(c.delai, tz, 'dd/MM/yyyy') + '</b></p>' : '')
      : '') +
    (c.precisions ? '<p>Tes précisions : <i>' + echapper_(c.precisions) + '</i></p>' : '') +
    '<p>Une erreur dans ta commande (prénom, modèle, adresse) ? Réponds simplement à cet e-mail ou appelle-moi au ' +
    TELEPHONE_CONTACT + '.</p>' +
    '<p>À très vite,<br><b>Arno – Le Sorcier Artisan</b><br><span style="color:#555">CELARNO28 · Gravure sur bois · Orgères-en-Beauce</span></p>' +
    '<p style="color:#999;font-size:12px">Tes informations servent uniquement à réaliser ta commande. ' +
    '<a href="' + LIEN_CONFIDENTIALITE + '" style="color:#999">Confidentialité</a></p>' +
    '</div>';

  MailApp.sendEmail({
    to: c.email,
    replyTo: ALERT_EMAIL,
    name: NOM_EXPEDITEUR,
    subject: objet,
    htmlBody: html
  });
  return true;
}

/** Pour voir la confirmation : choisir "testerConfirmation" puis Exécuter (l'e-mail arrive sur ALERT_EMAIL). */
function testerConfirmation() {
  var c = lireCommande_({
    type: 'livraison', grimoire: true, prenom: 'Arno', nom: 'Test', telephone: '0600000000', email: ALERT_EMAIL,
    adresse: '1 rue du Test', cp: '28140', ville: 'Orgères-en-Beauce',
    delai: Utilities.formatDate(new Date(Date.now() + 10 * 86400000), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    items: [{ id: 'bouleFlocons', qty: 2, units: [{ texte: 'Léa' }, { texte: 'Noé' }] },
            { id: 'bouleHoux', qty: 1, units: [{ texte: 'Mamie' }] }],
    photos: []
  });
  envoyerConfirmation_(c, false);
  Logger.log('Confirmation de test envoyée à ' + ALERT_EMAIL);
}

// ================== ASSOCIATIONS PARTENAIRES ==================

/** Prévient l'association qu'une commande est passée pour elle. Renvoie true si l'e-mail est parti. */
function envoyerAvisAsso_(c) {
  if (!c.asso || !c.asso.email) return false;
  if (MailApp.getRemainingDailyQuota() < 5) return false;
  var cumul = cumulAsso_(c.asso.nom);
  var lignes = c.lignes.filter(function (l) { return l.indexOf('🏫') !== 0; }).map(function (l) {
    return '<li style="margin:3px 0">' + echapper_(l) + '</li>';
  }).join('');
  var td = '<td style="padding:4px 10px 4px 0;color:#555">';
  var html =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#2a1f14;max-width:560px">' +
    '<p>Bonjour,</p>' +
    '<p>Une nouvelle commande de boules de Noël vient d\'être passée au profit de <b>' + echapper_(c.asso.nom) + '</b> 🎄</p>' +
    '<table style="border-collapse:collapse">' +
    '<tr>' + td + 'Parent</td><td><b>' + echapper_(c.prenom + ' ' + c.nom) + '</b></td></tr>' +
    '<tr>' + td + 'Téléphone</td><td>' + echapper_(c.telephone) + '</td></tr>' +
    '<tr>' + td + 'E-mail</td><td>' + echapper_(c.email) + '</td></tr>' +
    '<tr>' + td + 'Enfant</td><td><b>' + echapper_(c.enfant) + '</b> (' + echapper_(c.classe) + ')</td></tr>' +
    '<tr>' + td + 'Livraison</td><td>' + echapper_(c.livraisonAsso.texte) + '</td></tr>' +
    '</table>' +
    '<p style="margin-bottom:4px"><b>Commande</b></p><ul style="margin-top:0;padding-left:18px">' + lignes + '</ul>' +
    '<p>Montant de la commande : <b>' + c.total + ' €</b><br>' +
    '🏫 Reversé à l\'association pour cette commande : <b>' + c.reverse + ' €</b>' +
    (cumul ? '<br>Total reversé à ce jour : <b>' + cumul.reverse + ' €</b> pour ' + cumul.commandes + ' commande(s)' : '') + '</p>' +
    (c.precisions ? '<p>Précisions du parent : <i>' + echapper_(c.precisions) + '</i></p>' : '') +
    '<p>Merci pour ce partenariat !<br><b>Arno – Le Sorcier Artisan</b> · ' + TELEPHONE_CONTACT + '</p>' +
    '<p style="color:#999;font-size:12px">Ces informations vous sont transmises avec l\'accord du parent, uniquement pour la distribution de sa commande.</p>' +
    '</div>';
  MailApp.sendEmail({
    to: c.asso.email,
    replyTo: ALERT_EMAIL,
    name: NOM_EXPEDITEUR,
    subject: '🎄 Nouvelle commande pour ' + c.asso.nom + ' – ' + c.prenom + ' ' + c.nom + ' (' + c.enfant + ', ' + c.classe + ')',
    htmlBody: html
  });
  return true;
}

/** Nombre de commandes et total reversé pour une association, lus dans l'onglet Livraison. */
function cumulAsso_(nom) {
  var conf = ONGLETS.livraison;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(conf.nom);
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < conf.col.reverse) return null;
  var n = sh.getLastRow() - 1;
  var assos = sh.getRange(2, conf.col.asso, n, 1).getValues();
  var rev = sh.getRange(2, conf.col.reverse, n, 1).getValues();
  var res = { commandes: 0, reverse: 0 };
  assos.forEach(function (v, i) {
    if (v[0] === nom) { res.commandes++; res.reverse += Number(rev[i][0]) || 0; }
  });
  return res;
}

/** Onglet « Associations » : une ligne par association, calculée par formules sur l'onglet Livraison.
 *  La colonne « Déjà versé » est à remplir à la main (elle est conservée quand on relance installer). */
function preparerOngletAssos_(ss) {
  var conf = ONGLETS.livraison;
  var sh = ss.getSheetByName(ONGLET_ASSOS) || ss.insertSheet(ONGLET_ASSOS);
  var entetes = ['Association', 'E-mail', 'Commandes', 'Ventes (€)', 'À reverser (€)', 'Déjà versé (€)', 'Reste à verser (€)', 'Date limite'];
  sh.getRange(1, 1, 1, entetes.length).setValues([entetes])
    .setFontWeight('bold').setBackground('#1b140d').setFontColor('#ecdfc4').setHorizontalAlignment('center').setWrap(true);
  sh.setFrozenRows(1);
  [180, 220, 100, 100, 120, 120, 140, 110].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  var L = "'" + conf.nom + "'!";
  var colAsso = lettre_(conf.col.asso), colTotal = lettre_(conf.col.total), colRev = lettre_(conf.col.reverse);
  var existants = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (v) { return v[0]; }) : [];
  Object.keys(ASSOCIATIONS).forEach(function (id) {
    var a = ASSOCIATIONS[id];
    var i = existants.indexOf(a.nom);
    var r = i >= 0 ? i + 2 : sh.getLastRow() + 1;
    if (i < 0) { existants.push(a.nom); sh.getRange(r, 6).setValue(0); }
    sh.getRange(r, 1, 1, 2).setValues([[a.nom, a.email]]);
    sh.getRange(r, 3).setFormula('=COUNTIF(' + L + colAsso + ':' + colAsso + ';A' + r + ')');
    sh.getRange(r, 4).setFormula('=SUMIF(' + L + colAsso + ':' + colAsso + ';A' + r + ';' + L + colTotal + ':' + colTotal + ')');
    sh.getRange(r, 5).setFormula('=SUMIF(' + L + colAsso + ':' + colAsso + ';A' + r + ';' + L + colRev + ':' + colRev + ')');
    sh.getRange(r, 7).setFormula('=E' + r + '-F' + r);
    sh.getRange(r, 8).setValue(dateIso_(a.dateLimite)).setNumberFormat('dd/mm/yyyy');
    sh.getRange(r, 6).setBackground('#fff2cc').setNote('À remplir à la main : somme déjà versée à l\'association.');
  });
  var n = Math.max(sh.getLastRow() - 1, 1);
  sh.getRange(2, 4, n, 4).setNumberFormat('0 "€"');
  sh.getRange(2, 3, n, 6).setHorizontalAlignment('center');
}

/** Pour l'e-mail du matin : une ligne par association qui a des commandes. */
function blocAssos_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_ASSOS);
  if (!sh || sh.getLastRow() < 2) return '';
  var out = '';
  sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues().forEach(function (v) {
    if (!v[0] || !(Number(v[2]) > 0)) return;
    out += '<br>🏫 <b>' + echapper_(v[0]) + '</b> : ' + v[2] + ' commande(s), ' + v[3] + ' € de ventes, ' +
           v[4] + ' € à reverser' + (Number(v[5]) ? ' (déjà versé ' + v[5] + ' €, reste <b>' + v[6] + ' €</b>)' : '');
  });
  return out ? '<div style="margin-top:12px;padding:10px 12px;border:1px solid #ccc;border-radius:6px"><b>Associations partenaires</b>' + out + '</div>' : '';
}

/** Pour tester l'e-mail envoyé à l'association : choisir "testerAvisAsso" puis Exécuter (il arrive sur ALERT_EMAIL). */
function testerAvisAsso() {
  var id = Object.keys(ASSOCIATIONS)[0];
  var c = lireCommande_({
    type: 'livraison', grimoire: true, asso: id, livraisonAsso: Object.keys(ASSOCIATIONS[id].livraisons).pop(),
    prenom: 'Arno', nom: 'Test', telephone: '0600000000', email: ALERT_EMAIL, enfant: 'Léa', classe: 'CE1',
    items: [{ id: 'bouleFlocons', qty: 2, units: [{ texte: 'Léa' }, { texte: 'Noé' }] }], photos: []
  });
  var vrai = c.asso.email;
  c.asso = JSON.parse(JSON.stringify(c.asso)); c.asso.email = ALERT_EMAIL;   // le test ne part pas chez l'association
  envoyerAvisAsso_(c);
  Logger.log('Avis de test envoyé à ' + ALERT_EMAIL + ' (en vrai, il part à ' + vrai + ')');
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
               c.resume, total, c.precisions, '', false, c.delai, joursRestants_(c.delai, '', conf.marge), '', statut,
               c.asso ? c.asso.nom : '', c.asso ? c.reverse : ''];
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

/** "2026-12-16" → Date à minuit (heure du script). */
function dateIso_(s) {
  var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]);
}

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
  if (conf.col.reverse) sh.getRange(2, conf.col.reverse, max - 1, 1).setNumberFormat('0 "€"').setHorizontalAlignment('center');
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

/** Rappel de la routine, ajouté en bas de chaque e-mail du matin (+ commande test le lundi,
 *  + ménage de l'album photos le premier lundi de janvier, avril, juillet et octobre). */
function blocRoutine_(tz) {
  var lundi = Utilities.formatDate(new Date(), tz, 'u') === '1';   // 1 = lundi
  var jour = Number(Utilities.formatDate(new Date(), tz, 'd'));
  var mois = Number(Utilities.formatDate(new Date(), tz, 'M'));
  var menage = lundi && jour <= 7 && (mois % 3 === 1);              // 1er lundi du trimestre
  var html = '<div style="margin-top:16px;padding:10px 12px;border:1px solid #c9974b;border-radius:6px;background:#fbf6ea">' +
    '<b>Ta routine du jour</b><br>' +
    '☐ Recontacter les nouveaux clients, puis cocher <b>Répondu</b><br>' +
    '☐ À chaque envoi ou remise, remplir la date dans <b>Réalisé</b>';
  if (lundi) {
    html += '<br><br>🧪 <b>C\'est lundi : fais ta commande test</b> (30 secondes) depuis ton téléphone sur ' +
      '<a href="' + LIEN_FORMULAIRE + '">' + LIEN_FORMULAIRE.replace('https://', '') + '</a>, ' +
      'vérifie qu\'elle arrive dans la Sheet, puis supprime la ligne.';
  }
  html += rappelsGrimoire_(tz);
  if (menage) {
    html += '<br><br>🧹 <b>Ménage du trimestre : pense à vider l\'album photos</b> « ' + ALBUM_TITLE + ' » ' +
      '(<a href="https://photos.google.com/albums">ouvrir Google Photos</a>). Supprime les photos des commandes ' +
      'remises ou envoyées il y a plus de 3 mois, comme promis sur la page confidentialité. ' +
      'Pour libérer vraiment la place, vide aussi la corbeille de Google Photos.';
  }
  return html + '</div>';
}

/** Rappels du planning des collections du grimoire, pour l'e-mail du matin. */
function rappelsGrimoire_(tz) {
  var auj = aujourdhui_();
  function date(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function txt(d) { return Utilities.formatDate(d, tz, 'dd/MM/yyyy'); }
  var out = '';
  PLANNING_GRIMOIRE.forEach(function (c) {
    var avant = Math.round((date(c.debut) - auj) / 86400000);
    var reste = Math.round((date(c.fin) - auj) / 86400000);
    if (avant > 0 && avant <= PREPA_JOURS) {
      out += '<br><br>🗓️ <b>Grimoire : « ' + c.nom + ' » ouvre le ' + txt(date(c.debut)) + '</b> (dans ' + avant + ' j). ' +
        'Prépare tes modèles, fais une photo de chacun avec un prénom gravé, et envoie-les à Claude avec les noms et les prix ' +
        '(il met la page et le script à jour).';
    } else if (avant === 0) {
      out += '<br><br>🚀 <b>« ' + c.nom + ' » ouvre aujourd\'hui dans le grimoire.</b> Vérifie la page et annonce-la sur tes réseaux.';
    } else if (avant < 0 && reste >= 0 && reste <= FIN_JOURS) {
      out += '<br><br>⏳ <b>Dernière ligne droite pour « ' + c.nom + ' »</b> : commandes jusqu\'au ' + txt(date(c.fin)) +
        (reste ? ' (encore ' + reste + ' j)' : ' (dernier jour !)') + '. Pense à le rappeler sur tes réseaux.';
    }
  });
  return out;
}

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

  if (!lignes.length) {
    // Rien en cours : on envoie quand même un petit message, preuve que le script fonctionne
    MailApp.sendEmail({
      to: ALERT_EMAIL,
      subject: '✅ CELARNO28 – aucune commande en cours, tout fonctionne',
      htmlBody: '<p>Bonjour Arno,</p>' +
        '<p>Aucune commande en cours ce matin. Le script de commande fonctionne normalement ✅</p>' +
        '<p><a href="' + ss.getUrl() + '">Ouvrir le suivi des commandes</a></p>' + blocAssos_() + blocRoutine_(tz) +
        '<p style="color:#888">Si un matin tu ne reçois aucun e-mail CELARNO28, le script a un problème : ' +
        'ouvre le lien /exec du formulaire sur ton PC pour vérifier (autorisation à renouveler, etc.).</p>'
    });
    return;
  }
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
    '<p><a href="' + ss.getUrl() + '">Ouvrir le suivi des commandes</a></p>' + blocAssos_() + blocRoutine_(tz) +
    '<p style="color:#888">Une commande sort de cette liste dès que la case « Réalisé » est remplie.<br>' +
    'Ce récap arrive chaque matin, même sans commande : s\'il manque un jour, vérifie le script.</p>';
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

  preparerOngletAssos_(ss);

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