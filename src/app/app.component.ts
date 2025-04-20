import { Component } from '@angular/core';
import { NavbarComponent } from "./core/components/navbar/navbar.component";
import { FooterComponent } from './core/components/footer/footer.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'intelliSpace-front';
}
