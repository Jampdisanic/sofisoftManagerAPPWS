import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';

export default function MasterGastosScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Inicializar con un rango predeterminado de los últimos 30 días
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  
  const [gastos, setGastos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [businessName, setBusinessName] = useState('SOFISOFT');

  useEffect(() => {
    loadData();
  }, []);

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const startStr = getLocalDateString(fechaInicio);
      const endStr = getLocalDateString(fechaFin);

      const configStr = await AsyncStorage.getItem('firebase_config');
      const config = configStr ? JSON.parse(configStr) : {};
      const ip = config.directIp;

      if (ip) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const url = `http://${ip}:5246/api/reports/master-gastos?desde=${startStr}&hasta=${endStr}`;
          
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            setGastos(data);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Direct API failed in Master Gastos:", e);
        }
      }

      Alert.alert("Error", "No se pudo conectar al servidor para obtener el detalle de gastos.");
    } catch (e) {
      console.error("Error al cargar gastos:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const parsedGastos = useMemo(() => {
    if (!Array.isArray(gastos)) return [];
    return gastos.map(g => {
      const monto = parseFloat(g.MontoFacturado || 0);
      
      // Parsear booleanos de bit(1) de MySQL
      const isEgresoCaja = g.EgresoCaja === true || g.EgresoCaja === 1 || g.EgresoCaja === '1' || g.EgresoCaja?.toString().toLowerCase() === 'true';
      const isImportado = g.EgreoImportado === true || g.EgreoImportado === 1 || g.EgreoImportado === '1' || g.EgreoImportado?.toString().toLowerCase() === 'true';

      return {
        ...g,
        montoNum: monto,
        isEgresoCaja,
        isImportado,
        FechaObj: g.FechaDeFactura ? new Date(g.FechaDeFactura) : new Date()
      };
    });
  }, [gastos]);

  // Filtrar localmente por texto de búsqueda (Concepto, Proveedor, Nota)
  const filteredGastos = useMemo(() => {
    if (!searchText) return parsedGastos;
    const cleanSearch = searchText.toLowerCase().trim();
    return parsedGastos.filter(g => 
      (g.Concepto || '').toLowerCase().includes(cleanSearch) ||
      (g.Proveedor || '').toLowerCase().includes(cleanSearch) ||
      (g.Nota || '').toLowerCase().includes(cleanSearch) ||
      (g.NumeroDeFactura || '').toLowerCase().includes(cleanSearch)
    );
  }, [parsedGastos, searchText]);

  // Totales consolidados para las tarjetas KPI
  const kpis = useMemo(() => {
    return filteredGastos.reduce((acc, g) => {
      return {
        total: acc.total + g.montoNum,
        egresoCaja: acc.egresoCaja + (g.isEgresoCaja ? g.montoNum : 0),
        cantidad: acc.cantidad + 1
      };
    }, { total: 0, egresoCaja: 0, cantidad: 0 });
  }, [filteredGastos]);

  const exportarPDF = async () => {
    if (filteredGastos.length === 0) return;
    if (filteredGastos.length > 1000) {
      Alert.alert("Lista muy larga", "Por favor filtra un rango de fechas más pequeño para exportar PDF.");
      return;
    }

    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; font-size: 9px; color: #1e293b; }
              .header { text-align: center; border-bottom: 3px solid #8b5cf6; padding-bottom: 12px; margin-bottom: 20px; }
              .business-name { font-size: 18px; font-weight: bold; margin: 0; color: #8b5cf6; }
              .report-title { font-size: 14px; font-weight: 600; margin: 4px 0; color: #475569; }
              .period { font-size: 10px; color: #64748b; margin: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th { background-color: #f1f5f9; padding: 8px 6px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #334155; }
              td { padding: 8px 6px; border: 1px solid #e2e8f0; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .total-row { font-weight: bold; background: #f8fafc; border-top: 2px solid #94a3b8; }
              .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: bold; }
              .badge-caja { background-color: #d1fae5; color: #065f46; }
              .badge-regular { background-color: #f1f5f9; color: #475569; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 class="business-name">${businessName}</h2>
              <h3 class="report-title">Master de Gastos Detallado</h3>
              <p class="period">Periodo: ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>N° Factura</th>
                  <th>Proveedor</th>
                  <th>Concepto / Nota</th>
                  <th class="text-center">Egreso Caja</th>
                  <th class="text-center">Usuario</th>
                  <th class="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${filteredGastos.map(g => `
                  <tr>
                    <td>${g.FechaObj.toLocaleDateString()}</td>
                    <td>${g.NumeroDeFactura || 'N/A'}</td>
                    <td>${g.Proveedor || 'Desconocido'}</td>
                    <td>
                      <strong>${g.Concepto || ''}</strong>
                      ${g.Nota ? `<br/><span style="color:#64748b; font-style:italic;">Nota: ${g.Nota}</span>` : ''}
                    </td>
                    <td class="text-center">
                      <span class="badge ${g.isEgresoCaja ? 'badge-caja' : 'badge-regular'}">
                        ${g.isEgresoCaja ? 'SÍ' : 'NO'}
                      </span>
                    </td>
                    <td class="text-center">${g.Usuario || 'Sistema'}</td>
                    <td class="text-right" style="font-weight: 500;">C$ ${(g.montoNum || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="6" class="text-right">TOTAL GASTADO:</td>
                  <td class="text-right">C$ ${kpis.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr class="total-row" style="background-color: #faf5ff;">
                  <td colspan="6" class="text-right" style="color: #6b21a8;">CARGA A CAJA (ARQUEO):</td>
                  <td class="text-right" style="color: #6b21a8;">C$ ${kpis.egresoCaja.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert("Error", "No se pudo generar el PDF.");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.cardRow, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        {/* Fila superior: Fecha e ID */}
        <View style={styles.cardHeaderRow}>
          <ThemedText style={styles.cardDate}>
            {item.FechaObj.toLocaleDateString()} • {item.Usuario || 'Sistema'}
          </ThemedText>
          {item.NumeroDeFactura ? (
            <ThemedText style={[styles.cardInvoice, { color: isDark ? '#cbd5e1' : '#64748b' }]}>
              N°: {item.NumeroDeFactura}
            </ThemedText>
          ) : null}
        </View>

        {/* Concepto del gasto */}
        <ThemedText style={[styles.cardConcept, { color: isDark ? '#ffffff' : '#0f172a' }]}>
          {item.Concepto || 'Sin Concepto'}
        </ThemedText>

        {/* Proveedor */}
        <View style={styles.proveedorContainer}>
          <Ionicons name="business" size={14} color="#8b5cf6" style={{ marginRight: 4 }} />
          <ThemedText style={[styles.cardProveedor, { color: isDark ? '#94a3b8' : '#475569' }]}>
            {item.Proveedor || 'Desconocido'}
          </ThemedText>
        </View>

        {/* Nota opcional */}
        {item.Nota ? (
          <View style={[styles.notaContainer, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
            <ThemedText style={styles.cardNota} numberOfLines={2}>
              Nota: {item.Nota}
            </ThemedText>
          </View>
        ) : null}

        {/* Badges de Estado */}
        <View style={styles.badgeRow}>
          {item.isEgresoCaja ? (
            <View style={[styles.badge, { backgroundColor: '#10b98120' }]}>
              <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
              <ThemedText style={[styles.badgeText, { color: '#10b981' }]}>Afecta Arqueo</ThemedText>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: '#64748b20' }]}>
              <View style={[styles.dot, { backgroundColor: '#64748b' }]} />
              <ThemedText style={[styles.badgeText, { color: '#64748b' }]}>Solo Gasto</ThemedText>
            </View>
          )}

          {item.isImportado ? (
            <View style={[styles.badge, { backgroundColor: '#3b82f620' }]}>
              <ThemedText style={[styles.badgeText, { color: '#3b82f6' }]}>Importado</ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Monto del Gasto */}
      <View style={styles.cardRight}>
        <ThemedText style={[styles.cardMonto, { color: isDark ? '#38bdf8' : '#8b5cf6' }]}>
          C$ {item.montoNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      {/* Header Premium */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#8b5cf6' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Master de Gastos</ThemedText>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicio(true)}>
            <ThemedText style={styles.dateBtnLabel}>DESDE</ThemedText>
            <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={loadData} style={styles.refreshButton} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFin(true)}>
            <ThemedText style={styles.dateBtnLabel}>HASTA</ThemedText>
            <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tarjetas KPI (Consolidado de Totales) */}
      <View style={styles.kpiContainer}>
        {/* KPI: Total Gastado */}
        <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderLeftColor: '#8b5cf6' }]}>
          <ThemedText style={styles.kpiTitle}>TOTAL GASTOS</ThemedText>
          <ThemedText style={[styles.kpiValue, { color: isDark ? '#38bdf8' : '#8b5cf6' }]} numberOfLines={1}>
            C$ {kpis.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </ThemedText>
        </View>

        {/* KPI: Carga a Caja */}
        <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderLeftColor: '#10b981' }]}>
          <ThemedText style={styles.kpiTitle}>EGRESO CAJA</ThemedText>
          <ThemedText style={[styles.kpiValue, { color: isDark ? '#34d399' : '#10b981' }]} numberOfLines={1}>
            C$ {kpis.egresoCaja.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </ThemedText>
        </View>

        {/* KPI: Cantidad */}
        <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderLeftColor: '#f59e0b', flex: 0.8 }]}>
          <ThemedText style={styles.kpiTitle}>CANTIDAD</ThemedText>
          <ThemedText style={[styles.kpiValue, { color: isDark ? '#fbbf24' : '#f59e0b' }]}>
            {kpis.cantidad}
          </ThemedText>
        </View>
      </View>

      {/* Buscador Integrado */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
          <Ionicons name="funnel-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por concepto, proveedor o notas..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Lista Principal */}
      <FlatList
        data={filteredGastos}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.Id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
            <ThemedText style={styles.empty}>
              {isLoading ? "Cargando gastos del servidor..." : "No se encontraron gastos en este periodo."}
            </ThemedText>
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Floating Action Button (FAB) para PDF */}
      {filteredGastos.length > 0 && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: isDark ? '#8b5cf6' : '#7c3aed' }]} onPress={exportarPDF}>
          <Ionicons name="share-outline" size={22} color="#fff" />
          <ThemedText style={styles.fabText}>PDF</ThemedText>
        </TouchableOpacity>
      )}

      {/* Controladores de Fechas */}
      {showInicio && (
        <DateTimePicker 
          value={fechaInicio} 
          mode="date" 
          onChange={(e, d) => { setShowInicio(false); if(d) setFechaInicio(d); }} 
        />
      )}
      {showFin && (
        <DateTimePicker 
          value={fechaFin} 
          mode="date" 
          onChange={(e, d) => { setShowFin(false); if(d) setFechaFin(d); }} 
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: 55, 
    paddingHorizontal: 20, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', letterSpacing: 0.5 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtn: { 
    backgroundColor: 'rgba(255,255,255,0.18)', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 12, 
    width: '42%', 
    alignItems: 'center' 
  },
  dateBtnLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700' },
  dateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginTop: 1 },
  refreshButton: { 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  kpiContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 15, 
    marginTop: 15, 
    gap: 10,
    justifyContent: 'space-between'
  },
  kpiCard: { 
    flex: 1, 
    padding: 10, 
    borderRadius: 16, 
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  kpiTitle: { fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 },
  kpiValue: { fontSize: 14, fontWeight: 'bold' },
  searchSection: { paddingHorizontal: 15, marginTop: 12 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    height: 44, 
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  listContent: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 100 },
  cardRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 18, 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardDate: { fontSize: 10, color: '#94a3b8' },
  cardInvoice: { fontSize: 10, fontWeight: '600' },
  cardConcept: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, lineHeight: 18 },
  proveedorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardProveedor: { fontSize: 12, fontWeight: '500' },
  notaContainer: { padding: 8, borderRadius: 8, marginBottom: 8 },
  cardNota: { fontSize: 11, color: '#64748b', fontStyle: 'italic' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontSize: 9, fontWeight: 'bold' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  cardMonto: { fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 13, paddingHorizontal: 30 },
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 20, 
    height: 52, 
    borderRadius: 26, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  fabText: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 13 }
});
