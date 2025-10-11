import {
  Component,
  input,
  output,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Project } from '../../../../core/models/project.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectForm implements OnChanges {
  project = input<Project | undefined>();
  clockifyProjects = input<{ id: string; name: string }[]>([]);
  save = output<Partial<Project>>();

  form: FormGroup;
  private fb = inject(FormBuilder);

  constructor() {
    this.form = this.fb.group({
      id: [null],
      clockify_project_id: ['', Validators.required],
      name: [{ value: '', disabled: true }, Validators.required],
      target_hours: [0, [Validators.required, Validators.min(1)]],
    });

    this.form.get('clockify_project_id')?.valueChanges.subscribe((id) => {
      const selectedProject = this.clockifyProjects().find((p) => p.id === id);
      this.form.get('name')?.setValue(selectedProject?.name ?? '');
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['project']) {
      const currentProject = this.project();
      if (currentProject) {
        this.form.patchValue(currentProject);
      } else {
        this.form.reset();
      }
    }

    if (changes['clockifyProjects']) {
      const selectedId = this.form.get('clockify_project_id')?.value;
      if (selectedId) {
        const selectedProject = this.clockifyProjects().find(
          (p) => p.id === selectedId
        );
        this.form.get('name')?.setValue(selectedProject?.name ?? '');
      }
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      this.save.emit(formValue);
      this.form.reset();
    }
  }
}
