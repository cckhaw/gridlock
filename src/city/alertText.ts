import type { LogCategory, LogSeverity } from '../types/game';

export interface CityAlert {
  key: string;
  nodeId: string;
  text: string;
  icon: string;
  tone: 'warn' | 'crit' | 'info';
  born: number;
}

/** Turn a telemetry log line into a short, friendly pop-up (or null if it shouldn't pop). */
export function alertFromLog(l: { category: LogCategory; severity: LogSeverity; source: string; message: string }): Pick<CityAlert, 'text' | 'icon' | 'tone'> | null {
  const m = l.message;
  if (l.category === 'HAZARD') {
    if (m.startsWith('LIGHTNING')) return { icon: '⚡', text: 'Lightning strike!', tone: 'crit' };
    if (m.startsWith('TRANSFORMER')) return { icon: '🔧', text: 'Transformer blew out', tone: 'crit' };
    if (m.startsWith('DEMAND SURGE')) return { icon: '📈', text: 'Power demand surging', tone: 'warn' };
    if (m.startsWith('HEATWAVE')) return { icon: '🔥', text: 'Heatwave — cooling weak', tone: 'warn' };
  }
  if (l.category === 'ALARM') {
    if (m.includes('BLACKOUT')) return { icon: '💡', text: 'Blackout! Lights out', tone: 'crit' };
    if (m.includes('CRITICAL')) return { icon: '🚨', text: 'Critical — act now!', tone: 'crit' };
    if (m.includes('caution')) return { icon: '⚠️', text: 'Running hot', tone: 'warn' };
    if (m.includes('reports OVERLOAD')) return { icon: '📣', text: `${l.source}: overload reported`, tone: 'warn' };
  }
  if (l.category === 'VOTE') return { icon: '🗳️', text: m.includes('SABOTEUR') ? 'Saboteur caught!' : 'Wrong call — innocent', tone: m.includes('SABOTEUR') ? 'info' : 'crit' };
  if (l.category === 'SCAN' && l.severity === 'WARN') return { icon: '🕵️', text: 'Scan found something odd', tone: 'warn' };
  return null;
}
