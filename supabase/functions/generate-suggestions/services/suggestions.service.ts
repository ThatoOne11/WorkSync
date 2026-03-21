import {
  DBProject,
  ProjectsRepository,
} from '../../_shared/repo/projects.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import {
  GeminiService,
  ProjectVarianceContext,
} from '../../_shared/services/gemini.service.ts';
import {
  getWorkdaysInMonth,
  getPassedWorkdays,
  parseISO8601Duration,
} from '../../_shared/utils/date.utils.ts';

export class SuggestionsService {
  private readonly geminiService: GeminiService;

  constructor(private readonly projectsRepo: ProjectsRepository) {
    this.geminiService = new GeminiService();
  }

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

    let projectsData: ProjectVarianceContext[];

    // Gather data based on whether it is the weekend (review) or weekday (pacing projection)
    if (isWeekend) {
      projectsData = await this.gatherWeekendData(
        projects,
        clockify,
        userId,
        today,
      );
    } else {
      projectsData = await this.gatherWeekdayData(
        projects,
        clockify,
        userId,
        today,
      );
    }

    // Send the data to Gemini for dynamic AI insights!
    return await this.geminiService.generatePacingSuggestions(
      projectsData,
      isWeekend,
    );
  }

  private async gatherWeekendData(
    projects: DBProject[],
    clockify: ClockifyService,
    userId: string,
    today: Date,
  ): Promise<ProjectVarianceContext[]> {
    const { start, end } = this.getLastWorkWeekBoundaries(today);
    const timeEntries = await clockify.fetchUserTimeEntries(userId, start, end);
    const totalWorkdaysInMonth = getWorkdaysInMonth(
      today.getFullYear(),
      today.getMonth(),
    );

    return projects.map((p) => {
      const loggedSeconds = timeEntries
        .filter((te) => te.projectId === p.clockify_project_id)
        .reduce(
          (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
          0,
        );

      const loggedHours = loggedSeconds / 3600;
      const targetHours = p.target_hours * (5 / totalWorkdaysInMonth); // Weekly target slice

      return {
        name: p.name,
        loggedHours: Math.round(loggedHours * 100) / 100,
        targetHours: Math.round(targetHours * 100) / 100,
        variance: Math.round((loggedHours - targetHours) * 100) / 100,
      };
    });
  }

  private async gatherWeekdayData(
    projects: DBProject[],
    clockify: ClockifyService,
    userId: string,
    today: Date,
  ): Promise<ProjectVarianceContext[]> {
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

    return projects.map((p) => {
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
        loggedHours: Math.round(loggedHours * 100) / 100,
        targetHours: p.target_hours,
        variance: Math.round((projectedHours - p.target_hours) * 100) / 100,
      };
    });
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
