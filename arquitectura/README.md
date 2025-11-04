# ArCash - Documentación de Arquitectura C4

Este directorio contiene la documentación de la arquitectura de la aplicación **ArCash** siguiendo el modelo C4 (Context, Containers, Components, Code).

## 📋 Índice de Diagramas

### [C1 - Diagrama de Contexto](./C1-Contexto-Sistema.md)
Muestra el sistema ArCash en su contexto, incluyendo usuarios, administradores y sistemas externos con los que interactúa.

**Elementos clave:**
- Usuarios finales y administradores
- Sistema ArCash como caja negra
- APIs externas (DolarAPI, Resend)

### [C2 - Diagrama de Contenedores](./C2-Contenedores.md)
Descompone el sistema ArCash en sus principales contenedores de software y las tecnologías utilizadas.

**Contenedores principales:**
- Frontend Web (Angular 20 - Puerto 4200)
- Backend API (Spring Boot 3.4.5 - Puerto 8080)
- Base de datos MySQL
- Sistemas externos

### [C3 - Diagrama de Componentes](./C3-Componentes.md)
Detalla los componentes internos del Frontend y Backend, mostrando la arquitectura interna y las responsabilidades de cada componente.

**Componentes Frontend:**
- Components (Home, Dashboard, Admin, etc.)
- Services (Auth, Data, Transaction, etc.)
- Guards e Interceptors

**Componentes Backend:**
- Controllers (REST API endpoints)
- Services (Lógica de negocio)
- Repositories (Acceso a datos)
- Security (JWT, configuración)
- Models/Entities

## 🏗️ Arquitectura General

ArCash es una **billetera virtual** construida con:

### Frontend
- **Angular 20** con TypeScript (Puerto 4200)
- **Arquitectura basada en componentes**
- **Servicios para gestión de estado**
- **Guards para seguridad de rutas**
- **Interceptors para JWT automático**

### Backend
- **Spring Boot 3.4.5** con Java 21 (Puerto 8080)
- **Arquitectura en capas (MVC)**
- **API RESTful** con documentación Swagger
- **Spring Security** con JWT
- **JPA/Hibernate** para persistencia
- **CORS configurado** para Angular

### Base de Datos
- **MySQL 8.0+**
- **Diseño relacional normalizado**
- **Índices optimizados**

### Integraciones
- **DolarAPI**: Cotización oficial del dólar
- **Resend API**: Servicio de emails
- **JWT**: Autenticación stateless

## 🔐 Seguridad

- **Autenticación JWT** con refresh tokens
- **CORS configurado** para frontend
- **Validaciones** en frontend y backend
- **Tokens de verificación** para emails
- **Passwords hasheados** con BCrypt
- **Guards de autorización** por roles

## 📊 Funcionalidades Principales

1. **Gestión de Usuarios**
   - Registro y verificación por email
   - Login con JWT
   - Recuperación de contraseña
   - Perfiles de usuario

2. **Cuentas Financieras**
   - Cuentas en pesos y dólares
   - CVU y alias únicos
   - Consulta de saldos
   - Historial de movimientos

3. **Transacciones**
   - Transferencias por alias, CVU o QR
   - Validaciones de seguridad
   - Estados de transacción
   - Notificaciones automáticas

4. **Administración**
   - Panel administrativo
   - Gestión de usuarios
   - Monitoreo del sistema
   - Configuraciones

5. **Características Adicionales**
   - Contactos favoritos
   - Escáner QR
   - Cotización USD en tiempo real
   - Temas claro/oscuro
   - Optimizaciones de rendimiento

## 🚀 Deployment

La aplicación está diseñada para ser desplegada en:
- **Frontend**: Servidor web estático (Angular build) - Puerto 4200
- **Backend**: Servidor de aplicaciones Java - Puerto 8080  
- **Base de datos**: Servidor MySQL dedicado - Puerto 3306

## 📁 Estructura de Archivos

```
ArCash-Angularr/
├── frontend/                 # Aplicación Angular
│   ├── src/app/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   ├── services/        # Servicios Angular
│   │   ├── guards/          # Guards de rutas
│   │   ├── models/          # Interfaces TypeScript
│   │   └── core/            # Configuraciones core
│   └── ...
├── backend/                 # Aplicación Spring Boot
│   ├── src/main/java/com/EDJ/ArCash/
│   │   ├── Controller/      # REST Controllers
│   │   ├── Service/         # Servicios de negocio
│   │   ├── Repository/      # Repositorios JPA
│   │   ├── Models/          # Entidades JPA
│   │   ├── Security/        # Configuración seguridad
│   │   ├── Config/          # Configuraciones
│   │   └── DTO/             # Data Transfer Objects
│   └── ...
└── arquitectura/            # Documentación C4 (este directorio)
    ├── C1-Contexto-Sistema.md
    ├── C2-Contenedores.md
    ├── C3-Componentes.md
    └── README.md (este archivo)
```

---

## 📝 Notas de Desarrollo

- Los diagramas utilizan **Mermaid** para visualización
- La documentación sigue las convenciones del **modelo C4**
- Se incluyen detalles técnicos específicos de implementación
- Los diagramas se actualizan conforme evoluciona la aplicación

---

**Versión**: 1.0  
**Fecha**: Noviembre 2025  
**Autor**: Equipo ArCash  
**Tecnologías**: Angular 20, Spring Boot 3.4.5, MySQL 8.0+
