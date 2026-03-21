import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { GetClockifyDataRequest } from '../types/clockify-data.types.ts';

export class ClockifyDataService {
  async processAction(
    body: GetClockifyDataRequest,
    clockify: ClockifyService,
  ): Promise<unknown> {
    switch (body.action) {
      case 'getCurrentUserId':
        return await clockify.getCurrentUser();

      case 'getClockifyProjects':
        return await clockify.getProjects();

      case 'getTimeEntries':
        if (!body.userId)
          throw new Error('userId is required for getTimeEntries.');
        return await clockify.fetchUserTimeEntries(
          body.userId,
          body.start || new Date(0).toISOString(),
          body.end || new Date().toISOString(),
        );

      default:
        throw new Error('Invalid action provided.');
    }
  }
}
