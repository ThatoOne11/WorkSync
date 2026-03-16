import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { DBProject } from '../../_shared/repo/projects.repo.ts';
import { DBWeeklySummary } from '../../_shared/repo/summaries.repo.ts';
import { ProjectSummary } from '../../_shared/types/app.types.ts';
import { ClockifyTimeEntry } from '../../_shared/types/clockify.types.ts';
import {
  getWeekDates,
  parseISO8601Duration,
} from '../../_shared/utils/date.utils.ts';

export interface AggregationResult {
  allMonthlyData: ProjectSummary[];
  summariesToUpsert: DBWeeklySummary[];
  thisWeeksTimeEntries: ClockifyTimeEntry[];
}

export class ClockifyAggregator {
  static async fetchAndAggregate(
    clockify: ClockifyService,
    projects: DBProject[],
    userId: string,
    clockifyUserId: string,
    today: Date,
    currentWeekNumber: number,
    workdaysInMonth: number,
  ): Promise<AggregationResult> {
    const allMonthlyData: ProjectSummary[] = [];
    const summariesToUpsert: DBWeeklySummary[] = [];
    let thisWeeksTimeEntries: ClockifyTimeEntry[] = [];

    for (let i = 1; i <= currentWeekNumber; i++) {
      const weekDates = getWeekDates(today, i);
      const timeEntries = await clockify.fetchUserTimeEntries(
        clockifyUserId,
        weekDates.start,
        weekDates.end,
      );

      if (i === currentWeekNumber) {
        thisWeeksTimeEntries = timeEntries;
      }

      const weeklySummaries = projects.map((project) => {
        const loggedSeconds = timeEntries
          .filter((te) => te.projectId === project.clockify_project_id)
          .reduce(
            (acc, te) => acc + parseISO8601Duration(te.timeInterval.duration),
            0,
          );

        const logged_hours = loggedSeconds / 3600;
        const recommended_hours = (project.target_hours / workdaysInMonth) * 5;

        return {
          project_id: project.id,
          project_name: project.name,
          user_id: userId,
          target_hours: project.target_hours,
          logged_hours,
          week_ending_on: weekDates.end.split('T')[0],
          recommended_hours,
          balance: recommended_hours - logged_hours,
        };
      });

      allMonthlyData.push(...weeklySummaries);
      summariesToUpsert.push(
        ...weeklySummaries.map((s) => ({
          project_id: s.project_id,
          user_id: s.user_id,
          target_hours: s.target_hours,
          logged_hours: s.logged_hours,
          week_ending_on: s.week_ending_on,
        })),
      );
    }

    return { allMonthlyData, summariesToUpsert, thisWeeksTimeEntries };
  }
}
