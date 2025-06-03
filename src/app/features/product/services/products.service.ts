import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap, map } from 'rxjs';
import { Product, CreateProduct, UpdateProduct } from '../interfaces/product.interface';
import { TokenService } from '../../../auth/services/token.service';
import { environment } from '@environments/environments';
import { API_ROUTES } from 'src/app/core/constants';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly baseUrl: string = environment.baseUrl;

  public findAllProducts(limit = 10, offset = 0): Observable<PaginatedResponse<Product>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    // Por ahora, simularemos la respuesta paginada hasta que el backend la implemente
    return this.http.get<Product[]>(`${this.baseUrl}${API_ROUTES.CONSUMER_PRODUCTS}`, { params }).pipe(
      tap(products => {
        console.log('🔍 Productos recibidos del backend:', products);
        console.log('📊 Cantidad de productos:', products.length);
        console.log('📄 Parámetros de paginación - limit:', limit, 'offset:', offset);
      }),
      // Transformamos la respuesta para incluir información de paginación
      tap(products => {
        // Si recibimos menos productos que el límite, significa que hemos llegado al final
        const hasMore = products.length === limit;
        console.log('🔄 ¿Hay más páginas?', hasMore);
      }),      // Mapear a la estructura de respuesta paginada
      map((products: Product[]) => {
        const hasMore = products.length === limit;
        // Estimamos el total basado en si hay más páginas
        const estimatedTotal = hasMore ? (offset + limit + 1) : (offset + products.length);
        
        return {
          data: products,
          total: estimatedTotal, // Esto es una estimación hasta que el backend nos dé el total real
          limit: limit,
          offset: offset,
          hasMore: hasMore
        } as PaginatedResponse<Product>;
      })
    );
  }
  public findVendorProducts(limit = 10, offset = 0): Observable<PaginatedResponse<Product>> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.FIND_VENDOR_PRODUCTS}`;

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<Product[]>(url, { params, headers }).pipe(
      tap(products => {
        console.log('🔍 Productos del vendor recibidos del backend:', products);
        console.log('📊 Cantidad de productos del vendor:', products.length);
      }),
      map((products: Product[]) => {
        const hasMore = products.length === limit;
        const estimatedTotal = hasMore ? (offset + limit + 1) : (offset + products.length);
        
        return {
          data: products,
          total: estimatedTotal,
          limit: limit,
          offset: offset,
          hasMore: hasMore
        } as PaginatedResponse<Product>;
      })
    );
  }

  public getVendorProduct(id: string): Observable<Product> {
    const url = `${this.baseUrl}${API_ROUTES.GET_VENDOR_PRODUCT}/${id}`;

    return this.http.get<Product>(url);
  }
  public createProduct(createProduct: CreateProduct): Observable<Product> {
    console.log('🏭 ProductsService.createProduct iniciado');
    console.log('📦 Datos del producto a enviar:', createProduct);
    
    const token = this.tokenService.getToken();
    console.log('🔑 Token obtenido:', token ? 'Token presente' : 'Token NO encontrado');
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.CREATE_VENDOR_PRODUCTS}`;
    console.log('🌐 URL de la petición:', url);
    console.log('📋 Headers de la petición:', headers);

    return this.http.post<Product>(url, createProduct, { headers }).pipe(
      tap({
        next: (response) => {
          console.log('✅ ProductsService.createProduct - Respuesta exitosa:', response);
          console.log('🆔 ID del producto creado:', response.id);
        },
        error: (error) => {
          console.error('❌ ProductsService.createProduct - Error:', error);
          console.error('📊 Status del error:', error.status);
          console.error('📝 Mensaje del error:', error.message);
          console.error('🔍 Detalle completo del error:', error.error);
        }
      })
    );
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
