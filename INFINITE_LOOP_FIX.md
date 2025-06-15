# Corrección de Bucle Infinito en Login

## Problema Identificado
Al hacer click en el botón de login, el navegador se colgaba debido a un bucle infinito causado por múltiples llamadas recursivas entre los servicios de autenticación.

## Causa Raíz
El problema se originó por las siguientes llamadas recursivas:

1. **NavbarComponent constructor** → `authService.checkAuthStatus()`
2. **AuthService constructor** → `checkAuthStatus()`
3. **checkAuthStatus()** → Si no hay token → `logout()`
4. **logout()** → `globalCleanup.executeCleanup()`
5. **Computed signals** → Reevaluación continua con logging de debug

## Cambios Realizados

### 1. NavbarComponent
**Archivo**: `src/app/core/components/navbar/navbar.component.ts`

**Problema**: Llamaba `checkAuthStatus()` innecesariamente en el constructor cuando el AuthService ya lo hace.

**Solución**: Removimos la llamada redundante del constructor.

```typescript
// ANTES
constructor() {
  this.authService.checkAuthStatus().subscribe({
    error: (err) => {
      console.error('Error verificando estado de autenticación:', err);
    }
  });
}

// DESPUÉS
constructor() {
  // El AuthService ya verifica el estado de autenticación en su constructor
  // No es necesario verificarlo aquí también
}
```

### 2. AuthService
**Archivo**: `src/app/auth/services/auth.service.ts`

**Problema**: El constructor llamaba `checkAuthStatus()` que podía hacer llamadas HTTP y llamar `logout()` recursivamente.

**Solución**: Reemplazamos con `initializeAuthState()` que hace verificación local sin llamadas HTTP.

```typescript
// ANTES
constructor() {
  this.checkAuthStatus()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe();
}

// DESPUÉS
constructor() {
  // Verificación inicial simple sin llamadas HTTP
  this.initializeAuthState();
}

private initializeAuthState(): void {
  const token = this.tokenService.getToken();
  
  if (!token) {
    this.authState.clearAuthState();
    return;
  }

  // Verificar si el token ha expirado (local, no HTTP)
  if (this.tokenDecoder.isTokenExpired()) {
    this.authState.clearAuthState();
    this.tokenService.removeToken();
    return;
  }

  // Resto de verificación local...
}
```

**También**: Modificamos `checkAuthStatus()` para que no llame a `logout()` automáticamente, evitando recursión.

### 3. AuthStateService
**Archivo**: `src/app/auth/services/auth-state.service.ts`

**Problema**: Los computed signals `isVendor` e `isConsumer` hacían logging de debug en cada evaluación, causando reevaluaciones constantes.

**Solución**: Removimos los logs de debug de los computed signals.

```typescript
// ANTES
public readonly isVendor = computed(() => {
  const user = this._currentUser();
  const role = this.getCurrentUserRole();
  this.logger.debug('Computed isVendor:', { 
    hasUser: !!user, 
    role, 
    isVendor: role === userRole.VENDOR 
  }, 'AuthStateService');
  return role === userRole.VENDOR;
});

// DESPUÉS
public readonly isVendor = computed(() => {
  const role = this.getCurrentUserRole();
  return role === userRole.VENDOR;
});
```

## Flujo Corregido

### Inicialización:
1. **AuthService constructor** → `initializeAuthState()` (verificación local)
2. **NavbarComponent constructor** → Sin llamadas adicionales
3. **Computed signals** → Evaluación simple sin logging

### Login/Logout:
1. **Login** → `authService.login()` → Establecer estado
2. **Logout** → `authService.logout()` → Limpiar estado (sin recursión)
3. **Verificaciones** → `checkAuthStatus()` solo cuando sea necesario

## Beneficios
- ✅ Eliminado el bucle infinito
- ✅ Login funciona correctamente
- ✅ Navegación fluida
- ✅ Menor sobrecarga de logging
- ✅ Inicialización más rápida
- ✅ Mejor performance de computed signals

## Verificación
- ✅ El botón de login responde correctamente
- ✅ No hay cuelgues del navegador
- ✅ La autenticación funciona normalmente
- ✅ El logout funciona sin problemas
- ✅ Los computed signals son eficientes
