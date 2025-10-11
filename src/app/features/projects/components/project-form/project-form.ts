import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Project } from '../../../../core/models/project.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select'; // Import MatSelectModule

@Component({
  selector: 'app-project-form',
  standalone: true, // Ensure standalone is true
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss'
})
export class ProjectForm implements OnChanges {
  @Input() project?: Project;
  @Input() clockifyProjects: { id: string; name: string; }[] = []; // Re-added input for Clockify projects
  @Output() save = new EventEmitter<Partial<Project>>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      id: [null],
      clockify_project_id: ['', Validators.required], // Corrected form control name
      name: [{ value: '', disabled: true }, Validators.required], // Name will be derived
      target_hours: [0, [Validators.required, Validators.min(1)]]
    });

    // Listen for changes in clockify_project_id to update the name
    this.form.get('clockify_project_id')?.valueChanges.subscribe(clockify_project_id => {
      const selectedProject = this.clockifyProjects.find(p => p.id === clockify_project_id);
      if (selectedProject) {
        this.form.get('name')?.setValue(selectedProject.name);
      } else {
        this.form.get('name')?.setValue('');
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['project'] && this.project) {
      this.form.patchValue(this.project);
    } else if (changes['project'] && !this.project) { // Clear form when project is undefined (new project)
      this.form.reset();
    }
    // If clockifyProjects change, and a project is selected, ensure name is updated
    if (changes['clockifyProjects'] && this.form.get('clockify_project_id')?.value) {
      const selectedProject = this.clockifyProjects.find(p => p.id === this.form.get('clockify_project_id')?.value);
      if (selectedProject) {
        this.form.get('name')?.setValue(selectedProject.name);
      } else {
        this.form.get('name')?.setValue('');
      }
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.getRawValue(); // Use getRawValue to get disabled fields
      const projectToSave: Partial<Project> = formValue.id
        ? { ...formValue, name: formValue.name } // Include name for update
        : {
            name: formValue.name,
            target_hours: formValue.target_hours,
            clockify_project_id: formValue.clockify_project_id // Corrected property name
          };

      this.save.emit(projectToSave);
      this.form.reset();
    }
  }
}