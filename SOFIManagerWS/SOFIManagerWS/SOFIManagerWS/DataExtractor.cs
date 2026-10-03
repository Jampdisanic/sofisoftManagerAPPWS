using MySqlConnector;
using System.Text.Json;

namespace SOFIManagerWS
{
    /// <summary>
    /// Extrae datos de la base de datos MySQL del Kardex.
    /// Por ahora solo consulta usuarios como prueba inicial.
    /// </summary>
    public class DataExtractor
    {
        private readonly string _connectionString;
        private readonly ILogger _logger;

        public DataExtractor(string connectionString, ILogger logger)
        {
            _connectionString = connectionString;
            _logger = logger;
        }

        /// <summary>
        /// Consulta los usuarios del sistema Kardex.
        /// </summary>
        public async Task<List<Dictionary<string, object>>> GetUsuariosAsync()
        {
            var usuarios = new List<Dictionary<string, object>>();

            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                // AJUSTA ESTA CONSULTA a tu tabla real de usuarios
                // Ejemplo: puede ser "usuarios", "users", "tbl_usuarios", etc.
                string query = @"
                    SELECT *
                    FROM usuarios
                    LIMIT 50";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var usuario = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        usuario[columnName] = value;
                    }

                    usuarios.Add(usuario);
                }

                _logger.LogInformation("Se extrajeron {Count} usuarios de la base de datos.", usuarios.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer usuarios de MySQL.");
            }

