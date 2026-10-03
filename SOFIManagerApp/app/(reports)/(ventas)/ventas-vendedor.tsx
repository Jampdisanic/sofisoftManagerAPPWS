import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform
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

export default function VentasVendedorScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date(); d.setHours(23,59,59,999); return d;
  });
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  const [tipoFactura, setTipoFactura] = useState('TODAS'); // TODAS, CONTADO, CREDITO
  
  const [facturas, setFacturas] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState('SOFISOFT');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('dashboard_cache');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        if (data.facturas) setFacturas(data.facturas);
        if (data.configuracion && data.configuracion.length > 0) {
          setBusinessName(data.configuracion[0].NOMBRE || 'SOFISOFT');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generarResumen = () => {
    // Filtrar facturas por fecha y tipo
    const filtradas = facturas.filter(f => {
      const fDate = new Date(f.FECHA);
      const start = new Date(fechaInicio);
      start.setHours(0,0,0,0);
      const end = new Date(fechaFin);
      end.setHours(23,59,59,999);

      const enRango = fDate >= start && fDate <= end;
      const noAnulada = f.ESTATUSDOC?.toString() !== '3';
      
      // Lógica de tipo (esto puede variar según tu DB, asumo 1=Contado, 2=Crédito por ahora)
      // Si no tienes el campo claro, lo dejamos en todas por defecto
      return enRango && noAnulada;
    });

    // Agrupar por vendedor
    const agrupado: any = {};
    filtradas.forEach(f => {
      const vendedor = f.VENDEDOR || 'SIN VENDEDOR';
      if (!agrupado[vendedor]) {
        agrupado[vendedor] = { nombre: vendedor, total: 0, cantidad: 0 };
      }
      agrupado[vendedor].total += parseFloat(f.TotalFinal || 0);
      agrupado[vendedor].cantidad += 1;
    });

    const listaResumen = Object.values(agrupado).sort((a: any, b: any) => b.total - a.total);
    setResumen(listaResumen);
    if (listaResumen.length === 0) {
      Alert.alert("Aviso", "No se encontraron ventas en el rango seleccionado.");
    }
  };

  const exportarPDF = async () => {
    if (resumen.length === 0) {
      Alert.alert("Error", "Primero genera el resumen para poder exportar.");
      return;
    }

    const totalGeneral = resumen.reduce((acc, r) => acc + r.total, 0);

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            .business-name { fontSize: 24px; font-weight: bold; color: #2563eb; margin: 0; }
            .report-title { fontSize: 18px; margin: 5px 0; color: #64748b; }
            .date-range { fontSize: 12px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f1f5f9; color: #475569; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
            .total-row { font-weight: bold; background-color: #f8fafc; }
            .text-right { text-align: right; }
            .footer { margin-top: 50px; text-align: center; fontSize: 10px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="business-name">${businessName}</h1>
            <h2 class="report-title">Reporte de Ventas por Vendedor</h2>
            <p class="date-range">Del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th class="text-right">Facturas</th>
                <th class="text-right">Total (C$)</th>
              </tr>
            </thead>
            <tbody>
              ${resumen.map(r => `
                <tr>
                  <td>${r.nombre}</td>
                  <td class="text-right">${r.cantidad}</td>
                  <td class="text-right">${r.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>TOTAL GENERAL</td>
                <td class="text-right">${resumen.reduce((acc, r) => acc + r.cantidad, 0)}</td>
                <td class="text-right">C$ ${totalGeneral.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Generado automáticamente por SOFIManager PV - ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo generar el PDF.");
    }
  };

  const onChangeInicio = (event: any, selectedDate?: Date) => {
    setShowInicio(false);
    if (selectedDate) {
      // Android devuelve UTC midnight; extraemos partes UTC para crear fecha local correcta
      const corrected = new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 0, 0, 0, 0);
      setFechaInicio(corrected);
    }
  };

  const onChangeFin = (event: any, selectedDate?: Date) => {
    setShowFin(false);
    if (selectedDate) {
      // Android devuelve UTC midnight; extraemos partes UTC para crear fecha local correcta
      const corrected = new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 23, 59, 59, 999);
      setFechaFin(corrected);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Ventas por Vendedor</ThemedText>
        </View>

        {/* Filtros */}
        <View style={styles.filtersCard}>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.datePicker} onPress={() => setShowInicio(true)}>
              <ThemedText style={styles.dateLabel}>Desde:</ThemedText>
              <ThemedText style={styles.dateValue}>{fechaInicio.toLocaleDateString()}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.datePicker} onPress={() => setShowFin(true)}>
              <ThemedText style={styles.dateLabel}>Hasta:</ThemedText>
              <ThemedText style={styles.dateValue}>{fechaFin.toLocaleDateString()}</ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.generateButton} onPress={generarResumen}>
            <Ionicons name="stats-chart" size={20} color="#fff" />
            <ThemedText style={styles.generateButtonText}>Procesar Reporte</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {resumen.length > 0 ? (
          <View style={[styles.resultCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <ThemedText style={styles.cardTitle}>Resumen de Ventas</ThemedText>
            {resumen.map((r, i) => (
              <View key={i} style={[styles.sellerRow, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <View>
                  <ThemedText style={styles.sellerName}>{r.nombre}</ThemedText>
                  <ThemedText style={styles.sellerQty}>{r.cantidad} facturas</ThemedText>
                </View>
                <ThemedText style={styles.sellerAmount}>C$ {r.total.toLocaleString()}</ThemedText>
              </View>
            ))}
            
            <TouchableOpacity style={styles.pdfButton} onPress={exportarPDF}>
              <Ionicons name="document-text" size={20} color="#fff" />
              <ThemedText style={styles.pdfButtonText}>Exportar a PDF</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#475569" />
            <ThemedText style={styles.emptyText}>Selecciona el rango de fechas para generar el reporte.</ThemedText>
          </View>
        )}
      </ScrollView>

      {showInicio && (
        <DateTimePicker value={fechaInicio} mode="date" display="default" onChange={onChangeInicio} />
      )}
      {showFin && (
        <DateTimePicker value={fechaFin} mode="date" display="default" onChange={onChangeFin} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  filtersCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 15 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  datePicker: { width: '48%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10 },
  dateLabel: { color: '#fff', fontSize: 10, opacity: 0.8 },
  dateValue: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', borderRadius: 12, height: 45, gap: 10 },
  generateButtonText: { color: '#fff', fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  resultCard: { borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  sellerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  sellerName: { fontSize: 15, fontWeight: '600' },
  sellerQty: { fontSize: 12, color: '#475569' },
  sellerAmount: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  pdfButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 15, height: 50, marginTop: 20, gap: 10 },
  pdfButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 20, fontSize: 14, color: '#475569', textAlign: 'center', paddingHorizontal: 40 }
});
