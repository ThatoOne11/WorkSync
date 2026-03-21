import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../../_shared/repo/summaries.repo.ts';

export class DeleteUserDataService {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly summariesRepo: SummariesRepository,
  ) {}

  async deleteData(browserId: string): Promise<void> {
    // Concurrently delete from all tables
    await Promise.all([
      this.settingsRepo.deleteUserData(browserId),
      this.projectsRepo.deleteUserData(browserId),
      this.summariesRepo.deleteUserData(browserId),
    ]);
  }
}
