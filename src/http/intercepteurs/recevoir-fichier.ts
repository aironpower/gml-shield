import multer from 'multer';

export const TAILLE_MAXIMALE_FICHIER_OCTETS = 10 * 1024 * 1024;

/**
 * Reçoit un unique fichier multipart (champ « file ») en mémoire.
 *
 * Pourquoi en mémoire et non sur disque : le fichier n'est écrit nulle part tant que son type
 * réel n'a pas été vérifié ; un fichier refusé ne laisse aucune trace.
 * Pourquoi ces limites : sans elles, un envoi de plusieurs gigaoctets ou de milliers de champs
 * épuiserait la mémoire du serveur (déni de service).
 * Pourquoi 10 Mo (au-dessus du seuil par défaut de Sonar, 8 Mo) : une photo de smartphone en
 * pleine résolution ou un bon de livraison PDF scanné dépasse régulièrement 8 Mo ; le risque est
 * contenu car le fichier n'est reçu qu'après authentification et contrôle du rôle DRIVER.
 */
export const recevoirFichierUnique = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAXIMALE_FICHIER_OCTETS, files: 1, fields: 0 },
}).single('file');
