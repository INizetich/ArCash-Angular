# Diagrama C2 - Contenedores del Sistema
## ArCash - Arquitectura de Contenedores

```mermaid
graph TB
    %% Actores
    Usuario((Usuario Final<br/>Navegador Web))
    Admin((Administrador<br/>Navegador Web))
    
    %% Contenedores de la aplicación
    subgraph "ArCash System"
        Frontend[Frontend Web Application<br/>Angular 20 + TypeScript<br/>Puerto 4200<br/><br/>• Interfaz de usuario responsiva<br/>• Gestión de estado<br/>• Autenticación JWT<br/>• Escáner QR<br/>• Temas claro/oscuro]
        
        Backend[Backend API Application<br/>Spring Boot 3.4.5 + Java 21<br/>Puerto 8080<br/><br/>• API REST<br/>• Lógica de negocio<br/>• Validaciones<br/>• Servicios de transacciones<br/>• Documentación Swagger]
        
        MySQL[(MySQL Database<br/>Puerto 3306<br/><br/>Tablas:<br/>• users<br/>• accounts<br/>• transactions<br/>• credentials<br/>• refresh_tokens<br/>• validation_tokens<br/>• recovery_tokens<br/>• favorite_contacts)]
    end
    
    %% Sistemas externos
    DolarAPI[DolarAPI<br/>API Externa<br/>HTTPS/REST<br/><br/>Cotización oficial<br/>del dólar argentino]
    
    ResendAPI[Resend API<br/>Servicio de Email<br/>HTTPS/REST<br/><br/>Envío de emails<br/>de verificación<br/>y recuperación]
    
    %% Relaciones Usuario-Sistema
    Usuario -.->|Utiliza<br/>HTTPS| Frontend
    Admin -.->|Administra<br/>HTTPS| Frontend
    
    %% Relaciones Internas
    Frontend -->|Llamadas API<br/>HTTP/JSON<br/>Puerto 8080<br/>+ CORS| Backend
    
    %% Relaciones Backend-Externos
    Backend -->|Persiste datos<br/>JDBC/MySQL<br/>Puerto 3306| MySQL
    Backend -.->|Consulta cotización<br/>HTTP GET<br/>10 min intervals| DolarAPI
    Backend -.->|Envía emails<br/>HTTP POST<br/>API Key auth| ResendAPI
    
    %% Estilos
    classDef person fill:#08427b,stroke:#052e4b,stroke-width:2px,color:#fff
    classDef frontend fill:#1168bd,stroke:#0b4884,stroke-width:2px,color:#fff
    classDef backend fill:#1168bd,stroke:#0b4884,stroke-width:2px,color:#fff
    classDef external fill:#999999,stroke:#666666,stroke-width:2px,color:#fff
    classDef database fill:#2f7e32,stroke:#1b5e20,stroke-width:2px,color:#fff
    
    class Usuario,Admin person
    class Frontend frontend
    class Backend backend
    class DolarAPI,ResendAPI external
    class MySQL database
```

## Descripción de Contenedores

### Frontend Web Application (Angular 20)
**Tecnología**: Angular 20 + TypeScript  
**Puerto**: 4200  
**Responsabilidades**:
- Interfaz de usuario responsiva
- Gestión de autenticación con JWT
- Manejo de estado de la aplicación
- Escáner y generación de códigos QR
- Validaciones del lado cliente
- Temas claro/oscuro
- Interceptores HTTP para tokens
- Guards de rutas para seguridad

**Componentes principales**:
- `Dashboard`: Panel principal del usuario
- `Auth`: Login y registro
- `Transaction`: Gestión de transferencias
- `Admin`: Panel administrativo
- `Profile`: Gestión de perfil de usuario

### Backend API Application (Spring Boot)
**Tecnología**: Spring Boot 3.4.5 + Java 21  
**Puerto**: 8080 (acceso directo desde Frontend)  
**Responsabilidades**:
- API RESTful con endpoints seguros
- Autenticación y autorización JWT
- Lógica de negocio de transacciones
- Validaciones del lado servidor
- Gestión de sesiones y tokens
- Integración con APIs externas (DolarAPI, Resend)
- Configuración CORS para Frontend Angular
- Documentación Swagger/OpenAPI en `/swagger-ui.html`

**Principales módulos**:
- `Controller`: Endpoints REST (AuthController, UserController, etc.)
- `Service`: Lógica de negocio (UserService, TransactionService, etc.)
- `Repository`: Acceso a datos (JPA Repositories)
- `Security`: Configuración JWT y CORS
- `Models`: Entidades JPA (User, Account, Transaction, etc.)

### MySQL Database (Contenedor Interno)
**Tecnología**: MySQL 8.0+  
**Puerto**: 3306  
**Responsabilidades**:
- Almacenamiento persistente de datos del sistema ArCash
- Integridad referencial entre entidades
- Índices optimizados para consultas frecuentes
- Transacciones ACID para operaciones financieras

**Principales tablas**:
- `users`: Información de usuarios
- `accounts`: Cuentas en pesos y dólares
- `transactions`: Historial de transacciones
- `credentials`: Credenciales de acceso
- `refresh_tokens`: Tokens de refresh JWT
- `validation_tokens`: Tokens de validación de email
- `recovery_tokens`: Tokens de recuperación de contraseña
- `favorite_contacts`: Contactos favoritos del usuario

### Sistemas Externos

#### DolarAPI
- **Propósito**: Obtener cotización oficial del dólar argentino
- **Protocolo**: HTTPS/REST
- **Frecuencia**: Cada 10 minutos (configurable)
- **Endpoint**: `https://dolarapi.com/v1/dolares/oficial`

#### Resend API
- **Propósito**: Envío de emails transaccionales
- **Protocolo**: HTTPS/REST
- **Autenticación**: API Key
- **Uso**: Verificación de cuentas y recuperación de contraseñas
