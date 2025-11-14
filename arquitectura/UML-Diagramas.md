# Diagramas UML - ArCash Billetera Virtual

## 1. Diagrama de Casos de Uso

```mermaid
flowchart TB
  subgraph ArCash["ArCash System"]
    direction TB
    %% Agrupo los casos de usuario normal en columna
    UC1["Registrarse"]
    UC2["Iniciar Sesión"]
    UC3["Verificar Email"]
    UC4["Consultar Saldo"]
    UC5["Transferir Dinero"]
    UC6["Buscar Cuenta por Alias/CVU"]
    UC7["Generar QR para Cobro"]
    UC8["Escanear QR"]
    UC9["Ver Historial Transacciones"]
    UC10["Agregar Contacto Favorito"]
    UC11["Gestionar Favoritos"]
    UC12["Cambiar Alias"]
    UC13["Calcular Impuestos ARS/USD"]
    UC14["Recuperar Contraseña"]
    UC15["Ingresar Dinero"]
    
    %% Casos sólo de Admin
    UC16["Gestionar Usuarios"]
    UC18["Habilitar/Deshabilitar Usuarios"]

    %% Externos, separados
    UC19["Consultar Cotización USD"]
    UC20["Enviar Email Verificación"]
    UC21["Enviar Email Recuperación"]
  end

  %% Actores
  Usuario(("Usuario")):::person
  Admin(("Administrador")):::admin
  DolarAPI(("DolarAPI")):::external
  ResendAPI(("Resend API")):::external

  %% Organización de nodos para reducir líneas cruzadas
  %% Enlaces invisibles para mantener orden
  UC1 ~~~ UC2 ~~~ UC3 ~~~ UC4 ~~~ UC5 ~~~ UC6 ~~~ UC7 ~~~ UC8 ~~~ UC9 ~~~ UC10 ~~~ UC11 ~~~ UC12 ~~~ UC13 ~~~ UC14 ~~~ UC15
  UC16 ~~~ UC17 ~~~ UC18
  UC19 ~~~ UC20 ~~~ UC21

  %% Relaciones principales (Sin cambios)
  Usuario --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9 & UC10 & UC11 & UC12 & UC13 & UC14 & UC15
  Admin -. extiende .-> Usuario
  Admin -.-> UC16 & UC17 & UC18

  DolarAPI --> UC19
  ResendAPI --> UC20 & UC21

  %% includes & relaciones secundarias (Sin cambios)
  UC1 -. incluye .-> UC20
  UC14 -. incluye .-> UC21
  UC5 -. incluye .-> UC2
  UC4 -. incluye .-> UC2
  UC9 -. incluye .-> UC2
  UC6 -. incluye .-> UC2
  UC7 -. incluye .-> UC2
  UC8 -. incluye .-> UC2
  UC10 -. incluye .-> UC2
  UC11 -. incluye .-> UC2
  UC12 -. incluye .-> UC2
  UC15 -. incluye .-> UC2
  UC19 -. incluye .-> UC2
  UC13 -. incluye .-> UC19

  %% === EXTENDS AGREGADOS ===
  %% "Recuperar Contraseña" es una extensión opcional de "Iniciar Sesión"
  UC14 -. extiende .-> UC2
  %% "Agregar Favorito" es una extensión opcional de "Transferir Dinero"
  UC10 -. extiende .-> UC5


  %% Estilos (Sin cambios)
  classDef person fill:#08427b,stroke:#052e4b,stroke-width:2px,color:#fff
  classDef admin fill:#d35400,stroke:#a0392f,stroke-width:3px,color:#fff
  classDef system fill:#1168bd,stroke:#0b4884,stroke-width:2px,color:#fff
  classDef adminSystem fill:#e67e22,stroke:#d35400,stroke-width:2px,color:#fff
  classDef external fill:#999999,stroke:#666666,stroke-width:2px,color:#fff

  class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12,UC13,UC14,UC15,UC19,UC20,UC21 system
  class UC16,UC17,UC18 adminSystem
```

**Descripción:**
- **Usuario**: Persona que usa la billetera para transacciones financieras
- **Administrador**: Extiende de Usuario - puede hacer todo lo que hace un usuario más funciones administrativas específicas
- **DolarAPI**: Sistema externo para cotización del dólar
- **Resend API**: Sistema externo para envío de emails (solo verificación y recuperación)

