import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  calculateAchievements,
  checkTopicMastery,
  getAchievementsByGuild,
  getRequirementDescription,
  GUILDS,
  type TopicMasteryStats,
} from './achievements';

describe('achievements', () => {
  describe('getAchievementsByGuild', () => {
    it('should return a Map', () => {
      const grouped = getAchievementsByGuild();
      expect(grouped).toBeInstanceOf(Map);
    });

    it('should group achievements by guild', () => {
      const grouped = getAchievementsByGuild();

      // Tüm guild'lerin var olduğunu kontrol et (MASTERY hariç - başarım yok)
      expect(grouped.has('HUKUK')).toBe(true);
      expect(grouped.has('EKONOMI')).toBe(true);
      expect(grouped.has('MUHASEBE_MALIYE')).toBe(true);
      expect(grouped.has('GENEL_YETENEK')).toBe(true);
      expect(grouped.has('HYBRID')).toBe(true);
      expect(grouped.has('SPECIAL')).toBe(true);
      expect(grouped.has('TITLES')).toBe(true);
      // MASTERY guild'inde henüz başarım yok
      expect(grouped.has('MASTERY')).toBe(false);
    });

    it('should sort achievements by order within each guild', () => {
      const grouped = getAchievementsByGuild();

      for (const [, achievements] of grouped) {
        for (let i = 1; i < achievements.length; i++) {
          expect(achievements[i].order).toBeGreaterThan(
            achievements[i - 1].order
          );
        }
      }
    });

    it('should contain HUKUK achievements', () => {
      const grouped = getAchievementsByGuild();
      const hukukAchievements = grouped.get('HUKUK');

      expect(hukukAchievements).toBeDefined();
      expect(hukukAchievements!.length).toBeGreaterThan(0);

      // HUKUK başarımlarını kontrol et
      const achievementIds = hukukAchievements!.map((a) => a.id);
      expect(achievementIds).toContain('hukuk_10');
      expect(achievementIds).toContain('hukuk_100');
    });

    it('should contain HYBRID achievements with multi_category_progress', () => {
      const grouped = getAchievementsByGuild();
      const hybridAchievements = grouped.get('HYBRID');

      expect(hybridAchievements).toBeDefined();
      expect(hybridAchievements!.length).toBeGreaterThan(0);

      // HYBRID başarımları multi_category_progress tipinde olmalı
      const hybrid01 = hybridAchievements!.find((a) => a.id === 'hybrid_01');
      expect(hybrid01).toBeDefined();
      expect(hybrid01!.requirement.type).toBe('multi_category_progress');
    });
  });

  describe('checkTopicMastery', () => {
    it('should return true when topic is fully mastered', () => {
      const topicStats: TopicMasteryStats[] = [
        {
          topicId: 'topic-1',
          courseId: 'course-1',
          totalQuestions: 10,
          masteredQuestions: 10,
          isMastered: true,
        },
      ];

      const result = checkTopicMastery(topicStats, 'topic-1', 'course-1');
      expect(result).toBe(true);
    });

    it('should return false when topic is not mastered', () => {
      const topicStats: TopicMasteryStats[] = [
        {
          topicId: 'topic-1',
          courseId: 'course-1',
          totalQuestions: 10,
          masteredQuestions: 5,
          isMastered: false,
        },
      ];

      const result = checkTopicMastery(topicStats, 'topic-1', 'course-1');
      expect(result).toBe(false);
    });

    it('should return false when topic does not exist', () => {
      const topicStats: TopicMasteryStats[] = [
        {
          topicId: 'topic-1',
          courseId: 'course-1',
          totalQuestions: 10,
          masteredQuestions: 10,
          isMastered: true,
        },
      ];

      const result = checkTopicMastery(
        topicStats,
        'non-existent-topic',
        'course-1'
      );
      expect(result).toBe(false);
    });

    it('should return false when courseId does not match', () => {
      const topicStats: TopicMasteryStats[] = [
        {
          topicId: 'topic-1',
          courseId: 'course-1',
          totalQuestions: 10,
          masteredQuestions: 10,
          isMastered: true,
        },
      ];

      const result = checkTopicMastery(
        topicStats,
        'topic-1',
        'different-course'
      );
      expect(result).toBe(false);
    });

    it('should handle empty topicStats array', () => {
      const result = checkTopicMastery([], 'topic-1', 'course-1');
      expect(result).toBe(false);
    });

    it('should find correct topic among multiple topics', () => {
      const topicStats: TopicMasteryStats[] = [
        {
          topicId: 'topic-1',
          courseId: 'course-1',
          totalQuestions: 10,
          masteredQuestions: 5,
          isMastered: false,
        },
        {
          topicId: 'topic-2',
          courseId: 'course-1',
          totalQuestions: 10,
          masteredQuestions: 10,
          isMastered: true,
        },
        {
          topicId: 'topic-3',
          courseId: 'course-1',
          totalQuestions: 10,
          masteredQuestions: 3,
          isMastered: false,
        },
      ];

      expect(checkTopicMastery(topicStats, 'topic-1', 'course-1')).toBe(false);
      expect(checkTopicMastery(topicStats, 'topic-2', 'course-1')).toBe(true);
      expect(checkTopicMastery(topicStats, 'topic-3', 'course-1')).toBe(false);
    });
  });

  describe('calculateAchievements', () => {
    const createBaseStats = (overrides = {}) => ({
      completedVideos: 0,
      totalVideos: 100,
      completedHours: 0,
      totalHours: 100,
      categoryProgress: {
        HUKUK: {
          completedVideos: 0,
          totalVideos: 25,
          completedHours: 0,
          totalHours: 25,
        },
        EKONOMI: {
          completedVideos: 0,
          totalVideos: 25,
          completedHours: 0,
          totalHours: 25,
        },
        MUHASEBE_MALIYE: {
          completedVideos: 0,
          totalVideos: 25,
          completedHours: 0,
          totalHours: 25,
        },
        GENEL_YETENEK: {
          completedVideos: 0,
          totalVideos: 25,
          completedHours: 0,
          totalHours: 25,
        },
      },
      ...overrides,
    });

    const createBaseLog = (overrides = {}) => ({
      currentStreak: 0,
      totalActiveDays: 0,
      dailyVideosCompleted: 0,
      ...overrides,
    });

    it('should return empty array when no achievements unlocked', () => {
      const stats = createBaseStats();
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toEqual([]);
    });

    it('should unlock category_progress achievement when threshold met', () => {
      const stats = createBaseStats({
        categoryProgress: {
          HUKUK: {
            completedVideos: 10,
            totalVideos: 100,
            completedHours: 10,
            totalHours: 100,
          },
        },
      });
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toContain('hukuk_10');
    });

    it('should unlock all_progress achievement when overall progress met', () => {
      const stats = createBaseStats({
        completedHours: 50,
        totalHours: 100,
      });
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toContain('special-06'); // 50% progress
      expect(unlocked).toContain('hybrid_05'); // 50% all progress
    });

    it('should unlock streak achievements', () => {
      const stats = createBaseStats();
      const log = createBaseLog({
        currentStreak: 7,
      });

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toContain('special-03'); // 7 day streak
    });

    it('should unlock daily_progress achievements', () => {
      const stats = createBaseStats();
      const log = createBaseLog({
        dailyVideosCompleted: 10,
      });

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toContain('special-02'); // 10 videos in a day
    });

    it('should unlock total_active_days achievements', () => {
      const stats = createBaseStats();
      const log = createBaseLog({
        totalActiveDays: 60,
      });

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toContain('special-05'); // 60 active days
    });

    it('should unlock minimum_videos achievements', () => {
      const stats = createBaseStats({
        completedVideos: 1,
      });
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toContain('RANK_UP:1'); // 1 minimum video
    });

    it('should unlock multi_category_progress achievements', () => {
      const stats = createBaseStats({
        categoryProgress: {
          HUKUK: {
            completedVideos: 25,
            totalVideos: 100,
            completedHours: 25,
            totalHours: 100,
          },
          EKONOMI: {
            completedVideos: 25,
            totalVideos: 100,
            completedHours: 25,
            totalHours: 100,
          },
        },
      });
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).toContain('hybrid_01'); // 25% in HUKUK and EKONOMI
    });

    it('should return achievement IDs as strings', () => {
      const stats = createBaseStats({
        completedHours: 100,
        totalHours: 100,
      });
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked.every((id) => typeof id === 'string')).toBe(true);
    });

    it('should handle edge case with zero totalHours', () => {
      const stats = createBaseStats({
        totalHours: 0,
        completedHours: 0,
      });
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      // Sıfır totalHours ile hiçbir all_progress achievement açılmamalı
      expect(unlocked).not.toContain('special-06');
      expect(unlocked).not.toContain('special-07');
    });

    it('should handle edge case with zero category totalHours', () => {
      const stats = createBaseStats({
        categoryProgress: {
          HUKUK: {
            completedVideos: 0,
            totalVideos: 0,
            completedHours: 0,
            totalHours: 0,
          },
        },
      });
      const log = createBaseLog();

      const unlocked = calculateAchievements(stats, log);
      expect(unlocked).not.toContain('hukuk_10');
    });
  });

  describe('getRequirementDescription', () => {
    it('should describe category_progress requirement', () => {
      const requirement = {
        type: 'category_progress' as const,
        category: 'HUKUK',
        percentage: 50,
      };

      const description = getRequirementDescription(requirement);
      expect(description).toContain('Hukuk');
      expect(description).toContain('50');
    });

    it('should describe multi_category_progress requirement', () => {
      const requirement = {
        type: 'multi_category_progress' as const,
        categories: [
          { category: 'HUKUK', percentage: 25 },
          { category: 'EKONOMI', percentage: 25 },
        ],
      };

      const description = getRequirementDescription(requirement);
      expect(description).toContain('Hukuk');
      expect(description).toContain('Ekonomi');
      expect(description).toContain('25');
    });

    it('should describe all_progress requirement', () => {
      const requirement = {
        type: 'all_progress' as const,
        percentage: 50,
      };

      const description = getRequirementDescription(requirement);
      expect(description).toContain('Tüm ilimlerde');
      expect(description).toContain('50');
    });

    it('should describe streak requirement', () => {
      const requirement = {
        type: 'streak' as const,
        days: 7,
      };

      const description = getRequirementDescription(requirement);
      expect(description).toContain('7');
      expect(description).toContain('gün');
    });

    it('should describe daily_progress requirement', () => {
      const requirement = {
        type: 'daily_progress' as const,
        count: 5,
      };

      const description = getRequirementDescription(requirement);
      expect(description).toContain('5');
      expect(description).toContain('video');
    });

    it('should describe total_active_days requirement', () => {
      const requirement = {
        type: 'total_active_days' as const,
        days: 60,
      };

      const description = getRequirementDescription(requirement);
      expect(description).toContain('60');
      expect(description).toContain('gün');
    });

    it('should describe minimum_videos requirement', () => {
      const requirement = {
        type: 'minimum_videos' as const,
        count: 1,
      };

      const description = getRequirementDescription(requirement);
      expect(description).toContain('1');
      expect(description).toContain('video');
    });

    it('should handle unknown requirement type gracefully', () => {
      // eslint-disable-next-line no-restricted-syntax
      const requirement = {
        type: 'unknown_type',
      } as unknown as {
        type: 'category_progress';
        category: string;
        percentage: number;
      };

      const description = getRequirementDescription(requirement);
      expect(description).toBe('Gizli gereksinim');
    });
  });

  describe('GUILDS constant', () => {
    it('should contain all guild types', () => {
      expect(GUILDS.HUKUK).toBeDefined();
      expect(GUILDS.EKONOMI).toBeDefined();
      expect(GUILDS.MUHASEBE_MALIYE).toBeDefined();
      expect(GUILDS.GENEL_YETENEK).toBeDefined();
      expect(GUILDS.HYBRID).toBeDefined();
      expect(GUILDS.SPECIAL).toBeDefined();
      expect(GUILDS.MASTERY).toBeDefined();
      expect(GUILDS.TITLES).toBeDefined();
    });

    it('should have required properties for each guild', () => {
      for (const [, guild] of Object.entries(GUILDS)) {
        expect(guild.id).toBeDefined();
        expect(guild.name).toBeDefined();
        expect(guild.description).toBeDefined();
        expect(guild.color).toBeDefined();
        expect(typeof guild.id).toBe('string');
        expect(typeof guild.name).toBe('string');
        expect(typeof guild.description).toBe('string');
        expect(typeof guild.color).toBe('string');
      }
    });

    it('should have valid color format (oklch)', () => {
      for (const [, guild] of Object.entries(GUILDS)) {
        expect(guild.color).toMatch(/^oklch\(/);
      }
    });
  });

  describe('ACHIEVEMENTS constant', () => {
    it('should be an array', () => {
      expect(Array.isArray(ACHIEVEMENTS)).toBe(true);
      expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
    });

    it('should have required properties for each achievement', () => {
      for (const achievement of ACHIEVEMENTS) {
        expect(achievement.id).toBeDefined();
        expect(achievement.title).toBeDefined();
        expect(achievement.motto).toBeDefined();
        expect(achievement.imagePath).toBeDefined();
        expect(achievement.guild).toBeDefined();
        expect(achievement.requirement).toBeDefined();
        expect(achievement.order).toBeDefined();

        expect(typeof achievement.id).toBe('string');
        expect(typeof achievement.title).toBe('string');
        expect(typeof achievement.motto).toBe('string');
        expect(typeof achievement.imagePath).toBe('string');
        expect(typeof achievement.order).toBe('number');
      }
    });

    it('should have valid requirement types', () => {
      const validTypes = [
        'category_progress',
        'multi_category_progress',
        'all_progress',
        'streak',
        'daily_progress',
        'total_active_days',
        'minimum_videos',
      ];

      for (const achievement of ACHIEVEMENTS) {
        expect(validTypes).toContain(achievement.requirement.type);
      }
    });

    it('should have unique IDs', () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should reference valid guilds', () => {
      const validGuilds = Object.keys(GUILDS);

      for (const achievement of ACHIEVEMENTS) {
        expect(validGuilds).toContain(achievement.guild);
      }
    });

    it('should have image paths starting with /', () => {
      for (const achievement of ACHIEVEMENTS) {
        expect(achievement.imagePath).toMatch(/^\//);
      }
    });

    it('should have positive order numbers', () => {
      for (const achievement of ACHIEVEMENTS) {
        expect(achievement.order).toBeGreaterThan(0);
      }
    });

    it('should identify permanent achievements correctly', () => {
      const permanentAchievements = ACHIEVEMENTS.filter((a) => a.isPermanent);

      for (const achievement of permanentAchievements) {
        expect(achievement.isPermanent).toBe(true);
      }

      // SPECIAL guild'deki bazı başarımlar kalıcı olmalı
      const specialPermanent = ACHIEVEMENTS.filter(
        (a) => a.guild === 'SPECIAL' && a.isPermanent
      );
      expect(specialPermanent.length).toBeGreaterThan(0);
    });
  });

  describe('integration scenarios', () => {
    it('should correctly identify all guild achievements', () => {
      const grouped = getAchievementsByGuild();
      let totalCount = 0;

      for (const [, achievements] of grouped) {
        totalCount += achievements.length;
      }

      expect(totalCount).toBe(ACHIEVEMENTS.length);
    });

    it('should handle complex achievement unlocking scenario', () => {
      const stats = {
        completedVideos: 50,
        totalVideos: 100,
        completedHours: 50,
        totalHours: 100,
        categoryProgress: {
          HUKUK: {
            completedVideos: 25,
            totalVideos: 50,
            completedHours: 25,
            totalHours: 50,
          },
          EKONOMI: {
            completedVideos: 25,
            totalVideos: 50,
            completedHours: 25,
            totalHours: 50,
          },
          MUHASEBE_MALIYE: {
            completedVideos: 0,
            totalVideos: 25,
            completedHours: 0,
            totalHours: 25,
          },
          GENEL_YETENEK: {
            completedVideos: 0,
            totalVideos: 25,
            completedHours: 0,
            totalHours: 25,
          },
        },
      };

      const log = {
        currentStreak: 7,
        totalActiveDays: 30,
        dailyVideosCompleted: 10,
      };

      const unlocked = calculateAchievements(stats, log);

      // HUKUK ilerlemesi (50%)
      expect(unlocked).toContain('hukuk_10');
      expect(unlocked).toContain('hukuk_25');
      expect(unlocked).toContain('hukuk_50');

      // EKONOMI ilerlemesi (50%)
      expect(unlocked).toContain('eko_10');
      expect(unlocked).toContain('eko_25');
      expect(unlocked).toContain('eko_50');

      // HYBRID başarımları
      expect(unlocked).toContain('hybrid_01'); // 25% HUKUK + 25% EKONOMI

      // SPECIAL başarımları
      expect(unlocked).toContain('special-03'); // 7 day streak
      expect(unlocked).toContain('special-02'); // 10 daily videos

      // TITLES başarımları
      expect(unlocked).toContain('RANK_UP:2'); // 25% all progress
      expect(unlocked).toContain('RANK_UP:3'); // 50% all progress
    });
  });
});
