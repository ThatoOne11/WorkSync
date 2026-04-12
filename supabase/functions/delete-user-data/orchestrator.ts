import { DeleteUserDataService } from './services/delete-user-data.service.ts';
import { DeleteUserDataSchema } from './types/delete.types.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';

export class DeleteUserDataOrchestrator {
  constructor(private readonly service: DeleteUserDataService) {}

  async execute(req: Request): Promise<Response> {
    try {
      const body = await parseRequest(req, DeleteUserDataSchema);

      await this.service.deleteData(body.browserId);

      return jsonResponse({
        success: true,
        data: { message: 'User data deleted successfully.' },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown exception occurred.';
      console.error(
        `[${this.constructor.name}] Critical Failure:`,
        errorMessage,
      );
      return jsonResponse({ success: false, error: errorMessage }, 400);
    }
  }
}
