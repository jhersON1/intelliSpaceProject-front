import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environments';
import { Observable } from 'rxjs';
import { Category } from '../interfaces/category.interface';
import { API_ROUTES } from 'src/app/core/constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private readonly baseUrl: string = environment.baseUrl;

  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}${API_ROUTES.GET_CATEGORIES}`);
  }
}
