import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  effect,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Project } from '../../../../shared/schemas/app.schemas';

export type ProjectFormModel = {
  id: FormControl<number | null>;
  clockify_project_id: FormControl<string>;
  target_hours: FormControl<number>;
};

@Component({
  selector: 'app-project-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
})
export class ProjectForm {
  project = input<Project | undefined>(undefined);
  clockifyProjects = input.required<{ id: string; name: string }[]>();

  save = output<Partial<Project>>();
  cancel = output<void>();

  readonly form = new FormGroup<ProjectFormModel>({
    id: new FormControl<number | null>(null),
    clockify_project_id: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    target_hours: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  constructor() {
    effect(() => {
      const p = this.project();
      if (p) {
        this.form.patchValue({
          id: p.id ?? null,
          clockify_project_id: p.clockify_project_id ?? '',
          target_hours: p.target_hours ?? 0,
        });
        this.form.controls.clockify_project_id.disable();
      } else {
        this.form.reset();
        this.form.controls.clockify_project_id.enable();
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.save.emit(this.form.getRawValue() as Partial<Project>);
      this.form.reset();
    }
  }
}
