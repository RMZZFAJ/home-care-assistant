type Finding = { id: string; impact?: string | null; nodes: { target: unknown; failureSummary?: string }[] };

export function accessibilityEvidence(label: string, results: { violations: Finding[]; incomplete: Finding[] }) {
  const summarize = (findings: Finding[]) => findings.map(({ id, impact, nodes }) => ({
    rule: id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
  }));
  return {
    surface: label,
    violations: summarize(results.violations),
    reviewRequired: summarize(results.incomplete),
    status: results.violations.length ? "FAIL" : results.incomplete.length ? "AUTOMATED_PASS_REVIEW_REQUIRED" : "AUTOMATED_PASS",
    humanAcceptance: "NOT_ESTABLISHED_BY_AXE",
  };
}
