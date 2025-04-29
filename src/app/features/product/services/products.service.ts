import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environments';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../../../core/constants';
import { Product, CreateProduct } from '../interfaces/product.interface';
import { TokenService } from '../../../auth/services/token.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly baseUrl: string = environment.baseUrl;

  public findAllProducts(limit = 10, offset = 0): Observable<Product[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<Product[]>(`${this.baseUrl}${API_ROUTES.CONSUMER_PRODUCTS}`, { params });
  }

  public findVendorProducts(limit = 10, offset = 0): Observable<Product[]> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.FIND_VENDOR_PRODUCTS}`;

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<Product[]>(url, { params, headers });
  }

  public createProduct(createProduct: CreateProduct): Observable<CreateProduct> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.CREATE_VENDOR_PRODUCTS}`;

    return this.http.post<CreateProduct>(url, createProduct, { headers });
  }
}
