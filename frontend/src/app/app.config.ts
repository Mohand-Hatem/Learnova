import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { AuthService } from './services/auth.service';
import { firstValueFrom } from 'rxjs';
import { USERS_ECHARTS_PROVIDERS } from './components/dashboard/users/users-echarts.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    ...USERS_ECHARTS_PROVIDERS,
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return firstValueFrom(authService.initializeAuth());
    }),
  ],
};
