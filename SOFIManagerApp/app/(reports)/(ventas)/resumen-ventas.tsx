import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ResumenVentasScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Fecha Inicio (hace 7 días por defecto para ver un historial)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate());
    d.setHours(0, 0, 0, 0);
    return d;
  });
  // Fecha Fin (hoy por defecto)
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const [showInicioDate, setShowInicioDate] = useState(false);
  const [showFinDate, setShowFinDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resumenData, setResumenData] = useState<any[]>([]);

  const formatIsoDate = (d: Date) => {
    const pad = (num: number) => (num < 10 ? '0' : '') + num;
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  const getNombreDia = (fechaStr: string) => {
    try {
      const partes = fechaStr.split('-');
      const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return dias[d.getDay()];
    } catch {
      return '';
    }
  };

  const formaterFechaVisual = (fechaStr: string) => {
    try {
      const partes = fechaStr.split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    } catch {
      return fechaStr;
    }
  };

  const consultarResumen = async () => {
    try {
      setIsLoading(true);
      const startStr = formatIsoDate(fechaInicio);
      const endStr = formatIsoDate(fechaFin);

      const configStr = await AsyncStorage.getItem('firebase_config');
      const config = configStr ? JSON.parse(configStr) : {};
      const ip = config.directIp;

      if (!ip) {
        Alert.alert("Error", "No hay una IP directa configurada en la aplicación.");
        return;
      }

      const url = `http://${ip}:5246/api/reports/resumen-ventas?desde=${startStr}&hasta=${endStr}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        setResumenData(Array.isArray(data) ? data : []);
      } else {
        Alert.alert("Error", "No se pudo obtener el resumen del servidor.");
      }
    } catch (e) {
      console.error("Error al consultar resumen:", e);
      Alert.alert("Error", "Fallo de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar al inicio de la pantalla
  useEffect(() => {
    consultarResumen();
  }, []);

  // Totales generales para los KPI Cards
  const totales = useMemo(() => {
    let tContado = 0;
    let tCredito = 0;
    let tBruta = 0;
    let tIva = 0;
    let tDevol = 0;
    let tNeta = 0;
    let tCostos = 0;
    let tUtilidad = 0;
    let tCobranzas = 0;
    let tRecibido = 0;

    resumenData.forEach((row: any) => {
      tContado += parseFloat(row.Contado || 0);
      tCredito += parseFloat(row.Credito || 0);
      tBruta += parseFloat(row.VentaBruta || 0);
      tIva += parseFloat(row.IVA || 0);
      tDevol += parseFloat(row.DevolAnul || 0);
      tNeta += parseFloat(row.VentaNeta || 0);
      tCostos += parseFloat(row.Costos || 0);
      tUtilidad += parseFloat(row.VentaNeta || 0) - parseFloat(row.Costos || 0);
      tCobranzas += parseFloat(row.Cobranzas || 0);
      tRecibido += parseFloat(row.TotalRecibido || 0);
    });

    const porcUtilidad = tNeta > 0 ? (tUtilidad / tNeta) * 100 : 0;

    return {
      contado: tContado,
      credito: tCredito,
      bruta: tBruta,
      iva: tIva,
      devol: tDevol,
      neta: tNeta,
      costos: tCostos,
      utilidad: tUtilidad,
      porcUtilidad: porcUtilidad,
      cobranzas: tCobranzas,
      recibido: tRecibido
    };
  }, [resumenData]);

  const exportarPDF = async () => {
    const configStr = await AsyncStorage.getItem('firebase_config');
    const config = configStr ? JSON.parse(configStr) : {};
    const businessName = config.businessName || "SOFIManager";

    let rowsHtml = '';
    resumenData.forEach((row: any) => {
      const vNeta = parseFloat(row.VentaNeta || 0);
      const costos = parseFloat(row.Costos || 0);
      const util = vNeta - costos;
      const porc = vNeta > 0 ? (util / vNeta) * 100 : 0;

      rowsHtml += `
        <tr style="border-bottom: 1px solid #ddd; font-size: 10px;">
          <td style="padding: 6px 2px;">${getNombreDia(row.Fecha)}</td>
          <td style="padding: 6px 2px; white-space: nowrap;">${formaterFechaVisual(row.Fecha)}</td>
          <td style="padding: 6px 2px; text-align: right;">C$ ${parseFloat(row.Contado || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right;">C$ ${parseFloat(row.Credito || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right; font-weight: bold;">C$ ${parseFloat(row.VentaBruta || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right;">C$ ${parseFloat(row.IVA || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right; color: #ef4444;">C$ ${parseFloat(row.DevolAnul || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right; font-weight: bold; color: #1e3a8a;">C$ ${vNeta.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right; color: #b91c1c;">C$ ${costos.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right; font-weight: bold; color: #15803d;">C$ ${util.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right;">${porc.toFixed(1)}%</td>
          <td style="padding: 6px 2px; text-align: right; font-weight: bold; color: #4338ca;">C$ ${parseFloat(row.Cobranzas || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px 2px; text-align: right; font-weight: bold; background-color: #f0fdf4; color: #166534;">C$ ${parseFloat(row.TotalRecibido || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 15px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; }
            .title { font-size: 20px; font-weight: bold; color: #1e3a8a; margin: 0; }
            .subtitle { font-size: 13px; color: #4b5563; margin-top: 5px; }
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; text-align: center; background-color: #f9fafb; }
            .card-title { font-size: 10px; color: #6b7280; text-transform: uppercase; margin-bottom: 2px; }
            .card-value { font-size: 12px; font-weight: bold; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #2563eb; color: white; font-size: 10px; font-weight: bold; padding: 6px 2px; text-align: left; }
            .totals-row { background-color: #f3f4f6; font-weight: bold; font-size: 10px; border-top: 2px solid #111827; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${businessName}</div>
            <div class="subtitle">Resumen de Ventas y Cobros Diario</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 5px;">Del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}</div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Venta Bruta</div>
              <div class="card-value">C$ ${totales.bruta.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
            <div class="card">
              <div class="card-title">Venta Neta</div>
              <div class="card-value" style="color: #1e3a8a;">C$ ${totales.neta.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
            <div class="card">
              <div class="card-title">Utilidad Ap.</div>
              <div class="card-value" style="color: #166534;">C$ ${totales.utilidad.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
            <div class="card">
              <div class="card-title">Caja / Recibido</div>
              <div class="card-value" style="color: #166534; font-weight: 900;">C$ ${totales.recibido.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">Día</th>
                <th style="width: 10%">Fecha</th>
                <th class="text-right" style="width: 10%">Contado</th>
                <th class="text-right" style="width: 10%">Crédito</th>
                <th class="text-right" style="width: 10%">V. Bruta</th>
                <th class="text-right" style="width: 5%">IVA</th>
                <th class="text-right" style="width: 8%">Devol/Anul</th>
                <th class="text-right" style="width: 10%">V. Neta</th>
                <th class="text-right" style="width: 8%">Costos</th>
                <th class="text-right" style="width: 10%">Util. Ap</th>
                <th class="text-right" style="width: 5%">% Util</th>
                <th class="text-right" style="width: 10%">Cobranzas</th>
                <th class="text-right" style="width: 12%">Recibido</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="totals-row">
                <td colspan="2" style="padding: 8px 2px;">TOTALES</td>
                <td class="text-right" style="padding: 8px 2px;">C$ ${totales.contado.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px;">C$ ${totales.credito.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px;">C$ ${totales.bruta.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px;">C$ ${totales.iva.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px; color: #ef4444;">C$ ${totales.devol.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px; color: #1e3a8a;">C$ ${totales.neta.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px; color: #b91c1c;">C$ ${totales.costos.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px; color: #15803d;">C$ ${totales.utilidad.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px;">${totales.porcUtilidad.toFixed(1)}%</td>
                <td class="text-right" style="padding: 8px 2px; color: #4338ca;">C$ ${totales.cobranzas.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-right" style="padding: 8px 2px; background-color: #e6fcf5; color: #115e59;">C$ ${totales.recibido.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert("Error", "No se pudo generar el reporte PDF.");
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Resumen de Ventas y Cobros</ThemedText>
        </View>

        {/* Date Filters */}
        <View style={styles.filterSection}>
          <View style={styles.rowLayout}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.filterLabel}>Desde:</ThemedText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowInicioDate(true)}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <ThemedText style={styles.dateBtnText}>{fechaInicio.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={{ width: 15 }} />
            
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.filterLabel}>Hasta:</ThemedText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFinDate(true)}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <ThemedText style={styles.dateBtnText}>{fechaFin.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={consultarResumen} style={styles.refreshButton} disabled={isLoading}>
             {isLoading ? (
               <ActivityIndicator color="#fff" size="small" />
             ) : (
               <>
                 <Ionicons name="search" size={20} color="#fff" />
                 <ThemedText style={styles.refreshText}>Consultar Resumen</ThemedText>
               </>
             )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <ThemedText style={styles.loadingText}>Cargando datos diarios...</ThemedText>
          </View>
        ) : resumenData.length > 0 ? (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiContainer}>
              <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                <Ionicons name="bar-chart-outline" size={22} color="#2563eb" />
                <ThemedText style={styles.kpiTitle}>Venta Bruta</ThemedText>
                <ThemedText style={[styles.kpiValue, { color: isDark ? '#f8fafc' : '#1e293b' }]}>
                  C$ {totales.bruta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </ThemedText>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                <Ionicons name="cash-outline" size={22} color="#10b981" />
                <ThemedText style={styles.kpiTitle}>Cobranzas</ThemedText>
                <ThemedText style={[styles.kpiValue, { color: '#10b981' }]}>
                  C$ {totales.cobranzas.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </ThemedText>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                <Ionicons name="trending-up" size={22} color="#8b5cf6" />
                <ThemedText style={styles.kpiTitle}>Utilidad Ap.</ThemedText>
                <ThemedText style={[styles.kpiValue, { color: '#8b5cf6' }]}>
                  C$ {totales.utilidad.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </ThemedText>
                <ThemedText style={styles.kpiSubText}>{totales.porcUtilidad.toFixed(1)}% Margen</ThemedText>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                <Ionicons name="wallet" size={22} color="#f59e0b" />
                <ThemedText style={styles.kpiTitle}>Caja Real</ThemedText>
                <ThemedText style={[styles.kpiValue, { color: '#f59e0b', fontSize: 16 }]}>
                  C$ {totales.recibido.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </ThemedText>
                <ThemedText style={styles.kpiSubText}>Contado + Cobros</ThemedText>
              </View>
            </View>

            {/* Data Grid Table (Horizontal Scrollable) */}
            <ThemedText style={styles.tableTitle}>Movimiento Consolidado Diario</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
              <View style={[styles.tableContainer, { borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                {/* Table Header */}
                <View style={[styles.tableRow, styles.tableHeaderRow, { backgroundColor: isDark ? '#334155' : '#2563eb' }]}>
                  <ThemedText style={[styles.cell, styles.headerCell, { width: 50 }]}>Día</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, { width: 90 }]}>Fecha</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 110 }]}>Contado</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 110 }]}>Crédito</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 120, fontWeight: 'bold' }]}>V. Bruta</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 90 }]}>IVA</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 100 }]}>Devol/Anul</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 120, fontWeight: 'bold' }]}>V. Neta</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 110 }]}>Costos</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 120, fontWeight: 'bold' }]}>Utilidad</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 70 }]}>% Util</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 110, fontWeight: 'bold' }]}>Cobranzas</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerCell, styles.rightAlign, { width: 130, fontWeight: 'bold' }]}>Recibido</ThemedText>
                </View>

                {/* Table Body Rows */}
                {resumenData.map((row: any, index: number) => {
                  const vNeta = parseFloat(row.VentaNeta || 0);
                  const costos = parseFloat(row.Costos || 0);
                  const util = vNeta - costos;
                  const porc = vNeta > 0 ? (util / vNeta) * 100 : 0;
                  const isEven = index % 2 === 0;

                  return (
                    <View 
                      key={row.Fecha || index} 
                      style={[
                        styles.tableRow, 
                        { backgroundColor: isEven ? (isDark ? '#1e293b' : '#fff') : (isDark ? '#0f172a' : '#f8fafc') }
                      ]}
                    >
                      <ThemedText style={[styles.cell, { width: 50, color: isDark ? '#94a3b8' : '#64748b' }]}>{getNombreDia(row.Fecha)}</ThemedText>
                      <ThemedText style={[styles.cell, { width: 90, color: isDark ? '#f8fafc' : '#1e293b' }]}>{formaterFechaVisual(row.Fecha)}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, color: isDark ? '#f8fafc' : '#1e293b' }]}>C$ {parseFloat(row.Contado || 0).toLocaleString(undefined, {minimumFractionDigits: 1})}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, color: isDark ? '#cbd5e1' : '#4b5563' }]}>C$ {parseFloat(row.Credito || 0).toLocaleString(undefined, {minimumFractionDigits: 1})}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 120, fontWeight: 'bold', color: isDark ? '#60a5fa' : '#2563eb' }]}>C$ {parseFloat(row.VentaBruta || 0).toLocaleString(undefined, {minimumFractionDigits: 1})}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 90, color: isDark ? '#cbd5e1' : '#4b5563' }]}>C$ {parseFloat(row.IVA || 0).toLocaleString()}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 100, color: '#ef4444' }]}>C$ {parseFloat(row.DevolAnul || 0).toLocaleString()}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 120, fontWeight: 'bold', color: isDark ? '#38bdf8' : '#1e3a8a' }]}>C$ {vNeta.toLocaleString(undefined, {minimumFractionDigits: 1})}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, color: '#f87171' }]}>C$ {costos.toLocaleString(undefined, {minimumFractionDigits: 1})}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 120, fontWeight: 'bold', color: '#10b981' }]}>C$ {util.toLocaleString(undefined, {minimumFractionDigits: 1})}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 70, color: isDark ? '#94a3b8' : '#64748b' }]}>{porc.toFixed(1)}%</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, fontWeight: 'bold', color: '#818cf8' }]}>C$ {parseFloat(row.Cobranzas || 0).toLocaleString()}</ThemedText>
                      <ThemedText style={[styles.cell, styles.rightAlign, { width: 130, fontWeight: 'bold', color: '#fbbf24', backgroundColor: isDark ? '#1e1b4b' : '#fef3c7' }]}>C$ {parseFloat(row.TotalRecibido || 0).toLocaleString(undefined, {minimumFractionDigits: 1})}</ThemedText>
                    </View>
                  );
                })}

                {/* Table Totals Row */}
                <View style={[styles.tableRow, styles.tableFooterRow, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                  <ThemedText style={[styles.cell, { width: 140, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b' }]}>TOTALES</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b' }]}>C$ {totales.contado.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, fontWeight: 'bold', color: isDark ? '#cbd5e1' : '#4b5563' }]}>C$ {totales.credito.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 120, fontWeight: 'bold', color: isDark ? '#60a5fa' : '#2563eb' }]}>C$ {totales.bruta.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 90, fontWeight: 'bold', color: isDark ? '#cbd5e1' : '#4b5563' }]}>C$ {totales.iva.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 100, fontWeight: 'bold', color: '#ef4444' }]}>C$ {totales.devol.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 120, fontWeight: 'bold', color: isDark ? '#38bdf8' : '#1e3a8a' }]}>C$ {totales.neta.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, fontWeight: 'bold', color: '#f87171' }]}>C$ {totales.costos.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 120, fontWeight: 'bold', color: '#10b981' }]}>C$ {totales.utilidad.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 70, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b' }]}>{totales.porcUtilidad.toFixed(1)}%</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 110, fontWeight: 'bold', color: '#818cf8' }]}>C$ {totales.cobranzas.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                  <ThemedText style={[styles.cell, styles.rightAlign, { width: 130, fontWeight: 'bold', color: '#fbbf24', backgroundColor: isDark ? '#311005' : '#fef3c7' }]}>C$ {totales.recibido.toLocaleString(undefined, {maximumFractionDigits: 0})}</ThemedText>
                </View>
              </View>
            </ScrollView>

            {/* Export PDF Button */}
            <TouchableOpacity style={styles.pdfBtn} onPress={exportarPDF}>
              <Ionicons name="print-outline" size={24} color="#fff" />
              <ThemedText style={styles.pdfBtnText}>GENERAR PDF CONSOLIDADO</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color={isDark ? "#334155" : "#cbd5e1"} />
            <ThemedText style={styles.emptyText}>
              No hay datos registrados en el rango de fechas seleccionado.
            </ThemedText>
          </View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Date Pickers */}
      {showInicioDate && (
        <DateTimePicker 
          value={fechaInicio} 
          mode="date" 
          onChange={(e, d) => { 
            setShowInicioDate(false); 
            if(d) { 
              // Android devuelve UTC midnight; extraemos partes UTC para crear fecha local correcta
              const corrected = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
              setFechaInicio(corrected); 
            } 
          }} 
        />
      )}
      {showFinDate && (
        <DateTimePicker 
          value={fechaFin} 
          mode="date" 
          onChange={(e, d) => { 
            setShowFinDate(false); 
            if(d) { 
              // Android devuelve UTC midnight; extraemos partes UTC para crear fecha local correcta
              const corrected = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
              setFechaFin(corrected); 
            } 
          }} 
        />
      )}
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
  dateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 10, gap: 8, height: 48 },
  dateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  refreshButton: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, marginTop: 5, gap: 8 },
  refreshText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  content: { padding: 20 },
  loadingContainer: { marginTop: 100, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 15, color: '#94a3b8', fontSize: 15 },
  kpiContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 25 },
  kpiCard: { width: '48%', borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, justifyContent: 'space-between', minHeight: 110 },
  kpiTitle: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginTop: 4 },
  kpiValue: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  kpiSubText: { fontSize: 9, color: '#94a3b8', marginTop: 3 },
  tableTitle: { fontSize: 15, fontWeight: 'bold', color: '#2563eb', marginBottom: 10 },
  tableScroll: { marginBottom: 25 },
  tableContainer: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  tableHeaderRow: { height: 45 },
  tableFooterRow: { height: 45, borderTopWidth: 2, borderTopColor: 'rgba(0,0,0,0.1)' },
  cell: { fontSize: 12 },
  headerCell: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  rightAlign: { textAlign: 'right' },
  pdfBtn: { backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 15, gap: 10, marginTop: 10 },
  pdfBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: { marginTop: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 15, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40, fontSize: 14 }
});
