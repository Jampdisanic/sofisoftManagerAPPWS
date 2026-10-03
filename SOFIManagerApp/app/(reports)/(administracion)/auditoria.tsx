import React, { useState, useEffect, useMemo } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AuditoriaScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [fechaConsulta, setFechaConsulta] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('0');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [allAuditorias, setAllAuditorias] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [fechaConsulta]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const startStr = fechaConsulta.toISOString().split('T')[0];

      // 1. Intentar conexión directa
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.directIp) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const base = `http://${config.directIp}:5246/api/reports`;
            
            const [audRes, uRes] = await Promise.all([
              fetch(`${base}/auditoria?desde=${startStr}`, { signal: controller.signal }),
              fetch(`${base}/usuarios`, { signal: controller.signal })
            ]);
            clearTimeout(timeoutId);

            if (audRes.ok) {
              const data = await audRes.json();
              setAllAuditorias(data);
            }
            if (uRes.ok) {
              setUsuarios(await uRes.json());
            }
            
            if (audRes.ok) return; // Éxito total o parcial suficiente
          } catch (e) {
            console.warn("Direct API failed in Auditoria:", e);
          }
        }
      }

      // 2. Fallback: Caché local
      const cachedData = await AsyncStorage.getItem('dashboard_cache');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        if (data.usuarios) setUsuarios(data.usuarios);
        if (data.auditorias) setAllAuditorias(data.auditorias);
      }
    } catch (error) {
      console.error("Error cargando datos de auditoría:", error);
    } finally {
      setIsLoading(false);
    }
  };  // Filtrado lógico combinado (Usuario + Búsqueda + Fecha)
  const filteredAuditorias = useMemo(() => {
    const selDateStr = fechaConsulta.toISOString().split('T')[0];

    return allAuditorias.filter(item => {
      if (!item) return false;
      
      // 1. Filtrar por Fecha (Comparación ISO YYYY-MM-DD)
      let itemDateStr = '';
      if (item.Fecha) {
        if (typeof item.Fecha === 'string') {
          itemDateStr = item.Fecha.split('T')[0];
        } else {
          itemDateStr = new Date(item.Fecha).toISOString().split('T')[0];
        }
      }
      const matchesDate = itemDateStr === selDateStr;

      // 2. Filtrar por Usuario
      const itemUserId = item.UsuarioID?.toString() || '';
      const matchesUser = selectedUserId === '0' || itemUserId === selectedUserId;
      
      // 3. Filtrar por texto
      const lowerSearch = search.toLowerCase();
      const description = (item.Descripcion || '').toLowerCase();
      const modulo = (item.Modulo || '').toLowerCase();
      const matchesSearch = description.includes(lowerSearch) || 
                            modulo.includes(lowerSearch);
                               
      return matchesDate && matchesUser && matchesSearch;
    });
  }, [allAuditorias, selectedUserId, search, fechaConsulta]);

  const getModuleColor = (modulo: string) => {
    const m = modulo?.toLowerCase() || '';
    if (m.includes('venta')) return '#3b82f6';
    if (m.includes('inventario')) return '#f59e0b';
    if (m.includes('factura')) return '#10b981';
    if (m.includes('usuario')) return '#8b5cf6';
    if (m.includes('sistema')) return '#ef4444';
    return '#64748b';
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.row, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
      <View style={styles.infoCol}>
        <View style={styles.moduleBadgeContainer}>
          <View style={[styles.moduleBadge, { backgroundColor: getModuleColor(item.Modulo) }]}>
            <ThemedText style={styles.moduleText}>{item.Modulo || 'SISTEMA'}</ThemedText>
          </View>
          <ThemedText style={styles.originText}>{item.Origen || 'Terminal'}</ThemedText>
        </View>
        <ThemedText style={[styles.descriptionText, { color: isDark ? '#fff' : '#000' }]}>{item.Descripcion}</ThemedText>
        <View style={styles.footerRow}>
          <Ionicons name="time-outline" size={12} color={isDark ? "#94a3b8" : "#475569"} />
          <ThemedText style={[styles.dateText, { color: isDark ? "#94a3b8" : "#475569" }]}>
            {typeof item.Fecha === 'string' ? item.Fecha.replace('T', ' ').substring(0, 19) : String(item.Fecha)}
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
          <ThemedText style={styles.headerTitle}>Auditoría Global</ThemedText>
          
          <TouchableOpacity 
            style={styles.calendarBtn} 
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#fff" />
            <ThemedText style={styles.calendarBtnText}>{fechaConsulta.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Picker de Usuarios */}
        <View style={styles.filtersContainer}>
          <View style={[styles.pickerWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="person-outline" size={18} color="#fff" style={{marginLeft: 12}} />
            <Picker 
              selectedValue={selectedUserId} 
              onValueChange={(v) => setSelectedUserId(v)} 
              style={[styles.picker, { color: '#fff' }]} 
              dropdownIconColor="#fff"
              mode="dropdown"
            >
              <Picker.Item label="Todos los usuarios" value="0" />
              {usuarios.map((u, i) => (
                <Picker.Item key={u.IDUSER || i} label={u.NOMBRE || 'Sin Nombre'} value={String(u.IDUSER || '')} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Buscador */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#475569" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por descripción..."
            placeholderTextColor="#475569"
            style={[styles.searchInput, { color: isDark ? '#fff' : '#1e293b' }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker 
          value={fechaConsulta} 
          mode="date" 
          onChange={(e, d) => { setShowDatePicker(false); if(d) setFechaConsulta(d); }} 
        />
      )}


      <FlatList
        data={filteredAuditorias}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.ID ? String(item.ID) : String(index)}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#475569" />
            <ThemedText style={styles.emptyText}>
              {search || selectedUserId !== '0' ? "No hay resultados para este filtro." : "No hay movimientos registrados."}
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', flex: 1 },
  calendarBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5 },
  calendarBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  filtersContainer: { marginBottom: 15 },
  filterLabel: { color: '#ffffff', fontSize: 12, marginBottom: 8, opacity: 0.8, marginLeft: 5 },
  pickerWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 15, 
    height: 50, 
    overflow: 'hidden' 
  },
  picker: { flex: 1, height: 50 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 15, paddingHorizontal: 12, height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  row: { paddingVertical: 18, borderBottomWidth: 1 },
  infoCol: { flex: 1 },
  moduleBadgeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  moduleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  moduleText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  originText: { fontSize: 10, color: '#475569', fontWeight: '500' },
  descriptionText: { fontSize: 15, fontWeight: '600', marginBottom: 8, lineHeight: 20, color: '#000000' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: '#475569' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 20, fontSize: 16, color: '#475569', textAlign: 'center' },
});
