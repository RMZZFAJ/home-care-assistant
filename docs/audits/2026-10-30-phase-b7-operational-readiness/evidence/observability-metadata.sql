begin read only;
set local statement_timeout = '15s';
select jsonb_build_object(
 'recorded_at',now(),
 'scheduler_health',(select jsonb_build_object('last_run',last_run,'processed',processed,'age_seconds',extract(epoch from now()-last_run)) from private.scheduler_health where singleton),
 'bal_progress',(select jsonb_build_object('cursor_present',last_patient is not null,'updated_at',updated_at) from private.bal_scheduler_progress where singleton),
 'jobs',(select jsonb_agg(x order by jobid) from(select j.jobid,j.jobname,j.schedule,j.active,md5(j.command) command_md5,(select max(end_time) from cron.job_run_details d where d.jobid=j.jobid and d.status='succeeded') last_success,(select max(end_time) from cron.job_run_details d where d.jobid=j.jobid and d.status='failed') last_failure,(select count(*) from cron.job_run_details d where d.jobid=j.jobid and d.start_time>now()-interval '24 hours' and d.status='succeeded') successes_24h,(select count(*) from cron.job_run_details d where d.jobid=j.jobid and d.start_time>now()-interval '24 hours' and d.status='failed') failures_24h from cron.job j)x),
 'worker_secret_names',jsonb_build_object('url_present',exists(select 1 from vault.secrets where name='hca_worker_url'),'bearer_present',exists(select 1 from vault.secrets where name='hca_worker_bearer')),
 'http_queue_count',(select count(*) from net.http_request_queue),
 'http_response_metadata',(select coalesce(jsonb_agg(x),'[]') from(select status_code,timed_out,count(*) count,max(created) latest_response_at from net._http_response where created>now()-interval '6 hours' group by status_code,timed_out)x),
 'notifications',(select coalesce(jsonb_agg(x),'[]') from(select channel,state,count(*) count,min(created_at) oldest_created_at,max(attempted_at) latest_attempt_at,max(delivered_at) latest_delivered_at,count(*) filter(where leased_by is not null and lease_expires_at<now()) expired_leases,count(*) filter(where last_error is not null) with_error from public.requisition_notifications group by channel,state order by channel,state)x)
) metadata;
rollback;
