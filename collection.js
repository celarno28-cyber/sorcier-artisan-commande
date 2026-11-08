// =====================================================================
//  LE GRIMOIRE DU MOMENT — collection en cours
//  Pour changer de collection (Saint-Valentin, fête des mères…), on modifie
//  seulement ce fichier + les images. Les prix doivent aussi être ajoutés
//  dans Code.gs (CATALOGUE), sinon le script refuse la commande.
// =====================================================================
var COLLECTION = {
  nom: 'Boules de Noël',                                   // titre court (bouton de la page de choix)
  emoji: '🎄',
  sousTitre: 'Boules de Noël en bois gravées à ton prénom',
  unite: 'boule', unites: 'boules', article: 'une',        // « une boule » / « un cœur »
  prixUne: 6,                                              // prix d'une pièce
  prixDeux: 10,                                            // prix de 2 pièces (mettre 0 s'il n'y a pas de tarif par 2)
  maxCaracteres: 12,                                       // longueur max du texte gravé
  champ: 'prénom', exemple: 'Léa',                         // ce que le client écrit sur chaque pièce
  dateLimite: '2026-12-19',                                // dernier jour de commande (inclus)
  messageFin: 'Les commandes de boules de Noël sont closes pour cette année. Merci à toutes et à tous !',
  // x, y = centre de la zone où s'affiche le texte (en % de l'image) ; l = largeur utile (%)
  modeles: [
    { id: 'bouleCerfSapin', nom: 'Cerf & sapin', img: 'boule-cerf-sapin.jpg', vierge: 'boule-cerf-sapin-vierge.jpg', x: 48.3, y: 57.7, l: 62 },
    { id: 'bouleFlocons',   nom: 'Flocons',      img: 'boule-flocons.jpg',    vierge: 'boule-flocons-vierge.jpg',    x: 54.2, y: 60.0, l: 66 },
    { id: 'bouleTeteCerf',  nom: 'Tête de cerf', img: 'boule-tete-cerf.jpg',  vierge: 'boule-tete-cerf-vierge.jpg',  x: 50.0, y: 58.0, l: 64 },
    { id: 'bouleHoux',      nom: 'Houx',         img: 'boule-houx.jpg',       vierge: 'boule-houx-vierge.jpg',       x: 48.8, y: 56.3, l: 64 }
  ]
};

// Outils communs (ne pas modifier)
COLLECTION.finCommandes = function () {
  var p = COLLECTION.dateLimite.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 23, 59, 59);
};
COLLECTION.ouverte = function () { return new Date() <= COLLECTION.finCommandes(); };
COLLECTION.dateTexte = function () {
  var p = COLLECTION.dateLimite.split('-');
  var mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return Number(p[2]) + ' ' + mois[Number(p[1]) - 1];
};
COLLECTION.prix = function (n) {
  return COLLECTION.prixDeux ? Math.floor(n / 2) * COLLECTION.prixDeux + (n % 2) * COLLECTION.prixUne : n * COLLECTION.prixUne;
};
