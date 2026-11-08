// =====================================================================
//  LE GRIMOIRE DU MOMENT — PLANNING DES COLLECTIONS
//  La page choisit toute seule la collection dont les dates encadrent le jour.
//  Une collection sans modèles (modeles: []) n'ouvre pas : la page annonce « bientôt ».
//  Les prix et les modèles doivent aussi être dans Code.gs (CATALOGUE + PLANNING_GRIMOIRE).
//  debut = premier jour de commande · dateLimite = dernier jour de commande (inclus)
// =====================================================================
var PLANNING = [
  {
    nom: 'Boules de Noël', emoji: '🎄', debut: '2026-11-07', dateLimite: '2026-12-19',
    sousTitre: 'Boules de Noël en bois gravées à ton prénom',
    unite: 'boule', unites: 'boules', article: 'une',
    prixUne: 6, prixDeux: 10, maxCaracteres: 12, champ: 'prénom', exemple: 'Léa',
    // x, y = centre de la zone du texte (% de l'image) ; l = largeur utile (%)
    modeles: [
      { id: 'bouleCerfSapin', nom: 'Cerf & sapin', img: 'boule-cerf-sapin.jpg', vierge: 'boule-cerf-sapin-vierge.jpg', x: 48.3, y: 57.7, l: 62 },
      { id: 'bouleFlocons',   nom: 'Flocons',      img: 'boule-flocons.jpg',    vierge: 'boule-flocons-vierge.jpg',    x: 54.2, y: 60.0, l: 66 },
      { id: 'bouleTeteCerf',  nom: 'Tête de cerf', img: 'boule-tete-cerf.jpg',  vierge: 'boule-tete-cerf-vierge.jpg',  x: 50.0, y: 58.0, l: 64 },
      { id: 'bouleHoux',      nom: 'Houx',         img: 'boule-houx.jpg',       vierge: 'boule-houx-vierge.jpg',       x: 48.8, y: 56.3, l: 64 }
    ]
  },
  { nom: 'Saint-Valentin',        emoji: '❤️', debut: '2027-01-04', dateLimite: '2027-02-07', modeles: [] },
  { nom: 'Fête des grands-mères', emoji: '🌷', debut: '2027-02-08', dateLimite: '2027-02-28', modeles: [] },
  { nom: 'Fête des mères',        emoji: '💐', debut: '2027-04-26', dateLimite: '2027-05-23', modeles: [] },
  { nom: 'Fête des pères',        emoji: '👔', debut: '2027-05-24', dateLimite: '2027-06-13', modeles: [] },
  { nom: 'Cadeaux de maîtresse',  emoji: '🍎', debut: '2027-06-14', dateLimite: '2027-06-27', modeles: [] },
  {
    nom: 'Boules de Noël', emoji: '🎄', debut: '2027-11-02', dateLimite: '2027-12-19',
    reprendre: 0   // reprend les réglages et modèles de la 1re collection (Noël 2026)
  }
];

// ===================== Outils (ne pas modifier) =====================
(function () {
  var MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var DEFAUT = { sousTitre: '', unite: 'pièce', unites: 'pièces', article: 'une', prixUne: 0, prixDeux: 0,
                 maxCaracteres: 12, champ: 'prénom', exemple: 'Léa', modeles: [] };
  function jour(s, fin) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], fin ? 23 : 0, fin ? 59 : 0, fin ? 59 : 0); }
  function texteDate(s) { var p = s.split('-'); return +p[2] + ' ' + MOIS[+p[1] - 1]; }
  PLANNING.forEach(function (c) {
    if (typeof c.reprendre === 'number') {
      var src = PLANNING[c.reprendre];
      for (var k in src) if (!(k in c)) c[k] = src[k];
    }
    for (var d in DEFAUT) if (!(d in c)) c[d] = DEFAUT[d];
    if (!c.sousTitre) c.sousTitre = c.nom + ' : créations en bois gravées à ton prénom';
    c.finCommandes = function () { return jour(c.dateLimite, true); };
    c.dateTexte = function () { return texteDate(c.dateLimite); };
    c.debutTexte = function () { return texteDate(c.debut); };
    c.prix = function (n) { return c.prixDeux ? Math.floor(n / 2) * c.prixDeux + (n % 2) * c.prixUne : n * c.prixUne; };
  });
  var now = new Date();
  var enCours = PLANNING.filter(function (c) { return now >= jour(c.debut) && now <= jour(c.dateLimite, true); })[0];
  var prochaine = PLANNING.filter(function (c) { return jour(c.debut) > now; })
                          .sort(function (a, b) { return jour(a.debut) - jour(b.debut); })[0];
  var passees = PLANNING.filter(function (c) { return jour(c.dateLimite, true) < now; });
  var derniere = passees[passees.length - 1];

  // COLLECTION = collection affichée : en cours si elle a des modèles, sinon la précédente / suivante pour les textes
  var ouverte = !!(enCours && enCours.modeles.length);
  window.COLLECTION = enCours || derniere || prochaine || PLANNING[0];
  COLLECTION.ouverte = function () { return ouverte; };
  COLLECTION.prochaine = prochaine || null;
  COLLECTION.messageFerme = function () {
    var t;
    if (enCours && !ouverte) t = 'La collection « ' + enCours.nom + ' » ' + enCours.emoji + ' arrive très bientôt dans le grimoire !';
    else t = (derniere ? 'Les commandes « ' + derniere.nom + ' » ' + derniere.emoji + ' sont terminées. Merci à toutes et à tous !' : '');
    if (!(enCours && !ouverte) && prochaine) t += '<br>Prochaine collection : <b>' + prochaine.nom + ' ' + prochaine.emoji +
      '</b>, à partir du ' + prochaine.debutTexte() + '.';
    return t;
  };
  COLLECTION.texteBouton = function () {
    if (ouverte) return COLLECTION.sousTitre + ' · jusqu\'au ' + COLLECTION.dateTexte();
    if (enCours) return enCours.nom + ' ' + enCours.emoji + ' : bientôt disponible';
    if (prochaine) return 'Prochaine collection : ' + prochaine.nom + ' ' + prochaine.emoji + ', dès le ' + prochaine.debutTexte();
    return 'Nouvelle collection bientôt…';
  };
})();
