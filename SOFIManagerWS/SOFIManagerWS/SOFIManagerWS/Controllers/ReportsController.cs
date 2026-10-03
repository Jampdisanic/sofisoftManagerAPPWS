using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOFIManagerWS.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly DataExtractor _extractor;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(DataExtractor extractor, ILogger<ReportsController> logger)
        {
            _extractor = extractor;
            _logger = logger;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            return Ok(new { 
                status = "Online", 
                serverTime = DateTime.Now,
                message = "SOFIManager Hybrid API is ready for direct queries."
            });
        }

        [HttpGet("articulos")]
        public async Task<IActionResult> GetArticulos()
        {
            try
            {
                var data = await _extractor.GetArticulosAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API articulos");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("facturas")]
        public async Task<IActionResult> GetFacturas([FromQuery] string desde, [FromQuery] string hasta, [FromQuery] int? iduser = null)
        {
            try
            {
                DateTime from = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                DateTime to = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                var data = await _extractor.GetFacturasAsync(from, to, iduser);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API facturas");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("clientes")]
        public async Task<IActionResult> GetClientes()
        {
            var data = await _extractor.GetClientesAsync();
            return Ok(data);
        }

        [HttpGet("vendedores")]
        public async Task<IActionResult> GetVendedores()
        {
            var data = await _extractor.GetVendedoresAsync();
            return Ok(data);
        }

        [HttpGet("usuarios")]
        public async Task<IActionResult> GetUsuarios()
        {
            try
            {
                var data = await _extractor.GetUsuariosAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API usuarios");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("grupos")]
        public async Task<IActionResult> GetGrupos()
        {
            var data = await _extractor.GetGruposAsync();
            return Ok(data);
        }

        [HttpGet("abonos")]
        public async Task<IActionResult> GetAbonos([FromQuery] string desde)
        {
            try
            {
                DateTime fecha = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                var data = await _extractor.GetAbonosFlujoAsync(fecha);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API abonos");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("configuracion")]
        public async Task<IActionResult> GetConfiguracion()
        {
            try
            {
                var data = await _extractor.GetConfiguracionAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API configuracion");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("permisos")]
        public async Task<IActionResult> GetPermisos()
        {
            try
            {
                var data = await _extractor.GetPermisosAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API permisos");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("permiroles")]
        public async Task<IActionResult> GetPermiroles()
        {
            try
            {
                var data = await _extractor.GetPermirolesAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API permiroles");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            try
            {
                var data = await _extractor.GetRolesAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API roles");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("proveedores")]
        public async Task<IActionResult> GetProveedores()
        {
            try
            {
                var data = await _extractor.GetProveedoresAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API proveedores");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("auditoria")]
        public async Task<IActionResult> GetAuditoria([FromQuery] string desde)
        {
            try
            {
                DateTime fecha = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                var data = await _extractor.GetAuditoriaAsync(fecha);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API auditoria");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("ventasmes")]
        public async Task<IActionResult> GetVentasMes()
        {
            try
            {
                var data = await _extractor.GetVentasPorMesAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API ventasmes");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("ranking-vendedores")]
        public async Task<IActionResult> GetRankingVendedores()
        {
            var data = await _extractor.GetRankingVendedoresAsync();
            return Ok(data);
        }

        [HttpGet("ranking-clientes")]
        public async Task<IActionResult> GetRankingClientes()
        {
            var data = await _extractor.GetRankingClientesAsync();
            return Ok(data);
        }
        [HttpGet("master-compras")]
        public async Task<IActionResult> GetMasterCompras([FromQuery] string desde)
        {
            try
            {
                DateTime fecha = string.IsNullOrEmpty(desde) ? DateTime.Today.AddDays(-30) : DateTime.Parse(desde);
                var data = await _extractor.GetMasterComprasAsync(fecha);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API master-compras");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("notificaciones")]
        public async Task<IActionResult> GetNotificaciones([FromQuery] string desde)
        {
            try
            {
                DateTime fecha = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                var data = await _extractor.GetNotificacionesAsync(fecha);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API notificaciones");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("cierre-caja")]
        public async Task<IActionResult> GetCierreCaja([FromQuery] string desde, [FromQuery] string hasta, [FromQuery] string usuario)
        {
            try
            {
                DateTime fechaDesde = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                DateTime fechaHasta = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                int usuarioId = string.IsNullOrEmpty(usuario) ? 0 : int.Parse(usuario);

                var data = await _extractor.GetCierreCajaAsync(fechaDesde, fechaHasta, usuarioId);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API cierre-caja");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("cierre-caja-consolidado")]
        public async Task<IActionResult> GetCierreCajaConsolidado([FromQuery] string desde, [FromQuery] string hasta, [FromQuery] string usuario)
        {
            try
            {
                DateTime fechaDesde = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                DateTime fechaHasta = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                int usuarioId = string.IsNullOrEmpty(usuario) ? 0 : int.Parse(usuario);

                var data = await _extractor.GetCierreCajaConsolidadoAsync(fechaDesde, fechaHasta, usuarioId);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API cierre-caja-consolidado");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("articulos-vendidos")]
        public async Task<IActionResult> GetArticulosVendidos([FromQuery] string desde, [FromQuery] string hasta)
        {
            try
            {
                DateTime fechaDesde = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                DateTime fechaHasta = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                var data = await _extractor.GetArticulosVendidosAsync(fechaDesde, fechaHasta);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API articulos-vendidos");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("articulos-comprados")]
        public async Task<IActionResult> GetArticulosComprados([FromQuery] string desde, [FromQuery] string hasta)
        {
            try
            {
                DateTime fechaDesde = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                DateTime fechaHasta = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                var data = await _extractor.GetArticulosCompradosAsync(fechaDesde, fechaHasta);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API articulos-comprados");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("kardex")]
        public async Task<IActionResult> GetKardex([FromQuery] string desde, [FromQuery] string hasta, [FromQuery] string codigoBarras = "")
        {
            try
            {
                DateTime fechaDesde = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                DateTime fechaHasta = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                var data = await _extractor.GetKardexAsync(fechaDesde, fechaHasta, codigoBarras);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API kardex");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("facturas-pendientes")]
        public async Task<IActionResult> GetFacturasPendientesCliente([FromQuery] string idClien)
        {
            try
            {
                if (string.IsNullOrEmpty(idClien)) return BadRequest("Falta idClien");
                var data = await _extractor.GetFacturasPendientesClienteAsync(idClien);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API facturas-pendientes");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("master-gastos")]
        public async Task<IActionResult> GetMasterGastos([FromQuery] string desde, [FromQuery] string hasta)
        {
            try
            {
                DateTime fechaDesde = string.IsNullOrEmpty(desde) ? DateTime.Today.AddDays(-30) : DateTime.Parse(desde);
                DateTime fechaHasta = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                var data = await _extractor.GetMasterGastosAsync(fechaDesde, fechaHasta);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API master-gastos");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("resumen-ventas")]
        public async Task<IActionResult> GetResumenVentas([FromQuery] string desde, [FromQuery] string hasta)
        {
            try
            {
                DateTime fechaDesde = string.IsNullOrEmpty(desde) ? DateTime.Today : DateTime.Parse(desde);
                DateTime fechaHasta = string.IsNullOrEmpty(hasta) ? DateTime.Today : DateTime.Parse(hasta);
                var data = await _extractor.GetResumenVentasCobrosAsync(fechaDesde, fechaHasta);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en API resumen-ventas");
                return StatusCode(500, ex.Message);
            }
        }
    }
}
