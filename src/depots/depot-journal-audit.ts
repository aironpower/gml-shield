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

export interface TraceAuditLue {
  id: string;
  email: string | null;
  action: string;
  ip_address: string | null;
  http_status: number | null;
  timestamp: Date;
}

/** Dernières traces, la plus récente en premier, avec l'e-mail de l'auteur s'il est connu. */
export async function listerDernieresTraces(nombreMaximal: number): Promise<TraceAuditLue[]> {
  const resultat = await poolConnexions.query<TraceAuditLue>(
    `SELECT a.id, u.email, a.action, a.ip_address, a.http_status, a.timestamp
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC LIMIT $1`,
    [nombreMaximal],
  );
  return resultat.rows;
}