**Nota importante**: Las transferencias NO generan notificaciones por email

**Explicación del Diagrama:**

Este diagrama muestra las funcionalidades principales de ArCash desde la perspectiva de los usuarios. Tenemos dos actores principales: el Usuario final y el Administrador (que extiende de Usuario), y dos sistemas externos - DolarAPI y Resend API.

El Administrador hereda todas las capacidades de un Usuario regular (15 operaciones como registrarse, transferir dinero, consultar saldo, etc.) y además tiene acceso a 3 funcionalidades administrativas exclusivas: gestionar usuarios, ver reportes del sistema, y habilitar/deshabilitar usuarios.

Los usuarios pueden realizar 15 operaciones principales como registrarse, iniciar sesión, transferir dinero, consultar saldo, y gestionar contactos favoritos. Los administradores tienen acceso a estas mismas funcionalidades más las administrativas.

Es importante destacar las relaciones 'include' - por ejemplo, cuando un usuario se registra, automáticamente se incluye el envío de email de verificación. Y cuando realiza transferencias, necesariamente debe estar autenticado.

Los sistemas externos DolarAPI y Resend API son fundamentales: DolarAPI nos proporciona la cotización del dólar para los cálculos de impuestos, y Resend API maneja únicamente los emails de verificación y recuperación de contraseña - no se envían emails por transferencias.

---

## 2. Diagrama de Secuencia - Transferir Dinero

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend Angular
    participant B as Backend Spring Boot
    participant DB as Base de Datos
    
    
    U->>+F: 1. Ingresar datos transferencia<br/>(alias destino, monto)
    F->>F: 2. Validar formulario cliente
    
    F->>+B: 3. Petición POST al backend<br/>Body: {balance: monto}
    B->>B: 4. Extraer userID del JWT
    B->>+DB: 5. Buscar cuenta origen por ID
    DB-->>-B: 6. Datos cuenta origen
    
    B->>+DB: 7. Buscar cuenta destino por ID 
    DB-->>-B: 8. Datos cuenta destino
    
    B->>B: 9. Validar permisos usuario<br/>(cuenta origen le pertenece)
    
    
    alt Validaciones exitosas (Paso 9 OK)
        B->>+DB: 10. Consultar saldo cuenta origen
        DB-->>-B: 11. Saldo actual
        
        alt Saldo suficiente
            B->>+DB: 12. BEGIN TRANSACTION
            B->>DB: 13. UPDATE cuenta origen (-monto)
            B->>DB: 14. UPDATE cuenta destino (+monto)
            B->>DB: 15. INSERT transaction (state: COMPLETED)
            B->>DB: 16. COMMIT TRANSACTION
            DB-->>-B: 17. Transacción confirmada
            
            B-->>F: 18. 200 OK<br/>{success: true, message: "Transferencia realizada correctamente"} 
            F->>F: 19. Actualizar saldo en UI
            F->>F: 20. Recargar historial transacciones
            F-->>U: 21. Mostrar resultado (Éxito)  
            
        else Saldo insuficiente
            B->>+DB: 12.1. INSERT transaction (state: FAILED)
            DB-->>-B: 12.2. Registro creado
            B-->>F: 12.3. 403 Forbidden<br/>{success: false, message: "Saldo insuficiente"} 
            F->>F: 12.4. Recargar historial transacciones
            F-->>U: 12.5. Mostrar resultado (Error: Saldo) 
        end
        
    else Error validación (Paso 9 Falla)
        B-->>F: 9.1. 404/403 Error<br/>{success: false, message: "Error: Cuenta no encontrada o sin permisos"} 
        F-->>U: 9.2. Mostrar resultado (Error: Validación)  
    end
    
    
    deactivate B
    deactivate F
   
