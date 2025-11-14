# Diagrama C1 - Contexto del Sistema

```mermaid
graph TB
    %% Actores externos
    Usuario((Usuario Final<br/>Persona que utiliza<br/>la billetera virtual))
    Admin((Administrador<br/>Gestiona usuarios<br/>y sistema))
    APIExterna[API Externa DolarAPI<br/>Cotización USD<br/>en tiempo real]
    ServicioEmail[Servicio de Email<br/>Resend API<br/>Envío de notificaciones]
    
    %% Sistema principal
    ArCash[ArCash System<br/>Billetera Virtual<br/>Gestión de transacciones<br/>y pagos digitales]
    
    %% Relaciones
    Usuario -.->|Utiliza aplicación web<br/>Realiza transacciones<br/>Consulta saldos| ArCash
    Admin -.->|Administra usuarios<br/>Monitorea sistema<br/>Gestiona configuraciones| ArCash
    
    ArCash -.->|Consulta cotización<br/>del dólar oficial<br/>HTTPS/REST| APIExterna
    ArCash -.->|Envía emails de<br/>verificación y<br/>recuperación| ServicioEmail
    
    %% Estilos
    classDef person fill:#08427b,stroke:#052e4b,stroke-width:2px,color:#fff
    classDef system fill:#1168bd,stroke:#0b4884,stroke-width:2px,color:#fff
    classDef external fill:#999999,stroke:#666666,stroke-width:2px,color:#fff
    
    class Usuario,Admin person
    class ArCash system
    class APIExterna,ServicioEmail external
```

## ArCash### Sistemas Externos:
- **DolarAPI**: Proporciona cotización oficial del dólar argentino
- **Resend API**: Servicio de envío de emails para verificación y recuperación

### Tecnologías del Sistema:
- **Frontend**: Angular 20 con TypeScript (Puerto 4200)
- **Backend**: Spring Boot 3.4.5 con Java 21 (Puerto 8080)
- **Seguridad**: JWT + Spring Security
- **Base de Datos**: MySQL 8.0+ (interna al sistema)
- **Build**: Mavena Virtual


 Descripción del Sistema

ArCash es una aplicación de billetera virtual que permite a los usuarios:

 Funcionalidades Principales:
Gestión de Cuentas: Creación y administración de cuentas en pesos y dólares
Transacciones: Transferencias entre usuarios usando alias, CVU o QR
Autenticación Segura: Sistema de login con JWT y tokens de refresh
Gestión de Contactos: Favoritos para facilitar transferencias
-Conversión de Divisas: Integración con cotización oficial del dólar
Administración: Panel administrativo para gestión de usuarios

Actores:
Usuario Final: Personas que utilizan la billetera para transacciones
Administrador: Gestiona usuarios y monitorea el sistema

 Sistemas Externos:
DolarAPI: Proporciona cotización oficial del dólar argentino
Resend API: Servicio de envío de emails para verificación y recuperación
MySQL: Base de datos principal del sistema

Tecnologías:
Frontend: Angular 20 con TypeScript
Backend: Spring Boot 3.4.5 con Java 21
Seguridad: JWT + Spring Security
Base de Datos: MySQL 8.0+
Build: Maven
