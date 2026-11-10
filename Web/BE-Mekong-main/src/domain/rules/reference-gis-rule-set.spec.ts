import {
  evaluateReferenceGisRule,
  REFERENCE_GIS_RULE_SET,
} from './reference-gis-rule-set';

describe('reference GIS rule set', () => {
  it('keeps a version and marks the legacy rules as simulation-only', () => {
    expect(REFERENCE_GIS_RULE_SET).toMatchObject({
      version: '1.0.0',
      confirmationStatus: 'unconfirmed',
      intendedUse: 'reference_simulation_only',
    });
    expect(REFERENCE_GIS_RULE_SET.rules.map((rule) => rule.stationId)).toEqual([
      'baodinh',
      'gocat',
      'vamkenh',
    ]);
  });

  it('converts the Vam Kenh source threshold to mg/L and preserves negatives', () => {
    expect(evaluateReferenceGisRule('vamkenh', 1500.1, true)).toMatchObject({
      code: 'close_for_storage',
      thresholdMgL: 1500,
    });
    expect(evaluateReferenceGisRule('vamkenh', 1500, true).code).toBe(
      'monitor',
    );
    expect(evaluateReferenceGisRule('vamkenh', -250, true).code).toBe(
      'monitor',
    );
  });

  it('returns unknown when the required observation is absent', () => {
    expect(evaluateReferenceGisRule('vamkenh', null, false).code).toBe(
      'unknown',
    );
    expect(evaluateReferenceGisRule('vamkenh', null, true).code).toBe(
      'unknown',
    );
  });

  it('keeps the legacy fixed labels for Bao Dinh and Go Cat', () => {
    expect(evaluateReferenceGisRule('baodinh', null, true).code).toBe(
      'open_to_flow',
    );
    expect(evaluateReferenceGisRule('gocat', 0, true).code).toBe(
      'open_to_flow',
    );
  });
});
