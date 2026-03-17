import {
  Component,
  output,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Project } from '../../../../core/models/project.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-project-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectList {
  projects = input.required<Project[]>();

  edit = output<Project>();
  delete = output<number>();

  displayedColumns: string[] = ['name', 'target_hours', 'actions'];
}
