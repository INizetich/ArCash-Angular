# ArCash Frontend (Angular) 📱

![Angular](https://img.shields.io/badge/Angular-20-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=rxjs&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-para_desarrollo-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

Este es el frontend de **ArCash**, una billetera virtual. Es una **Single-Page Application (SPA)** construida con el framework [Angular](https://angular.io/).

---

##  Descripción

El frontend proporciona la interfaz de usuario para interactuar con la aplicación ArCash. Se comunica con el **[Backend de ArCash (Spring Boot)](https://github.com/ignacionizetich/ArCashApp)** a través de su API RESTful para realizar todas las operaciones necesarias.

Esta SPA maneja el estado de la aplicación, la autenticación de usuarios, la visualización de datos y la interacción en tiempo real, siguiendo una arquitectura robusta y modular.

---

##  Arquitectura Detallada del Proyecto

El proyecto está fuertemente tipado y estructurado para una escalabilidad y mantenibilidad claras, separando cada capa de responsabilidad.

###  `pages`
Componentes "inteligentes" que actúan como la vista principal para cada ruta de la aplicación.

* `home`: Landing page pública.
* `login` / `register`: Formularios y lógica para la autenticación de usuarios.
* `forgot` / `recover-password`: Flujo completo para la recuperación de contraseñas.
* `resend` / `validate`: Páginas para manejar la validación de email y el reenvío de tokens.
* `dashboard`: El panel principal del usuario, accesible solo tras iniciar sesión.
* `admin`: Panel de administración con funcionalidades protegidas.
* `error-404`: Página de "No Encontrado" para rutas inválidas.

###  `components`
Componentes reutilizables, diseñados para recibir datos y emitir eventos.

* `footer`: El pie de página global de la aplicación.
* `forms`:
    * `login-form`: Componente reutilizable del formulario de login.
    * `register-form`: Componente reutilizable del formulario de registro.
    * `forgot-password-form`: Componente reutilizable del formulario de recuperación.
* `ui`: Componentes genéricos de UI (ej. botones, modales, spinners).

###  `services`
Clases *singleton* (Inyección de Dependencias) que manejan la lógica de negocio, el estado global y las llamadas a la API.

* **Autenticación y Sesión:**
    * `auth-service`: Maneja las llamadas a la API de login, registro y gestiona el estado de autenticación del usuario.
    * `recovery-service`: Orquesta el flujo de "contraseña olvidada".
    * `validation-service`: Lógica para validar tokens de email.
    * `resend-service` / `resend-navigation`: Servicios para el reenvío de tokens de validación.
* **Datos de la Aplicación:**
    * `transaction-service`: Realiza y consulta transacciones.
    * `favorite-service`: Maneja el CRUD de contactos favoritos del usuario.
    * `admin-service`: Contiene las llamadas a la API exclusivas para el panel de administración.
    * `data-service`: Un servicio de utilidad para compartir estado o datos entre componentes.
* **Utilidad y UX:**
    * `cache-service`: Almacena en caché datos de API para reducir peticiones (ej. datos de usuario).
    * `theme-service`: Gestiona el estado de tema claro/oscuro.
    * `modal-service`: Un servicio global para controlar la apertura y cierre de ventanas modales.
    * `device-service`: Detecta información del dispositivo (ej. tamaño de pantalla).
    * `util-service`: Funciones de ayuda genéricas.

###  `core`
Archivos centrales que definen el comportamiento de la aplicación.

* **`interceptors`**:
    * `jwt-interceptor.ts`: Intercepta *todas* las peticiones HTTP salientes para adjuntar automáticamente el `Bearer Token` (JWT) de autenticación.
* **`guards`**:
    * `auth.guard.ts`: Protege rutas que **requieren** autenticación (ej. `/dashboard`). Redirige al `/login` si no hay sesión.
    * `guest.guard.ts`: Protege rutas que **no deben** verse si el usuario ya está autenticado (ej. `/login`, `/register`). Redirige al `/dashboard`.
    * `admin.guard.ts`: Protege la ruta `/admin`, verificando que el usuario tenga el rol de `ADMIN`.
    * `home.guard.ts`: Lógica de guarda específica para la ruta `/home`.
    * `validate.guard.ts` / `validate-request.guard.ts` / `resend.guard.ts`: Guardas que protegen los flujos de validación y reenvío de tokens.

###  `models`
Define la "forma" de los datos. Son interfaces de TypeScript que aseguran que el código sea robusto y libre de errores de tipado.

* `user-data.ts`: Interface para el objeto `User`.
* `transaction.interface.ts`: Interface para los objetos de `Transaction`.
* `favorite-contact.ts`: Interface para los contactos favoritos.
* `admin.interface.ts`: Interfaces para los datos del panel de admin.
* `qrData.ts`: Interface para la data de generación de QR.
* `cache.interface.ts` / `common.interface.ts`: Modelos genéricos.

---

##  Puesta en Marcha (Desarrollo Local)

### Prerrequisitos

* [Node.js](https://nodejs.org/) (que incluye **npm**) instalado. Se recomienda usar la última versión LTS.
* Tener el **[Backend de ArCash](https://github.com/ignacionizetich/ArCashApp) corriendo** en `http://localhost:8080`.

### Instalación y Configuración

1.  **Clonar el repositorio:**
    ```bash
    git clone <url-del-repositorio-frontend>
    ```

2.  **Navegar al directorio del proyecto:**
    ```bash
    cd ArCash-Angular
    ```

3.  **Instalar dependencias:**
    ```bash
    npm install
    ```

---

##  Servidor de Desarrollo

Ejecuta `npm start` (o `ng serve`) para levantar el servidor de desarrollo.

Navega a **`http://localhost:4200/`**. La aplicación se recargará automáticamente si cambias alguno de los archivos fuente.

###  Conexión con el Backend

El proyecto está configurado para usar un **proxy** (`proxy.conf.json`). Esto soluciona los problemas de CORS durante el desarrollo.

El proxy reenvía automáticamente todas las solicitudes de `http://localhost:4200/api` al servidor backend que se espera esté corriendo en `http://localhost:8080`.

---

##  Comandos Útiles

* **Construir (Build) para Producción:**
    ```bash
    npm run build
    ```
    (o `ng build --prod`). Los artefactos de la compilación se almacenarán en el directorio `dist/`.

