import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function VentasReports() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText type="title">Reportes de Ventas</ThemedText>
    </ThemedView>
  );
}