```

**Explicación del Diagrama:**

Este diagrama muestra el flujo temporal detallado de una transferencia de dinero entre usuarios. Es el proceso más crítico del sistema por manejar transacciones financieras.

El proceso inicia cuando el usuario ingresa los datos en el frontend Angular. Primero se valida el formulario del lado cliente, luego se envía una petición POST al backend Spring Boot en el puerto 8080.

El backend realiza múltiples validaciones de seguridad: extrae el userID del token JWT, verifica que las cuentas origen y destino existan, y crucialmente, valida que el usuario sea dueño de la cuenta origen para prevenir transferencias no autorizadas.

Si todo es válido, se ejecuta una transacción ACID en la base de datos: se resta el monto de la cuenta origen, se suma a la cuenta destino, y se registra la operación con estado 'COMPLETED'. Si hay saldo insuficiente, se registra como 'FAILED' pero no se mueve dinero.

Note que no se envían emails por transferencias - solo se muestran notificaciones toast en el frontend.

---

## 3. Diagrama de Estados - Cuenta de Usuario

```mermaid
stateDiagram-v2
    [*] --> No_Registrado
    
    No_Registrado --> Pendiente_Verificacion : Usuario se registra (enabled=false, active=false)
    
    Pendiente_Verificacion --> Usuario_Activo : Usuario verifica email (enabled=true, active=true)
    Pendiente_Verificacion --> No_Registrado : Token expira
    
    Usuario_Activo --> Deshabilitado : Admin deshabilita (active=false)
    Deshabilitado --> Usuario_Activo : Admin habilita (active=true)
    
    %% Nodo de fin principal (como pidió el profesor)
    Usuario_Activo --> Fin_Cuenta
    Deshabilitado --> Fin_Cuenta
    Fin_Cuenta --> [*]

    %% === SUB-ESTADO PROLIJO ===
    state Usuario_Activo {
        %% El sub-estado siempre inicia en "Sin_Saldo"
        [*] --> Sin_Saldo
        
        %% Flujos de ACREDITACIÓN (Ingreso de dinero)
        Sin_Saldo --> Con_Saldo   : Se recibe dinero [monto > 0] / acreditarSaldo()
        Con_Saldo --> Con_Saldo   : Se recibe dinero [monto > 0] / acreditarSaldo()

        %% Flujos de DÉBITO (Salida de dinero)
        Con_Saldo --> Sin_Saldo   : Se transfiere todo [monto == saldo] / ejecutarTransferencia()
        Con_Saldo --> Con_Saldo   : Se transfiere parcial [monto < saldo] / ejecutarTransferencia()
        
        %% Flujo del PROCESO de transferencia (estado temporal)
        Con_Saldo --> Transfiriendo : Se inicia transferencia
        Transfiriendo --> Con_Saldo : Transferencia completa
        Transfiriendo --> Con_Saldo : Transferencia falla

        %% Nodo de fin explícito del sub-estado (sin etiqueta)
        Con_Saldo --> [*]
        Sin_Saldo --> [*]
        Transfiriendo --> [*]
        %% El nodo de fin del sub-estado es ahora explícito y no depende del padre.
    }
    %% === FIN SUB-ESTADO ===
    
    note right of Pendiente_Verificacion
        - enabled = false, active = false
        - No puede hacer login
        - Email enviado para verificación
        - Se crea cuenta ARS tras verificar
    end note
    
    note right of Usuario_Activo
        - enabled = true, active = true
        - Acceso completo al sistema
        - Puede realizar transacciones
        - Login permitido
    end note
    
    note right of Deshabilitado
        - enabled = true, active = false
        - Deshabilitado por administrador
        - Login bloqueado: "Usuario no habilitado"
        - Mantiene datos pero sin acceso
    end note
