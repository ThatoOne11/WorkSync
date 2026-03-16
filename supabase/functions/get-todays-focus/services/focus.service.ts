import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import { parseISO8601Duration } from '../../_shared/utils/date.utils.ts';
import { FocusProjectResult } from '../types/focus.types.ts';

export class FocusService {
  constructor(private readonly projectsRepo: ProjectsRepository) {}

  async calculateTodaysFocus(
    browserId: string,
    clockify: ClockifyService,
    userId: string,
  ): Promise<FocusProjectResult[]> {
    const projects = await this.projectsRepo.getActiveProjects(browserId);

    const today = new Date();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;

    if (isWeekend || projects.length === 0) {
      return [];
    }

    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ).toISOString();
    const timeEntries = await clockify.fetchUserTimeEntries(
      userId,
      startOfMonth,
      today.toISOString(),
    );

    const remainingWorkdays = this.getRemainingWorkdays(today);

    const focusList = projects
      .map((p) => {
        const loggedSeconds = timeEntries
          .filter((te) => te.projectId === p.clockify_project_id)
          .reduce(
            (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
            0,
          );

        const loggedHours = loggedSeconds / 3600;
        const remainingHours = p.target_hours - loggedHours;
        const requiredDailyPace =
          remainingHours > 0 ? remainingHours / remainingWorkdays : 0;

        return {
          name: p.name,
          requiredHoursToday: Math.round(requiredDailyPace * 100) / 100,
        };
      })
      .filter((p) => p.requiredHoursToday > 0);

    return focusList;
  }

  private getRemainingWorkdays(today: Date): number {
    let remainingWorkdays = 0;
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = today.getDate(); day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        remainingWorkdays++;
      }
    }
    return remainingWorkdays > 0 ? remainingWorkdays : 1;
  }
}
