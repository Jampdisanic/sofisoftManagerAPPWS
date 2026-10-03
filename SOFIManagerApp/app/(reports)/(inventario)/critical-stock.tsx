import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TextInput, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';
import { useRouter } from 'expo-router';

export default function CriticalStockScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('dashboard_cache');
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          if (Array.isArray(data.articulos)) {
            const critical = data.articulos.filter((a: any) => {
              if (!a) return false;
              const stock = parseFloat(a.EXISTENCIA || 0);
              const min = parseFloat(a.ExistenciaMinima || 0);
              return stock <= min && min > 0;
            });
            setItems(critical);
            setFilteredItems(critical);
          }
        } catch (e) {
          console.error("Error al procesar caché en Stock Crítico:", e);
        }
      }
    } catch (error) {
      console.log("Error cargando inventario");
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    const lowerText = text.toLowerCase();
    const filtered = items.filter(i => 
      (i.NOMBRE || '').toLowerCase().includes(lowerText) || 
      (i.IDART || '').toString().toLowerCase().includes(lowerText)
    );
    setFilteredItems(filtered);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.row, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
      <View style={styles.infoCol}>
        <ThemedText style={styles.artName}>{item.NOMBRE || 'Sin nombre'}</ThemedText>
        <ThemedText style={styles.artCode}>ID: {item.IDART}</ThemedText>
      </View>
      <View style={styles.stockCol}>
        <ThemedText style={[styles.stockValue, { color: parseFloat(item.EXISTENCIA || 0) <= 0 ? '#ef4444' : '#f59e0b' }]}>
          {item.EXISTENCIA || 0}
        </ThemedText>
        <ThemedText style={styles.minLabel}>Min: {item.ExistenciaMinima || 0}</ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Stock Crítico</ThemedText>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#475569" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o ID..."
            placeholderTextColor="#475569"
            style={[styles.searchInput, { color: isDark ? '#fff' : '#1e293b' }]}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <View style={styles.tableHeader}>
        <ThemedText style={styles.tableHeaderText}>Artículo</ThemedText>
        <ThemedText style={[styles.tableHeaderText, { textAlign: 'right' }]}>Existencia</ThemedText>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?.IDART ? item.IDART.toString() : index.toString()}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#10b981" />
            <ThemedText style={styles.emptyText}>No hay artículos con stock crítico</ThemedText>
          </View>
        }
      />

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, height: 45 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, paddingVertical: 15 },
  tableHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  listContent: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  infoCol: { flex: 1 },
  artName: { fontSize: 15, fontWeight: '600', color: '#171b1b' },
  artCode: { fontSize: 12, color: '#475569', marginTop: 2 },
  stockCol: { alignItems: 'flex-end' },
  stockValue: { fontSize: 16, fontWeight: 'bold' },
  minLabel: { fontSize: 10, color: '#475569' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 20, fontSize: 16, color: '#475569' }
});
