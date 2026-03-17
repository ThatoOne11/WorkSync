import { ProjectSummary, WeeklyStats } from '../../_shared/types/app.types.ts';
import { ClockifyTimeEntry } from '../../_shared/types/clockify.types.ts';
import { DBProject } from '../../_shared/repo/projects.repo.ts';
import { parseISO8601Duration } from '../../_shared/utils/date.utils.ts';

export class WeeklyStatsHelper {
  static calculateWeeklyStats(
    thisWeekData: ProjectSummary[],
    projects: DBProject[],
    thisWeeksTimeEntries: ClockifyTimeEntry[],
    allMonthlyData: ProjectSummary[],
  ): WeeklyStats {
    const weeklyLoggedHours = thisWeekData.reduce(
      (acc, s) => acc + s.logged_hours,
      0,
    );
    const recommendedWeeklyHours = thisWeekData.reduce(
      (acc, s) => acc + (s.recommended_hours || 0),
      0,
    );

    const dayTotals: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    const projectTotalsWeek: Record<string, { name: string; logged: number }> =
      {};
    const projectMap = new Map(
      projects.map((p) => [p.clockify_project_id, p.name]),
    );
    const trackedProjectIds = new Set(
      projects.map((p) => p.clockify_project_id),
    );

    const trackedTimeEntries = thisWeeksTimeEntries.filter(
      (te) => te.projectId && trackedProjectIds.has(te.projectId),
    );

    trackedTimeEntries.forEach((te) => {
      const entryDate = new Date(te.timeInterval.start);
      const dayName = entryDate.toLocaleDateString('en-US', {
        weekday: 'long',
      });
      const durationSeconds = parseISO8601Duration(te.timeInterval.duration);

      dayTotals[dayName] = (dayTotals[dayName] || 0) + durationSeconds;

      if (te.projectId) {
        const projectName = projectMap.get(te.projectId) || 'Unknown';
        if (!projectTotalsWeek[projectName]) {
          projectTotalsWeek[projectName] = { name: projectName, logged: 0 };
        }
        projectTotalsWeek[projectName].logged += durationSeconds;
      }
    });

    let peakDay = 'N/A';
    let peakHours = 0;
    for (const [day, totalSeconds] of Object.entries(dayTotals)) {
      const hours = totalSeconds / 3600;
      if (hours > peakHours) {
        peakDay = day;
        peakHours = hours;
      }
    }

    const sortedProjects = Object.values(projectTotalsWeek).sort(
      (a, b) => b.logged - a.logged,
    );
    const topProject = sortedProjects[0]?.name || 'N/A';
    const topProjectSeconds = sortedProjects[0]?.logged || 0;

    const totalTrackedSecondsThisWeek = Object.values(projectTotalsWeek).reduce(
      (sum, p) => sum + p.logged,
      0,
    );
    const topProjectShare =
      totalTrackedSecondsThisWeek > 0
        ? (topProjectSeconds / totalTrackedSecondsThisWeek) * 100
        : 0;

    const totalLoggedMonth = allMonthlyData.reduce(
      (acc, s) => acc + s.logged_hours,
      0,
    );
    const totalTarget = projects.reduce((acc, p) => acc + p.target_hours, 0);
    const overallBalance = totalTarget - totalLoggedMonth;

    let overallStatus: 'On Pace' | 'Over Shooting' | 'Under Shooting' =
      'On Pace';
    if (totalTarget > 0) {
      if (overallBalance < -0.05 * totalTarget) overallStatus = 'Over Shooting';
      else if (overallBalance > 0.05 * totalTarget)
        overallStatus = 'Under Shooting';
    }

    return {
      weeklyLoggedHours,
      recommendedWeeklyHours,
      weeklyBalance: recommendedWeeklyHours - weeklyLoggedHours,
      overallStatus,
      peakDay,
      peakHours,
      topProject,
      topProjectShare,
    };
  }
}
