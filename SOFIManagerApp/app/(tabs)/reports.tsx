import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router'; // Añadir router
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';
import { usePermissions, PERMISSION_IDS } from '@/constants/PermissionsContext';

export default function ReportsScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const categoriesConfig = [
    { label: 'Ventas', value: 'Ventas', permId: PERMISSION_IDS.MODULO_VENTAS },
    { label: 'Compras', value: 'Compras', permId: PERMISSION_IDS.MODULO_COMPRAS },
    { label: 'Inventario', value: 'Inventario', permId: PERMISSION_IDS.MODULO_INVENTARIO },
    { label: 'Administración', value: 'Administracion', permId: PERMISSION_IDS.MODULO_ADMINISTRACION },
  ];

  // Filtramos las categorías a las que el usuario tiene acceso
  const availableCategories = categoriesConfig.filter(c => hasPermission(c.permId).canView);
  
  // Tomamos la primera disponible como estado inicial por defecto
  const [selectedCategory, setSelectedCategory] = useState(
    availableCategories.length > 0 ? availableCategories[0].value : 'Ventas'
  );

  // Si cambian los permisos y la categoría actual ya no es válida, la corregimos
  const availableValues = availableCategories.map(c => c.value).join(',');
  React.useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.find(c => c.value === selectedCategory)) {
      setSelectedCategory(availableCategories[0].value);
    }
  }, [availableValues]);

  const reportCategories: any = {
    Ventas: [
      { id: PERMISSION_IDS.REPORTE_CAJA, title: 'Informe de Caja', desc: 'Desglose de ingresos, efectivo y tarjetas', icon: 'calculator-outline', route: '/(reports)/(ventas)/flujo-dia' },
      { id: PERMISSION_IDS.MASTER_VENTAS, title: 'Master de Ventas', desc: 'Listado detallado de todas las facturas', icon: 'list-outline', route: '/(reports)/(ventas)/master-ventas' },
      { id: PERMISSION_IDS.ARTICULOS_VENDIDOS, title: 'Artículos Vendidos', desc: 'Listado y resumen de artículos facturados', icon: 'cart-outline', route: '/(reports)/(ventas)/articulos-vendidos' },
      { id: PERMISSION_IDS.VENDEDORES, title: 'Ventas por Vendedor', desc: 'Rendimiento de ventas por usuario', icon: 'people-outline', route: '/(reports)/(ventas)/ventas-vendedor' },
      { id: PERMISSION_IDS.PARETO_ARTICULOS, title: 'Top Productos', desc: 'Artículos más vendidos del periodo', icon: 'trending-up-outline', route: '/(reports)/(ventas)/paretos-articulos' },
      { id: PERMISSION_IDS.RESUMEN_VENTAS, title: 'Resumen de Ventas', desc: 'Consolidado diario de ventas, costos y cobros', icon: 'analytics-outline', route: '/(reports)/(ventas)/resumen-ventas' },
    ],
    Compras: [
      { id: PERMISSION_IDS.FACTURAS_COMPRAS, title: 'Master de Compras', desc: 'Consolidado de facturas, compras y gastos', icon: 'cart-outline', route: '/(reports)/(compras)/master-compras' },
      { id: PERMISSION_IDS.MASTER_GASTOS, title: 'Master de Gastos', desc: 'Detalle de gastos con conceptos y notas', icon: 'receipt-outline', route: '/(reports)/(compras)/master-gastos' },
      { id: PERMISSION_IDS.FACTURAS_COMPRAS, title: 'Artículos Comprados', desc: 'Consolidado de artículos comprados', icon: 'bag-outline', route: '/(reports)/(compras)/articulos-comprados' },
    ],
    Inventario: [
      { id: PERMISSION_IDS.LISTA_EXISTENCIA, title: 'Stock Crítico', desc: 'Artículos bajo el nivel mínimo', icon: 'alert-circle-outline', route: '/(reports)/(inventario)/critical-stock' },
      { id: PERMISSION_IDS.INVENTARIO_VALORIZADO, title: 'Inventario Valorizado', desc: 'Costo total de mercancía en almacén', icon: 'calculator-outline', route: '/(reports)/(inventario)/inventario-valorizado' },
      { id: PERMISSION_IDS.KARDEX, title: 'Movimientos de Kardex', desc: 'Entradas y salidas de productos', icon: 'swap-horizontal-outline', route: '/(reports)/(inventario)/kardex' },
    ],
    Administracion: [
      { id: PERMISSION_IDS.CLIENTES, title: 'Lista de Clientes', desc: 'Directorio y detalles de clientes', icon: 'people-outline', route: '/(reports)/(administracion)/clientes' },
      { id: PERMISSION_IDS.PROVEEDORES, title: 'Lista de Proveedores', desc: 'Directorio de proveedores', icon: 'business-outline', route: '/(reports)/(administracion)/proveedores' },
      { id: PERMISSION_IDS.VENDEDORES, title: 'Lista de Vendedores', desc: 'Directorio de Vendedores', icon: 'lock-closed-outline', route: '/(reports)/(administracion)/vendedores' },
      { id: PERMISSION_IDS.AUDITORIA, title: 'Auditoría de Logs', desc: 'Actividad del sistema y usuarios', icon: 'shield-checkmark-outline', route: '/(reports)/(administracion)/auditoria' },
    ]
  };

  const handleReportPress = (report: any) => {
    if (report.route) {
      router.push(report.route);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#f8fafc' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <ThemedText style={styles.headerTitle}>Centro de Reportes</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Analiza el rendimiento de tu negocio</ThemedText>
      </View>

      {/* Selector de Categoría Restaurado */}
      <View style={styles.pickerSection}>
        <ThemedText style={styles.label}>Selecciona el Módulo:</ThemedText>
        <View style={[styles.pickerContainer, { backgroundColor: isDark ? '#334155' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0', borderWidth: 1 }]}>
          <Ionicons name="filter-outline" size={20} color={isDark ? "#cbd5e1" : "#64748b"} style={styles.pickerIcon} />
          <Picker
            selectedValue={selectedCategory}
            onValueChange={(itemValue) => setSelectedCategory(itemValue)}
            style={[styles.picker, { color: isDark ? '#fff' : '#1e293b' }]}
            dropdownIconColor={isDark ? '#cbd5e1' : '#64748b'}
            mode="dropdown"
          >
            {availableCategories.length === 0 && (
              <Picker.Item label="🚫 Sin acceso a módulos" value="Ventas" />
            )}
            {availableCategories.map((cat) => (
              <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Reportes de {selectedCategory}</ThemedText>
        
        {reportCategories[selectedCategory] ? (
          reportCategories[selectedCategory]
            .filter((report: any) => report.id === -1 || hasPermission(report.id).canView)
            .map((report: any) => (
            <TouchableOpacity 
              key={report.id + report.title} 
              style={[styles.reportCard, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}
              onPress={() => handleReportPress(report)}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                <Ionicons name={report.icon} size={24} color="#2563eb" />
              </View>
              <View style={styles.reportInfo}>
                <ThemedText style={[styles.reportTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>{report.title}</ThemedText>
                <ThemedText style={[styles.reportDesc, { color: isDark ? '#94a3b8' : '#64748b' }]}>{report.desc}</ThemedText>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))
        ) : (
          <ThemedText style={{ textAlign: 'center', marginTop: 20, color: isDark ? '#94a3b8' : '#64748b' }}>
            No tienes acceso a los reportes de este módulo.
          </ThemedText>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  pickerSection: { paddingHorizontal: 20, marginTop: -25, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#ffffff', marginBottom: 8, marginLeft: 10 },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, height: 60, paddingHorizontal: 15, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  pickerIcon: { marginRight: 5 },
  picker: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 10 },
  reportCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: 'bold' },
  reportDesc: { fontSize: 12, marginTop: 2 },
});
