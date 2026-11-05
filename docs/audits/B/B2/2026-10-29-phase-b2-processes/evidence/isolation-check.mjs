import {writeFileSync} from 'node:fs';
import {getTestEnvironment,sql} from '../../../../scripts/test-environment.mjs';
getTestEnvironment();
const data=JSON.parse(sql(`select jsonb_build_object('cronJobs',(select jsonb_agg(jsonb_build_object('name',jobname,'active',active,'schedule',schedule)) from cron.job),'workerUrlConfigured',exists(select 1 from vault.decrypted_secrets where name='hca_worker_url'),'workerBearerConfigured',exists(select 1 from vault.decrypted_secrets where name='hca_worker_bearer'),'networkQueueCount',(select count(*) from net.http_request_queue));`));
if(data.workerUrlConfigured||data.workerBearerConfigured)throw new Error('Local DB has a configured external worker;review isolation before further mutations');
const record={recordedAt:new Date().toISOString(),project:'home-care-assistant',externalApplicationSending:false,metaFlows:false,...data,limits:'No decrypted value exported;read-only presence check. Internal delivery is performed by local SQL cron. No cron/Vault configuration changed.'};
writeFileSync(new URL('isolation-check.json',import.meta.url),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
