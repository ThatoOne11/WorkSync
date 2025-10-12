import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
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
})
export class ProjectForm implements OnChanges {
  @Input() project?: Project;
  @Input() clockifyProjects: { id: string; name: string }[] = [];
  @Output() save = new EventEmitter<Partial<Project>>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      id: [null],
      clockify_project_id: ['', Validators.required],
      target_hours: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['project'] && this.project) {
      this.form.patchValue(this.project);
    } else if (changes['project'] && !this.project) {
      this.form.reset();
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      const selectedProject = this.clockifyProjects.find(
        (p) => p.id === formValue.clockify_project_id
      );

      const projectToSave: Partial<Project> = formValue.id
        ? {
            // When updating, we only need to send the changed values
            id: formValue.id,
            target_hours: formValue.target_hours,
            // The name and clockify_project_id are not editable on update
          }
        : {
            // When creating, we derive the name from the selection
            name: selectedProject?.name,
            target_hours: formValue.target_hours,
            clockify_project_id: formValue.clockify_project_id,
          };

      this.save.emit(projectToSave);
      this.form.reset();
    }
  }
}
