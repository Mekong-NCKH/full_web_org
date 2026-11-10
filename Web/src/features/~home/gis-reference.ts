import type {
  GISReferenceRuleSet,
  GISReferenceStatus,
  Observation,
} from '@/types/monitoring.type';

export function evaluateGISReferenceRule(
  ruleSet: GISReferenceRuleSet | null,
  stationId: string,
  observation: Observation | null,
): GISReferenceStatus {
  if (!observation) {
    return {
      code: 'unknown',
      label: 'Không có bản ghi',
      basis: 'No historical observation exists at or before the selected time.',
    };
  }

  if (!ruleSet) {
    return {
      code: 'unknown',
      label: 'Chưa tải được quy tắc',
      basis: 'The versioned GIS reference rule set is unavailable.',
    };
  }

  const rule = ruleSet.rules.find(
    (candidate) => candidate.stationId === stationId.toLowerCase(),
  );
  if (!rule) {
    return {
      code: 'unknown',
      label: 'Chưa có quy tắc tham chiếu',
      basis: 'This station is not covered by the published reference rule set.',
    };
  }

  if (rule.kind === 'fixed') {
    return {
      code: rule.result,
      label: rule.label,
      basis: 'Fixed reference label copied from the legacy GIS rule script.',
    };
  }

  const salinityMgL = observation.salinity.value;
  if (salinityMgL === null || !Number.isFinite(salinityMgL)) {
    return {
      code: 'unknown',
      label: 'Thiếu giá trị độ mặn',
      basis: 'The rule requires an observed salinity value.',
      thresholdMgL: rule.thresholdMgL,
    };
  }

  if (salinityMgL > rule.thresholdMgL) {
    return {
      code: rule.aboveThreshold,
      label: rule.aboveThresholdLabel,
      basis: `Legacy rule: salinity > ${rule.sourceThreshold} g/L (${rule.thresholdMgL} mg/L).`,
      thresholdMgL: rule.thresholdMgL,
    };
  }

  return {
    code: rule.atOrBelowThreshold,
    label: rule.atOrBelowThresholdLabel,
    basis: `Legacy rule fallback at or below ${rule.sourceThreshold} g/L (${rule.thresholdMgL} mg/L).`,
    thresholdMgL: rule.thresholdMgL,
  };
}
