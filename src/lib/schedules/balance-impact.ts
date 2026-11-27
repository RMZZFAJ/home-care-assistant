import type {
  ScheduleBalanceDecision,
  ScheduleResourceFields,
  ScheduleResourceReference,
} from "./resource-preparations";
import { editedCivilInstant } from "./time";

export function scheduleBalanceReview(fields: ScheduleResourceFields, reference: ScheduleResourceReference | null, now = Date.now()) {
  const workspace = reference?.workspace;
  if (!workspace || fields.form === "type") return null;

  const shift = workspace.shifts[0];
  const series = workspace.series[0];
  const proposal = workspace.changes[0];
  const impact = fields.form === "series" && fields.operation === "end_series"
    ? series?.balanceImpact
    : fields.form === "shift" && fields.operation !== "propose_change"
      ? shift?.balanceImpact
      : fields.form === "decision" && fields.operation === "approve" && !proposal?.is_stale
        ? proposal?.balanceImpact : undefined;
  if (!impact) return null;
  if (fields.form === "series" && (!fields.from || impact.shiftDate < fields.from)) return null;

  let start: string | undefined;
  let end: string | undefined;
  let professional: string | undefined;
  let changed = true;
  if (fields.form === "shift" && fields.operation === "change" && shift) {
    try {
      start = editedCivilInstant(fields.start, shift.starts_at, shift.timezone);
      end = editedCivilInstant(fields.end, shift.ends_at, shift.timezone);
    } catch { return null; }
    professional = fields.professionalId;
    changed = professional !== shift.professional_id || Date.parse(start) !== Date.parse(shift.starts_at) ||
      Date.parse(end) !== Date.parse(shift.ends_at);
  } else if (fields.form === "decision" && proposal?.source_snapshot) {
    ({ starts_at: start, ends_at: end, proposed_professional_id: professional } = proposal);
    changed = professional !== proposal.source_snapshot.professional_id ||
      Date.parse(start) !== Date.parse(proposal.source_snapshot.starts_at) ||
      Date.parse(end) !== Date.parse(proposal.source_snapshot.ends_at);
  }
  if (!changed) return null;
  if (impact.restricted) return { impact, keep: false, assign: [], defer: [] };

  const oldEnd = Date.parse(impact.endsAt);
  const keep = Boolean(start && end && professional === impact.professionalId &&
    Date.parse(start) <= Date.parse(impact.startsAt) && Date.parse(end) >= oldEnd);
  const targets = impact.targets.filter(target => Date.parse(target.endsAt) > now &&
    (fields.form !== "series" || target.seriesId !== series?.id || target.localDate < fields.from));
  const assign = targets.filter((target) => Date.parse(target.endsAt) <= oldEnd);
  if (start && end && professional && professional !== impact.professionalId && impact.obligationStart &&
    Date.parse(start) >= Date.parse(impact.obligationStart) && Date.parse(end) <= oldEnd &&
    Date.parse(end) > Date.parse(start) && Date.parse(end) > now) {
    assign.unshift({
      id: impact.shiftId,
      version: impact.sourceVersion,
      professionalName: "Profissional desta alteração",
      startsAt: start, endsAt: end, timezone: impact.timezone,
      seriesId: shift?.series_id ?? impact.shiftId,
      localDate: impact.shiftDate,
    });
  }
  return { impact, keep, assign, defer: targets.filter((target) => Date.parse(target.startsAt) >= oldEnd) };
}

export type ScheduleBalanceReview = NonNullable<ReturnType<typeof scheduleBalanceReview>>;

export function scheduleBalanceDecisionReady(review: ScheduleBalanceReview | null, decision?: ScheduleBalanceDecision, now = Date.now()) {
  if (!review) return !decision;
  const { impact } = review;
  if (impact.restricted || !impact.canDecide || !decision || decision.reason.trim().length < 3 ||
    decision.assignmentId !== impact.assignmentId || decision.assignmentVersion !== impact.assignmentVersion ||
    decision.sourceVersion !== impact.sourceVersion) return false;
  if (decision.decision === "keep") return review.keep;
  if (decision.decision === "defer" && !impact.canDefer) return false;
  return review[decision.decision].some(target => target.id === decision.targetShiftId &&
    target.version === decision.targetShiftVersion && Date.parse(target.endsAt) > now);
}
