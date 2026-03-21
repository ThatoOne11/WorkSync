import { assertEquals } from 'jsr:@std/assert';
import { DeleteUserDataService } from '../services/delete-user-data.service.ts';
import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../../_shared/repo/summaries.repo.ts';

Deno.test('DeleteUserDataService Suite', async (t) => {
  let settingsDeleted = false;
  let projectsDeleted = false;
  let summariesDeleted = false;

  const mockSettingsRepo = {
    deleteUserData: (_userId: string) => {
      settingsDeleted = true;
      return Promise.resolve();
    },
  } as unknown as SettingsRepository;

  const mockProjectsRepo = {
    deleteUserData: (_userId: string) => {
      projectsDeleted = true;
      return Promise.resolve();
    },
  } as unknown as ProjectsRepository;

  const mockSummariesRepo = {
    deleteUserData: (_userId: string) => {
      summariesDeleted = true;
      return Promise.resolve();
    },
  } as unknown as SummariesRepository;

  const service = new DeleteUserDataService(
    mockSettingsRepo,
    mockProjectsRepo,
    mockSummariesRepo,
  );

  await t.step(
    'deleteData - successfully calls all repositories concurrently',
    async () => {
      await service.deleteData('browser_123');

      assertEquals(settingsDeleted, true);
      assertEquals(projectsDeleted, true);
      assertEquals(summariesDeleted, true);
    },
  );
});
