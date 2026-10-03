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

export default function VendedoresScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [vendedores, setVendedores] = useState<any[]>([]);

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
            const response = await fetch(`http://${config.directIp}:5246/api/reports/vendedores`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              setVendedores(data);
              return;
            }
          } catch (e) { console.warn("Direct API failed in Vendedores"); }
        }
      }

      // 2. Fallback: Caché local
      const cachedData = await AsyncStorage.getItem('dashboard_cache');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        if (data.vendedores) setVendedores(data.vendedores);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filtrados = useMemo(() => {
    return vendedores.filter(c => 
      c.NombreVendedor?.toLowerCase().includes(search.toLowerCase()) ||
      c.Id?.toString().includes(search)
    ).sort((a, b) => (a.NombreVendedor || '').localeCompare(b.NombreVendedor || ''));
  }, [vendedores, search]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.row, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
      <View style={styles.avatar}>
        {/*<ThemedText style={styles.avatarText}>{item.NOMBRE?.substring(0, 1)}</ThemedText>*/}
        <ThemedText style={styles.avatarText}>{item.Id}</ThemedText>
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <ThemedText style={styles.name}>{item.NombreVendedor}</ThemedText>
        <ThemedText style={styles.details}>ID: {item.Id} • RUC: {item.RUC || 'N/A'}</ThemedText>
        {item.Direccion && <ThemedText style={styles.address} numberOfLines={1}>{item.Direccion}</ThemedText>}
      </View>
      <TouchableOpacity style={styles.callBtn}>
        <Ionicons name="person-outline" size={20} color="#2563eb" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Lista de Vendedores</ThemedText>
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
        keyExtractor={(item, index) => item.Id ? String(item.Id) : String(index)}
        contentContainerStyle={{ padding: 20 }}
        refreshing={isRefreshing}
        onRefresh={loadData}
        ListEmptyComponent={<ThemedText style={styles.empty}>No se encontraron vendedores.</ThemedText>}
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 18 },
  name: { fontSize: 16, fontWeight: 'bold'},
  details: { fontSize: 12, color: '#475569', marginTop: 2 },
  address: { fontSize: 11, color: '#64748b', marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 50, color: '#475569' }
});
