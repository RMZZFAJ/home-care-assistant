import { randomUUID } from "node:crypto";
import { fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

// Controlled schedule setup only; permission assertions use real Auth RPC.
export function currentDeliveryShift(f, person = fixtures.professional.id) {
  const type = randomUUID(),
    series = randomUUID(),
    id = randomUUID();
  sql(`begin;insert into public.shift_types(id,care_recipient_id,name,starts_local,duration_minutes,created_by) values(${sqlLiteral(type)},${sqlLiteral(f.patient)},${sqlLiteral("Escala fictícia P06 " + id)},'00:00',1440,${sqlLiteral(fixtures.adminA.id)});
 insert into public.shift_series(id,care_recipient_id,professional_id,shift_type_id,recurrence,anchor_date,valid_until,status,created_by) values(${sqlLiteral(series)},${sqlLiteral(f.patient)},${sqlLiteral(person)},${sqlLiteral(type)},'once',current_date,current_date+1,'published',${sqlLiteral(fixtures.adminA.id)});
 insert into public.scheduled_shifts(id,care_recipient_id,series_id,professional_id,shift_type_id,starts_at,ends_at,original_starts_at,timezone,status) values(${sqlLiteral(id)},${sqlLiteral(f.patient)},${sqlLiteral(series)},${sqlLiteral(person)},${sqlLiteral(type)},clock_timestamp()-interval '5 minutes',clock_timestamp()+interval '55 minutes',clock_timestamp()-interval '5 minutes','America/Sao_Paulo','published');commit;`);
  return {
    id,
    close: () =>
      sql(
        `update public.scheduled_shifts set status='cancelled' where id=${sqlLiteral(id)};`,
      ),
  };
}
