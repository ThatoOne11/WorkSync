import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackfillDialog } from './backfill-dialog';

describe('BackfillDialog', () => {
  let component: BackfillDialog;
  let fixture: ComponentFixture<BackfillDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackfillDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackfillDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
