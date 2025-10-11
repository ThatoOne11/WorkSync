import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ClockifyService } from '../../core/services/clockify.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // For notifications

@Component({
  selector: 'app-settings',
  standalone: true, // Ensure standalone is true
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit {
  form: FormGroup;
  private clockifyService = inject(ClockifyService);
  private snackBar = inject(MatSnackBar);

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      apiKey: ['', Validators.required],
      workspaceId: ['', Validators.required],
      userId: ['', Validators.required]
    });
  }

  ngOnInit() {
    const settings = localStorage.getItem('work-sync-settings');
    if (settings) {
      this.form.patchValue(JSON.parse(settings));
    }
  }

  onSubmit() {
    if (this.form.valid) {
      localStorage.setItem('work-sync-settings', JSON.stringify(this.form.value));
      this.snackBar.open('Settings saved!', 'Close', { duration: 3000 });
    }
  }

  fetchUserId() {
    const apiKey = this.form.get('apiKey')?.value;
    if (!apiKey) {
      this.snackBar.open('Please enter your Clockify API Key first.', 'Close', { duration: 3000 });
      return;
    }

    this.clockifyService.getCurrentUserId(apiKey).subscribe({
      next: (user: any) => {
        if (user && user.id) {
          this.form.patchValue({ userId: user.id });
          this.snackBar.open('User ID fetched successfully!', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Could not fetch User ID. Check your API Key.', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        console.error('Error fetching user ID:', err);
        this.snackBar.open('Error fetching User ID. Check console for details.', 'Close', { duration: 3000 });
      }
    });
  }
}