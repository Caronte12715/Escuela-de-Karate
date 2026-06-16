# Kyudai Kai Dojo Manager 🥋

Un sistema de gestión moderno, elegante y de tiempo real diseñado específicamente para el **Dojo Kyudai Kai**. Este panel administrativo permite a los instructores controlar la matrícula de alumnos, registrar la asistencia por clases/grupos, y supervisar el progreso técnico y los ascensos de cinturón históricos con sincronización persistente mediante **Firebase**.

---

## 🚀 Características Principales

- 🔐 **Autenticación Segura**: Acceso restringido por lista blanca (*whitelist*) mediante Google Authentication. Solo los instructores autorizados (`alexguevara12715@gmail.com`) pueden visualizar o modificar datos.
- 👥 **Registro de Matrícula (Roster)**: Registro detallado de alumnos con nombre, edad, cinturón, notas y teléfono de emergencia.
- ⏱️ **Control de Asistencia Activo**: Creación de sesiones de clase dinámicas y pase de lista en tiempo real por categoría de edad ("Participantes", "Pre-Policiales/Infantil", "Juvenil/Adulto").
- 📈 **Bitácora de Progreso y Ascensos**:
  - Evaluación y checklist de Katas dominadas de manera personalizada.
  - Registro de horas de combate (*Sparring/Kumite*).
  - Promoción oficial de cinturones con cálculo automático del siguiente nivel y registro histórico de exámenes.
- 📊 **Reportes y Auditoría**: Visualización rápida del estado de asistencia de los alumnos, rankings del dojo y listado histórico de promociones aplicadas.
- 🎨 **Diseño Impecable**: Interfaz de usuario de alta fidelidad optimizada con Tailwind CSS, animaciones interactivas ligeras con Framer Motion, y adaptabilidad completa para dispositivos móviles y tabletas.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18, TypeScript, Vite.
- **Estilos**: Tailwind CSS 4.
- **Base de Datos y Auth**: Firebase Firestore (tiempos de respuesta ultra-bajos con suscripción distribuida a streams de datos `onSnapshot`) y Firebase Authentication (Google Provider).
- **Animaciones**: Framer Motion / Motion.
- **Iconografía**: Lucide React.

---

## ⚙️ Configuración y Ejecución Local

Para ejecutar este gestor en tu máquina local:

### 1. Clonar el repositorio
Una vez exportado a tu GitHub, clónalo localmente:
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd <CARPETA_DEL_REPOSITORIO>
```

### 2. Instalar dependencias
Instala los paquetes necesarios del ecosistema Node:
```bash
npm install
```

### 3. Configurar Firebase (Opcional en Local)
El proyecto ya cuenta con un archivo interno auto-generado de configuración (`firebase-applet-config.json`). Si prefieres utilizar tu propio proyecto de Firebase en local:
1. Reemplaza el contenido de `firebase-applet-config.json` con tus credenciales de consola de Firebase.
2. Asegúrate de habilitar los métodos de inicio de sesión de Google en tu consola de Firebase.

### 4. Lanzar el Servidor de Desarrollo
Inicia el entorno de desarrollo local con Vite:
```bash
npm run dev
```
La aplicación estará disponible de inmediato en `http://localhost:3000`.

---

## 📦 Cómo Exportar a GitHub desde Google AI Studio

Para enviar este proyecto directamente a tu cuenta de GitHub, sigue estos pasos guiados dentro del portal de **Google AI Studio**:

1. **Abre el menú de configuración de la aplicación** en la barra superior derecha de la interfaz de desarrollo de AI Studio Build (ícono de engranaje ⚙️ o menú de opciones de la app).
2. Selecciona la opción**"Export to GitHub"** (Exportar a GitHub).
3. **Autoriza tu cuenta**: Si es la primera vez, el sistema te pedirá asociar tu cuenta de GitHub con Google AI Studio.
4. **Define tu repositorio**:
   - Asígnale un nombre descriptivo (por ejemplo, `kyudai-kai-dojo-manager`).
   - Elige si deseas que sea **Público** o **Privado**.
5. Presiona **"Export"** (Exportar). ¡AI Studio subirá automáticamente todo el código estructurado, la configuración de Firebase y este archivo explicativo en un solo paso!
