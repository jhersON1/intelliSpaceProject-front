import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms-and-conditions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms-and-conditions.component.html',
  styleUrl: './terms-and-conditions.component.css'
})
export class TermsAndConditionsComponent {
  
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }
}
