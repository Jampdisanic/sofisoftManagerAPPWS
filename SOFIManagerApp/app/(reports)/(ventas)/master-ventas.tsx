import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Alert,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';

export default function MasterVentasScreen() {
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
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('0');
  
  const [facturas, setFacturas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState('SOFISOFT');

  // Helper: formatea fecha usando partes LOCALES (evita desfase de zona horaria)
  const formatLocalDate = (d: Date): string => {
    const pad = (n: number) => (n < 10 ? '0' : '') + n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const startStr = formatLocalDate(fechaInicio);
      const endStr = formatLocalDate(fechaFin);

      // Leer IP configurada
      const configStr = await AsyncStorage.getItem('firebase_config');
      const config = configStr ? JSON.parse(configStr) : {};
      const ip = config.directIp;

      if (ip) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const base = `http://${ip}:5246/api/reports`;

          const [factRes, uRes] = await Promise.all([
            fetch(`${base}/facturas?desde=${startStr}&hasta=${endStr}`, { signal: controller.signal }),
            fetch(`${base}/usuarios`, { signal: controller.signal })
          ]);
          clearTimeout(timeoutId);

          if (factRes.ok) {
            const data = await factRes.json();
            setFacturas(data.map((f: any) => ({
              ...f,
              fechaFormatted: f.FECHA ? new Date(f.FECHA).toLocaleDateString() : 'N/A'
            })));
          }

          if (uRes.ok) {
            setUsuarios(await uRes.json());
          }

          return;
        } catch (e) {
          console.warn("Direct API failed in Master Ventas:", e);
        }
      }

      // Fallback: leer desde caché local
      const cached = await AsyncStorage.getItem('dashboard_cache');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.usuarios) setUsuarios(data.usuarios);
        if (data.facturas) {
          const filtered = data.facturas.filter((f: any) => {
            const d = f.FECHA?.split('T')[0] || '';
            return d >= startStr && d <= endStr;
          });
          setFacturas(filtered.map((f: any) => ({
            ...f,
            fechaFormatted: f.FECHA ? new Date(f.FECHA).toLocaleDateString() : 'N/A'
          })));
        }
      }
    } catch (e) {
      console.error("Error al cargar facturas:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const filtradas = useMemo(() => {
    return facturas.filter(f => {
      const deUsuario = selectedUserId === '0' || f.IDUSER?.toString() === selectedUserId;
      return deUsuario;
    });
  }, [facturas, selectedUserId]);

  const exportarPDF = async () => {
    if (filtradas.length === 0) return;

    const totalVentas = filtradas.reduce((acc, f) => f.ESTATUSDOC?.toString() !== '3' ? acc + parseFloat(f.TotalFinal || 0) : acc, 0);

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 10px; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f1f5f9; padding: 8px; border: 1px solid #e2e8f0; text-align: left; }
            td { padding: 8px; border: 1px solid #e2e8f0; }
            .anulada { color: #ef4444; text-decoration: line-through; }
            .total { font-weight: bold; background: #f8fafc; text-align: right; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${businessName}</h2>
            <h3>Master de Ventas Detallado</h3>
            <p>Rango: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>No. Fact</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filtradas.map(f => `
                <tr class="${f.ESTATUSDOC?.toString() === '3' ? 'anulada' : ''}">
                  <td>${f.NFACT}</td>
                  <td>${new Date(f.FECHA).toLocaleDateString()}</td>
                  <td>${f.CLIENTE}</td>
                  <td>${f.VENDEDOR}</td>
                  <td style="text-align: right">C$ ${parseFloat(f.TotalFinal).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td>${f.ESTATUSDOC?.toString() === '3' ? 'Anulada' : 'Activa'}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="4" class="total">TOTAL VENTAS ACTIVAS:</td>
                <td colspan="2" class="total" style="text-align: left">C$ ${totalVentas.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri);
  };

  const renderFactura = ({ item }: { item: any }) => (
    <View style={[styles.row, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.nFact}>#{item.NFACT}</ThemedText>
        <ThemedText style={styles.clientName}>{item.CLIENTE}</ThemedText>
        <ThemedText style={styles.vendedorName}>{item.VENDEDOR} • {item.fechaFormatted}</ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText style={[styles.amount, item.ESTATUSDOC?.toString() === '3' && styles.anulada]}>
          C$ {parseFloat(item.TotalFinal).toLocaleString()}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: item.ESTATUSDOC?.toString() === '3' ? '#fee2e2' : '#dcfce7' }]}>
          <ThemedText style={[styles.statusText, { color: item.ESTATUSDOC?.toString() === '3' ? '#ef4444' : '#10b981' }]}>
            {item.ESTATUSDOC?.toString() === '3' ? 'Anulada' : 'Activa'}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Master de Ventas</ThemedText>
        </View>

        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicio(true)}>
            <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton} disabled={isLoading}>
            {isLoading 
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="search" size={20} color="#fff" />
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFin(true)}>
            <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedUserId}
              onValueChange={setSelectedUserId}
              style={{ color: '#fff' }}
              dropdownIconColor="#fff"
            >
              <Picker.Item label="TODOS LOS USUARIOS" value="0" />
              {usuarios.map(u => <Picker.Item key={u.IDUSER} label={u.NOMBRE} value={u.IDUSER.toString()} />)}
            </Picker>
          </View>
      </View>

      <FlatList
        data={filtradas}
        renderItem={renderFactura}
        keyExtractor={item => item.NFACT}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={<ThemedText style={styles.empty}>No hay facturas registradas.</ThemedText>}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {filtradas.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={exportarPDF}>
          <Ionicons name="share-outline" size={24} color="#fff" />
          <ThemedText style={{color: '#fff', fontWeight: 'bold', marginLeft: 5}}>PDF</ThemedText>
        </TouchableOpacity>
      )}

      {showInicio && <DateTimePicker value={fechaInicio} mode="date" onChange={(e, d) => { 
        setShowInicio(false); 
        if(d) { 
          // Android devuelve UTC midnight; extraemos partes UTC para crear fecha local correcta
          const corrected = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
          setFechaInicio(corrected); 
        } 
      }} />}
      {showFin && <DateTimePicker value={fechaFin} mode="date" onChange={(e, d) => { 
        setShowFin(false); 
        if(d) { 
          // Android devuelve UTC midnight; extraemos partes UTC para crear fecha local correcta
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
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  dateBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 10, width: '45%', alignItems: 'center' },
  dateBtnText: { color: '#fff', fontWeight: 'bold' },
  pickerWrapper: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, height: 50, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  nFact: { fontSize: 16, fontWeight: 'bold', color: '#000000' },
  clientName: { fontSize: 14, marginTop: 2 , color: '#000000'},
  vendedorName: { fontSize: 12, color: '#475569', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: 'bold' , color: '#000000' },
  anulada: { textDecorationLine: 'line-through', color: '#ef4444' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 5 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: '#475569' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2563eb', height: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', elevation: 5 },
  refreshButton: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 10 }
});
