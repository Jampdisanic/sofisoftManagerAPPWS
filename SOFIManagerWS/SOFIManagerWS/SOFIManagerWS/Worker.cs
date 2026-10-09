using SOFIManagerWS;
using System.Text.Json;

namespace SOFIManagerWS
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly IConfiguration _configuration;
        private readonly DataExtractor _extractor;

        public Worker(ILogger<Worker> logger, IConfiguration configuration, DataExtractor extractor)
        {
            _logger = logger;
            _configuration = configuration;
            _extractor = extractor;
        }

        private int _cyclesSinceLastMasterSync = 99; // Forzar sincronización en el primer arranque

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("=== SOFIManager Hybrid Server Iniciado ===");

            string fireProjectId = _configuration["FirebaseSettings:ProjectId"] ?? "";
            string fireKeyPath = _configuration["FirebaseSettings:KeyPath"] ?? "";
            int intervalMinutes = _configuration.GetValue<int>("WorkerSettings:IntervalMinutes", 15);
            bool enableSync = _configuration.GetValue<bool>("WorkerSettings:EnableFirebaseSync", true);

            while (!stoppingToken.IsCancellationRequested)
            {
                var fireClient = enableSync ? new FirestoreClient(fireProjectId, fireKeyPath, _logger) : null;
                bool isMasterCycle = _cyclesSinceLastMasterSync >= 4; // Cada 4 ciclos (ej: 15min * 4 = 1 hora)
                
                if (enableSync) {
                    _logger.LogInformation("--- Ciclo Sincronización a Nube: {time} (Maestro: {IsMaster}) ---", DateTimeOffset.Now, isMasterCycle);
                } else {
                    _logger.LogInformation("--- Ciclo Extracción Local: {time} (Sincronización DESACTIVADA) ---", DateTimeOffset.Now);
                }

                try
                {
                    // 1. Obtener última sincronización incremental
                    DateTime? lastFireSync = enableSync ? await fireClient.GetLastSyncAsync() : null;
                    DateTime fechaFiltro = lastFireSync ?? new DateTime(2026, 1, 1);
                    
                    // 2. SINCRONIZACIÓN DE TRANSACCIONES (Siempre en cada ciclo)
                    _logger.LogInformation("Procesando transacciones incrementales desde {Fecha}...", fechaFiltro.ToString("yyyy-MM-dd HH:mm"));
                    
                    var facturasNuevas = await _extractor.GetFacturasAsync(fechaFiltro, DateTime.Now);
                    var auditoriasNuevas = await _extractor.GetAuditoriaAsync(fechaFiltro);
                    var abonosNuevos = await _extractor.GetAbonosFlujoAsync(fechaFiltro);
                    var notificacionesNuevas = await _extractor.GetNotificacionesAsync(fechaFiltro);

                    if (enableSync)
                    {
                        if (facturasNuevas.Count > 0) await fireClient.SyncCollectionAsync("facturas", facturasNuevas, "NFACT");
                        if (auditoriasNuevas.Count > 0) await fireClient.SyncCollectionAsync("auditorias", auditoriasNuevas, "Fecha");
                        if (abonosNuevos.Count > 0) await fireClient.SyncCollectionAsync("abonos", abonosNuevos, "ID");
                        if (notificacionesNuevas.Count > 0) await fireClient.SyncCollectionAsync("notificaciones", notificacionesNuevas, "ID");
                    }

                    // 3. SINCRONIZACIÓN DE MAESTROS (Solo una vez por hora / cada 4 ciclos)
                    if (isMasterCycle)
                    {
                        _logger.LogInformation("Ciclo Maestro: Sincronizando catálogos completos para ahorrar cuota...");
                        
                        var usuarios = await _extractor.GetUsuariosAsync();
                        var clientes = await _extractor.GetClientesAsync();
                        var vendedores = await _extractor.GetVendedoresAsync();
                        var articulos = await _extractor.GetArticulosAsync();
                        var articulosAgrupados = await _extractor.GetArticuloAgrupadoItemAsync();
                        var articulosIntegrados = await _extractor.GetArticuloIntegradoItemAsync();
                        var configuracion = await _extractor.GetConfiguracionAsync();
                        var permisos = await _extractor.GetPermisosAsync();
                        var permiroles = await _extractor.GetPermirolesAsync();
                        var roles = await _extractor.GetRolesAsync();
                        var grupos = await _extractor.GetGruposAsync();
                        var proveedores = await _extractor.GetProveedoresAsync();
                        var lotes = await _extractor.GetLotesVencimientoAsync();
                        var seriales = await _extractor.GetSerialesAsync();
                        var ventasmes = await _extractor.GetVentasPorMesAsync();

                        if (enableSync)
                        {
                            await fireClient.SyncCollectionAsync("usuarios", usuarios, "IDUSER");
                            await fireClient.SyncCollectionAsync("clientes", clientes, "IDCLIENTE");
                            await fireClient.SyncCollectionAsync("vendedores", vendedores, "Id");
                            await fireClient.SyncCollectionAsync("articulos", articulos, "IDART");
                            await fireClient.SyncCollectionAsync("configuracion", configuracion, "ID");
                            await fireClient.SyncCollectionAsync("permisos", permisos, "IDPERMISO");
                            await fireClient.SyncCollectionAsync("roles", roles, "IDROL");
                            await fireClient.SyncCollectionAsync("permiroles", permiroles, "ID");
                            await fireClient.SyncCollectionAsync("grupos", grupos, "IDGRUPO");
                            await fireClient.SyncCollectionAsync("proveedores", proveedores, "IDPROVEEDOR");
                            await fireClient.SyncCollectionAsync("lotes", lotes, "idArticulo");
                            await fireClient.SyncCollectionAsync("seriales", seriales, "ID");
                            await fireClient.SyncCollectionAsync("ventasmes", ventasmes, "NumeroMes");
                        }

                        _cyclesSinceLastMasterSync = 0;
                    }
                    else
                    {
                        _cyclesSinceLastMasterSync++;
                    }

                    // Actualizar marca de tiempo para el próximo ciclo incremental
                    if (enableSync)
                    {
                        await fireClient.UpdateLastSyncAsync();
                    }
                    
                    _logger.LogInformation("✅ Ciclo completado. Próximo intento en {Interval} minutos.", intervalMinutes);
                }
                catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.ResourceExhausted)
                {
                    _logger.LogCritical("❌ CUOTA DE FIREBASE AGOTADA. El servicio esperará al siguiente ciclo. " +
                                        "Considera aumentar 'IntervalMinutes' en appsettings.json o pasar a un plan de pago.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error en el ciclo de sincronización.");
                }

                await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
            }
        }
    }
}
