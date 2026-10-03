// Firebase DESACTIVADO - La app usa conexión directa (VPN/Local) vía IP del servidor.
// Este archivo se mantiene para compatibilidad con imports existentes.

let db: any = null;

export const initFirebase = async () => {
  // No-op: Firebase desactivado
  return null;
};

export const getDb = () => null;

// Stubs de Firestore para que los imports no fallen
export const collection = () => {};
export const query = () => {};
export const where = () => {};
export const onSnapshot = () => () => {};
export const getDocs = async () => ({ docs: [] });
export const limit = () => {};
export const orderBy = () => {};

export { db };

