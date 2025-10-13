import { TestBed } from '@angular/core/testing';

import { ProjectHistoryService } from './project-history.service';

describe('ProjectHistoryService', () => {
  let service: ProjectHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
