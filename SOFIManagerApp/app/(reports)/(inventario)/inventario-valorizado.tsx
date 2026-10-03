import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

export default function InventarioValorizadoScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [selectedGrupo, setSelectedGrupo] = useState('0');
  const [articulos, setArticulos] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState('SOFISOFT');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // 1. Intentar conexión directa si existe IP configurada
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.directIp) {
          try {
            console.log("Intentando conexión directa a:", config.directIp);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const response = await fetch(`http://${config.directIp}:5246/api/reports/articulos`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              setArticulos(data);
              // También intentar traer grupos por vía directa
              const gRes = await fetch(`http://${config.directIp}:5246/api/reports/grupos`); // Asumiendo que existe
              if (gRes.ok) setGrupos(await gRes.json());
              
              setIsLoading(false);
              return; // Éxito total
            }
          } catch (err) {
            console.warn("Conexión directa fallida, usando caché de Firebase.");
          }
        }
      }

      // 2. Fallback a Caché (Offline)
      const cachedData = await AsyncStorage.getItem('dashboard_cache');
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          if (Array.isArray(data.articulos)) setArticulos(data.articulos);
          if (Array.isArray(data.grupos)) setGrupos(data.grupos);
          if (data.configuracion && data.configuracion.length > 0) {
            setBusinessName(data.configuracion[0].NOMBRE || 'SOFISOFT');
          }
        } catch (e) {
          console.error("Error al procesar caché de inventario:", e);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const filtrados = useMemo(() => {
    if (!Array.isArray(articulos)) return [];
    return articulos.filter(a => {
      if (!a) return false;
      const matchGrupo = selectedGrupo === '0' || a.CODG?.toString() === selectedGrupo;
      return matchGrupo;
    }).sort((a, b) => (a.NOMBRE || '').localeCompare(b.NOMBRE || ''));
  }, [articulos, selectedGrupo]);

  const totales = useMemo(() => {
    return filtrados.reduce((acc, a) => {
      const costo = parseFloat(a.COSTO || 0);
      const stock = parseFloat(a.EXISTENCIA || 0);
      return acc + (costo * stock);
    }, 0);
  }, [filtrados]);

  const exportarPDF = async () => {
    if (filtrados.length === 0) return;
    
    // Seguridad: Si hay demasiados registros, el PDF puede cerrar la App por falta de memoria
    if (filtrados.length > 1500) {
      Alert.alert(
        "Lista demasiado larga", 
        "Tienes más de 1,500 artículos. Generar un PDF tan grande puede cerrar la App. Por favor, filtra por un grupo específico antes de exportar."
      );
      return;
    }

    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; font-size: 10px; }
              .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th { background-color: #f1f5f9; padding: 8px; border: 1px solid #e2e8f0; text-align: left; }
              td { padding: 8px; border: 1px solid #e2e8f0; }
              .total-row { font-weight: bold; background: #f8fafc; font-size: 12px; }
              .text-right { text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${businessName}</h2>
              <h3>Reporte de Inventario Valorizado</h3>
              <p>Grupo: ${selectedGrupo === '0' ? 'TODOS' : grupos.find(g => g.CODG.toString() === selectedGrupo)?.NOMBRE}</p>
              <p>Fecha de Generación: ${new Date().toLocaleString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th class="text-right">Stock</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                ${filtrados.map(a => `
                  <tr>
                    <td>${a.IDART}</td>
                    <td>${a.NOMBRE}</td>
                    <td class="text-right">${parseFloat(a.EXISTENCIA || 0).toLocaleString()}</td>
                    <td class="text-right">C$ ${parseFloat(a.COSTO || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td class="text-right">C$ ${(parseFloat(a.COSTO || 0) * parseFloat(a.EXISTENCIA || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="4" class="text-right">VALOR TOTAL DEL INVENTARIO:</td>
                  <td class="text-right">C$ ${totales.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el PDF. El inventario podría ser demasiado grande para la memoria del teléfono.");
    }
  };


  const renderItem = ({ item }: { item: any }) => {
    const valor = parseFloat(item.COSTO || 0) * parseFloat(item.EXISTENCIA || 0);
    return (
      <View style={[styles.row, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.artName}>{item.NOMBRE}</ThemedText>
          <ThemedText style={styles.artDetails}>ID: {item.IDART} • Stock: {parseFloat(item.EXISTENCIA).toLocaleString()}</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText style={styles.artValue}>C$ {valor.toLocaleString(undefined, {minimumFractionDigits: 2})}</ThemedText>
          <ThemedText style={styles.artCost}>Costo: {parseFloat(item.COSTO).toLocaleString()}</ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#10b981' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Inventario Valorizado</ThemedText>
        </View>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedGrupo}
            onValueChange={setSelectedGrupo}
            style={{ color: '#fff' }}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="TODOS LOS GRUPOS" value="0" />
            {grupos.map(g => <Picker.Item key={g.CODG} label={g.NOMBRE} value={g.CODG.toString()} />)}
          </Picker>
        </View>

        <View style={styles.totalBanner}>
          <ThemedText style={styles.totalLabel}>VALOR TOTAL SELECCIONADO</ThemedText>
          <ThemedText style={styles.totalAmount}>C$ {totales.toLocaleString(undefined, {minimumFractionDigits: 2})}</ThemedText>
        </View>
      </View>

      <FlatList
        data={filtrados}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.IDART ? String(item.IDART) : String(index)}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={<ThemedText style={styles.empty}>No hay artículos en este grupo.</ThemedText>}
      />

      {filtrados.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={exportarPDF}>
          <Ionicons name="print-outline" size={24} color="#fff" />
          <ThemedText style={{color: '#fff', fontWeight: 'bold', marginLeft: 8}}>PDF</ThemedText>
        </TouchableOpacity>
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
  pickerWrapper: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, height: 50, justifyContent: 'center', marginBottom: 15 },
  totalBanner: { alignItems: 'center', marginTop: 5 },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  totalAmount: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  artName: { fontSize: 15, fontWeight: 'bold' },
  artDetails: { fontSize: 12, color: '#475569', marginTop: 2 },
  artValue: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  artCost: { fontSize: 10, color: '#475569' },
  empty: { textAlign: 'center', marginTop: 50, color: '#475569' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#10b981', paddingHorizontal: 25, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', elevation: 5 }
});
