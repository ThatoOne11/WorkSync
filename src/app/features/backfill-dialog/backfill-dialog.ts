import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { Project } from '../../core/models/project.model';

interface DialogData {
  projects: Project[];
  months: string[];
}

@Component({
  selector: 'app-backfill-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './backfill-dialog.html',
  styleUrls: ['./backfill-dialog.scss'],
})
export class BackfillDialog implements OnInit {
  private fb = inject(FormBuilder);
  public dialogRef: MatDialogRef<BackfillDialog> = inject(MatDialogRef);
  public data: DialogData = inject(MAT_DIALOG_DATA);

  form: FormGroup;
  months: string[] = this.data.months;

  constructor() {
    this.form = this.fb.group({
      projects: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.data.projects.forEach((project) => {
      this.projectsArray.push(this.createProjectGroup(project));
    });
  }

  get projectsArray(): FormArray {
    return this.form.get('projects') as FormArray;
  }

  private createProjectGroup(project: Project): FormGroup {
    // --- FIX: Explicitly define the group to allow any string key ---
    const group = this.fb.group({
      projectId: [project.id],
      projectName: [project.name],
    }) as FormGroup; // Cast to a generic FormGroup

    this.months.forEach((month) => {
      // Now addControl works without a type error
      group.addControl(
        month.toLowerCase(),
        this.fb.control(null, [Validators.min(0)])
      );
    });
    return group;
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.projects);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