```

**Estados Principales:**

### Estados de Usuario
- **No Registrado**: Usuario no existe en el sistema
- **Pendiente Verificación**: Usuario creado pero no verificado (enabled=false, active=false)
- **Usuario Activo**: Usuario verificado y habilitado (enabled=true, active=true)
- **Deshabilitado**: Usuario deshabilitado por administrador (enabled=true, active=false)

### Estados de Saldo
- **Sin Saldo**: $0 en la cuenta ARS
- **Con Saldo**: Dinero disponible para transferir
- **Transfiriendo**: Procesando transferencia (validaciones + transacción ACID)

**Explicación del Diagrama:**

Este diagrama representa el ciclo de vida completo de una cuenta de usuario en ArCash, basado en dos campos booleanos del modelo User: 'enabled' y 'active'.

Un usuario inicia como 'No Registrado'. Al registrarse, pasa a 'Pendiente Verificación' con enabled=false y active=false. En este estado no puede hacer login y debe verificar su email.

Una vez verificado el email, se activa completamente: enabled=true y active=true, convirtiéndose en 'Usuario Activo'. Solo en este estado puede realizar transacciones y usar todas las funcionalidades.

Los administradores pueden deshabilitar usuarios, cambiando solo el campo active=false. Esto los lleva al estado 'Deshabilitado' donde mantienen sus datos pero no pueden acceder al sistema.

Dentro del estado activo, manejamos sub-estados de saldo: Sin Saldo, Con Saldo, y Transfiriendo durante el procesamiento de operaciones. Este diseño refleja exactamente la implementación real del código sin funcionalidades ficticias.

---

## 4. Diagrama de Actividades - Proceso de Registro

```mermaid
flowchart TD
    subgraph Usuario
        Start(( )):::startNode --> Input[Completar formulario]
        
        Input --> Validate{Validar datos}
        Validate -->|Datos inválidos| ShowError[Mostrar errores]
        ShowError --> Input
        Validate -->|Datos válidos| CheckEmail{Email ya existe?}
        CheckEmail -->|Sí| ShowEmailError[Error: Email en uso]
        ShowError --> Input
    end

    subgraph Sistema_Backend ["Sistema (Backend)"]
        CheckEmail -->|No| CreateUser[Crear usuario en BD]
        CreateUser --> GenerateToken[Generar token verificación]
        GenerateToken --> CallSendEmail[Invocar API de Email]
    end

    subgraph ResendAPI_Externo ["ResendAPI (Externo)"]
        CallSendEmail --> SendEmail[Enviar email verificación]
    end

    subgraph Usuario
        SendEmail --> WaitVerification[Usuario recibe email<br/>y hace clic en enlace]
        WaitVerification --> CheckToken{Verificar token en Backend}
    end

    subgraph Sistema_Backend ["Sistema (Backend)"]
        CheckToken -->|Token inválido/vencido| ResendOption{Token inválido}
        CheckToken -->|Token válido| ActivateAccount[Activar cuenta]
        ActivateAccount --> CreateAccount[Crear cuenta ARS]
        CreateAccount --> GenerateAlias[Generar alias único]
        
        GenerateAlias --> ShowSuccess[Mostrar pantalla de éxito]
    end

    subgraph Usuario
        ResendOption --> ShowResend{Mostrar opción de reenvío}
        ShowResend -->|Sí| CallSendEmail
        
        
        ShowSuccess --> End2(( ))
        ShowResend -->|No| End1(( ))
    end


    classDef startNode fill:#000,stroke:#000,stroke-width:1px;
