import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Diccionario centralizado de mapeo de IDs de la DB con las pantallas de SOFIManager App
export const PERMISSION_IDS = {
  FACTURAS_COMPRAS: 9,      // (compras)/master-compras
  ARTICULOS_VENDIDOS: 31,   // (ventas)/articulos-vendidos
  MASTER_VENTAS: 32,        // (ventas)/master-ventas
  REPORTE_CAJA: 33,         // (ventas)/flujo-dia (o Arqueo 46)
  RESUMEN_VENTAS: 44,       // (ventas)/resumen-ventas
  KARDEX: 45,               // (inventario)/kardex
  ARQUEO_CAJA: 46,          // (ventas)/flujo-dia
  VENDEDORES: 47,           // (ventas)/ventas-vendedor
  PARETO_ARTICULOS: 50,     // (ventas)/paretos-articulos
  INVENTARIO_VALORIZADO: 49,// (inventario)/inventario-valorizado
  AUDITORIA: 48,            // (administracion)/auditoria
  CLIENTES: 18,             // (administracion)/clientes
  PROVEEDORES: 21,          // (administracion)/proveedores
  MASTER_GASTOS: 37,        // (compras)/master-gastos
  LISTA_EXISTENCIA: 38,     // (inventario)/critical-stock
  
  // Módulos Principales (Categorías)
  MODULO_VENTAS: 1,
  MODULO_COMPRAS: 8,
  MODULO_INVENTARIO: 10,
  MODULO_ADMINISTRACION: 17,
  
  // Acciones / Pantallas
  CREAR_PROFORMA: 2,        // (ventas)/proformas
};

type PermissionData = {
  IdPermi?: number;
  IDPERMI?: number;
  idPermi?: number;
  Activo?: number | boolean;
  ACTIVO?: number | boolean;
  crear?: number | boolean;
  CREAR?: number | boolean;
  editar?: number | boolean;
  EDITAR?: number | boolean;
  eliminar?: number | boolean;
  ELIMINAR?: number | boolean;
};

type PermissionsContextType = {
  permissions: PermissionData[];
  reloadPermissions: () => Promise<void>;
  hasPermission: (id: number) => { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
};

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  reloadPermissions: async () => {},
  hasPermission: () => ({ canView: false, canCreate: false, canEdit: false, canDelete: false })
});

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [permissions, setPermissions] = useState<PermissionData[]>([]);

  const reloadPermissions = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_permissions');
      if (stored) {
        setPermissions(JSON.parse(stored));
      } else {
        setPermissions([]);
      }
    } catch (e) {
      console.warn("Error leyendo permisos en caché", e);
    }
  };

  useEffect(() => {
    reloadPermissions();
  }, []);

  const hasPermission = (id: number) => {
    const match = permissions.find((p) => p.IdPermi === id || p.IDPERMI === id || p.idPermi === id);
    if (match) {
      return {
        canView: match.Activo === 1 || match.ACTIVO === 1 || match.Activo === true || match.ACTIVO === true,
        canCreate: match.crear === 1 || match.CREAR === 1 || match.crear === true || match.CREAR === true,
        canEdit: match.editar === 1 || match.EDITAR === 1 || match.editar === true || match.EDITAR === true,
        canDelete: match.eliminar === 1 || match.ELIMINAR === 1 || match.eliminar === true || match.ELIMINAR === true,
      };
    }
    // Si no se encuentra el permiso, bloqueamos por seguridad (False by default)
    return { canView: false, canCreate: false, canEdit: false, canDelete: false };
  };

  return (
    <PermissionsContext.Provider value={{ permissions, reloadPermissions, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
