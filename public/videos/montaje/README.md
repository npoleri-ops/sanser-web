# Videos Explicativos de Montaje — SANSER Metalúrgica

Este directorio almacena los videos explicativos en formato MP4 que se reproducen en el cotizador interactivo (`/cotizar`) y se vinculan a las cotizaciones de los clientes.

## Estructura de nombres y variantes

El sistema selecciona dinámicamente el archivo según la tipología y los complementos (cerramientos y aberturas). Si una variante específica no está presente en este directorio, el reproductor realiza un fallback automático e imperceptible a la versión base correspondiente.

### 1. Tinglados y Galpones a Dos Aguas (`gable`, `gable_varillas`)
- **Estructura base:** `2-aguas.mp4` *(Versión genérica por defecto)*
- **Con cerramiento perimetral:** `2-aguas-con-cerramiento.mp4`
- **Con portón o puertas:** `2-aguas-con-aberturas.mp4`
- **Completo (cerramiento + portón/puertas):** `2-aguas-con-cerramiento-y-aberturas.mp4`

### 2. Galpones a Dos Aguas Pórtico (`gable_portico`)
- **Estructura base:** `2-aguas-portico.mp4` *(Fallback a `2-aguas.mp4`)*
- **Con cerramiento perimetral:** `2-aguas-portico-con-cerramiento.mp4`
- **Con portón o puertas:** `2-aguas-portico-con-aberturas.mp4`
- **Completo:** `2-aguas-portico-con-cerramiento-y-aberturas.mp4`

### 3. Tinglados a Una Agua (`shed`, `shed_varillas`)
- **Estructura base:** `1-agua.mp4` *(Versión genérica por defecto)*
- **Con cerramiento perimetral:** `1-agua-con-cerramiento.mp4`
- **Con portón o puertas:** `1-agua-con-aberturas.mp4`
- **Completo (cerramiento + portón/puertas):** `1-agua-con-cerramiento-y-aberturas.mp4`

## Especificaciones recomendadas de video
- **Formato:** MP4 (H.264 / AAC)
- **Resolución:** 1080p (1920x1080) o 720p (1280x720)
- **Tasa de bits:** 2.5 a 4 Mbps (optimizado para carga rápida en móviles)
- **Aspect Ratio:** 16:9

