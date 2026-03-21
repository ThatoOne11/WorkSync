import { DeleteUserDataService } from './services/delete-user-data.service.ts';
import { DeleteUserDataSchema } from './types/delete.types.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';

export class DeleteUserDataOrchestrator {
  constructor(private readonly service: DeleteUserDataService) {}

  async execute(req: Request): Promise<Response> {
    const body = await parseRequest(req, DeleteUserDataSchema);

    await this.service.deleteData(body.browserId);

    return jsonResponse({ message: 'User data deleted successfully.' });
  }
}
