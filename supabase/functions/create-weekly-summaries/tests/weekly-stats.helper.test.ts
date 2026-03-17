import { assertEquals } from 'jsr:@std/assert';
import { WeeklyStatsHelper } from '../helpers/weekly-stats.helper.ts';
import { ProjectSummary } from '../../_shared/types/app.types.ts';
import { ClockifyTimeEntry } from '../../_shared/types/clockify.types.ts';
import { DBProject } from '../../_shared/repo/projects.repo.ts';

Deno.test('WeeklyStatsHelper Suite', async (t) => {
  const mockProjects: DBProject[] = [
    {
      id: 1,
      name: 'Website Build',
      clockify_project_id: 'proj_1',
      target_hours: 40,
    },
    {
      id: 2,
      name: 'SEO Audit',
      clockify_project_id: 'proj_2',
      target_hours: 10,
    },
  ];

  const mockThisWeekData: ProjectSummary[] = [
    {
      project_id: 1,
      project_name: 'Website Build',
      logged_hours: 15,
      recommended_hours: 10,
      target_hours: 40,
      balance: -5,
      week_ending_on: '2026-02-08',
      user_id: 'user1',
    },
    {
      project_id: 2,
      project_name: 'SEO Audit',
      logged_hours: 0,
      recommended_hours: 2.5,
      target_hours: 10,
      balance: 2.5,
      week_ending_on: '2026-02-08',
      user_id: 'user1',
    },
  ];

  const mockAllMonthlyData: ProjectSummary[] = [
    ...mockThisWeekData,
    // Add previous week's data to simulate total monthly logged hours
    {
      project_id: 1,
      project_name: 'Website Build',
      logged_hours: 10,
      recommended_hours: 10,
      target_hours: 40,
      balance: 0,
      week_ending_on: '2026-02-01',
      user_id: 'user1',
    },
  ];

  const mockTimeEntries: ClockifyTimeEntry[] = [
    // Tuesday: 4 hours
    {
      id: 'te_1',
      projectId: 'proj_1',
      timeInterval: { start: '2026-02-03T09:00:00Z', duration: 'PT4H' },
    },
    // Wednesday: 6 hours (This should be the Peak Day)
    {
      id: 'te_2',
      projectId: 'proj_1',
      timeInterval: { start: '2026-02-04T09:00:00Z', duration: 'PT6H' },
    },
    // Thursday: 5 hours
    {
      id: 'te_3',
      projectId: 'proj_1',
      timeInterval: { start: '2026-02-05T09:00:00Z', duration: 'PT5H' },
    },
  ];

  await t.step(
    'calculateWeeklyStats - correctly calculates pacing, peak day, and top project',
    () => {
      const stats = WeeklyStatsHelper.calculateWeeklyStats(
        mockThisWeekData,
        mockProjects,
        mockTimeEntries,
        mockAllMonthlyData,
      );

      // 1. Weekly Totals
      assertEquals(stats.weeklyLoggedHours, 15); // 15 + 0
      assertEquals(stats.recommendedWeeklyHours, 12.5); // 10 + 2.5

      // 2. Peak Day Identification (Wednesday had 6 hours)
      assertEquals(stats.peakDay, 'Wednesday');
      assertEquals(stats.peakHours, 6);

      // 3. Top Project Tracking
      assertEquals(stats.topProject, 'Website Build');
      assertEquals(stats.topProjectShare, 100); // 100% of time was spent on proj_1

      // 4. Overall Monthly Status
      // Total Target: 50 hrs. Total Logged: 25 hrs. (15 + 0 this week, 10 last week).
      // Variance threshold is 5%. They are 25 hours behind, which is massively "Under Shooting".
      assertEquals(stats.overallStatus, 'Under Shooting');
    },
  );
});
