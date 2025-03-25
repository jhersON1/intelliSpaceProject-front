import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  // Datos de productos que vendrían desde un servicio
  products = [
    {
      id: 1,
      name: 'Table wood 1',
      company: 'Company name 1',
      image: 'https://placehold.co/450x425'
    },
    {
      id: 2,
      name: 'Table wood 2',
      company: 'Company name 2',
      image: 'https://placehold.co/450x425'
    },
    {
      id: 3,
      name: 'Table wood 3',
      company: 'Company name 3',
      image: 'https://placehold.co/450x425'
    },
    {
      id: 4,
      name: 'Table wood 4',
      company: 'Company name 4',
      image: 'https://placehold.co/450x425'
    },
    {
      id: 5,
      name: 'Table wood 5',
      company: 'Company name 5',
      image: 'https://placehold.co/450x425'
    },
    {
      id: 6,
      name: 'Table wood 6',
      company: 'Company name 6',
      image: 'https://placehold.co/450x425'
    }
  ];

  // Categorías para explorar
  categories = [
    {
      id: 1,
      name: 'Sofas',
      image: 'https://placehold.co/435x396'
    },
    {
      id: 2,
      name: 'Kitchen',
      image: 'https://placehold.co/435x403'
    },
    {
      id: 3,
      name: 'Lamp',
      image: 'https://placehold.co/435x403'
    },
    {
      id: 4,
      name: 'Table',
      image: 'https://placehold.co/435x404'
    }
  ];

  // Fotos de los usuarios
  userPhotos = [
    'https://placehold.co/213x304',
    'https://placehold.co/350x248',
    'https://placehold.co/229x312',
    'https://placehold.co/267x197',
    'https://placehold.co/214x287',
    'https://placehold.co/317x205',
    'https://placehold.co/225x277',
    'https://placehold.co/330x344',
    'https://placehold.co/296x257'
  ];
}
