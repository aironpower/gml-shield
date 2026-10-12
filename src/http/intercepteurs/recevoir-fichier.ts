import multer from 'multer';

export const TAILLE_MAXIMALE_FICHIER_OCTETS = 10 * 1024 * 1024;

/**
 * Reçoit un unique fichier multipart (champ « file ») en mémoire.
 *
 * Pourquoi en mémoire et non sur disque : le fichier n'est écrit nulle part tant que son type
 * réel n'a pas été vérifié ; un fichier refusé ne laisse aucune trace.
 * Pourquoi ces limites : sans elles, un envoi de plusieurs gigaoctets ou de milliers de champs
 * épuiserait la mémoire du serveur (déni de service).
 */
export const recevoirFichierUnique = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAXIMALE_FICHIER_OCTETS, files: 1, fields: 0 },
}).single('file');
