import { Injectable } from '@angular/core';
import { AUTH_CONSTANTS } from '../../core/constants/index';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly storageKey: string = AUTH_CONSTANTS.TOKEN_KEY;
  
  public setToken(token: string): void {
    localStorage.setItem(this.storageKey, token);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  public removeToken(): void {
    localStorage.removeItem(this.storageKey);
  }
}
