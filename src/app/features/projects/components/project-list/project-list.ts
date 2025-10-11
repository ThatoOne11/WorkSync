import {
  Component,
  input,
  output,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Project } from '../../../../core/models/project.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProjectHistory } from '../../../project-history/project-history';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  projects = input.required<Project[]>();
  edit = output<Project>();
  delete = output<number>();

  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['name', 'target_hours', 'actions'];

  onEdit(project: Project) {
    this.edit.emit(project);
  }

  onDelete(id: number) {
    this.delete.emit(id);
  }

  onShowHistory(project: Project) {
    this.dialog.open(ProjectHistory, {
      width: '800px',
      data: { project },
    });
  }
}
