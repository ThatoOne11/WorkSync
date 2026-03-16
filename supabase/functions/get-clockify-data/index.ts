import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ClockifyDataService } from './services/clockify-data.service.ts';
import { ClockifyDataController } from './controllers/clockify-data.controller.ts';

Deno.serve(
  withEdgeWrapper('Get-Clockify-Data', async (req: Request) => {
    const service = new ClockifyDataService();
    const controller = new ClockifyDataController(service);

    return await controller.handleRequest(req);
  }),
);
