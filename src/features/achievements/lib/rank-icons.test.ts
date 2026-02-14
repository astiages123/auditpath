import { describe, expect, it } from 'vitest';
import { getRankIcon, rankIcons } from './rank-icons';
import { Briefcase, Crown, Shield, Star } from 'lucide-react';

describe('rankIcons', () => {
  it('has correct icons mapped to rank names', () => {
    expect(rankIcons['Sürgün']).toBe(Briefcase);
    expect(rankIcons['Yazıcı']).toBe(Star);
    expect(rankIcons['Sınır Muhafızı']).toBe(Shield);
    expect(rankIcons['Yüce Bilgin']).toBe(Crown);
  });

  it('getRankIcon returns correct icon for known rank', () => {
    expect(getRankIcon('Sürgün')).toBe(Briefcase);
    expect(getRankIcon('Yazıcı')).toBe(Star);
  });

  it('getRankIcon returns fallback for unknown or null rank', () => {
    expect(getRankIcon('Unknown')).toBe(Briefcase);
    expect(getRankIcon(null)).toBe(Briefcase);
    expect(getRankIcon(undefined)).toBe(Briefcase);
  });
});
