import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  // Propiedades para controlar la UI
  loading = false;
  allProducts: Product[] = [];
  displayedProducts: Product[] = [];
  searchTerm = '';
  
  // Propiedades para paginación
  currentPage = 1;
  pageSize = 10; // Cambiado de 12 a 10
  totalItems = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.loadProducts();
  }

  // Método para cargar los productos
  loadProducts(): void {
    this.loading = true;
    
    // Obtenemos todos los productos pero solo mostramos los de la página actual
    this.allProducts = this.getMockProducts();
    this.totalItems = this.allProducts.length;
    this.calculateTotalPages();
    this.updateDisplayedProducts();
    this.loading = false;
  }

  // Actualiza los productos mostrados según la página actual
  updateDisplayedProducts(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.totalItems);
    this.displayedProducts = this.allProducts.slice(startIndex, endIndex);
  }

  // Métodos para navegación
  viewDetails(product: Product): void {
    console.log('Ver detalles del producto:', product);
    // Implementar navegación al detalle del producto
  }

  addToCart(product: Product): void {
    console.log('Añadir al carrito:', product);
    // Implementar lógica para añadir al carrito
  }

  // Métodos para paginación
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedProducts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedProducts();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updateDisplayedProducts();
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Si hay pocas páginas, mostrar todas
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica para mostrar un número limitado de páginas
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, start + maxPagesToShow - 1);
      
      // Ajustar si estamos cerca del final
      if (end === this.totalPages) {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  // Datos de muestra para pruebas
  private getMockProducts(): Product[] {
    return [
      {
        id: 1,
        name: 'Laptop HP Pavilion',
        description: 'Laptop potente con procesador i7, 16GB RAM y 512GB SSD',
        price: 999.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=Laptop',
        category: 'Electrónica'
      },
      {
        id: 2,
        name: 'Smartphone Samsung Galaxy',
        description: 'Smartphone con pantalla AMOLED, cámara de 48MP y batería de larga duración',
        price: 799.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=Smartphone',
        category: 'Móviles'
      },
      {
        id: 3,
        name: 'Auriculares Bluetooth Sony',
        description: 'Auriculares con cancelación de ruido y 30 horas de batería',
        price: 249.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=Auriculares',
        category: 'Audio'
      },
      {
        id: 4,
        name: 'Monitor 4K LG',
        description: 'Monitor UltraHD de 32 pulgadas con tecnología HDR',
        price: 349.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=Monitor',
        category: 'Electrónica'
      },
      {
        id: 5,
        name: 'Teclado Mecánico Logitech',
        description: 'Teclado gaming con switches mecánicos y RGB personalizable',
        price: 129.99,
        category: 'Periféricos'
      },
      {
        id: 6,
        name: 'SSD Samsung 1TB',
        description: 'Disco de estado sólido ultrarrápido con interfaz NVMe',
        price: 179.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=SSD',
        category: 'Componentes'
      },
      {
        id: 7,
        name: 'SSD Samsung 1TB',
        description: 'Disco de estado sólido ultrarrápido con interfaz NVMe',
        price: 179.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=SSD',
        category: 'Componentes'
      },
      {
        id: 8,
        name: 'SSD Samsung 1TB',
        description: 'Disco de estado sólido ultrarrápido con interfaz NVMe',
        price: 179.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=SSD',
        category: 'Componentes'
      },
      {
        id: 9,
        name: 'SSD Samsung 1TB',
        description: 'Disco de estado sólido ultrarrápido con interfaz NVMe',
        price: 179.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=SSD',
        category: 'Componentes'
      },
      {
        id: 10,
        name: 'SSD Samsung 1TB',
        description: 'Disco de estado sólido ultrarrápido con interfaz NVMe',
        price: 179.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=SSD',
        category: 'Componentes'
      },
      {
        id: 11,
        name: 'SSD Samsung 1TB',
        description: 'Disco de estado sólido ultrarrápido con interfaz NVMe',
        price: 179.99,
        imageUrl: 'https://via.placeholder.com/300x200?text=SSD',
        category: 'Componentes'
      }
    ];
  }
}
