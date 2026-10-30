/* Read-only database backup outside Git; no reset or restore. */
import { writeFileSync } from 'node:fs';
import { backupLocalDatabase } from '../../../../scripts/backup-local-database.mjs';
const result=await backupLocalDatabase();
const safe=Object.fromEntries(Object.entries(result).filter(([key])=>key!=='file'));
writeFileSync(new URL('backup-proof.json',import.meta.url),JSON.stringify({...safe,privateLocation:'LOCALAPPDATA/home-care-assistant/backups',scope:'TOC and SHA verified; no restore; Storage bytes excluded'},null,2)+'\n');
console.log({bytes:result.bytes,sha256:result.sha256,archiveListVerified:result.archiveListVerified});
