# RS Monitor

App para trackear la actividad de una agente inmobiliaria: base de relaciones (contactos A/B/C/D), actividades diarias, objetivos anuales y ratios de conversión. Funciona en computadora y en el teléfono (se puede instalar como app desde el navegador).

Está basada en las planillas de trabajo de Sofía Vitale:

| Planilla | En la app |
| --- | --- |
| Base de relaciones (contactos + historial) | **Contactos**: ficha completa, nivel A/B/C/D, próxima acción, historial |
| Seguimiento de actividades (semana a semana) | **Actividades**: vista semanal lunes a domingo |
| Objetivos y trackeo (objetivos, gastos, ratios) | **Objetivos**: plan anual, mes a mes, trackeo semanal, ratios y gastos |
| — | **Hoy**: metas de la semana, acciones pendientes, a quién recontactar, cumpleaños |

Cada actividad que registrás (contacto, prelisting, ACM, captación, visita, cierre, farming, reunión) alimenta automáticamente los ratios, el trackeo semanal y la facturación real (los cierres llevan la comisión cobrada).

## Tecnología

- React 18 + TypeScript + Vite
- Supabase (base de datos Postgres + autenticación), con Row Level Security: cada usuaria ve solo sus datos
- Netlify (hosting)

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Abrí **SQL Editor → New query**, pegá el contenido de [`supabase/schema.sql`](supabase/schema.sql) y tocá **Run**.
3. En **Authentication → URL Configuration**, poné en **Site URL** la dirección de Netlify (por ejemplo `https://rsmonitor.netlify.app`) y agregala también en **Redirect URLs**. Sin esto, los emails de confirmación y de "olvidé mi contraseña" apuntan a `localhost`.
4. En **Project Settings → API** copiá la **Project URL** y la **anon public key**.

> Si vas a ser la única usuaria, después de crear tu cuenta podés desactivar los registros nuevos en **Authentication → Sign In / Providers → Allow new users to sign up**.

### 2. Netlify

1. **Add new site → Import an existing project** y elegí este repositorio de GitHub.
2. La configuración de build ya está en [`netlify.toml`](netlify.toml) (`npm run build`, carpeta `dist`).
3. En **Site configuration → Environment variables** agregá:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
4. Deploy. Cada `git push` a `main` vuelve a publicar.

### 3. En el teléfono

Abrí la URL de Netlify y:
- **iPhone (Safari)**: Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome)**: menú ⋮ → *Instalar app*.

## Desarrollo local

Requiere Node 16.14 o superior.

```bash
npm install
cp .env.example .env.local   # completá con tus datos de Supabase
npm run dev
```

Sin `.env.local` la app ofrece un **modo demo** con datos ficticios guardados solo en el navegador, útil para probar la interfaz.

## Accesibilidad y diseño

- Navegación lateral en escritorio y barra inferior + botón "Registrar" en el teléfono.
- Contraste AA o superior, modo oscuro automático, foco visible, enlace "Saltar al contenido".
- Formularios con etiquetas reales, errores anunciados y campos de 44 px mínimo para tocar.
- Diálogos nativos (`<dialog>`) con foco atrapado y cierre con Esc; pestañas navegables con flechas.
- Respeta "reducir movimiento" del sistema; los números aceptan coma decimal.

## Estructura

```
supabase/schema.sql      tablas, índices y políticas de seguridad
src/lib/                 tipos, acceso a datos (Supabase o demo), cálculos de objetivos
src/components/          layout, formularios, diálogos
src/pages/               Hoy, Actividades, Contactos, Ficha de contacto, Objetivos
```
