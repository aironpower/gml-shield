import { createServer } from 'node:http';
import { environnement } from './configuration/environnement.js';
import { creerApplication } from './http/application.js';
import { journalApplicatif } from './infrastructure/journal-applicatif.js';

const serveurHttp = createServer(
  creerApplication({ nombreProxysDeConfiance: environnement.NOMBRE_PROXYS_DE_CONFIANCE }),
);

serveurHttp.listen(environnement.PORT, () => {
  journalApplicatif.info({ port: environnement.PORT }, 'GML-SHIELD à l’écoute');
});
