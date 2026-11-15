// =====================================================================
//  ASSOCIATIONS PARTENAIRES DU GRIMOIRE
//  Une association s'affiche sur la page du grimoire quand sa collection est ouverte
//  et jusqu'à sa date limite. Lien direct pour l'association :
//    https://celarno28-cyber.github.io/sorcier-artisan-commande/grimoire.html?asso=<id>
//  ⚠ L'adresse e-mail de l'association et les montants reversés sont aussi dans Code.gs
//    (ASSOCIATIONS) : c'est le script qui fait foi.
// =====================================================================
var ASSOCIATIONS = [
  {
    id: 'bouge-nos-ecoles',
    nom: 'Bouge nos écoles',
    description: "Association des parents d'élèves",
    emoji: '🏫',
    collection: 'Boules de Noël',          // nom de la collection du grimoire concernée (collection.js)
    reverseUne: 3,                         // reversé pour 1 pièce
    reverseDeux: 5,                        // reversé pour un lot de 2
    dateLimite: '2026-12-16',              // dernier jour de commande (inclus)
    paiement: 'https://www.helloasso.com/associations/bouge-nos-ecoles/boutiques/vente-de-boule-de-noel', // règlement obligatoire sur HelloAsso
    // Modes de livraison proposés aux familles. « jusquau » : dernier jour où le choix est proposé.
    livraisons: [
      { id: 'marche', texte: 'Retrait au marché de Noël, samedi 5 décembre, à la salle des fêtes de Bazoches-en-Dunois (commande réglée avant le 4 décembre)', date: '2026-12-05', jusquau: '2026-12-03' },
      { id: 'ecole',  texte: 'Retrait au périscolaire les 17 et 18 décembre, en venant chercher vos enfants', date: '2026-12-17' }
    ]
  }
];

// ===================== Outils (ne pas modifier) =====================
(function () {
  function fin(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59); }
  var MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  ASSOCIATIONS.forEach(function (a) {
    a.ouverte = function () { return new Date() <= fin(a.dateLimite); };
    a.dateTexte = function () { var p = a.dateLimite.split('-'); return +p[2] + ' ' + MOIS[+p[1] - 1]; };
    a.reverse = function (n) { return a.reverseDeux ? Math.floor(n / 2) * a.reverseDeux + (n % 2) * a.reverseUne : n * a.reverseUne; };
    a.livraisonsDispo = function () {
      return a.livraisons.filter(function (l) { return !l.jusquau || new Date() <= fin(l.jusquau); });
    };
  });
  window.associationsActives = function (collection) {
    return ASSOCIATIONS.filter(function (a) { return a.collection === collection.nom && collection.ouverte() && a.ouverte(); });
  };
})();
