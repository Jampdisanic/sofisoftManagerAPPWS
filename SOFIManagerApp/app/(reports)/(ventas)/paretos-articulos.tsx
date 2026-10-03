import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';

const { width } = Dimensions.get('window');

type TabType = 'articulos' | 'vendedores' | 'clientes';

export default function ParetosArticulosScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  
  const [showInicioDate, setShowInicioDate] = useState(false);
  const [showFinDate, setShowFinDate] = useState(false);
  
  const [rawData, setRawData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('articulos');

  const consultarDatos = async () => {
    try {
      setIsLoading(true);
      
      const formatIsoDate = (d: Date) => {
        const pad = (num: number) => (num < 10 ? '0' : '') + num;
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      };
      
      const startStr = formatIsoDate(fechaInicio);
      const endStr = formatIsoDate(fechaFin);

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
        // Filtrar anuladas (ESTATUSDOC = 3)
        const validos = result.filter((r: any) => r.ESTATUSDOC?.toString() !== '3');
        setRawData(validos);
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

  // Calcular consolidados
  const analytics = useMemo(() => {
    let totalSalesVal = 0;
    const articulosMap = new Map();
    const vendedoresMap = new Map();
    const clientesMap = new Map();

    rawData.forEach(item => {
      const cant = parseFloat(item.CANTDART || 0);
      const monto = parseFloat(item.DetallePrecionTotal || item.MONTOTOTAL || 0);
      totalSalesVal += monto;

      // 1. Agrupar por Artículo
      const artNombre = item.ARTICULO || 'Sin Nombre';
      if (articulosMap.has(artNombre)) {
        const a = articulosMap.get(artNombre);
        a.cant += cant;
        a.monto += monto;
      } else {
        articulosMap.set(artNombre, { cant, monto });
      }

      // 2. Agrupar por Vendedor
      const vendNombre = item.VENDEDOR || 'Desconocido';
      if (vendedoresMap.has(vendNombre)) {
        const v = vendedoresMap.get(vendNombre);
        v.monto += monto;
        v.cant += cant;
        v.movimientos += 1;
      } else {
        vendedoresMap.set(vendNombre, { monto, cant, movimientos: 1 });
      }

      // 3. Agrupar por Cliente
      const cliNombre = item.CLIENTE || item.CLIENTETEMP || 'Cliente Eventual';
      if (clientesMap.has(cliNombre)) {
        const c = clientesMap.get(cliNombre);
        c.monto += monto;
        c.cant += cant;
        c.movimientos += 1;
      } else {
        clientesMap.set(cliNombre, { monto, cant, movimientos: 1 });
      }
    });

    const articulos = Array.from(articulosMap.entries())
      .map(([name, val]) => ({ name, ...val, pct: totalSalesVal > 0 ? (val.monto / totalSalesVal) * 100 : 0 }))
      .sort((a, b) => b.monto - a.monto); // Top por dinero facturado

    const vendedores = Array.from(vendedoresMap.entries())
      .map(([name, val]) => ({ name, ...val, pct: totalSalesVal > 0 ? (val.monto / totalSalesVal) * 100 : 0 }))
      .sort((a, b) => b.monto - a.monto);

    const clientes = Array.from(clientesMap.entries())
      .map(([name, val]) => ({ name, ...val, pct: totalSalesVal > 0 ? (val.monto / totalSalesVal) * 100 : 0 }))
      .sort((a, b) => b.monto - a.monto);

    return {
      totalSalesVal,
      articulos,
      vendedores,
      clientes
    };
  }, [rawData]);

  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'articulos': return analytics.articulos;
      case 'vendedores': return analytics.vendedores;
      case 'clientes': return analytics.clientes;
      default: return [];
    }
  }, [activeTab, analytics]);

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return '#f59e0b'; // Oro
    if (index === 1) return '#94a3b8'; // Plata
    if (index === 2) return '#b45309'; // Bronce
    return isDark ? '#334155' : '#e2e8f0';
  };

  const getRankBadgeTextColor = (index: number) => {
    if (index < 3) return '#ffffff';
    return isDark ? '#94a3b8' : '#475569';
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Top Movimiento (Pareto)</ThemedText>
        </View>

        {/* Filtros */}
        <View style={styles.filterSection}>
          <View style={styles.rowLayout}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.filterLabel}>Desde:</ThemedText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicioDate(true)}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.filterLabel}>Hasta:</ThemedText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFinDate(true)}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={consultarDatos} style={styles.refreshButton}>
             <Ionicons name={isLoading ? "sync-outline" : "search"} size={20} color="#fff" />
             <ThemedText style={{color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 8}}>Analizar Movimiento</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'articulos' && styles.tabActive]}
          onPress={() => setActiveTab('articulos')}
        >
          <Ionicons name="cube-outline" size={18} color={activeTab === 'articulos' ? '#2563eb' : '#64748b'} />
          <ThemedText style={[styles.tabText, activeTab === 'articulos' && styles.tabTextActive]}>Productos</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'vendedores' && styles.tabActive]}
          onPress={() => setActiveTab('vendedores')}
        >
          <Ionicons name="people-outline" size={18} color={activeTab === 'vendedores' ? '#2563eb' : '#64748b'} />
          <ThemedText style={[styles.tabText, activeTab === 'vendedores' && styles.tabTextActive]}>Vendedores</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'clientes' && styles.tabActive]}
          onPress={() => setActiveTab('clientes')}
        >
          <Ionicons name="business-outline" size={18} color={activeTab === 'clientes' ? '#2563eb' : '#64748b'} />
          <ThemedText style={[styles.tabText, activeTab === 'clientes' && styles.tabTextActive]}>Clientes</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Contenido Principal */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {rawData.length > 0 ? (
          <>
            {/* KPI Card */}
            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              <ThemedText style={styles.kpiTitle}>Facturación Total del Periodo</ThemedText>
              <ThemedText style={styles.kpiValue}>C$ {analytics.totalSalesVal.toLocaleString(undefined, {minimumFractionDigits: 2})}</ThemedText>
              <ThemedText style={styles.kpiSub}>Consolidado de {rawData.length} movimientos de venta</ThemedText>
            </View>

            {/* Listado */}
            <ThemedText style={styles.sectionHeader}>
              Top {activeTab === 'articulos' ? 'Artículos' : activeTab === 'vendedores' ? 'Vendedores' : 'Clientes'} con más movimiento
            </ThemedText>

            <View style={[styles.listCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              {activeList.map((item: any, index: number) => (
                <View key={index} style={[styles.rankRow, index < activeList.length - 1 && styles.borderBottom]}>
                  {/* Badge de Ranking */}
                  <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(index) }]}>
                    <ThemedText style={[styles.rankBadgeText, { color: getRankBadgeTextColor(index) }]}>
                      {index + 1}
                    </ThemedText>
                  </View>

                  <View style={styles.itemInfo}>
                    <View style={styles.nameRow}>
                      <ThemedText style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText style={styles.itemTotal}>
                        C$ {item.monto.toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </ThemedText>
                    </View>

                    <View style={styles.statsRow}>
                      <ThemedText style={styles.itemSubText}>
                        {activeTab === 'articulos' ? `Cantidad: ${item.cant}` : `Transacciones: ${item.movimientos}`}
                      </ThemedText>
                      <ThemedText style={styles.pctText}>
                        {item.pct.toFixed(1)}%
                      </ThemedText>
                    </View>

                    {/* Barra de Progreso Visual */}
                    <View style={[styles.progressBg, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                      <View style={[styles.progressFill, { width: `${item.pct}%`, backgroundColor: index < 3 ? '#2563eb' : '#10b981' }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={{ marginTop: 60, alignItems: 'center' }}>
            <Ionicons name="analytics-outline" size={64} color={isDark ? "#334155" : "#cbd5e1"} />
            <ThemedText style={{ marginTop: 15, color: '#94a3b8', textAlign: 'center', fontSize: 15, paddingHorizontal: 40 }}>
              Selecciona las fechas de tu consulta y presiona "Analizar Movimiento" para generar el informe consolidado.
            </ThemedText>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {showInicioDate && <DateTimePicker value={fechaInicio} mode="date" onChange={(e, d) => { 
        setShowInicioDate(false); 
        if(d) { 
          const corrected = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
          setFechaInicio(corrected); 
        } 
      }} />}
      {showFinDate && <DateTimePicker value={fechaFin} mode="date" onChange={(e, d) => { 
        setShowFinDate(false); 
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
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  filterSection: { gap: 12 },
  rowLayout: { flexDirection: 'row', justifyContent: 'space-between' },
  filterLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 12, gap: 8, height: 48 },
  dateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  refreshButton: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 4, height: 50 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 15, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 15, padding: 4, height: 50, alignItems: 'center' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: '100%', borderRadius: 12, gap: 6 },
  tabActive: { backgroundColor: '#ffffff', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#2563eb' },
  content: { padding: 20 },
  kpiCard: { borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.08, shadowRadius: 8 },
  kpiTitle: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' },
  kpiValue: { fontSize: 24, fontWeight: 'bold', color: '#10b981', marginVertical: 8 },
  kpiSub: { fontSize: 11, color: '#94a3b8' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#2563eb', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  listCard: { borderRadius: 20, padding: 15, elevation: 1, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.05, shadowRadius: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rankBadge: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rankBadgeText: { fontWeight: 'bold', fontSize: 14 },
  itemInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 14, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  itemTotal: { fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemSubText: { fontSize: 12, color: '#64748b' },
  pctText: { fontSize: 11, fontWeight: 'bold', color: '#10b981' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 }
});