```

**Explicación del Diagrama:**

Este diagrama muestra el flujo de trabajo completo del registro de usuarios, que es el proceso de onboarding más importante del sistema.

El proceso inicia cuando el usuario completa el formulario de registro. Se realizan validaciones tanto del lado cliente como servidor: formato de email, unicidad de datos, y longitud de campos.

Si el email ya existe, se muestra el error y debe intentar con otro. Si todo es válido, se crea el usuario en la base de datos con estado inactivo, se genera un token de verificación, y se envía automáticamente un email usando Resend API.

El usuario debe hacer clic en el enlace del email para activar su cuenta. Si el token es válido, se activa la cuenta, se crea automáticamente una cuenta ARS con saldo cero, se genera un alias único, y se envía un email de bienvenida.

Si el token expira o es inválido, el usuario puede solicitar un reenvío del email. Este flujo garantiza que solo emails válidos puedan usar el sistema y mejora la seguridad general.

---

## 5. Diseño de Condiciones de Prueba - Caja Negra

### Endpoint: POST /api/transactions/{idOrigen}/transfer/{idDestino}


Análisis de Clases de Prueba:
Este cuadro define todas las posibles categorías de entradas (clases) para la función de transferencia.


| **Variable**      | **Descripción**                | **Clases Válidas (CV)**                        | **Clases Inválidas (CI)**                       |
|-------------------|-------------------------------|------------------------------------------------|-------------------------------------------------|
| Autenticación     | Token JWT de la sesión        | CV1: Token válido y no expirado                | CI1: Sin token (Header ausente)<br>CI2: Token inválido (firma/formato)<br>CI3: Token expirado |
| Autorización      | Propiedad de la cuenta        | CV2: userID del JWT es dueño de idOrigen       | CI4: userID del JWT no es dueño de idOrigen     |
| Cuentas           | Existencia de idOrigen / idDestino | CV3: idOrigen existe<br>CV4: idDestino existe | CI5: idOrigen no existe<br>CI6: idDestino no existe |
| Relación Cuentas  | Comparación entre cuentas     | CV5: idOrigen != idDestino                     | CI7: idOrigen == idDestino                      |
| Monto             | Valor a transferir            | CV6: amount > 0                                | CI8: amount < 0<br>CI9: amount == 0           |
| Saldo             | Lógica de negocio             | CV7: Saldo de idOrigen >= amount               | CI10: Saldo de idOrigen < amount                |






Casos de Prueba:
Este cuadro selecciona casos de prueba específicos basados en las clases definidas en la Tabla 1.


**Tabla 2: Casos de Prueba Derivados**

| **ID** | **Condición de Prueba** | **idOrigen** | **idDestino** | **Monto** | **Saldo** | **JWT** | **Resultado Esperado** |
|--------|------------------------|-------------|--------------|----------|----------|---------|----------------------|
| TC001 | Transferencia válida exitosa | 1 | 2 | 1000 | 5000 | Válido (User 1) | HTTP 200, {success: true, message: "Transferencia realizada correctamente"} |
| TC002 | Saldo insuficiente | 1 | 2 | 1000 | 500 | Válido (User 1) | HTTP 403, {success: false, message: "Not enough cash, stranger"} |
| TC003 | Cuenta origen inexistente | 999 | 2 | 1000 | - | Válido (User 1) | HTTP 404, {success: false, message: "No se pudo encontrar la cuenta de origen"} |
| TC004 | Cuenta destino inexistente | 1 | 999 | 1000 | - | Válido (User 1) | HTTP 404, {success: false, message: "No se pudo encontrar la cuenta de destino"} |
| TC005 | Transferencia a sí mismo | 1 | 1 | 1000 | - | Válido (User 1) | HTTP 200, Transaction registrada con state: "FAILED" |
| TC006 | Monto negativo | 1 | 2 | -100 | - | Válido (User 1) | Transacción no se ejecuta, return false |
| TC007 | Monto cero | 1 | 2 | 0 | - | Válido (User 1) | Transacción no se ejecuta, return false |
| TC008 | JWT no proporcionado | - | - | - | - | Ausente | HTTP 498, {success: false, message: "Token no valido"} |
| TC009 | JWT inválido | - | - | - | - | Inválido | HTTP 498, {success: false, message: "Token inválido o nulo"} |
| TC010 | Usuario no es dueño | 2 | - | 1000 | - | Válido (User 1) | HTTP 403, {success: false, message: "No tiene permiso para operar esta cuenta"} |



**Explicación del Diagrama:**

Estas tablas documentan nuestro enfoque de testing de caja negra para los endpoints más críticos del sistema.

Para el endpoint de transferencias, diseñamos 10 casos que cubren: transferencias exitosas, validaciones de saldo, cuentas inexistentes, transferencias a uno mismo, montos inválidos, y diferentes escenarios de autenticación y autorización.

Para el endpoint de búsqueda de cuentas, probamos búsquedas por alias y CVU, tanto existentes como inexistentes, incluyendo casos límite como inputs vacíos.

Aplicamos técnicas de partición de equivalencia para agrupar inputs similares, análisis de valores límite para casos extremos, y pruebas específicas de seguridad para validar JWT y permisos.

Este enfoque sistemático nos permite validar que el sistema se comporta correctamente tanto en casos exitosos como en situaciones de error, garantizando la robustez y seguridad de las operaciones financieras.

---

## 6. Diagrama de Prueba de Seguridad - ArCash

### 1. Objetivo de la Prueba
El objetivo principal de esta prueba es validar la robustez del sistema ArCash contra accesos no autorizados y operaciones fraudulentas. Se busca verificar empíricamente que cada punto de control de seguridad (autenticación, autorización y validación de lógica de negocio) funcione como se espera, bloqueando efectivamente los intentos maliciosos.


### 5. Diagrama de Flujo de Seguridad (Mapa de Pruebas)
El siguiente diagrama es el "mapa" que se usa para ejecutar las pruebas. Cada rombo de decisión (ej. VerificarPassword, ValidarToken, VerificarPropiedad) es un punto de control que será atacado y validado.

```mermaid
flowchart TD
    Start(( )):::startNode --> InicioSesion[Inicio de Sesión]
    
    InicioSesion --> VerificarUsuario[Verificar Usuario]
    VerificarUsuario -->|Usuario no registrado| UsuarioNoExiste[Usuario No Existe]
    VerificarUsuario -->|Usuario encontrado| VerificarPassword[Verificar Password]
    
    VerificarPassword -->|Contraseña inválida| PasswordIncorrecta[Password Incorrecta]
    VerificarPassword -->|Contraseña válida| VerificarEstado[Verificar Estado]
    
    VerificarEstado -->|Usuario inactivo| UsuarioDeshabilitado[Usuario Deshabilitado]
    VerificarEstado -->|Usuario activo| SesionIniciada[Sesión Iniciada]
    
    SesionIniciada -->|Operación solicitada| SolicitarTransferencia[Solicitar Transferencia]
    
    SolicitarTransferencia -->|Verificar autenticación| ValidarToken[Validar Token]
    ValidarToken -->|Token expirado o inválido| TokenInvalido[Token Inválido]
    ValidarToken -->|Token válido| VerificarPropiedad[Verificar Propiedad]
    
    VerificarPropiedad -->|No es propietario| CuentaAjena[Cuenta Ajena]
    VerificarPropiedad -->|Cuenta propia| VerificarSaldo[Verificar Saldo]
    
    VerificarSaldo -->|Fondos insuficientes| SaldoInsuficiente[Saldo Insuficiente]
    VerificarSaldo -->|Saldo disponible| TransferenciaAprobada[Transferencia Aprobada]
    
    UsuarioNoExiste -->|Acceso denegado| End(( ))
    PasswordIncorrecta -->|Acceso denegado| End(( ))
    UsuarioDeshabilitado -->|Acceso denegado| End(( ))
    TokenInvalido -->|Sesión terminada| End(( ))
    CuentaAjena -->|Operación no autorizada| End(( ))
    SaldoInsuficiente -->|Transferencia rechazada| End(( ))
    TransferenciaAprobada -->|Transferencia completada| End(( ))

    classDef startNode fill:#000,stroke:#000,stroke-width:1px;
