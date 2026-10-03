import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  FlatList,
  Alert
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

export default function MasterComprasScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date(); d.setHours(23,59,59,999); return d;
  });
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  
  const [compras, setCompras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const url = `http://${ip}:5246/api/reports/master-compras?desde=${startStr}`;
          
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            let data = await response.json();
            // Filtrado local por fecha fin si es necesario (el server filtra desde)
            data = data.filter((f: any) => {
              const fDate = f.FECHA?.split('T')[0] || '';
              return fDate <= endStr;
            });
            setCompras(data);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Direct API failed in Master Compras:", e);
        }
      }

      Alert.alert("Error", "No se pudo conectar al servidor para obtener las compras.");
    } catch (e) {
      console.error("Error al cargar compras:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompras = useMemo(() => {
    if (!Array.isArray(compras)) return [];
    return compras.map(f => ({
      ...f,
      TotalAPagarNum: parseFloat(f.TotalAPagar || 0),
      SaldoNum: parseFloat(f.SALDO || 0),
      FechaObj: f.FECHA ? new Date(f.FECHA) : new Date()
    }));
  }, [compras]);

  const totales = useMemo(() => {
    return filteredCompras.reduce((acc, f) => {
      if (f.ESTATUDOC === 'ANULADO') return acc;
      return {
        pagar: acc.pagar + (f.TotalAPagarNum || 0),
        saldo: acc.saldo + (f.SaldoNum || 0)
      };
    }, { pagar: 0, saldo: 0 });
  }, [filteredCompras]);

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('PAGADO')) return '#10b981';
    if (s.includes('ABONADO')) return '#3b82f6';
    if (s.includes('PENDIENTE')) return '#f59e0b';
    if (s.includes('ANULADO')) return '#ef4444';
    return '#64748b';
  };

  const exportarPDF = async () => {
    if (filteredCompras.length === 0) return;
    if (filteredCompras.length > 1200) {
      Alert.alert("Lista muy larga", "Por favor filtra un rango de fechas más pequeño para exportar PDF.");
      return;
    }

    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; font-size: 9px; }
              .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th { background-color: #f1f5f9; padding: 6px; border: 1px solid #e2e8f0; text-align: left; }
              td { padding: 6px; border: 1px solid #e2e8f0; }
              .anulada { color: #ef4444; text-decoration: line-through; }
              .total-row { font-weight: bold; background: #f8fafc; }
              .text-right { text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${businessName}</h2>
              <h3>Master de Compras y Gastos</h3>
              <p>Periodo: ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Documento</th>
                  <th>Proveedor</th>
                  <th>Estado</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${filteredCompras.map(f => `
                  <tr class="${f.ESTATUDOC === 'ANULADO' ? 'anulada' : ''}">
                    <td>${f.TipoFact || ''}</td>
                    <td>${f.FechaObj.toLocaleDateString()}</td>
                    <td>${f.NDocument || ''}</td>
                    <td>${f.Proveedor || ''}</td>
                    <td>${f.ESTATUDOC || ''}</td>
                    <td class="text-right">C$ ${(f.TotalAPagarNum || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td class="text-right">C$ ${(f.SaldoNum || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="5" class="text-right">TOTALES:</td>
                  <td class="text-right">C$ ${totales.pagar.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td class="text-right">C$ ${totales.saldo.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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
    <View style={[styles.row, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.typeBadge, { backgroundColor: (item.TipoFact || '').includes('GASTO') ? '#8b5cf6' : '#6366f1' }]}>
            <ThemedText style={styles.typeText}>{(item.TipoFact || '').includes('GASTO') ? 'GASTO' : 'COMPRA'}</ThemedText>
          </View>
          <ThemedText style={[styles.nDoc, { color: isDark ? '#fff' : '#000' }]}>Doc: {item.NDocument || 'N/A'}</ThemedText>
        </View>
        <ThemedText style={[styles.proveedorName, { color: isDark ? '#fff' : '#000' }]}>{item.Proveedor || 'Desconocido'}</ThemedText>
        <ThemedText style={styles.dateText}>
          {item.FechaObj.toLocaleDateString()} • {item.TipoDoc || ''}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText style={[styles.amount, { color: isDark ? '#fff' : '#000' }, item.ESTATUDOC === 'ANULADO' && styles.anulada]}>
          C$ {(item.TotalAPagarNum || 0).toLocaleString()}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.ESTATUDOC) + '20' }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.ESTATUDOC) }]}>
            {item.ESTATUDOC || 'PENDIENTE'}
          </ThemedText>
        </View>
        {item.SaldoNum > 0 && (
          <ThemedText style={styles.saldoText}>Saldo: C$ {item.SaldoNum.toLocaleString()}</ThemedText>
        )}
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#6366f1' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Master de Compras</ThemedText>
        </View>

        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicio(true)}>
            <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton} disabled={isLoading}>
            <Ionicons name={isLoading ? "sync" : "search"} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFin(true)}>
            <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredCompras}
        renderItem={renderItem}
        keyExtractor={(item, idx) => item.NDocument ? String(item.NDocument) + idx : String(idx)}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={<ThemedText style={styles.empty}>No se encontraron registros en este periodo.</ThemedText>}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />


      {compras.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={exportarPDF}>
          <Ionicons name="share-outline" size={24} color="#fff" />
          <ThemedText style={{color: '#fff', fontWeight: 'bold', marginLeft: 8}}>PDF</ThemedText>
        </TouchableOpacity>
      )}

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
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 10, width: '40%', alignItems: 'center' },
  dateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  refreshButton: { backgroundColor: 'rgba(255,255,255,0.3)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  nDoc: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  proveedorName: { fontSize: 14, marginTop: 4, color: '#000' },
  dateText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  anulada: { textDecorationLine: 'line-through', color: '#ef4444' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  saldoText: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 50, color: '#64748b' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#6366f1', height: 56, borderRadius: 28, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', elevation: 5 }
});
