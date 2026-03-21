import { DeleteUserDataService } from './services/delete-user-data.service.ts';
import {
  DeleteUserDataRequest,
  DeleteUserDataSchema,
} from './types/delete.types.ts';
import { ValidationError } from '../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../_shared/utils/error.utils.ts';

export class DeleteUserDataOrchestrator {
  constructor(private readonly service: DeleteUserDataService) {}

  async execute(req: Request): Promise<Response> {
    let body: DeleteUserDataRequest;

    try {
      const rawBody = await req.json();
      body = DeleteUserDataSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    await this.service.deleteData(body.browserId);

    return new Response(
      JSON.stringify({ message: 'User data deleted successfully.' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
