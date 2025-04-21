import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
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
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227233/taller%20de%20grado/wood1_vkp2st.png'
    },
    {
      id: 2,
      name: 'Table wood 2',
      company: 'Company name 2',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227313/taller%20de%20grado/wood2_meqhys.jpg'
    },
    {
      id: 3,
      name: 'Table wood 3',
      company: 'Company name 3',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227446/taller%20de%20grado/wood3_glmj46.png'
    },
    {
      id: 4,
      name: 'Table wood 4',
      company: 'Company name 4',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227448/taller%20de%20grado/wood4_tfrvtd.png'
    },
    {
      id: 5,
      name: 'Table wood 5',
      company: 'Company name 5',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227447/taller%20de%20grado/wood5_mycsor.png'
    },
    {
      id: 6,
      name: 'Table wood 6',
      company: 'Company name 6',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227460/taller%20de%20grado/wood6_hqmu5z.png'
    }
  ];

  // Categorías para explorar
  categories = [
    {
      id: 1,
      name: 'Sofas',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227628/taller%20de%20grado/sofas_usny6x.png'
    },
    {
      id: 2,
      name: 'Kitchen',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227630/taller%20de%20grado/kitchen_m9r2tw.png'
    },
    {
      id: 3,
      name: 'Lamp',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227627/taller%20de%20grado/lamp_umv5pt.png'
    },
    {
      id: 4,
      name: 'Table',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227636/taller%20de%20grado/table_gjuqbo.png'
    }
  ];

}
