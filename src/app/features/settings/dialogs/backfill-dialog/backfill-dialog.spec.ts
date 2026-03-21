import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackfillDialog } from './backfill-dialog';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('BackfillDialog', () => {
  let component: BackfillDialog;
  let fixture: ComponentFixture<BackfillDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackfillDialog],
      providers: [
        provideAnimationsAsync(),
        // Mock the required Dialog injectables
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { projects: [], months: [] } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BackfillDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
