import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';
import { db, collection, query, where, onSnapshot, orderBy, limit, getDocs } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const MESES_NOMBRES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (typeof date === 'string') return date.split('T')[0];
    if (date.seconds) { // Firestore Timestamp
      return new Date(date.seconds * 1000).toISOString().split('T')[0];
    }
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return String(date);
  } catch (e) {
    return 'N/A';
  }
};

export default function HomeScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [userName, setUserName] = useState('Administrador');
  const [businessName, setBusinessName] = useState('SOFISOFT');
  const [realBajoStock, setRealBajoStock] = useState('0 Art.');
  const [ventasHoyReal, setVentasHoyReal] = useState('C$ 0');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [chartMetric, setChartMetric] = useState('monto');
  const [ventasRaw, setVentasRaw] = useState<any[]>([]);
  const [facturasRaw, setFacturasRaw] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Extraer años disponibles dinámicamente desde las ventas
  const availableYears = useMemo(() => {
    if (!Array.isArray(ventasRaw) || ventasRaw.length === 0) {
      return [new Date().getFullYear().toString()];
    }
    const yearsSet = new Set<string>();
    ventasRaw.forEach(v => {
      if (v && v.Anio) {
        yearsSet.add(v.Anio.toString());
      }
    });
    const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    if (sortedYears.length === 0) {
      sortedYears.push(new Date().getFullYear().toString());
    }
    return sortedYears;
  }, [ventasRaw]);

  // Si el año seleccionado no se encuentra dentro de los años disponibles del backend, auto-seleccionar el más reciente
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  const loadDashboardData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      if (name) setUserName(name);

      // Cargar caché primero para respuesta inmediata
      const cachedData = await AsyncStorage.getItem('dashboard_cache');
      if (cachedData) {
        try {
          processData(JSON.parse(cachedData));
        } catch (e) {
          console.error("Error al parsear caché del dashboard:", e);
        }
      }

      setIsLoading(true);

      // Leer IP configurada
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (!configStr) {
        console.warn("No hay configuración de IP guardada.");
        setIsLoading(false);
        return;
      }

      const config = JSON.parse(configStr);
      const ip = config.directIp;
      if (!ip) {
        console.warn("No hay IP del servidor configurada.");
        setIsLoading(false);
        return;
      }

      const base = `http://${ip}:5246/api/reports`;
      const hoyStr = new Date().toISOString().split('T')[0];

      // Peticiones paralelas al servidor
      const [
        artRes, configRes, gruposRes, clientesRes,
        vendedoresRes, proveedoresRes, factRes, usuariosRes,
        ventasMesRes, rankVendRes, rankCliRes
      ] = await Promise.allSettled([
        fetch(`${base}/articulos`),
        fetch(`${base}/configuracion`),
        fetch(`${base}/grupos`),
        fetch(`${base}/clientes`),
        fetch(`${base}/vendedores`),
        fetch(`${base}/proveedores`),
        fetch(`${base}/facturas?desde=${hoyStr}`),
        fetch(`${base}/usuarios`),
        fetch(`${base}/ventasmes`),
        fetch(`${base}/ranking-vendedores`),
        fetch(`${base}/ranking-clientes`)
      ]);

      const safeJson = async (res: PromiseSettledResult<Response>) => {
        if (res.status === 'fulfilled' && res.value.ok) {
          return await res.value.json();
        }
        return [];
      };

      const articulosData    = await safeJson(artRes);
      const configData       = await safeJson(configRes);
      const gruposData       = await safeJson(gruposRes);
      const clientesData     = await safeJson(clientesRes);
      const vendedoresData   = await safeJson(vendedoresRes);
      const proveedoresData  = await safeJson(proveedoresRes);
      const facturasData     = await safeJson(factRes);
      const usuariosData     = await safeJson(usuariosRes);
      const ventasMesData    = await safeJson(ventasMesRes);
      const rankVendData     = await safeJson(rankVendRes);
      const rankCliData      = await safeJson(rankCliRes);

      const fullData = {
        articulos:     articulosData,
        configuracion: configData,
        grupos:        gruposData,
        clientes:      clientesData,
        vendedores:    vendedoresData,
        proveedores:   proveedoresData,
        usuarios:      usuariosData,
        ventasmes:     ventasMesData,
        facturas:      facturasData,
        rankVendores:  rankVendData,
        rankClientes:  rankCliData
      };

      processData(fullData);
      await AsyncStorage.setItem('dashboard_cache', JSON.stringify(fullData));

    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const [rankVendores, setRankVendores] = useState<any[]>([]);
  const [rankClientes, setRankClientes] = useState<any[]>([]);

  const processData = (data: any) => {
    if (!data) return;
    
    // 1. Bajo Stock
    if (data.articulos) {
      const bajos = data.articulos.filter((a: any) => {
        const stock = parseFloat(a.EXISTENCIA || 0);
        const min = parseFloat(a.ExistenciaMinima || 0);
        return stock <= min && min > 0;
      }).length;
      setRealBajoStock(`${bajos} Art.`);
    }

    // 2. Ventas Hoy (Optimizado)
    if (data.facturas && Array.isArray(data.facturas)) {
      const hoy = new Date();
      const hoyStr = hoy.toISOString().split('T')[0]; 

      const totalHoy = data.facturas.reduce((acc: number, f: any) => {
        if (!f.FECHA) return acc;
        
        const fDateStr = formatDate(f.FECHA);
        const esHoy = fDateStr === hoyStr;
        const esAnulada = f.ESTATUSDOC?.toString() === '3';
        
        if (esHoy && !esAnulada) {
          return acc + parseFloat(f.TotalFinal || 0);
        }
        return acc;
      }, 0);
      
      setVentasHoyReal(`C$ ${Math.round(totalHoy).toLocaleString()}`);
      setFacturasRaw(data.facturas);
    }

    if (data.ventasmes && Array.isArray(data.ventasmes)) setVentasRaw(data.ventasmes);
    if (data.rankVendores) setRankVendores(data.rankVendores);
    if (data.rankClientes) setRankClientes(data.rankClientes);

    // 3. Configuración
    const nombre = data.configuracion?.[0]?.NOMBRE;
    if (nombre) setBusinessName(nombre);
  };

  useFocusEffect(React.useCallback(() => { loadDashboardData(); }, []));

  const getLineChartData = useMemo(() => {
    const dataPorMes = new Array(12).fill(0);
    if (Array.isArray(ventasRaw)) {
      ventasRaw.forEach(v => {
        if (v?.Anio?.toString() === selectedYear) {
          const index = parseInt(v.NumeroMes || 0) - 1;
          if (index >= 0 && index < 12) dataPorMes[index] = parseFloat(v.TotalMes || 0);
        }
      });
    }
    return {
      labels: MESES_NOMBRES,
      datasets: [{ data: dataPorMes, color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, strokeWidth: 3 }]
    };
  }, [ventasRaw, selectedYear]);

  const getSellersData = useMemo(() => {
    if (rankVendores && rankVendores.length > 0) {
      return {
        labels: rankVendores.map((s: any) => (s.VENDEDOR || 'N/A').substring(0, 6)),
        datasets: [{ data: rankVendores.map((s: any) => chartMetric === 'monto' ? Math.round(s.Total || 0) : s.Cantidad || 0) }]
      };
    }
    const sellersMap: any = {};
    if (Array.isArray(facturasRaw)) {
      facturasRaw.forEach(f => {
        if (!f || f.ESTATUSDOC?.toString() === '3') return;
        const name = f.VENDEDOR || 'N/A';
        const val = chartMetric === 'monto' ? Math.round(parseFloat(f.TotalFinal || 0)) : 1;
        sellersMap[name] = (sellersMap[name] || 0) + val;
      });
    }
    const sorted = Object.entries(sellersMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
    return {
      labels: sorted.map((s: any) => s[0].substring(0, 6)),
      datasets: [{ data: sorted.map((s: any) => s[1]) }]
    };
  }, [rankVendores, facturasRaw, chartMetric]);

  const getTopClientsData = useMemo(() => {
    if (rankClientes && rankClientes.length > 0) {
      return {
        labels: rankClientes.map((s: any) => (s.CLIENTE || 'N/A').substring(0, 8)),
        datasets: [{ data: rankClientes.map((s: any) => chartMetric === 'monto' ? Math.round(s.Total || 0) : s.Cantidad || 0) }]
      };
    }
    const clientsMap: any = {};
    if (Array.isArray(facturasRaw)) {
      facturasRaw.forEach(f => {
        if (!f || f.ESTATUSDOC?.toString() === '3') return;
        const name = f.CLIENTE || 'N/A';
        const val = chartMetric === 'monto' ? Math.round(parseFloat(f.TotalFinal || 0)) : 1;
        clientsMap[name] = (clientsMap[name] || 0) + val;
      });
    }
    const sorted = Object.entries(clientsMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4);
    return {
      labels: sorted.map((s: any) => s[0].substring(0, 8)),
      datasets: [{ data: sorted.map((s: any) => s[1]) }]
    };
  }, [rankClientes, facturasRaw, chartMetric]);

  const recentActivity = useMemo(() => {
    if (!Array.isArray(facturasRaw)) return [];
    return facturasRaw
      .filter(f => f && f.ESTATUSDOC?.toString() !== '3')
      .sort((a, b) => {
        const timeA = a.FECHA ? new Date(a.FECHA).getTime() : 0;
        const timeB = b.FECHA ? new Date(b.FECHA).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [facturasRaw]);


  const chartConfig = {
    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
    backgroundGradientFrom: isDark ? '#1e1e1e' : '#ffffff',
    backgroundGradientTo: isDark ? '#1e1e1e' : '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
    propsForBackgroundLines: { strokeDasharray: "", stroke: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }
  };

  const stats = [
    { id: 1, label: 'Ventas Hoy', value: ventasHoyReal, icon: 'cash-outline', color: '#10b981' },
    { id: 2, label: 'Bajo Stock', value: realBajoStock, icon: 'alert-circle-outline', color: '#ef4444' },
    { id: 3, label: 'CxC Vencidas', value: 'Consultar', icon: 'people-outline', color: '#f59e0b' },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText style={styles.welcomeText}>¡Hola, {userName}!</ThemedText>
            <ThemedText style={styles.dateText}>{businessName}</ThemedText>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/(auth)/login')}>
              <Ionicons name="log-out-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.profileButton}> 
               <Ionicons name="person-circle-outline" size={40} color="#ffffff" />
            </TouchableOpacity> */}
          </View>
        </View>
        <TouchableOpacity 
          style={styles.syncStatus} 
          onPress={loadDashboardData}
          disabled={isLoading}
        >
          <Ionicons name={isLoading ? "sync-outline" : "refresh-outline"} size={16} color="#ffffff" />
          <ThemedText style={styles.syncText}>
            {isLoading ? "Actualizando..." : "Toca para actualizar"}
          </ThemedText>
        </TouchableOpacity>
      </View>
 
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <TouchableOpacity 
              key={stat.id} 
              style={[styles.statCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}
              onPress={() => {
                if (stat.id === 2) {
                  router.push('/(reports)/(inventario)/critical-stock');
                } else if (stat.id === 3) {
                  router.push('/(reports)/(administracion)/clientes');
                }
              }}
              disabled={stat.id !== 2 && stat.id !== 3}
            >
              <View style={[styles.iconCircle, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <ThemedText style={[styles.statValue, { color: isDark ? '#ffffff' : '#1e293b' }]}>{stat.value}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: isDark ? '#cbd5e1' : '#64748b' }]}>{stat.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/*<ThemedText type="subtitle" style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Movimiento </ThemedText>
        <View style={styles.gridContainer}>
          <QuickButton title="Inventario" subtitle="Kardex Real" icon="cube-outline" color="#3b82f6" isDark={isDark} />
          <QuickButton title="Cierres" subtitle="Caja y Ventas" icon="calculator-outline" color="#8b5cf6" isDark={isDark} />
          <QuickButton title="Reportes" subtitle="Estadísticas" icon="bar-chart-outline" color="#ec4899" isDark={isDark} />
          <QuickButton title="Usuarios" subtitle="Vendedores" icon="people-outline" color="#f97316" isDark={isDark} />
        </View>*/}

        <View style={styles.chartHeader}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Ventas {selectedYear}</ThemedText>
          <View style={[styles.pickerWrapper, { backgroundColor: isDark ? '#334155' : '#ffffff', width: 120, borderColor: isDark ? '#475569' : '#e2e8f0', borderWidth: 1 }]}>
            <Picker selectedValue={selectedYear} onValueChange={(v) => setSelectedYear(v)} style={[styles.picker, { color: isDark ? '#fff' : '#1e293b' }]} mode="dropdown" dropdownIconColor={isDark ? '#fff' : '#1e293b'}>
              {availableYears.map(year => (
                <Picker.Item key={year} label={year} value={year} style={{ fontSize: 16 }} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={[styles.chartCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
          <LineChart data={getLineChartData} width={width - 72} height={180} chartConfig={chartConfig} bezier fromZero style={styles.chartStyle} />
        </View>

        <View style={styles.chartHeader}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Ranking del Mes Actual</ThemedText>
          <View style={[styles.pickerWrapper, { backgroundColor: isDark ? '#334155' : '#ffffff', width: 180, borderColor: isDark ? '#475569' : '#e2e8f0', borderWidth: 1 }]}>
            <Picker selectedValue={chartMetric} onValueChange={(v) => setChartMetric(v)} style={[styles.picker, { color: isDark ? '#fff' : '#1e293b' }]} mode="dropdown" dropdownIconColor={isDark ? '#fff' : '#1e293b'}>
              <Picker.Item label="Monto Vendido" value="monto" style={{ fontSize: 16 }} />
              <Picker.Item label="Facturas Hechas" value="cantidad" style={{ fontSize: 16 }} />
            </Picker>
          </View>
        </View>

        <ThemedText style={[styles.subSectionTitle, { color: isDark ? '#cbd5e1' : '#64748b' }]}>Vendedores</ThemedText>
        <View style={[styles.chartCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
          {getSellersData.labels.length > 0 ? (
            <BarChart
              data={getSellersData}
              width={width - 72}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})` }}
              fromZero
              style={styles.chartStyle}
              showValuesOnTopOfBars
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="people-outline" size={32} color={isDark ? "#475569" : "#cbd5e1"} />
              <ThemedText style={styles.emptyChartText}>No hay ventas por vendedor hoy</ThemedText>
            </View>
          )}
        </View>

        <ThemedText style={[styles.subSectionTitle, { color: isDark ? '#cbd5e1' : '#64748b' }]}>Clientes</ThemedText>
        <View style={[styles.chartCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
          {getTopClientsData.labels.length > 0 ? (
            <BarChart
              data={getTopClientsData}
              width={width - 72}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})` }}
              fromZero
              style={styles.chartStyle}
              showValuesOnTopOfBars
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="cart-outline" size={32} color={isDark ? "#475569" : "#cbd5e1"} />
              <ThemedText style={styles.emptyChartText}>No hay datos de clientes hoy</ThemedText>
            </View>
          )}
        </View>

        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Actividad Reciente</ThemedText>
        <View style={[styles.recentCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
          {recentActivity.length > 0 ? recentActivity.map((f, i) => (
              <RecentItem 
                key={i} 
                title={`Fac: ${f.NFACT} - ${f.CLIENTE}`} 
                time={formatDate(f.FECHA)} 
                amount={`C$ ${parseFloat(f.TotalFinal || 0).toLocaleString()}`} 
                isLast={i === recentActivity.length - 1} 
                isDark={isDark} 
              />
            )) : (
              <ThemedText style={{ textAlign: 'center', opacity: 0.5 }}>No hay actividad hoy</ThemedText>
            )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

function QuickButton({ title, subtitle, icon, color, isDark }: any) {
  return (
    <TouchableOpacity style={[styles.quickButton, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#ffffff" />
      </View>
      <View style={styles.quickTextContainer}>
        <ThemedText style={[styles.quickTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>{title}</ThemedText>
        <ThemedText style={[styles.quickSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>{subtitle}</ThemedText>
      </View>
    </TouchableOpacity>
  );
}

function RecentItem({ title, time, amount, isLast, isDark }: any) {
  return (
    <View style={[styles.recentItem, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.recentInfo}>
        <ThemedText style={[styles.recentTitle, { color: isDark ? '#ffffff' : '#1e293b' }]} numberOfLines={1}>{title}</ThemedText>
        <ThemedText style={[styles.recentTime, { color: isDark ? '#94a3b8' : '#64748b' }]}>{time}</ThemedText>
      </View>
      <ThemedText style={[styles.recentAmount, { color: '#10b981' }]}>{amount}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeText: { color: '#ffffff', fontSize: 16, opacity: 0.8 },
  dateText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  profileButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 25 },
  logoutButton: { backgroundColor: 'rgba(239, 68, 68, 0.4)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  syncStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  syncText: { color: '#ffffff', fontSize: 12, marginLeft: 6 },
  content: { flex: 1, paddingHorizontal: 20, marginTop: -20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: (width - 60) / 3, padding: 16, borderRadius: 20, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 14, fontWeight: 'bold' },
  statLabel: { fontSize: 10 },
  sectionTitle: { marginBottom: 16, fontSize: 17, fontWeight: 'bold' },
  subSectionTitle: { marginBottom: 8, fontSize: 13, fontWeight: '500', marginTop: -8 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  quickButton: { width: (width - 50) / 2, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  quickIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  quickTextContainer: { flex: 1 },
  quickTitle: { fontSize: 14, fontWeight: 'bold' },
  quickSubtitle: { fontSize: 10 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pickerWrapper: { borderRadius: 12, height: 50, width: 120, justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  picker: { height: 50, width: '100%' },
  chartCard: { padding: 16, borderRadius: 24, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, alignItems: 'center' },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  recentCard: { borderRadius: 24, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  recentInfo: { flex: 1, marginRight: 10 },
  recentTitle: { fontSize: 13, fontWeight: '500' },
  recentTime: { fontSize: 11 },
  recentAmount: { fontSize: 13, fontWeight: 'bold' },
  emptyChart: { height: 180, justifyContent: 'center', alignItems: 'center' },
  emptyChartText: { marginTop: 10, fontSize: 12, color: '#94a3b8' },
});