```

### Explicación del Diagrama
Este diagrama representa el flujo completo de validaciones de seguridad que ejecuta ArCash desde el momento que un usuario intenta acceder al sistema hasta que completa una transferencia de dinero.

El proceso inicia cuando el usuario solicita acceso al sistema. Primero se verifica si el usuario existe en la base de datos; si no existe, se deniega el acceso inmediatamente.

Si el usuario existe, se valida la contraseña usando el algoritmo BCrypt, que es computacionalmente costoso y previene ataques de fuerza bruta. Si la contraseña es incorrecta, se deniega el acceso.

Una vez validada la contraseña, se verifica el estado del usuario. Los administradores pueden deshabilitar usuarios, por lo que se controla que el usuario esté activo antes de permitir el acceso.

Cuando la sesión está iniciada correctamente, el usuario puede solicitar transferencias. Aquí comienza un segundo nivel de validaciones de seguridad.

- Primero se valida el token JWT que contiene la información de la sesión. Si el token está expirado o es inválido, se termina la sesión inmediatamente.
- Con un token válido, se verifica que el usuario sea propietario de la cuenta desde la cual quiere transferir dinero. Esta validación crucial previene que usuarios accedan a cuentas ajenas.
- Finalmente, se verifica que la cuenta tenga saldo suficiente para realizar la transferencia. Solo si pasa todas estas validaciones, la transferencia es aprobada y completada.

Cada punto de falla en este flujo (los caminos que llevan a End) termina el proceso, garantizando que el sistema sea seguro contra múltiples tipos de ataques.


