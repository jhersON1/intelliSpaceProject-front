import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environments';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../../../core/constants';
import { Product } from '../interfaces/product.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private http = inject(HttpClient);
  private readonly baseUrl: string = environment.baseUrl;

  findAllProducts(limit = 10, offset = 0): Observable<Product[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<Product[]>(`${this.baseUrl}${API_ROUTES.CONSUMER_PRODUCTS}`, { params });
  }
}
