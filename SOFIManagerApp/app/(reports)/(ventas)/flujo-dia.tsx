import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
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
import { db, collection, query, where, getDocs } from '../../../lib/firebase';

export default function FlujoDiaScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // Start of day by default
    return d;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999); // End of day by default
    return d;
  });
  const [showInicioDate, setShowInicioDate] = useState(false);
  const [showInicioTime, setShowInicioTime] = useState(false);
  const [showFinDate, setShowFinDate] = useState(false);
  const [showFinTime, setShowFinTime] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState('0');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cierreData, setCierreData] = useState<any[]>([]);
  const [ventasData, setVentasData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [businessName, setBusinessName] = useState('SOFISOFT');

  useEffect(() => {
    // Solo cargamos usuarios al iniciar
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      const configStr = await AsyncStorage.getItem('firebase_config');
      const config = configStr ? JSON.parse(configStr) : {};
      const ip = config.directIp;
      if (ip) {
        const res = await fetch(`http://${ip}:5246/api/reports/usuarios`);
        if (res.ok) setUsuarios(await res.json());
      }
    } catch (e) {
      console.warn("No se pudieron cargar usuarios:", e);
    }
  };

  const consultarCierre = async () => {
    try {
      setIsLoading(true);
      
      const formatIsoTime = (d: Date) => {
        const tzo = -d.getTimezoneOffset(),
            dif = tzo >= 0 ? '+' : '-',
            pad = (num: number) => (num < 10 ? '0' : '') + num;
        return d.getFullYear() +
            '-' + pad(d.getMonth() + 1) +
            '-' + pad(d.getDate()) +
            'T' + pad(d.getHours()) +
            ':' + pad(d.getMinutes()) +
            ':' + pad(d.getSeconds());
      };
      
      const startStr = formatIsoTime(fechaInicio);
      const endStr = formatIsoTime(fechaFin);

      const configStr = await AsyncStorage.getItem('firebase_config');
      const config = configStr ? JSON.parse(configStr) : {};
      const ip = config.directIp;

      if (!ip) {
        Alert.alert("Error", "No hay IP configurada para consultar.");
        return;
      }

      const url = `http://${ip}:5246/api/reports/cierre-caja-consolidado?desde=${startStr}&hasta=${endStr}&usuario=${selectedUserId}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        if (data.cierre && data.ventas) {
          setCierreData(data.cierre);
          setVentasData(data.ventas);
        } else {
          // Fallback en caso de que responda en el formato viejo
          setCierreData(Array.isArray(data) ? data : []);
          setVentasData([]);
        }
      } else {
        Alert.alert("Error", "No se pudo obtener el cierre de caja del servidor.");
      }
    } catch (e) {
      console.error("Error al consultar cierre:", e);
      Alert.alert("Error", "Fallo de conexión al servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cálculos agrupados a partir del Stored Procedure
  const informe = useMemo(() => {
    let contado = { efectivo: 0, tarjeta: 0, transf: 0, total: 0 };
    let abonos = { efectivo: 0, tarjeta: 0, transf: 0, total: 0 };
    let devoluciones = { efectivo: 0, tarjeta: 0, transf: 0, total: 0 };
    let devEfecGlobal = 0;

    cierreData.forEach((row: any) => {
      const crit = parseInt(row.CriterioDeOrden || '0');
      const efec = parseFloat(row.EFECTIVO || 0);
      const tarj = parseFloat(row.TARJETA || 0);
      const tran = parseFloat(row.TRANSFERENCIA || 0);
      const tot = parseFloat(row.TOTAL || 0);

      // El SP retorna DevEfec en cada fila, tomamos el máximo o el primero
      devEfecGlobal = Math.max(devEfecGlobal, parseFloat(row.DevEfec || 0));

      if (crit === 1) { // Contado
        contado.efectivo += efec;
        contado.tarjeta += tarj;
        contado.transf += tran;
        contado.total += tot;
      } else if (crit === 2 || crit === 3) { // Abonos
        abonos.efectivo += efec;
        abonos.tarjeta += tarj;
        abonos.transf += tran;
        abonos.total += tot;
      } else if (crit === 4) { // Devoluciones
        devoluciones.efectivo += efec;
        devoluciones.tarjeta += tarj;
        devoluciones.transf += tran;
        devoluciones.total += tot;
      }
    });

    const totalIngresos = (contado.total + abonos.total + devoluciones.total); // Devoluciones ya viene negativo en el SP

    // Extraer las ventas globales del nuevo SP
    let vtaContado = 0;
    let vtaCredito = 0;
    let totalVentas = 0;

    if (ventasData && ventasData.length > 0) {
      const v = ventasData[0];
      vtaContado = parseFloat(v.CONTADO || 0);
      vtaCredito = parseFloat(v.CREDITO || 0);
      totalVentas = parseFloat(v.TotalVentas || 0);
    }

    return {
      contado,
      abonos,
      devoluciones,
      devEfecGlobal,
      totalIngresos,
      vtaContado,
      vtaCredito,
      totalVentas
    };
  }, [cierreData, ventasData]);

  const exportarPDF = async () => {
    const format = (l: number, e: number) => `C$ ${l.toLocaleString(undefined, {minimumFractionDigits: 2})} / $ ${e.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 10px; color: #000; line-height: 1.2; }
            .header { text-align: center; border-bottom: 1px dashed #000; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 14px; margin: 5px 0; }
            .section { margin-top: 15px; border-top: 1px solid #000; padding-top: 5px; }
            .section-title { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
            .bold { font-weight: bold; }
            .dashed-line { border-bottom: 1px dashed #000; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${businessName}</div>
            <div class="subtitle">Informe de Caja Multimoneda</div>
            <div style="font-size: 10px">Documentos del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</div>
          </div>

          <div class="section">
            <div class="section-title">VENTAS GLOBALES (Brutas)</div>
            <div class="row"><span>Ventas Contado:</span><span>C$ ${informe.vtaContado.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            <div class="row"><span>Ventas Crédito:</span><span>C$ ${informe.vtaCredito.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            <div class="dashed-line"></div>
            <div class="row bold"><span>Total Ventas:</span><span>C$ ${informe.totalVentas.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
          </div>

            <div class="section">
            <div class="section-title">Desglose de Ingresos</div>
            <div style="text-align: center; font-size: 10px; font-style: italic;">Abonos de Facturas de crédito</div>
            <div class="row"><span>Efectivo:</span><span>C$ ${informe.abonos.efectivo.toLocaleString()}</span></div>
            <div class="row"><span>Tarjeta:</span><span>C$ ${informe.abonos.tarjeta.toLocaleString()}</span></div>
            <div class="row"><span>Transf:</span><span>C$ ${informe.abonos.transf.toLocaleString()}</span></div>
            
            <div style="text-align: center; font-size: 10px; font-style: italic; margin-top: 10px;">Ventas de Contado</div>
            <div class="row"><span>Efectivo:</span><span>C$ ${informe.contado.efectivo.toLocaleString()}</span></div>
            <div class="row"><span>Tarjeta:</span><span>C$ ${informe.contado.tarjeta.toLocaleString()}</span></div>
            <div class="row"><span>Transf:</span><span>C$ ${informe.contado.transf.toLocaleString()}</span></div>

            <div style="text-align: center; font-size: 10px; font-style: italic; margin-top: 10px;">Devoluciones / Anulaciones</div>
            <div class="row"><span>Total:</span><span>C$ ${informe.devoluciones.total.toLocaleString()}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Total General de Ingresos</div>
            <div class="row bold" style="font-size: 13px;"><span>TOTAL NETO:</span><span>C$ ${informe.totalIngresos.toLocaleString()}</span></div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert("Error", "No se pudo generar el PDF");
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Informe de Caja</ThemedText>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.rowLayout}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.filterLabel}>Desde:</ThemedText>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicioDate(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowInicioTime(true)}>
                  <Ionicons name="time-outline" size={16} color="#fff" />
                  <ThemedText style={styles.dateBtnText}>
                    {fechaInicio.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={{ width: 10 }} />
            
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.filterLabel}>Hasta:</ThemedText>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFinDate(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowFinTime(true)}>
                  <Ionicons name="time-outline" size={16} color="#fff" />
                  <ThemedText style={styles.dateBtnText}>
                    {fechaFin.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.pickerWrapper}>
            <Ionicons name="person-outline" size={20} color="#fff" style={{marginLeft: 10}} />
            <Picker
              selectedValue={selectedUserId}
              onValueChange={setSelectedUserId}
              style={{ color: '#fff', flex: 1 }}
              dropdownIconColor="#fff"
            >
              <Picker.Item label="Seleccione un Usuario" value="0" />
              {usuarios.map((u, i) => (
                <Picker.Item key={u.IDUSER || i} label={u.NOMBRE || 'Sin Nombre'} value={String(u.IDUSER || '')} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity onPress={consultarCierre} style={styles.refreshButton}>
             <Ionicons name={isLoading ? "sync-outline" : "search"} size={20} color="#fff" />
             <ThemedText style={{color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8}}>Consultar Informe</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        
        {cierreData.length > 0 ? (
          <>
            <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              <ThemedText style={styles.sectionHeader}>VENTAS GLOBALES (BRUTAS)</ThemedText>
              
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Ventas de Contado:</ThemedText>
                <ThemedText style={[styles.multiAmount, {color: '#3b82f6'}]}>C$ {informe.vtaContado.toLocaleString(undefined, {minimumFractionDigits: 2})}</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Ventas de Crédito:</ThemedText>
                <ThemedText style={[styles.multiAmount, {color: '#f59e0b'}]}>C$ {informe.vtaCredito.toLocaleString(undefined, {minimumFractionDigits: 2})}</ThemedText>
              </View>
              <View style={[styles.dataRow, styles.borderTop]}>
                <ThemedText style={[styles.labelText, styles.bold]}>Total Ventas:</ThemedText>
                <ThemedText style={[styles.multiAmount, styles.bold, {color: '#000000', fontSize: 16}]}>C$ {informe.totalVentas.toLocaleString(undefined, {minimumFractionDigits: 2})}</ThemedText>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              <ThemedText style={styles.sectionHeader}>DESGLOSE DE INGRESOS (NETOS)</ThemedText>
              
              <ThemedText style={styles.subHeader}>Abonos a Crédito</ThemedText>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Efectivo:</ThemedText>
                <ThemedText style={styles.multiAmount}>C$ {informe.abonos.efectivo.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Tarjeta:</ThemedText>
                <ThemedText style={styles.multiAmount}>C$ {informe.abonos.tarjeta.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Transf:</ThemedText>
                <ThemedText style={styles.multiAmount}>C$ {informe.abonos.transf.toLocaleString()}</ThemedText>
              </View>
              <View style={[styles.dataRow, styles.borderTop]}>
                <ThemedText style={[styles.labelText, styles.bold]}>Total Abonos:</ThemedText>
                <ThemedText style={[styles.multiAmount, styles.bold]}>C$ {informe.abonos.total.toLocaleString()}</ThemedText>
              </View>
              
              <ThemedText style={[styles.subHeader, {marginTop: 15}]}>Ventas de Contado</ThemedText>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Efectivo:</ThemedText>
                <ThemedText style={styles.multiAmount}>C$ {informe.contado.efectivo.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Tarjeta:</ThemedText>
                <ThemedText style={styles.multiAmount}>C$ {informe.contado.tarjeta.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Transf:</ThemedText>
                <ThemedText style={styles.multiAmount}>C$ {informe.contado.transf.toLocaleString()}</ThemedText>
              </View>
              <View style={[styles.dataRow, styles.borderTop]}>
                <ThemedText style={[styles.labelText, styles.bold]}>Total Contado:</ThemedText>
                <ThemedText style={[styles.multiAmount, styles.bold]}>C$ {informe.contado.total.toLocaleString()}</ThemedText>
              </View>

              <ThemedText style={[styles.subHeader, {marginTop: 15}]}>Otras Operaciones</ThemedText>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Devoluciones (Gral):</ThemedText>
                <ThemedText style={{color: '#ef4444', fontWeight: 'bold'}}>C$ {informe.devoluciones.total.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText style={styles.labelText}>Devoluciones en Efectivo:</ThemedText>
                <ThemedText style={{color: '#ef4444', fontWeight: 'bold'}}>C$ {informe.devEfecGlobal.toLocaleString()}</ThemedText>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              <ThemedText style={styles.sectionHeader}>TOTAL GENERAL (NETO)</ThemedText>
              <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981', textAlign: 'center', marginVertical: 10 }}>
                C$ {informe.totalIngresos.toLocaleString()}
              </ThemedText>
            </View>
          </>
        ) : (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Ionicons name="search-outline" size={48} color={isDark ? "#475569" : "#cbd5e1"} />
            <ThemedText style={{ marginTop: 15, color: '#94a3b8', textAlign: 'center' }}>
              Selecciona las fechas, el usuario y presiona "Consultar" para generar el informe.
            </ThemedText>
          </View>
        )}

        <TouchableOpacity style={styles.pdfBtn} onPress={exportarPDF}>
          <Ionicons name="print-outline" size={24} color="#fff" />
          <ThemedText style={styles.pdfBtnText}>GENERAR PDF MULTIMONEDA</ThemedText>
        </TouchableOpacity>
        
        <View style={{height: 40}} />
      </ScrollView>

      {showInicioDate && <DateTimePicker value={fechaInicio} mode="date" onChange={(e, d) => { setShowInicioDate(false); if(d) setFechaInicio(d); }} />}
      {showInicioTime && <DateTimePicker value={fechaInicio} mode="time" onChange={(e, d) => { setShowInicioTime(false); if(d) setFechaInicio(d); }} />}
      {showFinDate && <DateTimePicker value={fechaFin} mode="date" onChange={(e, d) => { setShowFinDate(false); if(d) setFechaFin(d); }} />}
      {showFinTime && <DateTimePicker value={fechaFin} mode="time" onChange={(e, d) => { setShowFinTime(false); if(d) setFechaFin(d); }} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  filterSection: { gap: 15 },
  filterLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
  rowLayout: { flexDirection: 'row', justifyContent: 'space-between' },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 10, gap: 5 },
  timeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 10, borderRadius: 10, gap: 5 },
  dateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  pickerWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, height: 50 },
  refreshButton: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, marginTop: 5 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  content: { padding: 20 },
  card: { borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#2563eb', marginBottom: 15, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5 },
  subHeader: { fontSize: 12, fontWeight: 'bold', color: '#000000', marginBottom: 10, textTransform: 'uppercase' },
  bold: { fontWeight: 'bold' },
  labelText: { color: '#000000' },
  valueText: { color: '#000000' },
  multiAmount: { fontSize: 13, fontWeight: 'bold', color: '#10b981' },
  borderTop: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 5, paddingTop: 10 },
  pdfBtn: { backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 15, gap: 10, marginTop: 10 },
  pdfBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
