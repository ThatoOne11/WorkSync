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
  @Output() cancel = new EventEmitter<void>();

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
      this.form.get('clockify_project_id')?.disable();
    } else if (changes['project'] && !this.project) {
      this.form.reset();
      this.form.get('clockify_project_id')?.enable();
    }
  }

  onSubmit() {
    if (this.form.valid) {
      // FIX: Emit the raw form value. The parent component is now responsible for finding the name.
      this.save.emit(this.form.getRawValue());
      this.form.reset();
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
