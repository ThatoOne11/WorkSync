import { z } from 'npm:zod';
import {
  ClockifyTimeEntry,
  ClockifyTimeEntrySchema,
} from '../types/clockify.types.ts';
import { fetchWithBackoff } from '../utils/api.utils.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';
import { ApiConstants } from '../constants/api.constants.ts';

export class ClockifyService {
  private readonly baseUrl = ApiConstants.CLOCKIFY_BASE_URL;
  private readonly headers: HeadersInit;

  constructor(
    apiKey: string,
    private readonly workspaceId?: string,
  ) {
    this.headers = { 'X-Api-Key': apiKey };
  }

  async fetchUserTimeEntries(
    userId: string,
    start: string,
    end: string,
    pageSize = 5000,
  ): Promise<ClockifyTimeEntry[]> {
    if (!this.workspaceId)
      throw new Error('Workspace ID required for time entries.');

    const params = new URLSearchParams({
      start,
      end,
      'page-size': pageSize.toString(),
    });

    const url = `${this.baseUrl}/workspaces/${this.workspaceId}/user/${userId}/time-entries?${params.toString()}`;
    const data = await this.get(url);

    return z.array(ClockifyTimeEntrySchema).parse(data);
  }

  async getCurrentUser(): Promise<unknown> {
    return await this.get(`${this.baseUrl}/user`);
  }

  async getProjects(): Promise<unknown> {
    if (!this.workspaceId)
      throw new Error('Workspace ID required for projects.');
    return await this.get(
      `${this.baseUrl}/workspaces/${this.workspaceId}/projects`,
    );
  }

  private async get(url: string): Promise<unknown> {
    const response = await fetchWithBackoff(url, { headers: this.headers });
    if (!response.ok) {
      const errorText = await response.text();
      throw new DownstreamSyncError(
        `Clockify API Error [${response.status}]: ${errorText}`,
      );
    }
    return response.json();
  }
}
