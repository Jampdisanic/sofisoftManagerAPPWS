# Mapeo de Seguridad: Pantallas vs. Permisos en Base de Datos

Este documento detalla qué **ID de Permiso** de la base de datos (tabla `permisos` y su cruce en `permiroles`) controla la visibilidad de cada categoría y reporte dentro de la aplicación móvil de **SOFIManager**.

## Módulos Principales (Categorías)
Estos permisos controlan si la pestaña o categoría entera aparece en la aplicación.

| Categoría | ID Permiso | Constante en Código |
| :--- | :--- | :--- |
| **Ventas** | `1` | `MODULO_VENTAS` |
| **Compras** | `8` | `MODULO_COMPRAS` |
| **Inventario** | `10` | `MODULO_INVENTARIO` |
| **Administración** | `17` | `MODULO_ADMINISTRACION` |

---

## Reportes Individuales
Estos permisos controlan la visibilidad de cada botón dentro de las categorías.

### 📈 Módulo de Ventas
| Reporte (Pantalla) | ID Permiso | Descripción del Permiso |
| :--- | :--- | :--- |
| **Informe de Caja (Flujo del día)** | `33` / `46` | Reporte de caja / Arqueo de Caja |
| **Master de Ventas** | `32` | Master de ventas |
| **Artículos Vendidos** | `31` | Artículos vendidos |
| **Ventas por Vendedor** | `47` | Vendedores |
| **Top Productos (Pareto)** | `50` | Pareto de Artículos |
| **Resumen de Ventas** | `44` | Resumen de ventas |

### 🛒 Módulo de Compras
| Reporte (Pantalla) | ID Permiso | Descripción del Permiso |
| :--- | :--- | :--- |
| **Master de Compras** | `9` | Facturas por compras |
| **Master de Gastos** | `37` | Master de gastos |
| **Artículos Comprados** | `9` | *(Vinculado temporalmente a Facturas por compras)* |

### 📦 Módulo de Inventario
| Reporte (Pantalla) | ID Permiso | Descripción del Permiso |
| :--- | :--- | :--- |
| **Stock Crítico** | `38` | Lista de existencia |
| **Inventario Valorizado** | `49` | Inventario Valorizado |
| **Movimientos de Kardex** | `45` | Kardex |

### ⚙️ Módulo de Administración
| Reporte (Pantalla) | ID Permiso | Descripción del Permiso |
| :--- | :--- | :--- |
| **Lista de Clientes** | `18` | Clientes |
| **Lista de Proveedores** | `21` | Proveedores |
| **Lista de Vendedores** | `9` *(Ref)* | Vendedores |
| **Auditoría de Logs** | `48` | Auditoria |

> [!NOTE]
> Las pantallas que comparten el mismo ID de permiso se mostrarán u ocultarán juntas. Si necesitas separarlas en el futuro, simplemente deberás crear un nuevo ID en tu tabla de `permisos` y actualizar el archivo `PermissionsContext.tsx`.
