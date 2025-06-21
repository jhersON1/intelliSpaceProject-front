import { ApplicationConfig, provideExperimentalZonelessChangeDetection, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation, withViewTransitions } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { LoggerService, ConsoleLoggerService } from './core/services';
import { HttpInterceptorService, AnalyticsTrackingInterceptor } from './core/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(), 
    provideRouter(
      routes,
      withHashLocation(),
      withViewTransitions(
        {skipInitialTransition: true}
      )
    ), 
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpInterceptorService,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AnalyticsTrackingInterceptor,
      multi: true
    },
    { provide: LoggerService, useClass: ConsoleLoggerService }
  ]
};
