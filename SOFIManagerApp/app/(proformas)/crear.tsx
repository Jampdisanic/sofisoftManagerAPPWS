import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  SafeAreaView,
  Platform,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/constants/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ArticuloProforma = {
  id: string; // Identificador único real (IDART)
  codigo: string; // Código de barras para la DB (CODG)
  nombre: string;
  cantidad: number;
  precio: number;
  iva: number;
};

export default function CrearProformaScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Estados de datos
  const [clientesRaw, setClientesRaw] = useState<any[]>([]);
  const [articulosRaw, setArticulosRaw] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Estados del Formulario
  const [clienteSel, setClienteSel] = useState<any>({ IDCLIENTE: 1, NOMBRE: 'CLIENTE CONTADO' });
  const [nota, setNota] = useState('');
  const [detalles, setDetalles] = useState<ArticuloProforma[]>([]);

  // Modales
  const [showClientesModal, setShowClientesModal] = useState(false);
  const [showArticulosModal, setShowArticulosModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Totales
  const subtotal = detalles.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const totalIva = detalles.reduce((acc, item) => acc + (item.iva * item.cantidad), 0);
  const totalFinal = subtotal + totalIva;

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      setIsLoadingData(true);
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.directIp) {
          // Fetch Clientes
          const resCli = await fetch(`http://${config.directIp}:5246/api/reports/clientes`);
          if (resCli.ok) setClientesRaw(await resCli.json());

          // Fetch Artículos
          const resArt = await fetch(`http://${config.directIp}:5246/api/reports/articulos`);
          if (resArt.ok) setArticulosRaw(await resArt.json());
        }
      }
    } catch (e) {
      console.warn("Error cargando catálogos", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const clientesFiltrados = useMemo(() => {
    if (!searchQuery) return clientesRaw;
    return clientesRaw.filter(c => 
      c.NOMBRE?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.IDCLIENTE?.toString().includes(searchQuery)
    );
  }, [clientesRaw, searchQuery]);

  const articulosFiltrados = useMemo(() => {
    if (!searchQuery) return articulosRaw;
    return articulosRaw.filter(a => 
      a.NOMBRE?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.CODG?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articulosRaw, searchQuery]);

  const seleccionarCliente = (cli: any) => {
    setClienteSel(cli);
    setShowClientesModal(false);
    setSearchQuery('');
  };

  const seleccionarArticulo = (art: any) => {
    // Usamos ESTRICTAMENTE el IDART como identificador único en la interfaz
    const artIdUnico = String(art.IDART);
    
    const index = detalles.findIndex(d => d.id === artIdUnico);
    if (index >= 0) {
      incrementarCantidad(index);
    } else {
      const precioVenta = art.PVENTA1 ? parseFloat(art.PVENTA1) : 0;
      const nuevoArticulo: ArticuloProforma = {
        id: artIdUnico,
        codigo: art.CODG || artIdUnico, // Para mandar al backend
        nombre: art.NOMBRE,
        cantidad: 1,
        precio: precioVenta,
        iva: 0 
      };
      setDetalles([...detalles, nuevoArticulo]);
    }
    setShowArticulosModal(false);
    setSearchQuery('');
  };

  const incrementarCantidad = (index: number) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index].cantidad += 1;
    setDetalles(nuevosDetalles);
  };

  const decrementarCantidad = (index: number) => {
    const nuevosDetalles = [...detalles];
    if (nuevosDetalles[index].cantidad > 1) {
      nuevosDetalles[index].cantidad -= 1;
      setDetalles(nuevosDetalles);
    } else {
      nuevosDetalles.splice(index, 1);
      setDetalles(nuevosDetalles);
    }
  };

  const generarProforma = async () => {
    if (detalles.length === 0) {
      Alert.alert("Atención", "Debe agregar al menos un artículo a la proforma.");
      return;
    }

    try {
      // 1. Armar el objeto JSON esperado por el API
      const proformaDto = {
        IdCliente: clienteSel.IDCLIENTE,
        IdVendedor: 1, // Puedes sacarlo del usuario logueado en AsyncStorage
        ClienteTemp: clienteSel.NOMBRE,
        IdUser: 1, 
        EstatusDoc: 1, // Proforma
        Subtotal: subtotal,
        Descuento: 0,
        TotalFinal: totalFinal,
        MontoRecibido: 0,
        Saldo: totalFinal,
        Vuelto: 0,
        MontoIva: totalIva,
        MontoPagado: 0,
        NotaDeProforma: nota,
        Detalles: detalles.map(d => ({
          Codigo: d.id, // Se manda el IDART estrictamente
          Cantidad: d.cantidad,
          Total: d.precio * d.cantidad,
          Descuento: 0,
          Precio: d.precio,
          Impto: d.iva * d.cantidad,
          Nombre: d.nombre,
          Oculto: 0,
          DetId: "1", 
          Sumat: 1,
          ExtId: ""
        }))
      };

      const configStr = await AsyncStorage.getItem('firebase_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.directIp) {
          const res = await fetch(`http://${config.directIp}:5246/api/ventas/proforma`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proformaDto)
          });
          
          const result = await res.json();
          if (res.ok && result.success) {
            Alert.alert("¡Éxito!", `Proforma generada correctamente. Doc #${result.nfact}`);
            // Limpiar carrito
            setDetalles([]);
            setNota('');
          } else {
            Alert.alert("Error", result.message || "No se pudo guardar la proforma.");
          }
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Problemas de conexión con el servidor.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#2563eb' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ThemedView style={[styles.container, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
          
          {/* Barra Superior con Botón Atrás */}
          <View style={[styles.topBar, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <ThemedText style={styles.topBarTitle}>Nueva Proforma</ThemedText>
            {isLoadingData && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 'auto' }} />}
          </View>

          {/* Header - Selección de Cliente */}
          <TouchableOpacity 
            style={[styles.headerCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}
            onPress={() => { setSearchQuery(''); setShowClientesModal(true); }}
          >
            <View style={styles.headerRow}>
              <View style={styles.clientInfo}>
                <ThemedText style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Cliente Facturación:</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 16, marginTop: 4 }}>{clienteSel.IDCLIENTE} - {clienteSel.NOMBRE}</ThemedText>
              </View>
              <View style={styles.searchButton}>
                <Ionicons name="person-outline" size={20} color="#ffffff" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Buscador de Artículos */}
          <View style={styles.searchContainer}>
            <TouchableOpacity 
              style={[styles.searchInputWrapper, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}
              onPress={() => { setSearchQuery(''); setShowArticulosModal(true); }}
            >
              <Ionicons name="barcode-outline" size={20} color={isDark ? '#94a3b8' : '#94a3b8'} style={{ paddingHorizontal: 10 }} />
              <ThemedText style={{ color: isDark ? '#94a3b8' : '#94a3b8', flex: 1 }}>Buscar artículo para agregar...</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => { setSearchQuery(''); setShowArticulosModal(true); }}>
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Lista de Detalles (Carrito) */}
          <ScrollView style={styles.detailsContainer}>
            {detalles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={64} color={isDark ? '#475569' : '#cbd5e1'} />
                <ThemedText style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: 10 }}>No hay artículos agregados</ThemedText>
              </View>
            ) : (
              detalles.map((item, index) => (
                <View key={index} style={[styles.itemCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
                  <View style={styles.itemInfo}>
                    <ThemedText type="defaultSemiBold">{item.nombre}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#3b82f6' }}>ID: {item.id} {item.codigo !== item.id ? `| Cód: ${item.codigo}` : ''}</ThemedText>
                    <ThemedText style={{ fontSize: 14, marginTop: 4 }}>Precio: C$ {item.precio.toFixed(2)}</ThemedText>
                  </View>
                  
                  <View style={styles.itemActions}>
                    <ThemedText type="defaultSemiBold" style={{ textAlign: 'right', marginBottom: 8 }}>
                      C$ {(item.precio * item.cantidad).toFixed(2)}
                    </ThemedText>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity style={styles.qtyButton} onPress={() => decrementarCantidad(index)}>
                        <Ionicons name="remove" size={16} color={isDark ? '#ffffff' : '#000000'} />
                      </TouchableOpacity>
                      <ThemedText style={styles.qtyText}>{item.cantidad}</ThemedText>
                      <TouchableOpacity style={styles.qtyButton} onPress={() => incrementarCantidad(index)}>
                        <Ionicons name="add" size={16} color={isDark ? '#ffffff' : '#000000'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer - Totales y Guardar */}
          <View style={[styles.footer, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderTopColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <TextInput 
              style={[styles.noteInput, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#ffffff' : '#000000' }]}
              placeholder="Nota de la proforma..."
              placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
              value={nota}
              onChangeText={setNota}
            />
            
            <View style={styles.totalsRow}>
              <View>
                <ThemedText style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Subtotal</ThemedText>
                <ThemedText>C$ {subtotal.toFixed(2)}</ThemedText>
              </View>
              <View>
                <ThemedText style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>IVA</ThemedText>
                <ThemedText>C$ {totalIva.toFixed(2)}</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Total</ThemedText>
                <ThemedText type="subtitle" style={{ color: '#10b981' }}>C$ {totalFinal.toFixed(2)}</ThemedText>
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={generarProforma}>
              <Ionicons name="save-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <ThemedText style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Generar Proforma</ThemedText>
            </TouchableOpacity>
          </View>

        </ThemedView>

        {/* MODAL DE CLIENTES */}
        <Modal visible={showClientesModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Seleccionar Cliente</ThemedText>
              <TouchableOpacity onPress={() => setShowClientesModal(false)}>
                <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
            <TextInput 
              style={[styles.modalSearch, { backgroundColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#fff' : '#000' }]}
              placeholder="Buscar cliente..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <FlatList
              data={clientesFiltrados}
              keyExtractor={item => String(item.IDCLIENTE)}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => seleccionarCliente(item)}>
                  <ThemedText type="defaultSemiBold">{item.NOMBRE}</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: '#64748b' }}>ID: {item.IDCLIENTE}</ThemedText>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>

        {/* MODAL DE ARTÍCULOS */}
        <Modal visible={showArticulosModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Agregar Artículo</ThemedText>
              <TouchableOpacity onPress={() => setShowArticulosModal(false)}>
                <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
            <TextInput 
              style={[styles.modalSearch, { backgroundColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#fff' : '#000' }]}
              placeholder="Buscar por nombre o código..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <FlatList
              data={articulosFiltrados}
              keyExtractor={item => String(item.IDART)}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => seleccionarArticulo(item)}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{item.NOMBRE}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#3b82f6' }}>Código: {item.CODG}</ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: 'bold' }}>C$ {parseFloat(item.PVENTA1 || 0).toFixed(2)}</ThemedText>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    padding: 10,
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    height: 48,
    marginRight: 10,
    paddingHorizontal: 10,
  },
  addButton: {
    backgroundColor: '#10b981',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flex: 2,
  },
  itemActions: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 4,
  },
  qtyButton: {
    padding: 4,
  },
  qtyText: {
    marginHorizontal: 12,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  noteInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  modalSearch: {
    margin: 16,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});
