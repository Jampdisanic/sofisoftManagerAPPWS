import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function ClientesScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
  
  // Estados para expansión
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      // 1. Intentar conexión directa
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.directIp) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`http://${config.directIp}:5246/api/reports/clientes`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              setClientes(data);
              return;
            }
          } catch (e) { console.warn("Direct API failed in Clientes"); }
        }
      }

      // 2. Fallback: Caché local
      const cachedData = await AsyncStorage.getItem('dashboard_cache');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        if (data.clientes) setClientes(data.clientes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filtrados = useMemo(() => {
    return clientes.filter(c => 
      c.NOMBRE?.toLowerCase().includes(search.toLowerCase()) ||
      c.IDCLIENTE?.toString().includes(search)
    ).sort((a, b) => (a.NOMBRE || '').localeCompare(b.NOMBRE || ''));
  }, [clientes, search]);

  const toggleExpand = async (idClien: string) => {
    if (expandedClientId === idClien) {
      setExpandedClientId(null);
      setClientInvoices([]);
      return;
    }

    setExpandedClientId(idClien);
    setClientInvoices([]);
    setIsLoadingInvoices(true);

    try {
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.directIp) {
          const res = await fetch(`http://${config.directIp}:5246/api/reports/facturas-pendientes?idClien=${idClien}`);
          if (res.ok) {
            const data = await res.json();
            setClientInvoices(data);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching facturas pendientes:", e);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = expandedClientId === String(item.IDCLIENTE);

    return (
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
        <TouchableOpacity 
          style={styles.row}
          onPress={() => toggleExpand(String(item.IDCLIENTE))}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{item.IDCLIENTE}</ThemedText>
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <ThemedText style={styles.name}>{item.NOMBRE}</ThemedText>
            <ThemedText style={styles.details}>ID: {item.IDCLIENTE} • RUC: {item.RUC || 'N/A'}</ThemedText>
            {item.DIRECCION && <ThemedText style={styles.address} numberOfLines={1}>{item.DIRECCION}</ThemedText>}
          </View>
          <View style={styles.callBtn}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#2563eb" />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedSection}>
            <ThemedText style={styles.expandedTitle}>Facturas Pendientes</ThemedText>
            {isLoadingInvoices ? (
              <ThemedText style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>Cargando facturas...</ThemedText>
            ) : clientInvoices.length > 0 ? (
              clientInvoices.map((fac, idx) => (
                <View key={idx} style={styles.invoiceItem}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.invFactText}>Factura: {fac.NFACT}</ThemedText>
                    <ThemedText style={styles.invDateText}>Emitida: {(fac.FECHA || '').toString().split('T')[0]}</ThemedText>
                    <ThemedText style={styles.invDateText}>Vence: {(fac.FVENCE || '').toString().split('T')[0]}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={styles.invSaldo}>Saldo: C${parseFloat(fac.SALDO || 0).toLocaleString()}</ThemedText>
                    <ThemedText style={[styles.invMora, { color: fac.Dias > 0 ? '#ef4444' : '#10b981' }]}>
                      Mora: {fac.Dias || 0} días ({fac.Clasificacion || 'N/A'})
                    </ThemedText>
                  </View>
                </View>
              ))
            ) : (
              <ThemedText style={{ color: '#10b981', fontSize: 13, marginTop: 10 }}>El cliente no tiene facturas pendientes o saldo en mora.</ThemedText>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Lista de Clientes</ThemedText>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#475569" />
          <TextInput
            placeholder="Buscar por nombre o ID..."
            placeholderTextColor="#475569"
            style={[styles.searchInput, { color: isDark ? '#fff' : '#1e293b' }]}
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#475569" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtrados}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.IDCLIENTE ? String(item.IDCLIENTE) : String(index)}
        contentContainerStyle={{ padding: 20 }}
        refreshing={isRefreshing}
        onRefresh={loadData}
        ListEmptyComponent={<ThemedText style={styles.empty}>No se encontraron clientes.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  card: { borderRadius: 15, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 15 },
  name: { fontSize: 16, fontWeight: 'bold' },
  details: { fontSize: 12, color: '#475569', marginTop: 2 },
  address: { fontSize: 11, color: '#64748b', marginTop: 2 },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 50, color: '#475569' },
  
  // Expanded section styles
  expandedSection: { paddingHorizontal: 15, paddingBottom: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: 'rgba(0,0,0,0.02)' },
  expandedTitle: { fontWeight: 'bold', fontSize: 14, color: '#2563eb', marginTop: 10, marginBottom: 5 },
  invoiceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  invFactText: { fontWeight: 'bold', fontSize: 13, color: '#1e293b' },
  invDateText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  invSaldo: { fontWeight: 'bold', fontSize: 14, color: '#ef4444' },
  invMora: { fontSize: 11, fontWeight: 'bold', marginTop: 2 }
});
