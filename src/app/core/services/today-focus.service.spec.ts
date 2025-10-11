import { TestBed } from '@angular/core/testing';

import { TodayFocusService } from './today-focus.service';

describe('TodayFocusService', () => {
  let service: TodayFocusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodayFocusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
