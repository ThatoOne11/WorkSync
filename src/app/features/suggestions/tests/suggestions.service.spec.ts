import { TestBed } from '@angular/core/testing';
import { SuggestionsService } from '../services/suggestions.service';
import { EdgeApiService } from '../../../core/services/edge-api.service';
import { STORAGE_CONSTANTS } from '../../../shared/constants/storage.constants';
import { APP_CONSTANTS } from '../../../shared/constants/app.constants';
import { of } from 'rxjs';

describe('SuggestionsService Caching Suite', () => {
  let service: SuggestionsService;
  let mockEdgeApi: jasmine.SpyObj<EdgeApiService>;

  beforeEach(() => {
    // Mock the Edge API to return a fake "Fresh" response
    mockEdgeApi = jasmine.createSpyObj('EdgeApiService', ['invoke']);
    mockEdgeApi.invoke.and.returnValue(
      of({ suggestions: ['Fresh AI Insight'] }),
    );

    TestBed.configureTestingModule({
      providers: [
        SuggestionsService,
        { provide: EdgeApiService, useValue: mockEdgeApi },
      ],
    });

    service = TestBed.inject(SuggestionsService);
    localStorage.clear();
  });

  it('should return cached data and NOT call the API if cache is valid (< 1 hr)', (done) => {
    // Seed a valid cache from 5 minutes ago
    const validTimestamp = Date.now() - 5 * 60 * 1000;
    localStorage.setItem(
      STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY,
      JSON.stringify({ data: ['Cached Insight'], timestamp: validTimestamp }),
    );

    service.getSuggestions().subscribe((result) => {
      expect(result).toEqual(['Cached Insight']);

      // CRITICAL: Prove the API was bypassed to save costs
      expect(mockEdgeApi.invoke).not.toHaveBeenCalled();
      done();
    });
  });

  it('should call the API if the cache is expired (> 1 hr)', (done) => {
    // Seed an expired cache from 2 hours ago
    const expiredTimestamp =
      Date.now() - (APP_CONSTANTS.AI_CACHE_TTL_MS + 1000);
    localStorage.setItem(
      STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY,
      JSON.stringify({ data: ['Old Insight'], timestamp: expiredTimestamp }),
    );

    service.getSuggestions().subscribe((result) => {
      // It should ignore the old insight and fetch the new one
      expect(result).toEqual(['Fresh AI Insight']);
      expect(mockEdgeApi.invoke).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('should call the API if the cache does not exist', (done) => {
    expect(
      localStorage.getItem(STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY),
    ).toBeNull();

    service.getSuggestions().subscribe((result) => {
      expect(result).toEqual(['Fresh AI Insight']);
      expect(mockEdgeApi.invoke).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
