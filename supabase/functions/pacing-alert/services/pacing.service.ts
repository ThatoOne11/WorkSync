import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import { AlertsRepository } from '../repo/alerts.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { EmailService } from '../../_shared/services/email.service.ts';
import {
  getWorkdaysInMonth,
  getPassedWorkdays,
  parseISO8601Duration,
} from '../../_shared/utils/date.utils.ts';
import { ProjectAnalysis } from '../../_shared/types/app.types.ts';
import { PacingAlertResult } from '../types/pacing.types.ts';
import { PacingHelper } from '../helpers/pacing.helper.ts';
import { buildPacingDigestTemplate } from '../templates/pacing-digest.template.ts';

export class PacingAlertService {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly alertsRepo: AlertsRepository,
    private readonly emailService: EmailService,
  ) {}

  async processAlerts(): Promise<PacingAlertResult> {
    const usersSettings = await this.settingsRepo.getAllUsersSettings();
    const messages: string[] = [];
    const today = new Date();

    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ).toISOString();
    const totalWorkdays = getWorkdaysInMonth(
      today.getFullYear(),
      today.getMonth(),
    );
    const passedWorkdays = getPassedWorkdays(today);

    for (const [userId, user] of Object.entries(usersSettings)) {
      if (user.enablePacingAlerts !== 'true' || !user.notificationEmail)
        continue;
      if (
        !user.clockifyApiKey ||
        !user.clockifyWorkspaceId ||
        !user.clockifyUserId
      )
        continue;

      try {
        const projects = await this.projectsRepo.getActiveProjects(userId);
        if (projects.length === 0) continue;

        const clockify = new ClockifyService(
          user.clockifyApiKey,
          user.clockifyWorkspaceId,
        );
        const timeEntries = await clockify.fetchUserTimeEntries(
          user.clockifyUserId,
          startOfMonth,
          today.toISOString(),
        );

        const projectAnalysis: ProjectAnalysis[] = projects.map((p) => {
          const loggedSeconds = timeEntries
            .filter((te) => te.projectId === p.clockify_project_id)
            .reduce(
              (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
              0,
            );

          const loggedHours = loggedSeconds / 3600;
          const projectedHours = (loggedHours / passedWorkdays) * totalWorkdays;
          return {
            id: p.id,
            name: p.name,
            variance: projectedHours - p.target_hours,
          };
        });

        const projectsToAlert = projectAnalysis.filter(
          (p) => Math.abs(p.variance) > 2,
        );

        if (projectsToAlert.length > 0) {
          // Construct the email locally
          const rowsHtml = PacingHelper.buildProjectRows(projectsToAlert);
          const emailHtml = buildPacingDigestTemplate(rowsHtml);

          await this.emailService.sendEmail(
            user.notificationEmail,
            'Your Daily Pacing Digest',
            emailHtml,
          );
          messages.push(`Pacing digest sent to ${user.notificationEmail}.`);

          const alertsToUpsert = projectsToAlert.map((p) => ({
            project_id: p.id,
            user_id: userId,
            alert_sent_at: new Date().toISOString(),
          }));
          await this.alertsRepo.upsertAlerts(alertsToUpsert);
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        messages.push(`Failed to process user ${userId}: ${errMsg}`);
        console.error(`Error processing user ${userId}:`, errMsg);
      }
    }

    return { message: 'Pacing analysis complete.', details: messages };
  }
}
