import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';

export default function KardexScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date(); d.setHours(23,59,59,999); return d;
  });
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  const [codigoBarras, setCodigoBarras] = useState('');
  
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cámara
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  // Modal Artículos
  const [showArticlesModal, setShowArticlesModal] = useState(false);
  const [articulosList, setArticulosList] = useState<any[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  useEffect(() => {
    cargarArticulos();
  }, []);

  const cargarArticulos = async () => {
    try {
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (!configStr) return;
      const config = JSON.parse(configStr);
      
      const response = await fetch(`http://${config.directIp}:5246/api/reports/articulos`);
      if (response.ok) {
        setArticulosList(await response.json());
        return;
      }
    } catch {
      // Fallback a caché
      const cached = await AsyncStorage.getItem('dashboard_cache');
      if (cached) {
        const data = JSON.parse(cached);
        if (Array.isArray(data.articulos)) setArticulosList(data.articulos);
      }
    }
  };

  const filteredArticulos = articulosList.filter(a => {
    const q = modalSearchQuery.toLowerCase();
    const nombre = (a.NOMBRE || '').toString().toLowerCase();
    const codg = (a.CODG || '').toString().toLowerCase();
    const idart = (a.IDART || '').toString().toLowerCase();
    return nombre.includes(q) || codg.includes(q) || idart.includes(q);
  }).slice(0, 50);

  const selectArticulo = (art: any) => {
    setCodigoBarras(art.IDART?.toString() || art.CODG || '');
    setShowArticlesModal(false);
    setModalSearchQuery('');
  };

  const consultarDatos = async () => {
    try {
      setIsLoading(true);
      const pad = (n: number) => (n < 10 ? '0' : '') + n;
      const startStr = `${fechaInicio.getFullYear()}-${pad(fechaInicio.getMonth()+1)}-${pad(fechaInicio.getDate())}`;
      const endStr = `${fechaFin.getFullYear()}-${pad(fechaFin.getMonth()+1)}-${pad(fechaFin.getDate())}`;

      const configStr = await AsyncStorage.getItem('firebase_config');
      const config = configStr ? JSON.parse(configStr) : {};
      const ip = config.directIp;

      if (!ip) {
        Alert.alert("Error", "No hay IP configurada para consultar.");
        setIsLoading(false);
        return;
      }

      const url = `http://${ip}:5246/api/reports/kardex?desde=${startStr}&hasta=${endStr}&codigoBarras=${encodeURIComponent(codigoBarras)}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        Alert.alert("Error", "No se pudo obtener el reporte del servidor.");
      }
    } catch (e) {
      console.error("Error al consultar:", e);
      Alert.alert("Error", "Fallo de conexión al servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }: any) => {
    setIsScanning(false);
    setCodigoBarras(data);
    Alert.alert("Código Escaneado", `Se ha escaneado: ${data}`);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permiso Denegado", "Se requiere permiso de cámara para escanear códigos de barras.");
        return;
      }
    }
    setIsScanning(true);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#0ea5e9' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Kardex e Inventario</ThemedText>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.dateSelector}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicio(true)}>
              <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
            </TouchableOpacity>
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>al</ThemedText>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFin(true)}>
              <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.inputContainer}>
            <Ionicons name="barcode-outline" size={20} color="#64748b" style={{ marginLeft: 10 }} />
            <TextInput 
              style={styles.input}
              placeholder="Código de artículo"
              placeholderTextColor="#94a3b8"
              value={codigoBarras}
              onChangeText={setCodigoBarras}
            />
            {codigoBarras.length > 0 && (
              <TouchableOpacity onPress={() => setCodigoBarras('')} style={{ padding: 10 }}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowArticlesModal(true)} style={[styles.scanBtn, { backgroundColor: '#f59e0b', marginRight: 10 }]}>
            <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openScanner} style={styles.scanBtn}>
            <Ionicons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={consultarDatos} style={styles.refreshButton}>
          <Ionicons name={isLoading ? "sync-outline" : "search"} size={20} color="#fff" />
          <ThemedText style={{color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8}}>Consultar Kardex</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {data.length > 0 ? (
          <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            {data.map((item, index) => (
              <View key={index} style={styles.detalleRow}>
                <View style={styles.detalleTop}>
                  <ThemedText style={[styles.bold, { color: '#0ea5e9' }]}>{item.TIPO_MOVIMIENTO}</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: '#64748b' }}>{item.FECHA?.split('T')[0]}</ThemedText>
                </View>
                <ThemedText style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 2 }}>{item.NOMBRE_ARTICULO}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{item.CONCEPTO} - Doc: {item.DOCUMENTO}</ThemedText>
                
                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <ThemedText style={styles.metricLabel}>ENTRADA</ThemedText>
                    <ThemedText style={[styles.metricValue, { color: '#10b981' }]}>{item.ENTRADA}</ThemedText>
                  </View>
                  <View style={styles.metricBox}>
                    <ThemedText style={styles.metricLabel}>SALIDA</ThemedText>
                    <ThemedText style={[styles.metricValue, { color: '#ef4444' }]}>{item.SALIDA}</ThemedText>
                  </View>
                  <View style={styles.metricBox}>
                    <ThemedText style={styles.metricLabel}>EXISTENCIA</ThemedText>
                    <ThemedText style={[styles.metricValue, { color: '#3b82f6' }]}>{item.EXISTENCIA}</ThemedText>
                  </View>
                </View>

                <View style={styles.costoRow}>
                  <ThemedText style={{ fontSize: 11, color: '#94a3b8' }}>Costo U: C${item.COSTO_UNITARIO}</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#94a3b8' }}>Costo Prom: C${item.COSTO_PROMEDIO}</ThemedText>
                  <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#e2e8f0' : '#475569' }}>Total: C${item.COSTO_TOTAL}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={48} color={isDark ? "#475569" : "#cbd5e1"} />
            <ThemedText style={{ marginTop: 15, color: '#94a3b8', textAlign: 'center' }}>
              Utiliza los filtros de fecha o la cámara para buscar movimientos del Kardex.
            </ThemedText>
          </View>
        )}
        <View style={{height: 40}} />
      </ScrollView>

      {/* Escáner de Código de Barras Modal */}
      {isScanning && (
        <Modal animationType="slide" transparent={false} visible={isScanning}>
          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
              }}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerTarget} />
            </View>
            <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setIsScanning(false)}>
              <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Cancelar</ThemedText>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Modal Lista de Artículos */}
      <Modal animationType="slide" transparent={true} visible={showArticlesModal} onRequestClose={() => setShowArticlesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Seleccionar Artículo</ThemedText>
              <TouchableOpacity onPress={() => setShowArticlesModal(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={20} color="#64748b" />
              <TextInput
                style={[styles.modalInput, { color: isDark ? '#fff' : '#000' }]}
                placeholder="Buscar por nombre o código..."
                placeholderTextColor="#94a3b8"
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
              />
            </View>

            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredArticulos.map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.modalItem, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}
                  onPress={() => selectArticulo(item)}
                >
                  <ThemedText style={{ fontWeight: 'bold', fontSize: 14 }}>{item.NOMBRE}</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: '#64748b' }}>Cód: {item.CODG} | ID: {item.IDART}</ThemedText>
                </TouchableOpacity>
              ))}
              {filteredArticulos.length === 0 && (
                <ThemedText style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No se encontraron artículos</ThemedText>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showInicio && <DateTimePicker value={fechaInicio} mode="date" onChange={(e, d) => { 
        setShowInicio(false); 
        if(d) { 
          const corrected = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
          setFechaInicio(corrected); 
        } 
      }} />}
      {showFin && <DateTimePicker value={fechaFin} mode="date" onChange={(e, d) => { 
        setShowFin(false); 
        if(d) { 
          const corrected = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
          setFechaFin(corrected); 
        } 
      }} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  filterSection: { marginBottom: 15 },
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, width: '40%', alignItems: 'center' },
  dateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginRight: 10 },
  input: { flex: 1, padding: 12, color: '#000', fontSize: 14 },
  scanBtn: { backgroundColor: '#3b82f6', width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  refreshButton: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  content: { padding: 15 },
  card: { borderRadius: 15, padding: 15, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2 },
  detalleRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  detalleTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  bold: { fontWeight: 'bold' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 8 },
  metricBox: { alignItems: 'center' },
  metricLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  metricValue: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  costoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 },
  
  // Estilos del Scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff', borderRadius: 20, backgroundColor: 'transparent' },
  closeScannerBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30 },

  // Estilos Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, borderRadius: 10, marginBottom: 15 },
  modalInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 10 },
  modalList: { flex: 1 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1 }
});
