import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { STORAGE_CONSTANTS } from '../../shared/constants/storage.constants';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  public readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        global: {
          // Intercept every request to inject the secure browser ID header
          fetch: (url, options = {}) => {
            const browserId = localStorage.getItem(
              STORAGE_CONSTANTS.BROWSER_ID_KEY,
            );
            if (browserId) {
              const headers = new Headers(options.headers);
              headers.set('x-browser-id', browserId);
              options.headers = headers;
            }
            return fetch(url, options);
          },
        },
      },
    );
  }
}
