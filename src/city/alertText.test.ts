import { describe, expect, it } from 'vitest';
import { alertFromLog } from './alertText';

describe('alertFromLog', () => {
  it('maps hazards, alarms and ignores routine telemetry', () => {
    expect(alertFromLog({ category: 'HAZARD', severity: 'CRIT', source: 'WEATHER', message: 'LIGHTNING STRIKE on X' })?.icon).toBe('⚡');
    expect(alertFromLog({ category: 'ALARM', severity: 'CRIT', source: 'SCADA', message: 'BLACKOUT X — 400 MW' })?.text).toMatch(/Blackout/);
    expect(alertFromLog({ category: 'ALARM', severity: 'WARN', source: 'ENG-02', message: 'ENG-02 reports OVERLOAD on X' })?.text).toMatch(/ENG-02/);
    expect(alertFromLog({ category: 'SYSTEM', severity: 'INFO', source: 'SCADA', message: 'DWN DEM 600' })).toBeNull();
    expect(alertFromLog({ category: 'ALLOCATION', severity: 'INFO', source: 'ENG-01', message: 'set X' })).toBeNull();
  });
});
