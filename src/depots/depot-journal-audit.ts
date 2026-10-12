import { poolConnexions } from '../infrastructure/base-de-donnees/pool-connexions.js';

export interface TraceAudit {
  idUtilisateur: string | undefined;
  action: string;
  adresseIp: string | undefined;
  statutHttp: number;
}

export async function enregistrerTraceAudit(trace: TraceAudit): Promise<void> {
  await poolConnexions.query(
    'INSERT INTO audit_logs (user_id, action, ip_address, http_status) VALUES ($1, $2, $3, $4)',
    [trace.idUtilisateur ?? null, trace.action, trace.adresseIp ?? null, trace.statutHttp],
  );
}
