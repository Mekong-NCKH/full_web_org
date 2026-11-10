export type ReferenceRuleResult = {
  code: 'unknown' | 'open_to_flow' | 'close_for_storage' | 'monitor';
  label: string;
  basis: string;
  thresholdMgL?: number;
};

export const REFERENCE_GIS_RULE_SET = {
  id: 'mekong-legacy-gis-reference',
  version: '1.0.0',
  confirmationStatus: 'unconfirmed',
  intendedUse: 'reference_simulation_only',
  sourceFiles: [
    'Sanility_GIS_Monitoring/script.py',
    'Sanility_GIS_Monitoring/logicLayer.py',
  ],
  sourceSalinityUnit: 'g/L',
  normalizedSalinityUnit: 'mg/L',
  rules: [
    {
      stationId: 'baodinh',
      kind: 'fixed',
      result: 'open_to_flow',
      label: 'Mở tự do',
    },
    {
      stationId: 'gocat',
      kind: 'fixed',
      result: 'open_to_flow',
      label: 'Mở tự do',
    },
    {
      stationId: 'vamkenh',
      kind: 'threshold',
      comparison: 'gt',
      sourceThreshold: 1.5,
      thresholdMgL: 1500,
      aboveThreshold: 'close_for_storage',
      aboveThresholdLabel: 'Đóng trữ',
      atOrBelowThreshold: 'monitor',
      atOrBelowThresholdLabel: 'Theo dõi',
    },
  ],
  limitations: [
    'Rule confirmation and operational approval have not been recorded.',
    'A reference result is not a gate command or a verified gate state.',
    'Only the three public stations with approved coordinates are included.',
  ],
} as const;

export function evaluateReferenceGisRule(
  stationId: string,
  salinityMgL: number | null,
  hasObservation: boolean,
): ReferenceRuleResult {
  if (!hasObservation) {
    return {
      code: 'unknown',
      label: 'Không có bản ghi',
      basis: 'No historical observation exists at or before the selected time.',
    };
  }

  const rule = REFERENCE_GIS_RULE_SET.rules.find(
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
