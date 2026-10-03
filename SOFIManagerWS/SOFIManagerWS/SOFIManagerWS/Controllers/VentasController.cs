using Microsoft.AspNetCore.Mvc;
using System.Xml.Linq;
using System.Collections.Generic;

namespace SOFIManagerWS.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VentasController : ControllerBase
    {
        private readonly DataExtractor _dataExtractor;

        public VentasController(DataExtractor dataExtractor)
        {
            _dataExtractor = dataExtractor;
        }

        [HttpPost("proforma")]
        public async Task<IActionResult> GuardarProforma([FromBody] ProformaDto dto)
        {
            try
            {
                // Configurar valores por defecto según la regla de negocio
                int idMoneda = 1; // 1 = Córdobas
                string fecha = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

                // Construir el XML esperado por paGuardarProforma
                XElement root = new XElement("Factura");

                // Nodo cabecera
                XElement facturaNode = new XElement("Factura",
                    new XAttribute("IDCLIEN", dto.IdCliente),
                    new XAttribute("VendedorId", dto.IdVendedor),
                    new XAttribute("CLIENTETEMP", dto.ClienteTemp ?? ""),
                    new XAttribute("FECHA", fecha),
                    new XAttribute("IDUSER", dto.IdUser),
                    new XAttribute("ESTATUSDOC", dto.EstatusDoc),
                    new XAttribute("SUBTOTAL", dto.Subtotal.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("DESCUENTO", dto.Descuento.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("TOTALFINAL", dto.TotalFinal.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("MONTORECIBIDO", dto.MontoRecibido.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("SALDO", dto.Saldo.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("VUELTO", dto.Vuelto.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("IDMONEDA", idMoneda),
                    new XAttribute("montoiva", dto.MontoIva.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("MONTOPAGADO", dto.MontoPagado.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                    new XAttribute("NOTADEPROFORMA", dto.NotaDeProforma ?? "")
                );
                root.Add(facturaNode);

                // Nodos detalle
                if (dto.Detalles != null)
                {
                    foreach (var det in dto.Detalles)
                    {
                        XElement detalleNode = new XElement("DetalleFact",
                            new XAttribute("codigo", det.Codigo ?? ""),
                            new XAttribute("cant", det.Cantidad.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                            new XAttribute("total", det.Total.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                            new XAttribute("desc", det.Descuento.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                            new XAttribute("precio", det.Precio.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                            new XAttribute("impto", det.Impto.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)),
                            new XAttribute("nombre", det.Nombre ?? ""),
                            new XAttribute("oculto", det.Oculto),
                            new XAttribute("detid", det.DetId ?? ""),
                            new XAttribute("sumat", det.Sumat),
                            new XAttribute("extid", det.ExtId ?? "")
                        );
                        root.Add(detalleNode);
                    }
                }

                string xmlDoc = root.ToString(SaveOptions.DisableFormatting);

                // Llamar a la base de datos
                var result = await _dataExtractor.GuardarProformaAsync(xmlDoc, dto.Detalles?.Count ?? 0);

                if (result.Success)
                {
                    return Ok(new { success = true, nfact = result.NFact, message = result.Message });
                }
                else
                {
                    return BadRequest(new { success = false, message = result.Message });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class ProformaDto
    {
        public int IdCliente { get; set; }
        public int IdVendedor { get; set; }
        public string ClienteTemp { get; set; }
        public int IdUser { get; set; }
        public int EstatusDoc { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Descuento { get; set; }
        public decimal TotalFinal { get; set; }
        public decimal MontoRecibido { get; set; }
        public decimal Saldo { get; set; }
        public decimal Vuelto { get; set; }
        public decimal MontoIva { get; set; }
        public decimal MontoPagado { get; set; }
        public string NotaDeProforma { get; set; }
        public List<ProformaDetalleDto> Detalles { get; set; }
    }

    public class ProformaDetalleDto
    {
        public string Codigo { get; set; }
        public decimal Cantidad { get; set; }
        public decimal Total { get; set; }
        public decimal Descuento { get; set; }
        public decimal Precio { get; set; }
        public decimal Impto { get; set; }
        public string Nombre { get; set; }
        public int Oculto { get; set; }
        public string DetId { get; set; }
        public int Sumat { get; set; }
        public string ExtId { get; set; }
    }
}
