import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Project } from '../../../../core/models/project.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

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

  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    id: [null],
    clockify_project_id: ['', Validators.required],
    target_hours: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    effect(() => {
      const p = this.project();
      if (p) {
        this.form.patchValue(p);
        this.form.get('clockify_project_id')?.disable();
      } else {
        this.form.reset();
        this.form.get('clockify_project_id')?.enable();
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.getRawValue());
      this.form.reset();
    }
  }
}
