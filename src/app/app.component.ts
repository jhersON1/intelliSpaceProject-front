import { Component } from '@angular/core';
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { NavbarComponent } from "./core/components/navbar/navbar.component";

@Component({
  selector: 'app-root',
  imports: [DashboardComponent, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'intelliSpace-front';
}
