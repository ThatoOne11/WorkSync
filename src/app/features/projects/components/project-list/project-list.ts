import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Project } from '../../../../core/models/project.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectList {
  @Input() projects: Project[] = [];
  @Output() edit = new EventEmitter<Project>();
  @Output() delete = new EventEmitter<number>();

  displayedColumns: string[] = ['name', 'target_hours', 'actions'];

  onEdit(project: Project) {
    this.edit.emit(project);
  }

  onDelete(id: number) {
    this.delete.emit(id);
  }
}
