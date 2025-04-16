import { Component } from '@angular/core';
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { NavbarComponent } from "./core/components/navbar/navbar.component";
import { FooterComponent } from './core/components/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'intelliSpace-front';
}
