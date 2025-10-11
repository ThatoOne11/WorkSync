import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodayFocus } from './today-focus';

describe('TodayFocus', () => {
  let component: TodayFocus;
  let fixture: ComponentFixture<TodayFocus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodayFocus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodayFocus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
