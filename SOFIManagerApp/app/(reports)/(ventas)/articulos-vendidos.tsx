import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Text,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';

export default function ArticulosVendidosScreen() {
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
  
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'resumen' | 'detalle'>('resumen');

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const consultarDatos = async () => {
    try {
      setIsLoading(true);
      const startStr = getLocalDateString(fechaInicio);
      const endStr = getLocalDateString(fechaFin);

      const configStr = await AsyncStorage.getItem('firebase_config');
      const config = configStr ? JSON.parse(configStr) : {};
      const ip = config.directIp;

      if (!ip) {
        Alert.alert("Error", "No hay IP configurada para consultar.");
        return;
      }

      const res = await fetch(`http://${ip}:5246/api/reports/articulos-vendidos?desde=${startStr}&hasta=${endStr}`);
      
      if (res.ok) {
        const result = await res.json();
        // Filtrar facturas anuladas si es necesario (ESTATUSDOC = 3)
        const validos = result.filter((r: any) => r.ESTATUSDOC?.toString() !== '3');
        setData(validos);
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

  const agrupados = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      const nombre = item.ARTICULO || 'Sin Nombre';
      const cant = parseFloat(item.CANTDART || 0);
      const monto = parseFloat(item.DetallePrecionTotal || item.MONTOTOTAL || 0);
      const ganancia = parseFloat(item.GananciaBrutaDetalle || 0);
      
      if (map.has(nombre)) {
        const v = map.get(nombre);
        v.cant += cant;
        v.monto += monto;
        v.ganancia += ganancia;
      } else {
        map.set(nombre, { cant, monto, ganancia });
      }
    });

    return Array.from(map.entries())
      .map(([nombre, vals]) => ({ nombre, ...vals }))
      .sort((a, b) => b.cant - a.cant); // Ordenar por más vendidos
  }, [data]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#3b82f6' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Artículos Vendidos</ThemedText>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>Desde</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicio(true)}>
                <Ionicons name="calendar-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFin(true)}>
                <Ionicons name="calendar-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            onPress={consultarDatos} 
            style={styles.largeQueryButton}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="#fff" />
                <ThemedText style={styles.largeQueryButtonText}>Consultar Reporte</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'resumen' && styles.toggleActive]} 
            onPress={() => setViewMode('resumen')}
          >
            <ThemedText style={[styles.toggleText, viewMode === 'resumen' && styles.toggleTextActive]}>Más Vendidos</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'detalle' && styles.toggleActive]} 
            onPress={() => setViewMode('detalle')}
          >
            <ThemedText style={[styles.toggleText, viewMode === 'detalle' && styles.toggleTextActive]}>Detalle por Factura</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {data.length > 0 ? (
          viewMode === 'resumen' ? (
            <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              <View style={styles.rowHeader}>
                <ThemedText style={[styles.colName, styles.bold]}>Artículo</ThemedText>
                <ThemedText style={[styles.colCant, styles.bold]}>Cant.</ThemedText>
                <ThemedText style={[styles.colTotal, styles.bold]}>Total (C$)</ThemedText>
              </View>
              {agrupados.map((item, index) => (
                <View key={index} style={styles.row}>
                  <ThemedText style={styles.colName} numberOfLines={2}>{item.nombre}</ThemedText>
                  <ThemedText style={styles.colCant}>{item.cant}</ThemedText>
                  <ThemedText style={[styles.colTotal, { color: '#10b981', fontWeight: 'bold' }]}>
                    {item.monto.toLocaleString()}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              {data.map((item, index) => (
                <View key={index} style={styles.detalleRow}>
                  <View style={styles.detalleTop}>
                    <ThemedText style={[styles.bold, { color: '#3b82f6' }]}>Factura: {item.FACTURA}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#64748b' }}>{item.FECHA?.split(' ')[0]}</ThemedText>
                  </View>
                  <ThemedText style={{ fontSize: 13, marginBottom: 5 }}>Vendedor: {item.VENDEDOR}</ThemedText>
                  <View style={styles.detalleItem}>
                    <ThemedText style={{ flex: 1, fontWeight: 'bold' }} numberOfLines={1}>{item.ARTICULO}</ThemedText>
                    <ThemedText style={{ width: 40, textAlign: 'center' }}>x{item.CANTDART}</ThemedText>
                    <ThemedText style={{ width: 80, textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>
                      C$ {parseFloat(item.DetallePrecionTotal || item.MONTOTOTAL || 0).toLocaleString()}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Ionicons name="cart-outline" size={48} color={isDark ? "#475569" : "#cbd5e1"} />
            <ThemedText style={{ marginTop: 15, color: '#94a3b8', textAlign: 'center' }}>
              Selecciona las fechas y presiona "Consultar" para cargar los artículos vendidos.
            </ThemedText>
          </View>
        )}
        <View style={{height: 40}} />
      </ScrollView>

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
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dateCol: { width: '48%' },
  dateLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontWeight: '600', marginBottom: 4, marginLeft: 2 },
  dateBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  largeQueryButton: { 
    backgroundColor: '#10b981', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 50, 
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  largeQueryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#fff' },
  toggleText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  toggleTextActive: { color: '#3b82f6' },
  content: { padding: 15 },
  card: { borderRadius: 15, padding: 15, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2 },
  rowHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10, marginBottom: 10 },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  colName: { flex: 2, fontSize: 13 },
  colCant: { flex: 0.5, textAlign: 'center', fontSize: 13 },
  colTotal: { flex: 1, textAlign: 'right', fontSize: 13 },
  bold: { fontWeight: 'bold' },
  detalleRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  detalleTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  detalleItem: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, alignItems: 'center' }
});
