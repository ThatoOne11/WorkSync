import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notificationService = inject(NotificationService);

  handleError(error: any): void {
    console.error('An error occurred:', error);
    this.notificationService.showError(
      'An unexpected error occurred. Please try again later.'
    );
  }
}
