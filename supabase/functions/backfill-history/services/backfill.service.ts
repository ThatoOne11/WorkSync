import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import {
  SummariesRepository,
  DBWeeklySummary,
} from '../../_shared/repo/summaries.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { parseISO8601Duration } from '../../_shared/utils/date.utils.ts';
import { HistoricalTarget } from '../types/backfill.types.ts';
import { BackfillHelper } from '../helpers/backfill.helper.ts';

export class BackfillService {
  constructor(
    private readonly projectsRepo: ProjectsRepository,
    private readonly summariesRepo: SummariesRepository,
  ) {}

  async runBackfill(
    browserId: string,
    historicalTargets: HistoricalTarget[],
    clockify: ClockifyService,
    userId: string,
  ): Promise<{ message: string }> {
    const projects = await this.projectsRepo.getActiveProjects(browserId);
    if (projects.length === 0) {
      throw new Error('No active projects found for this user.');
    }

    const targetMap = BackfillHelper.buildTargetMap(historicalTargets);
    const today = new Date();
    const allSummaries: DBWeeklySummary[] = [];
    const WEEKS_TO_BACKFILL = 12;

    for (let i = 0; i < WEEKS_TO_BACKFILL; i++) {
      const { start, end, weekEndingOn } =
        BackfillHelper.getTrailingWeekBoundaries(i, today);
      const timeEntries = await clockify.fetchUserTimeEntries(
        userId,
        start,
        end,
      );

      const weeklySummaries: DBWeeklySummary[] = projects.map((project) => {
        const loggedSeconds = timeEntries
          .filter((te) => te.projectId === project.clockify_project_id)
          .reduce(
            (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
            0,
          );

        const loggedHours = loggedSeconds / 3600;

        // Match boundary dates to target map keys to grab the right allocated hours
        const boundaryDate = new Date(end);
        const historicalKey = `${project.id}-${boundaryDate.getFullYear()}-${boundaryDate.getMonth()}`;
        const isCurrentMonth =
          boundaryDate.getFullYear() === today.getFullYear() &&
          boundaryDate.getMonth() === today.getMonth();

        const target_hours =
          targetMap.get(historicalKey) ??
          (isCurrentMonth ? project.target_hours : 0);

        return {
          project_id: project.id,
          user_id: browserId,
          target_hours,
          logged_hours: loggedHours,
          week_ending_on: weekEndingOn,
        };
      });

      allSummaries.push(...weeklySummaries);
    }

    await this.summariesRepo.upsertSummaries(allSummaries);

    return {
      message: `Successfully backfilled ${allSummaries.length} historical records.`,
    };
  }
}
