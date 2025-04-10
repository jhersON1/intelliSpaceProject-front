import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isNavbarHidden = false;
  private lastScrollTop = 0;
  private scrollThreshold = 5; // Minimum scroll amount to trigger hide/show

  constructor() { }

  ngOnInit(): void {
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Determine scroll direction
    if (currentScrollTop > this.lastScrollTop && currentScrollTop > 50) {
      // Scrolling down & not at the top
      this.isNavbarHidden = true;
    } else {
      // Scrolling up or at the top
      this.isNavbarHidden = false;
    }
    
    // Update scroll position
    this.lastScrollTop = currentScrollTop;
  }
}
