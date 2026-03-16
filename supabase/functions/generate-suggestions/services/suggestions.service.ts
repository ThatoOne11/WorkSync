import {
  DBProject,
  ProjectsRepository,
} from '../../_shared/repo/projects.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import {
  getWorkdaysInMonth,
  getPassedWorkdays,
  parseISO8601Duration,
} from '../../_shared/utils/date.utils.ts';
import {
  SuggestionsHelper,
  ProjectVarianceData,
} from '../../_shared/helpers/suggestions.helper.ts';

export class SuggestionsService {
  constructor(private readonly projectsRepo: ProjectsRepository) {}

  async getSuggestions(
    browserId: string,
    clockify: ClockifyService,
    userId: string,
  ): Promise<string[]> {
    const projects = await this.projectsRepo.getActiveProjects(browserId);

    if (projects.length === 0) {
      return [
        'No active projects found. Add one on the Projects page to start tracking your pacing.',
      ];
    }

    const today = new Date();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;

    if (isWeekend) {
      return await this.processWeekend(projects, clockify, userId, today);
    }

    return await this.processWeekday(projects, clockify, userId, today);
  }

  private async processWeekend(
    projects: DBProject[],
    clockify: ClockifyService,
    userId: string,
    today: Date,
  ): Promise<string[]> {
    const { start, end } = this.getLastWorkWeekBoundaries(today);
    const timeEntries = await clockify.fetchUserTimeEntries(userId, start, end);
    const totalWorkdaysInMonth = getWorkdaysInMonth(
      today.getFullYear(),
      today.getMonth(),
    );

    const projectsData: ProjectVarianceData[] = projects.map((p) => {
      const loggedSeconds = timeEntries
        .filter((te) => te.projectId === p.clockify_project_id)
        .reduce(
          (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
          0,
        );

      const loggedHours = loggedSeconds / 3600;
      const targetHours = p.target_hours * (5 / totalWorkdaysInMonth);
      const variance = loggedHours - targetHours;

      return { name: p.name, loggedHours, targetHours, variance };
    });

    // Delegate formatting to helper
    return SuggestionsHelper.formatWeekendSuggestions(projectsData);
  }

  private async processWeekday(
    projects: DBProject[],
    clockify: ClockifyService,
    userId: string,
    today: Date,
  ): Promise<string[]> {
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ).toISOString();
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).toISOString();

    const timeEntries = await clockify.fetchUserTimeEntries(
      userId,
      startOfMonth,
      endOfMonth,
    );
    const totalWorkdays = getWorkdaysInMonth(
      today.getFullYear(),
      today.getMonth(),
    );
    const passedWorkdays = getPassedWorkdays(today);

    const projectsData: ProjectVarianceData[] = projects.map((p) => {
      const loggedSeconds = timeEntries
        .filter((te) => te.projectId === p.clockify_project_id)
        .reduce(
          (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
          0,
        );

      const loggedHours = loggedSeconds / 3600;
      const projectedHours = (loggedHours / passedWorkdays) * totalWorkdays;

      return {
        name: p.name,
        loggedHours,
        targetHours: p.target_hours,
        variance: projectedHours - p.target_hours,
      };
    });

    // Delegate formatting to helper
    return SuggestionsHelper.formatWeekdaySuggestions(projectsData);
  }

  private getLastWorkWeekBoundaries(today: Date): {
    start: string;
    end: string;
  } {
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay());
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    return { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() };
  }
}
