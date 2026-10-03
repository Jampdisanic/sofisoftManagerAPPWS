using Google.Cloud.Firestore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOFIManagerWS
{
    public class FirestoreClient
    {
        private readonly FirestoreDb _db;
        private readonly ILogger _logger;

        public FirestoreClient(string projectId, string keyPath, ILogger logger)
        {
            _logger = logger;
            
            // Establecer la variable de entorno para la autenticación
            System.Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", keyPath);
            
            _db = FirestoreDb.Create(projectId);
            _logger.LogInformation("Firestore Client inicializado para el proyecto: {ProjectId}", projectId);
        }

        /// <summary>
        /// Sube una lista de documentos a una colección específica usando Batches para mayor eficiencia.
        /// </summary>
        public async Task<int> SyncCollectionAsync(string collectionName, List<Dictionary<string, object>> documents, string idField)
        {
            if (documents == null || documents.Count == 0) return 0;

            int count = 0;
            const int batchSize = 400; // Firestore permite hasta 500 operaciones por batch
            
            for (int i = 0; i < documents.Count; i += batchSize)
            {
                var batch = _db.StartBatch();
                var currentBatch = documents.GetRange(i, Math.Min(batchSize, documents.Count - i));

                foreach (var doc in currentBatch)
                {
                    if (doc.TryGetValue(idField, out var id) && id != null)
                    {
                        // Limpiar datos: Firestore no soporta el tipo Decimal y exige fechas en UTC
                        var cleanDoc = new Dictionary<string, object>();
                        foreach (var kvp in doc)
                        {
                            if (kvp.Value is decimal d)
                            {
                                cleanDoc[kvp.Key] = Convert.ToDouble(d);
                            }
                            else if (kvp.Value is DateTime dt)
                            {
                                // Firebase requiere que el Kind sea UTC explícitamente
                                cleanDoc[kvp.Key] = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                            }
                            else
                            {
                                cleanDoc[kvp.Key] = kvp.Value;
                            }
                        }

                        DocumentReference docRef = _db.Collection(collectionName).Document(id.ToString());
                        batch.Set(docRef, cleanDoc, SetOptions.Overwrite);
                        count++;
                    }
                }

                await batch.CommitAsync();
            }

            _logger.LogInformation("Sincronizados {Count} documentos en la colección {Collection}", count, collectionName);
            return count;
        }

        /// <summary>
        /// Actualiza la fecha de la última sincronización en un documento de control.
        /// </summary>
        public async Task UpdateLastSyncAsync()
        {
            var metadataRef = _db.Collection("metadata").Document("sync_info");
            await metadataRef.SetAsync(new { 
                lastSync = DateTime.UtcNow,
                serverTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            }, SetOptions.Overwrite);
        }

        /// <summary>
        /// Obtiene la fecha de la última sincronización desde Firestore.
        /// </summary>
        public async Task<DateTime?> GetLastSyncAsync()
        {
            try
            {
                var docRef = _db.Collection("metadata").Document("sync_info");
                var snapshot = await docRef.GetSnapshotAsync();
                
                if (snapshot.Exists && snapshot.ContainsField("lastSync"))
                {
                    return snapshot.GetValue<DateTime>("lastSync");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("No se pudo obtener la última fecha de sincronización de Firestore: {Msg}", ex.Message);
            }
            return null;
        }
    }
}