            return usuarios;
        }
        
        public async Task<List<Dictionary<string, object>>> GetPermisosAsync()
        {
            var config = new List<Dictionary<string, object>>();

            try {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = "SELECT * FROM permisos";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync()) {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++) {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        item[columnName] = value;
                    }

                    // Si no hay columna ID, le asignamos una por defecto para Firebase
                    if (!item.ContainsKey("ID")) {
                        item["ID"] = "1";
                    }

                    config.Add(item);
                }

                _logger.LogInformation("Se extrajo la configuración de la base de datos.");
            }
            catch (Exception ex) {
                _logger.LogError(ex, "Error al extraer configuración de MySQL.");
            }

            return config;
        }
        
        
        public async Task<List<Dictionary<string, object>>> GetPermirolesAsync()
        {
            var config = new List<Dictionary<string, object>>();

            try {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = "SELECT * FROM permiroles";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync()) {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++) {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        item[columnName] = value;
                    }

                    // Si no hay columna ID, le asignamos una por defecto para Firebase
                    if (!item.ContainsKey("ID")) {
                        item["ID"] = "1";
                    }

                    config.Add(item);
                }

                _logger.LogInformation("Se extrajo la configuración de la base de datos.");
            }
            catch (Exception ex) {
                _logger.LogError(ex, "Error al extraer configuración de MySQL.");
            }

            return config;
        }
        
        
        public async Task<List<Dictionary<string, object>>> GetRolesAsync()
        {
            var config = new List<Dictionary<string, object>>();

            try {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = "SELECT * FROM roles";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync()) {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++) {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        item[columnName] = value;
                    }

                    // Si no hay columna ID, le asignamos una por defecto para Firebase
                    if (!item.ContainsKey("ID")) {
                        item["ID"] = "1";
                    }

                    config.Add(item);
                }

                _logger.LogInformation("Se extrajo la configuración de la base de datos.");
            }
            catch (Exception ex) {
                _logger.LogError(ex, "Error al extraer configuración de MySQL.");
            }

            return config;
        }
        
        public async Task<List<Dictionary<string, object>>> GetConfiguracionAsync()
        {
            var config = new List<Dictionary<string, object>>();

            try {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = "SELECT * FROM configuracion LIMIT 1";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync()) {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++) {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        item[columnName] = value;
                    }

                    // Si no hay columna ID, le asignamos una por defecto para Firebase
                    if (!item.ContainsKey("ID")) {
                        item["ID"] = "1";
                    }

                    config.Add(item);
                }

                _logger.LogInformation("Se extrajo la configuración de la base de datos.");
            }
            catch (Exception ex) {
                _logger.LogError(ex, "Error al extraer configuración de MySQL.");
            }

            return config;
        }

        public async Task<List<Dictionary<string, object>>> GetArticulosAsync()
        {
            var articulos = new List<Dictionary<string, object>>();

            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                // AJUSTA ESTA CONSULTA a tu tabla real de usuarios
                // Ejemplo: puede ser "usuarios", "users", "tbl_usuarios", etc.
                string query = @"
                    SELECT 
                        a.IDART, 
                        a.NOMBRE, 
                        a.CODG, 
                        g.NOMBRE AS NOMBREGRUPO, 
                        a.EXISTENCIA, 
                        a.COSTO, 
                        a.PVENTA1, 
                        a.PVENTA2, 
                        a.PVENTA3, 
                        IFNULL(a.ExistenciaMinima, 0) AS ExistenciaMinima, 
                        IFNULL(a.ExistenciaMaxima, 0) AS ExistenciaMaxima
                    FROM articulo a
                    INNER JOIN grupo g ON a.CODG = g.CODG;";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var articulo = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        articulo[columnName] = value;
                    }

                    articulos.Add(articulo);
                }

                _logger.LogInformation("Se extrajeron {Count} artículos de la base de datos.", articulos.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer artículos de MySQL.");
            }

            return articulos;
        }

        public async Task<List<Dictionary<string, object>>> GetGruposAsync()
        {
            var articulos = new List<Dictionary<string, object>>();

            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                // AJUSTA ESTA CONSULTA a tu tabla real de usuarios
                // Ejemplo: puede ser "usuarios", "users", "tbl_usuarios", etc.
                string query = @"
                    SELECT 
                        CODG, 
                        NOMBRE, 
                        ESTADOG
                    FROM grupo;";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var articulo = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        articulo[columnName] = value;
                    }

                    articulos.Add(articulo);
                }

                _logger.LogInformation("Se extrajeron {Count} artículos de la base de datos.", articulos.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer artículos de MySQL.");
            }

            return articulos;
        }

        public async Task<List<Dictionary<string, object>>> GetClientesAsync()
        {
            var articulos = new List<Dictionary<string, object>>();

            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                // AJUSTA ESTA CONSULTA a tu tabla real de usuarios
                // Ejemplo: puede ser "usuarios", "users", "tbl_usuarios", etc.
                string query = @"
                    SELECT 
                        *
                    FROM clientes;";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var articulo = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        articulo[columnName] = value;
                    }

                    articulos.Add(articulo);
                }

                _logger.LogInformation("Se extrajeron {Count} artículos de la base de datos.", articulos.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer artículos de MySQL.");
            }

            return articulos;
        }

        public async Task<List<Dictionary<string, object>>> GetProveedoresAsync()
        {
            var articulos = new List<Dictionary<string, object>>();

            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                // AJUSTA ESTA CONSULTA a tu tabla real de usuarios
                // Ejemplo: puede ser "usuarios", "users", "tbl_usuarios", etc.
                string query = @"
                    SELECT 
                        *
                    FROM proveedores;";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var articulo = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        articulo[columnName] = value;
                    }

                    articulos.Add(articulo);
                }

                _logger.LogInformation("Se extrajeron {Count} artículos de la base de datos.", articulos.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer artículos de MySQL.");
            }

            return articulos;
        }

        public async Task<List<Dictionary<string, object>>> GetVendedoresAsync()
        {
            var articulos = new List<Dictionary<string, object>>();

            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                // AJUSTA ESTA CONSULTA a tu tabla real de usuarios
                // Ejemplo: puede ser "usuarios", "users", "tbl_usuarios", etc.
                string query = @"
                    SELECT 
                        *
                    FROM vendedores;";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var articulo = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        articulo[columnName] = value;
                    }

                    articulos.Add(articulo);
                }

                _logger.LogInformation("Se extrajeron {Count} artículos de la base de datos.", articulos.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer artículos de MySQL.");
            }

            return articulos;
        }

        public async Task<List<Dictionary<string, object>>> GetVentasPorMesAsync()
        {
            var ventas = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT 
                        YEAR(FECHA) AS Anio, 
                        MONTH(FECHA) AS NumeroMes, 
                        MONTHNAME(FECHA) AS Mes, 
                        SUM(IFNULL(TotalFinal, 0) - IFNULL(Devoluciones, 0)) AS TotalMes
                    FROM vwlistadomasterventas
                    WHERE FECHA BETWEEN '2025-01-01' AND '2055-12-31' AND EstVta <> 'Anulaciones'
                    GROUP BY YEAR(FECHA), MONTH(FECHA), MONTHNAME(FECHA)
                    ORDER BY YEAR(FECHA), MONTH(FECHA)";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var venta = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        venta[columnName] = value;
                    }
                    ventas.Add(venta);
                }
                _logger.LogInformation("Se extrajeron {Count} meses de ventas.", ventas.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer ventas por mes de MySQL.");
            }
            return ventas;
        }

        public async Task<List<Dictionary<string, object>>> GetFacturAnuladoAsync()
        {
            var ventas = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT 
                        *
                    FROM articulolotesvencimiento av
                    INNER JOIN articulo a ON av.idArticulo = a.IDART
                    WHERE av.cantidadArticulo != '0' AND av.estado != '0'; ";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var venta = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        venta[columnName] = value;
                    }
                    ventas.Add(venta);
                }
                _logger.LogInformation("Se extrajeron {Count} meses de ventas.", ventas.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer facturas anuladas de MySQL.");
            }
            return ventas;
        }

        public async Task<List<Dictionary<string, object>>> GetLotesVencimientoAsync()
        {
            var ventas = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT 
                        av.idArticulo,
                        av.numberLoteVencimiento,
                        av.idArticulo,
                        a.NOMBRE,
                        av.fechaRecepcion,
                        av.fechaVencimiento,
                        av.cantidadArticulo,
                        av.noFacturaCompra,
                        av.noFacturaVenta
                    FROM articulolotesvencimiento av
                    INNER JOIN articulo a ON av.idArticulo = a.IDART
                    WHERE cantidadArticulo != '0'; ";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var venta = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        venta[columnName] = value;
                    }
                    ventas.Add(venta);
                }
                _logger.LogInformation("Se extrajeron {Count} meses de ventas.", ventas.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer ventas por mes de MySQL.");
            }
            return ventas;
        }

        public async Task<List<Dictionary<string, object>>> GetSerialesAsync()
        {
            var ventas = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                                SELECT 
                                    ase.idArticuloSerial,
                                    ase.idArticulo,
                                    a.NOMBRE,
                                    ase.serialNumber,
                                    ase.disponible,
                                    ase.noFacturaCompra,
                                    ase.noFacturaVenta
                                FROM articuloseriales ase
                                INNER JOIN articulo a ON ase.idArticulo = a.IDART;";

                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var venta = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        venta[columnName] = value;
                    }
                    ventas.Add(venta);
                }
                _logger.LogInformation("Se extrajeron {Count} meses de ventas.", ventas.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer ventas por mes de MySQL.");
            }
            return ventas;
        }

        public async Task<List<Dictionary<string, object>>> GetFacturasAsync(DateTime desdeFecha, DateTime hastaFecha, int? idUser = null)
        {
            var facturas = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = $@"
                    SELECT 
                        NFACT, FECHACORTA as FECHA, IDUSER, IDCLIENTE, CLIENTE, ESTATUSDOC,
                        TOTALPAGAR as TotalFinal,
                        TotalDevol,
                        SALDO,
                        VENDEDOR
                    FROM vwfacturamaster
                    WHERE FECHACORTA >= @desde AND FECHACORTA <= @hasta" + (idUser.HasValue && idUser.Value > 0 ? " AND IDUSER = @idUser" : "");

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300; // 5 minutos
                command.Parameters.AddWithValue("@desde", desdeFecha.ToString("yyyy-MM-dd"));
                command.Parameters.AddWithValue("@hasta", hastaFecha.ToString("yyyy-MM-dd"));
                
                if (idUser.HasValue && idUser.Value > 0)
                {
                    command.Parameters.AddWithValue("@idUser", idUser.Value);
                }
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var factura = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        factura[columnName] = value;
                    }

                    // Añadir fecha corta para filtros rápidos en Firebase
                    if (factura.ContainsKey("FECHA") && factura["FECHA"] is DateTime dt) {
                        factura["fechaCorta"] = dt.ToString("yyyy-MM-dd");
                    } else if (factura.ContainsKey("FECHA") && !string.IsNullOrEmpty(factura["FECHA"].ToString())) {
                        if (DateTime.TryParse(factura["FECHA"].ToString(), out DateTime dt2)) {
                            factura["fechaCorta"] = dt2.ToString("yyyy-MM-dd");
                        }
                    }

                    facturas.Add(factura);
                }
                _logger.LogInformation("Se extrajeron {Count} facturas nuevas.", facturas.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer facturas de MySQL.");
            }
            return facturas;
        }

        public async Task<List<Dictionary<string, object>>> GetAuditoriaAsync(DateTime desdeFecha)
        {
            var auditorias = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = $@"
                    SELECT 
                        Fecha,
                        Descripcion,
                        Origen,
                        Modulo,
                        UsuarioID
                    FROM vw_auditoriaglobal
                    WHERE Fecha >= @desde";

                using var command = new MySqlCommand(query, connection);
                command.Parameters.AddWithValue("@desde", desdeFecha);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var auditoria = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        auditoria[columnName] = value;
                    }

                    if (auditoria.ContainsKey("Fecha") && auditoria["Fecha"] is DateTime dtA) {
                        auditoria["fechaCorta"] = dtA.ToString("yyyy-MM-dd");
                    }

                    auditorias.Add(auditoria);
                }
                _logger.LogInformation("Se extrajeron {Count} registros de auditoría nuevos.", auditorias.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer auditoría de MySQL.");
            }
            return auditorias;
        }

        public async Task<List<Dictionary<string, object>>> GetAbonosFlujoAsync(DateTime desdeFecha)
        {
            var auditorias = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = $@"
                    SELECT 
                        A.ID,
                        A.IDCLIENTE,
                        C.NOMBRE,
                        U.NOMBRE AS NOMBREUSER,
                        A.MONTOCREDITO,
                        A.MONTOABONO,

                        -- EFECTIVO
                        SUM(CASE WHEN (D.TIPODEDETALLE = 1 AND D.IDMONEDA = 1) THEN D.MONTO ELSE 0 END) AS EFECTIVOLOCAL,
                        SUM(CASE WHEN (D.TIPODEDETALLE = 1 AND D.IDMONEDA = 2) THEN D.MONTO ELSE 0 END) AS EFECTIVOEXTRA,

                        -- TARJETA
                        SUM(CASE WHEN (D.TIPODEDETALLE = 2 AND D.IDMONEDA = 1) THEN D.MONTO ELSE 0 END) AS TARJETALOCAL,
                        MAX(CASE WHEN (D.TIPODEDETALLE = 2 AND D.IDMONEDA = 1) THEN D.REFERENCIA ELSE '' END) AS REFTARJLOCAL,

                        SUM(CASE WHEN (D.TIPODEDETALLE = 2 AND D.IDMONEDA = 2) THEN D.MONTO ELSE 0 END) AS TARJETAEXTRA,
                        MAX(CASE WHEN (D.TIPODEDETALLE = 2 AND D.IDMONEDA = 2) THEN D.REFERENCIA ELSE '' END) AS REFTARJEXTRA,

                        -- TRANSFERENCIA
                        SUM(CASE WHEN (D.TIPODEDETALLE = 3 AND D.IDMONEDA = 1) THEN D.MONTO ELSE 0 END) AS TRANSFLOCAL,
                        MAX(CASE WHEN (D.TIPODEDETALLE = 3 AND D.IDMONEDA = 1) THEN D.REFERENCIA ELSE '' END) AS REFTRANSLOCAL,

                        SUM(CASE WHEN (D.TIPODEDETALLE = 3 AND D.IDMONEDA = 2) THEN D.MONTO ELSE 0 END) AS TRANSFEXTRA,
                        MAX(CASE WHEN (D.TIPODEDETALLE = 3 AND D.IDMONEDA = 2) THEN D.REFERENCIA ELSE '' END) AS REFTRASNEXTRA,

                        A.TOTAL,
                        (CASE WHEN ((F.TOTALFINAL - fnSumAbonos(a.ID, a.NFACT)) = 0) THEN 'Cancelacíon' ELSE 'Abono' END) AS 'CONCEPTO',
                        A.FECHAABONO,
                        A.NFACT,
                        A.USERABONO,
                        A.DOCCREDITO

                    FROM Abonos A 
                    JOIN Clientes C ON A.IDCLIENTE = C.IDCLIENTE
                    JOIN USUARIOS U ON A.USERABONO = U.IDUSER
                    JOIN FACT F ON A.NFACT = F.NFACT
                    LEFT JOIN DETALLEDEPAGO D 
                        ON A.ID = D.IDABONO

                    WHERE A.FECHAABONO >= @desde

                    GROUP BY 
                        A.ID,
                        A.IDCLIENTE,
                        C.NOMBRE,
                        U.NOMBRE,
                        A.MONTOCREDITO,
                        A.MONTOABONO,
                        A.TOTAL,
                        A.FECHAABONO,
                        A.NFACT,
                        A.USERABONO,
                        A.DOCCREDITO

                    ORDER BY A.ID ASC";

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300; // 5 minutos
                command.Parameters.AddWithValue("@desde", desdeFecha);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var abono = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        abono[columnName] = value;
                    }

                    if (abono.ContainsKey("FECHAABONO") && abono["FECHAABONO"] is DateTime dtAb) {
                        abono["fechaCorta"] = dtAb.ToString("yyyy-MM-dd");
                    }

                    auditorias.Add(abono);
                }
                _logger.LogInformation("Se extrajeron {Count} registros de auditoría nuevos.", auditorias.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer auditoría de MySQL.");
            }
            return auditorias;
        }

        public async Task<List<Dictionary<string, object>>> GetRankingVendedoresAsync()
        {
            var rank = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();
                string query = @"
                    SELECT 
                        VENDEDOR, 
                        SUM(TotalFinal) as Total,
                        COUNT(NFACT) as Cantidad
                    FROM vwlistadomasterventas 
                    WHERE EstVta <> 'Anulaciones' 
                      AND YEAR(FECHA) = YEAR(CURDATE()) AND MONTH(FECHA) = MONTH(CURDATE())
                    GROUP BY VENDEDOR 
                    ORDER BY Total DESC 
                    LIMIT 5";
                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? 0 : reader.GetValue(i);
                    }
                    rank.Add(item);
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Error ranking vendedores"); }
            return rank;
        }

        public async Task<List<Dictionary<string, object>>> GetRankingClientesAsync()
        {
            var rank = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();
                string query = @"
                    SELECT 
                        CLIENTE, 
                        SUM(TotalFinal) as Total,
                        COUNT(NFACT) as Cantidad
                    FROM vwlistadomasterventas 
                    WHERE EstVta <> 'Anulaciones' 
                      AND YEAR(FECHA) = YEAR(CURDATE()) AND MONTH(FECHA) = MONTH(CURDATE())
                    GROUP BY CLIENTE 
                    ORDER BY Total DESC 
                    LIMIT 5";
                using var command = new MySqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? 0 : reader.GetValue(i);
                    }
                    rank.Add(item);
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Error ranking clientes"); }
            return rank;
        }

        public async Task<List<Dictionary<string, object>>> GetMasterComprasAsync(DateTime desde)
        {
            var compras = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();
                
                string query = $@"
                    SELECT * FROM (
                        SELECT
                          'FACTURAS DE COMPRA' AS 'TipoFact',
                          CAST(`a`.`FECHA` AS date) AS 'FECHA',
                          `a`.`NumeroDeFactura` AS 'NDocument',
                          `b`.`NOMBRE` AS 'Proveedor',
                          (CASE WHEN (`a`.`TipoDeFactura` = 1) THEN 'CREDITO' ELSE 'CONTADO' END) AS 'TipoDoc',
                          `a`.`SUBTOTAL`,
                          `a`.`DESCUENTO`,
                          `a`.`IVATOTAL`,
                          `a`.`TOTALFINAL`,
                          `a`.`ImpuestoTotal` AS 'TotalRetenciones',
                          (`a`.`TOTALFINAL` - `a`.`ImpuestoTotal`) AS 'TotalAPagar',
                          (CASE WHEN (`a`.`TipoDeFactura` = 1) THEN ((`a`.`TOTALFINAL` - `a`.`ImpuestoTotal`) - IFNULL(`a`.`TotalAbonado`, 0)) ELSE 0 END) AS 'SALDO',
                          (CASE WHEN (`a`.`TipoDeFactura` = 1) THEN IFNULL(`a`.`TotalAbonado`, 0) ELSE (`a`.`TOTALFINAL` - `a`.`ImpuestoTotal`) END) AS 'TotalAbonado',
                          (CASE
                            WHEN ((`a`.`TipoDeFactura` = 0) AND (`a`.`ESTATUDOC` <> 'ANULADO')) THEN 'PAGADO'
                            WHEN ((`a`.`TipoDeFactura` = 1) AND ((`a`.`TOTALFINAL` - `a`.`ImpuestoTotal`) = `a`.`TotalAbonado`)) THEN 'PAGADO'
                            WHEN (`a`.`TotalAbonado` > 0) THEN 'ABONADO'
                            WHEN ((`a`.`TotalAbonado` = 0) OR ISNULL(`a`.`TotalAbonado`)) THEN 'PENDIENTE'
                            ELSE `a`.`ESTATUDOC`
                          END) AS 'ESTATUDOC',
                          `b`.`IDPROV`
                        FROM
                          `factprov` a
                          JOIN `proveedores` b ON `b`.`IDPROV` = `a`.`IDPROV`
                        
                        UNION ALL
                        
                        SELECT
                          'FACTURAS DE GASTO' AS 'TipoFact',
                          CAST(`x`.`FechaDeFactura` AS date) AS 'FECHA',
                          `x`.`NumeroDeFactura` AS 'NDocument',
                          `y`.`NOMBRE` AS 'Proveedor',
                          'CONTADO' AS 'TipoDoc',
                          `x`.`MontoFacturado` AS 'SUBTOTAL',
                          0 AS 'DESCUENTO',
                          0 AS 'IVATOTAL',
                          `x`.`MontoFacturado` AS 'TOTALFINAL',
                          0 AS 'TotalRetenciones',
                          `x`.`MontoFacturado` AS 'TotalAPagar',
                          0 AS 'SALDO',
                          `x`.`MontoFacturado` AS 'TotalAbonado',
                          (CASE WHEN (`x`.`EstadoValor` = 0) THEN 'ANULADO' ELSE 'PAGADO' END) AS 'ESTATUDOC',
                          `y`.`IDPROV`
                        FROM
                          `facturaporgasto` x
                          JOIN `proveedores` y ON `y`.`IDPROV` = `x`.`ProveedorId`
                    ) AS T
                    WHERE FECHA >= @desde
                    ORDER BY FECHA DESC";

                using var command = new MySqlCommand(query, connection);
                command.Parameters.AddWithValue("@desde", desde);
                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    compras.Add(item);
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Error GetMasterComprasAsync"); }
            return compras;
        }

        public async Task<List<Dictionary<string, object>>> GetArticulosVendidosAsync(DateTime desde, DateTime hasta)
        {
            var data = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT
                      `f`.`NFACT`,
                      `f`.`NFACT` AS 'FACTURA',
                      CAST(CONCAT(`f`.`FECHA`, ' ', CURTIME()) AS datetime) AS 'FECHA',
                      `u`.`VENDEDOR`,
                      `f`.`CLIENTETEMP` AS 'CLIENTE',
                      `df`.`IDAR`,
                      CONCAT(IFNULL(`df`.`NombreArticulo`, `a`.`NOMBRE`), (CASE WHEN ((`df`.`IMPUESTOTOTAL` = 0) AND (`cf`.`HabilitarCalculoIVA` = 1)) THEN ' (E)' ELSE '' END)) AS 'ARTICULO',
                      `df`.`CANTDART`,
                      `df`.`PRECIOFIN`,
                      `f`.`DESCUENTO` AS 'DESCUENTOTOTAL',
                      `df`.`MONTOTOTAL`,
                      `f`.`SUBTOTAL` AS 'NETO',
                      `f`.`MONTOIVA` AS 'IVA',
                      `f`.`TOTALFINAL` AS 'TOTALPAGAR',
                      `f`.`MONTORECIBIDO`,
                      `f`.`VUELTO`,
                      `f`.`SALDO`,
                      `c`.`DIRECCION`,
                      `c`.`TELEFONO`,
                      `c`.`IDENTIFICACION`,
                      (CASE WHEN (`f`.`EsCredito` = 1) THEN 'CREDITO' WHEN (`f`.`ESTATUSDOC` = 1) THEN 'CONTADO' ELSE 'CREDITO' END) AS 'TIPODOC',
                      `f`.`ESTATUSDOC`,
                      `estadofact`(RTRIM(`f`.`ESTATUSDOC`)) AS 'EstusDoc',
                      ROUND((`df`.`PRECIOFIN` / `df`.`CANTDART`), 2) AS 'PRECIOUNITARIO',
                      `df`.`DESCUENTOTOTAL` AS 'DESCUENTODETALLE',
                      `f`.`NotaCliente`,
                      `a`.`CODG`,
                      `g`.`NOMBRE` AS 'GRUPO',
                      `df`.`ID` AS 'IDDETALLE',
                      `c`.`IDCLIENTE`,
                      '' AS 'EstadoDevolucion',
                      (ROUND((`df`.`PRECIOFIN` * `df`.`CANTDART`), 2) - `df`.`COSTOTOTAL`) AS 'GananciaBrutaDetalle',
                      '' AS 'EstVta',
                      `df`.`IMPUESTOTOTAL` AS 'DetalleIVA',
                      ROUND((`df`.`PRECIOFIN` * `df`.`CANTDART`), 2) AS 'DetallePrecionTotal',
                      0 AS 'CantidadTotal',
                      '' AS 'IDAbono',
                      '' AS 'MINFECHAABONO'
                    FROM
                      `articulo` a
                      JOIN `vw_detallefact_todos` df ON `a`.`IDART` = `df`.`IDAR`
                      JOIN `grupo` g ON `a`.`CODG` = `g`.`CODG`
                      JOIN `fact` f ON `df`.`NFAC` = `f`.`NFACT`
                      JOIN `clientes` c ON `c`.`IDCLIENTE` = `f`.`IDCLIEN`
                      JOIN `usuarios` u ON `f`.`IDUSER` = `u`.`IDUSER`
                      CROSS JOIN `configuracion` cf
                    WHERE f.FECHA >= @desde AND f.FECHA <= @hasta";

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300;
                command.Parameters.AddWithValue("@desde", desde.ToString("yyyy-MM-dd 00:00:00"));
                command.Parameters.AddWithValue("@hasta", hasta.ToString("yyyy-MM-dd 23:59:59"));

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    data.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error GetArticulosVendidosAsync");
            }
            return data;
        }

        public async Task<List<Dictionary<string, object>>> GetArticulosCompradosAsync(DateTime desde, DateTime hasta)
        {
            var data = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT
                      CAST(`b`.`FECHA` AS date) AS 'FECHA',
                      `b`.`NumeroDeFactura` AS 'NDocument',
                      `e`.`NOMBRE` AS 'Proveedor',
                      `a`.`IDART`,
                      `c`.`NOMBRE`,
                      (`a`.`PRECIOFIN` / `a`.`CANTDART`) AS 'COSTO',
                      `a`.`CANTDART`,
                      `a`.`PRECIOFIN` AS 'CostoTotal',
                      `e`.`TipoDeProveedorId`,
                      `c`.`CODG` AS 'IdGrupo',
                      `f`.`NOMBRE` AS 'NombreGrupo',
                      `b`.`ESTATUDOC`,
                      `e`.`IDPROV`
                    FROM
                      ((((`detalleprov` a
                        JOIN `factprov` b ON (((`b`.`FACTPRO` = `a`.`FACTPR`) AND (`b`.`IDPROV` = `a`.`IDPROV`))))
                        JOIN `articulo` c ON ((`c`.`IDART` = `a`.`IDART`)))
                        JOIN `proveedores` e ON ((`e`.`IDPROV` = `a`.`IDPROV`)))
                        JOIN `grupo` f ON ((`f`.`CODG` = `c`.`CODG`)))
                    WHERE b.FECHA >= @desde AND b.FECHA <= @hasta";

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300;
                command.Parameters.AddWithValue("@desde", desde.ToString("yyyy-MM-dd 00:00:00"));
                command.Parameters.AddWithValue("@hasta", hasta.ToString("yyyy-MM-dd 23:59:59"));

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    data.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error GetArticulosCompradosAsync");
            }
            return data;
        }

        public async Task<List<Dictionary<string, object>>> GetMasterGastosAsync(DateTime desde, DateTime hasta)
        {
            var data = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT
                      `g`.`Id`,
                      `g`.`NumeroDeFactura`,
                      `g`.`ProveedorId`,
                      IFNULL(`p`.`NOMBRE`, 'Sin Proveedor') AS 'Proveedor',
                      `g`.`FechaDeFactura`,
                      `g`.`MontoFacturado`,
                      `g`.`Concepto`,
                      `g`.`FechaDeCreacion`,
                      `g`.`EstadoValor`,
                      `g`.`Nota`,
                      `g`.`EgresoCaja`,
                      `g`.`EgreoImportado`,
                      `g`.`IDUSER`,
                      IFNULL(`u`.`VENDEDOR`, 'Sistema') AS 'Usuario'
                    FROM
                      `facturaporgasto` g
                      LEFT JOIN `proveedores` p ON `g`.`ProveedorId` = `p`.`IDPROV`
                      LEFT JOIN `usuarios` u ON `g`.`IDUSER` = `u`.`IDUSER`
                    WHERE g.FechaDeFactura >= @desde AND g.FechaDeFactura <= @hasta
                    ORDER BY g.FechaDeFactura DESC, g.Id DESC";

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300;
                command.Parameters.AddWithValue("@desde", desde.ToString("yyyy-MM-dd 00:00:00"));
                command.Parameters.AddWithValue("@hasta", hasta.ToString("yyyy-MM-dd 23:59:59"));

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    data.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error GetMasterGastosAsync");
            }
            return data;
        }

        public async Task<List<Dictionary<string, object>>> GetKardexAsync(DateTime desde, DateTime hasta, string codigoBarras)
        {
            var data = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT
                      `k`.`IDKARDEX`,
                      `k`.`IDART`,
                      `a`.`NOMBRE` AS 'NOMBRE_ARTICULO',
                      `k`.`FECHA`,
                      `k`.`CONCEPTO`,
                      `k`.`DOCUMENTO`,
                      `k`.`TIPO_MOVIMIENTO`,
                      `k`.`ENTRADA`,
                      `k`.`SALIDA`,
                      `k`.`EXISTENCIA`,
                      `k`.`COSTO_UNITARIO`,
                      `k`.`COSTO_TOTAL`,
                      `k`.`COSTO_PROMEDIO`
                    FROM
                      (`kardex` k
                        JOIN `articulo` a ON ((`k`.`IDART` = `a`.`IDART`)))
                    WHERE k.FECHA >= @desde AND k.FECHA <= @hasta
                      AND (@codigoBarras = '' OR a.IDART = @codigoBarras OR a.CODG = @codigoBarras)
                    ORDER BY `k`.`FECHA` ASC";

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300;
                command.Parameters.AddWithValue("@desde", desde.ToString("yyyy-MM-dd 00:00:00"));
                command.Parameters.AddWithValue("@hasta", hasta.ToString("yyyy-MM-dd 23:59:59"));
                command.Parameters.AddWithValue("@codigoBarras", codigoBarras ?? "");

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    data.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error GetKardexAsync");
            }
            return data;
        }

        public async Task<List<Dictionary<string, object>>> GetFacturasPendientesClienteAsync(string idClien)
        {
            var data = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT
                      `f`.`IDCLIEN`,
                      `f`.`CLIENTETEMP`,
                      `f`.`NFACT`,
                      `f`.`FECHA`,
                      `f`.`FVENCE`,
                      TIMESTAMPDIFF(DAY, `f`.`FVENCE`, CURDATE()) AS 'Dias',
                      `fnTipoMora`(`f`.`FVENCE`) AS 'Clasificacion',
                      `f`.`SALDO`
                    FROM
                      `fact` f
                    WHERE
                      (CAST(`f`.`SALDO` AS decimal(10,2)) > 0)
                      AND f.IDCLIEN = @idClien
                    ORDER BY f.FECHA ASC";

                using var command = new MySqlCommand(query, connection);
                command.Parameters.AddWithValue("@idClien", idClien);

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    data.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error GetFacturasPendientesClienteAsync");
            }
            return data;
        }

        public async Task<List<Dictionary<string, object>>> GetCierreCajaAsync(DateTime desde, DateTime hasta, int usuarioId)
        {
            var cierre = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                // Respetar la hora enviada desde el frontend
                string desdeStr = desde.ToString("yyyy-MM-dd HH:mm:ss");
                string hastaStr = hasta.ToString("yyyy-MM-dd HH:mm:ss");

                using var command = new MySqlCommand("paCierreCaja", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;
                command.Parameters.AddWithValue("fecha_desde", desdeStr);
                command.Parameters.AddWithValue("fecha_hasta", hastaStr);
                command.Parameters.AddWithValue("usuario", usuarioId);

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    cierre.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al ejecutar paCierreCaja en MySQL.");
            }
            return cierre;
        }

        public async Task<Dictionary<string, object>> GetCierreCajaConsolidadoAsync(DateTime desde, DateTime hasta, int usuarioId)
        {
            var consolidado = new Dictionary<string, object>();
            
            // 1. Obtener Cierre de Caja (Ingresos netos)
            var cierre = await GetCierreCajaAsync(desde, hasta, usuarioId);
            consolidado["cierre"] = cierre;

            // 2. Obtener Ventas Globales Brutas
            var ventas = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string desdeStr = desde.ToString("yyyy-MM-dd HH:mm:ss");
                string hastaStr = hasta.ToString("yyyy-MM-dd HH:mm:ss");

                using var command = new MySqlCommand("paCierreCajaVentas", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;
                command.Parameters.AddWithValue("fecha_desde", desdeStr);
                command.Parameters.AddWithValue("fecha_hasta", hastaStr);
                command.Parameters.AddWithValue("usuario", usuarioId);

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        item[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                    }
                    ventas.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al ejecutar paCierreCajaVentas en MySQL.");
            }
            
            consolidado["ventas"] = ventas;
            return consolidado;
        }

        public async Task<List<Dictionary<string, object>>> GetResumenVentasCobrosAsync(DateTime desde, DateTime hasta)
        {
            var data = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT 
                        T.Fecha,
                        SUM(T.Contado) AS Contado,
                        SUM(T.Credito) AS Credito,
                        SUM(T.VentaBruta) AS VentaBruta,
                        SUM(T.IVA) AS IVA,
                        SUM(T.DevolAnul) AS DevolAnul,
                        (SUM(T.VentaBruta) - SUM(T.DevolAnul)) AS VentaNeta,
                        SUM(T.Costos) AS Costos,
                        SUM(T.Cobranzas) AS Cobranzas,
                        (SUM(T.Contado) + SUM(T.Cobranzas)) AS TotalRecibido
                    FROM (
                        -- Ventas activas: LEFT JOIN pre-agregado evita subquery correlacionada por factura
                        SELECT 
                            f.FECHACORTA AS Fecha,
                            SUM(CASE WHEN (f.EsCredito = 0 OR f.EsCredito IS NULL) THEN f.TOTALFINAL ELSE 0.00 END) AS Contado,
                            SUM(CASE WHEN f.EsCredito = 1 THEN f.TOTALFINAL ELSE 0.00 END) AS Credito,
                            SUM(f.TOTALFINAL) AS VentaBruta,
                            SUM(f.MONTOIVA) AS IVA,
                            0.00 AS DevolAnul,
                            SUM(IFNULL(costos.TotalCosto, 0.00)) AS Costos,
                            0.00 AS Cobranzas
                        FROM fact f
                        LEFT JOIN (
                            SELECT df.NFAC, SUM(df.COSTOTOTAL) AS TotalCosto
                            FROM vw_detallefact_todos df
                            INNER JOIN fact f2 ON df.NFAC = f2.NFACT
                            WHERE f2.FECHACORTA >= @desde AND f2.FECHACORTA <= @hasta
                              AND f2.ESTATUSDOC <> '3'
                            GROUP BY df.NFAC
                        ) costos ON costos.NFAC = f.NFACT
                        WHERE f.ESTATUSDOC <> '3' AND f.FECHACORTA >= @desde AND f.FECHACORTA <= @hasta
                        GROUP BY f.FECHACORTA

                        UNION ALL

                        -- Facturas Anuladas
                        SELECT 
                            f.FECHACORTA AS Fecha,
                            0.00 AS Contado,
                            0.00 AS Credito,
                            0.00 AS VentaBruta,
                            0.00 AS IVA,
                            SUM(f.TOTALFINAL) AS DevolAnul,
                            0.00 AS Costos,
                            0.00 AS Cobranzas
                        FROM fact f
                        WHERE f.ESTATUSDOC = '3' AND f.FECHACORTA >= @desde AND f.FECHACORTA <= @hasta
                        GROUP BY f.FECHACORTA

                        UNION ALL

                        -- Cobranzas (Abonos)
                        SELECT 
                            CAST(a.FECHAABONO AS DATE) AS Fecha,
                            0.00 AS Contado,
                            0.00 AS Credito,
                            0.00 AS VentaBruta,
                            0.00 AS IVA,
                            0.00 AS DevolAnul,
                            0.00 AS Costos,
                            SUM(a.TOTAL) AS Cobranzas
                        FROM Abonos a
                        WHERE a.FECHAABONO >= @desde AND a.FECHAABONO <= @hasta AND a.DOCCREDITO = '1'
                        GROUP BY CAST(a.FECHAABONO AS DATE)
                    ) AS T
                    GROUP BY T.Fecha
                    ORDER BY T.Fecha ASC;";

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300;
                command.Parameters.AddWithValue("@desde", desde.ToString("yyyy-MM-dd 00:00:00"));
                command.Parameters.AddWithValue("@hasta", hasta.ToString("yyyy-MM-dd 23:59:59"));

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var item = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string name = reader.GetName(i);
                        object val = reader.IsDBNull(i) ? 0 : reader.GetValue(i);
                        if (val is DateTime dt)
                        {
                            item[name] = dt.ToString("yyyy-MM-dd");
                        }
                        else
                        {
                            item[name] = val;
                        }
                    }
                    data.Add(item);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer Resumen de Ventas y Cobros de MySQL.");
            }
            return data;
        }

        public async Task<List<Dictionary<string, object>>> GetNotificacionesAsync(DateTime desdeFecha)
        {
            var notificaciones = new List<Dictionary<string, object>>();
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                string query = @"
                    SELECT 
                        CAST(CONCAT('STOCK_', a.IDART) AS CHAR) AS ID,
                        'Stock Bajo' AS Tipo,
                        CAST(CONCAT('El artículo ', a.NOMBRE, ' tiene stock de ', a.EXISTENCIA, ' (Mín: ', IFNULL(a.ExistenciaMinima, 0), ')') AS CHAR) AS Mensaje,
                        NOW() AS Fecha
                    FROM articulo a
                    WHERE a.EXISTENCIA <= a.ExistenciaMinima AND a.ExistenciaMinima > 0

                    UNION ALL

                    SELECT 
                        CAST(CONCAT('VENTA_', f.NFACT) AS CHAR) AS ID,
                        'Venta' AS Tipo,
                        CAST(CONCAT('Se registró una venta por $', f.TOTALFINAL, ' en la factura ', f.NFACT) AS CHAR) AS Mensaje,
                        f.FECHA AS Fecha
                    FROM fact f
                    WHERE f.FECHA >= @desde AND f.ESTATUSDOC <> '3'

                    UNION ALL

                    SELECT 
                        CAST(CONCAT('ANULADA_', f.NFACT) AS CHAR) AS ID,
                        CAST((CASE WHEN (f.EsCredito = 1) THEN 'Anulación de Crédito' ELSE 'Anulación' END) AS CHAR) AS Tipo,
                        CAST(CONCAT('La factura ', (CASE WHEN (f.EsCredito = 1) THEN 'de CRÉDITO ' ELSE '' END), f.NFACT, ' del cliente ', c.NOMBRE, ' por $', f.TOTALFINAL, ' fue anulada.') AS CHAR) AS Mensaje,
                        f.FECHA AS Fecha
                    FROM fact f
                    JOIN clientes c ON f.IDCLIEN = c.IDCLIENTE
                    WHERE f.FECHA >= @desde AND f.ESTATUSDOC = '3'

                    UNION ALL

                    SELECT 
                        CAST(CONCAT('ABONO_', a.ID) AS CHAR) AS ID,
                        CAST((CASE WHEN ((f.TOTALFINAL - fnSumAbonos(a.ID, a.NFACT)) = 0) THEN 'Pago Recibido' ELSE 'Abono Recibido' END) AS CHAR) AS Tipo,
                        CAST(CONCAT('El cliente ', c.NOMBRE, ' realizó un ', (CASE WHEN ((f.TOTALFINAL - fnSumAbonos(a.ID, a.NFACT)) = 0) THEN 'pago total' ELSE 'abono' END), ' de C$ ', a.TOTAL, ' para la factura ', a.NFACT) AS CHAR) AS Mensaje,
                        a.FECHAABONO AS Fecha
                    FROM Abonos a
                    JOIN Clientes c ON a.IDCLIENTE = c.IDCLIENTE
                    JOIN fact f ON a.NFACT = f.NFACT
                    WHERE a.FECHAABONO >= @desde

                    UNION ALL

                    SELECT 
                        CAST(CONCAT('MORA_', f.NFACT) AS CHAR) AS ID,
                        'Mora/Vencimiento' AS Tipo,
                        CAST(CONCAT('La factura ', f.NFACT, ' del cliente ', c.NOMBRE, ' está vencida por C$ ', f.SALDO, ' (Mora de ', TIMESTAMPDIFF(DAY, f.FVENCE, CURDATE()), ' días, Clasif: ', fnTipoMora(f.FVENCE), ')') AS CHAR) AS Mensaje,
                        f.FECHA AS Fecha
                    FROM fact f
                    JOIN clientes c ON f.IDCLIEN = c.IDCLIENTE
                    WHERE f.FECHA >= @desde AND CAST(f.SALDO AS decimal(10,2)) > 0 AND f.FVENCE < CURDATE()
                ";

                using var command = new MySqlCommand(query, connection);
                command.CommandTimeout = 300;
                command.Parameters.AddWithValue("@desde", desdeFecha);
                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var notificacion = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        object value = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                        if (value is byte[] bytes)
                        {
                            value = System.Text.Encoding.Latin1.GetString(bytes);
                        }
                        notificacion[columnName] = value;
                    }
                    
                    if (notificacion.ContainsKey("Fecha") && notificacion["Fecha"] is DateTime dt) {
                        notificacion["fechaCorta"] = dt.ToString("yyyy-MM-dd");
                        notificacion["timestamp"] = new DateTimeOffset(dt).ToUnixTimeMilliseconds();
                    }

                    notificaciones.Add(notificacion);
                }
                _logger.LogInformation("Se extrajeron {Count} notificaciones nuevas.", notificaciones.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al extraer notificaciones de MySQL.");
            }
            return notificaciones;
        }

        /// <summary>
        /// Genera el JSON completo con metadata y datos.
        /// </summary>
        public string BuildSyncJson(List<Dictionary<string, object>> usuarios, List<Dictionary<string, object>> articulos,
                                    List<Dictionary<string, object>> VentasMes, List<Dictionary<string, object>> Configuracion,
                                    List<Dictionary<string, object>> facturas, List<Dictionary<string, object>> auditorias,
                                    List<Dictionary<string, object>> abonosflujos, List<Dictionary<string, object>> grupos,
                                    List<Dictionary<string, object>> clientes, List<Dictionary<string, object>> proveedores,
                                    List<Dictionary<string, object>> lotes, List<Dictionary<string, object>> seriales,
                                    List<Dictionary<string, object>> vendedores)
        {
            var syncData = new
            {
                lastSync = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                usuarios = usuarios,
                articulos = articulos,
                ventasmes = VentasMes,
                configuracion = Configuracion,
                facturas = facturas,
                auditorias = auditorias,
                abonosflujos = abonosflujos,
                grupos = grupos,
                clientes = clientes,
                proveedores= proveedores,
                lotes = lotes,
                seriales = seriales,
                vendedores = vendedores
            };

            return JsonSerializer.Serialize(syncData, new JsonSerializerOptions
            {
                WriteIndented = false,
                PropertyNamingPolicy = null
            });
        }
        public async Task<(bool Success, string Message, int NFact)> GuardarProformaAsync(string xmlDoc, int cnt)
        {
            try
            {
                using var connection = new MySqlConnection(_connectionString);
                await connection.OpenAsync();

                using var command = new MySqlCommand("paGuardarProforma", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                // Parámetros de salida
                var pMessage = new MySqlParameter("_message", MySqlDbType.LongText) { Direction = System.Data.ParameterDirection.Output };
                var pNFact = new MySqlParameter("_NFACT", MySqlDbType.Int32) { Direction = System.Data.ParameterDirection.Output };
                
                // Parámetros de entrada
                var pXml = new MySqlParameter("_XmlDoc", MySqlDbType.LongText) { Value = xmlDoc };
                var pCnt = new MySqlParameter("_Cnt", MySqlDbType.Int32) { Value = cnt };

                command.Parameters.Add(pMessage);
                command.Parameters.Add(pNFact);
                command.Parameters.Add(pXml);
                command.Parameters.Add(pCnt);

                await command.ExecuteNonQueryAsync();

                string outMessage = pMessage.Value?.ToString();
                int outNFact = pNFact.Value != DBNull.Value ? Convert.ToInt32(pNFact.Value) : 0;

                return (outMessage == "success", outMessage, outNFact);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al guardar proforma en MySQL.");
                return (false, ex.Message, 0);
            }
        }
    }
}
