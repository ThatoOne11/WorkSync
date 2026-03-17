import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { Project } from '../../../../shared/schemas/app.schemas';

interface DialogData {
  projects: Project[];
  months: string[];
}

@Component({
  selector: 'app-backfill-dialog',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './backfill-dialog.html',
  styleUrls: ['./backfill-dialog.scss'],
})
export class BackfillDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef: MatDialogRef<BackfillDialog> = inject(MatDialogRef);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  readonly form: FormGroup = this.fb.group({
    projects: this.fb.array([]),
  });

  readonly months: string[] = this.data.months;

  ngOnInit(): void {
    this.data.projects.forEach((project) => {
      this.projectsArray.push(this.createProjectGroup(project));
    });
  }

  get projectsArray(): FormArray {
    return this.form.get('projects') as FormArray;
  }

  private createProjectGroup(project: Project): FormGroup {
    const group = this.fb.group({
      projectId: [project.id],
      projectName: [project.name],
    }) as FormGroup;

    this.months.forEach((month) => {
      group.addControl(
        month.toLowerCase(),
        this.fb.control(null, [Validators.min(0)]),
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
