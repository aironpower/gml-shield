import { createServer } from 'node:http';
import { environnement } from './configuration/environnement.js';
import { creerApplication } from './http/application.js';
import { journalApplicatif } from './infrastructure/journal-applicatif.js';
import { brancherServeurTempsReel } from './temps-reel/serveur-temps-reel.js';

const serveurHttp = createServer(creerApplication());
brancherServeurTempsReel(serveurHttp, environnement.ORIGINE_AUTORISEE);

serveurHttp.listen(environnement.PORT, () => {
  journalApplicatif.info({ port: environnement.PORT }, 'GML-SHIELD à l’écoute');
});
