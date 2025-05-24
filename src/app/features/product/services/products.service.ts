import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product, CreateProduct, UpdateProduct } from '../interfaces/product.interface';
import { TokenService } from '../../../auth/services/token.service';
import { environment } from '@environments/environments';
import { API_ROUTES } from 'src/app/core/constants';


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

  public getVendorProduct(id: string): Observable<Product> {
    const url = `${this.baseUrl}${API_ROUTES.GET_VENDOR_PRODUCT}/${id}`;

    return this.http.get<Product>(url);
  }

  public createProduct(createProduct: CreateProduct): Observable<Product> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.CREATE_VENDOR_PRODUCTS}`;

    return this.http.post<Product>(url, createProduct, { headers });
  }

  public updateProduct(productId: string, body: UpdateProduct): Observable<Product> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.UPDATE_VENDOR_PRODUCT}/${productId}`;

    return this.http.patch<Product>(url, body, { headers });
  }

  public getProductDetail(id: string): Observable<Product> {
    const url = `${this.baseUrl}${API_ROUTES.GET_PRODUCT_DETAIL}/${id}`;

    return this.http.get<Product>(url);
  }

}
