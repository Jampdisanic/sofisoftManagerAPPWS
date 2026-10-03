using SOFIManagerWS;
using Microsoft.OpenApi.Models;
using System.IO;

var logDir = @"C:\Disanic";
if (!Directory.Exists(logDir))
{
    Directory.CreateDirectory(logDir);
}
var logPath = Path.Combine(logDir, "api_service_log.txt");

File.WriteAllText(logPath, $"Iniciando aplicación: {DateTime.Now}\r\n");

// Aseguramos el directorio de trabajo correcto
var exePath = AppContext.BaseDirectory;
Directory.SetCurrentDirectory(exePath);

try
{
    File.AppendAllText(logPath, $"Directorio base establecido: {exePath}\r\n");

    var builder = WebApplication.CreateBuilder(new WebApplicationOptions
    {
        Args = args,
        ContentRootPath = exePath
    });

    File.AppendAllText(logPath, "Configurando UseWindowsService y URLs...\r\n");
    // Soporte para ejecutarse como Servicio de Windows
    builder.Host.UseWindowsService();
    
    // Forzamos a la API a escuchar en todas las IPs en el puerto 5246
    builder.WebHost.UseUrls("http://0.0.0.0:5246");

    File.AppendAllText(logPath, "Registrando controladores y servicios...\r\n");
    // 1. Configuración de Servicios Web
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    // 2. Registrar el DataExtractor para que tanto la API como el Worker lo usen
    string connectionString = builder.Configuration.GetConnectionString("KardexDB") ?? "";
    File.AppendAllText(logPath, $"Connection String: {connectionString}\r\n");

    builder.Services.AddSingleton(sp => {
        var logger = sp.GetRequiredService<ILogger<DataExtractor>>();
        return new DataExtractor(connectionString, logger);
    });

    // 3. Registrar el Worker Service en segundo plano
    builder.Services.AddHostedService<Worker>();

    // 4. Configurar CORS para permitir que la App se conecte
    builder.Services.AddCors(options => {
        options.AddDefaultPolicy(policy => {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        });
    });

    File.AppendAllText(logPath, "Construyendo aplicación (builder.Build)...\r\n");
    var app = builder.Build();

    // Habilitar Swagger siempre en desarrollo
    app.UseSwagger();
    app.UseSwaggerUI(c => {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SOFIManager API v1");

        // FORZAR MODO OSCURO INYECTANDO ESTILOS DIRECTAMENTE EN EL HEAD DEL HTML
        c.IndexStream = () =>
        {
            // 1. Lee la plantilla original interna de Swashbuckle
            var originalStream = typeof(Swashbuckle.AspNetCore.SwaggerUI.SwaggerUIOptions)
                .Assembly
                .GetManifestResourceStream("Swashbuckle.AspNetCore.SwaggerUI.index.html");

            using (var reader = new System.IO.StreamReader(originalStream))
            {
                var html = reader.ReadToEnd();

                // 2. Definimos todo nuestro CSS oscuro
                var darkCss = @"
                <style>
                    /* Forzar modo oscuro en el HTML y el Body antes de cargar nada */
                    html, body, .swagger-ui { background-color: #1b1b1b !important; color: #f8f8f2 !important; color-scheme: dark !important; }
                    .swagger-ui .info .title, .swagger-ui .info p, .swagger-ui .info a { color: #f8f8f2 !important; }
                    .swagger-ui .scheme-container { background-color: #252526 !important; box-shadow: none !important; border-bottom: 1px solid #333; }
                    
                    /* Bloques de endpoints */
                    .swagger-ui .opblock { background-color: #252526 !important; border-color: #3e3e42 !important; }
                    .swagger-ui .opblock .opblock-summary-description { color: #d4d4d4 !important; }
                    .swagger-ui .opblock .opblock-section-header { background-color: #2d2d30 !important; color: #f8f8f2 !important; }
                    
                    /* Inputs y Tablas */
                    .swagger-ui input[type=text], .swagger-ui select, .swagger-ui textarea { background-color: #2d2d30 !important; color: #f8f8f2 !important; border: 1px solid #555 !important; }
                    .swagger-ui .tabli .tabButton { color: #f8f8f2 !important; }
                    .swagger-ui .model-box { background-color: #2d2d30 !important; color: #f8f8f2 !important; }
                    .swagger-ui .model { color: #f8f8f2 !important; }
                    .swagger-ui table thead tr th, .swagger-ui .parameter__name, .swagger-ui .parameter__type { color: #f8f8f2 !important; }
                    
                    /* Cajas de código y respuestas */
                    .swagger-ui pre { background-color: #2d2d30 !important; color: #569cd6 !important; border: 1px solid #444 !important; }
                    .swagger-ui .responses-table { background-color: #1b1b1b !important; }
                    .swagger-ui .response-col_status { color: #f8f8f2 !important; }
                    
                    /* Botones */
                    .swagger-ui .btn.execute { background-color: #0e639c !important; color: #fff !important; border-color: #1177bb !important; }
                    .swagger-ui .btn.authorize { background-color: #1b1b1b !important; color: #4ec9b0 !important; border-color: #4ec9b0 !important; }
                    .swagger-ui .btn.authorize svg { fill: #4ec9b0 !important; }
                </style>
            ";

                // 3. Insertamos los estilos oscuros justo antes de que cierre la etiqueta </head>
                var updatedHtml = html.Replace("</head>", $"{darkCss}</head>");

                // 4. Devolvemos el HTML modificado al navegador
                return new System.IO.MemoryStream(System.Text.Encoding.UTF8.GetBytes(updatedHtml));
            }
        };
        c.RoutePrefix = "swagger";
    });

    app.UseCors();
    app.MapControllers();

    // Endpoint de prueba rápido
    app.MapGet("/", () => "SOFIManager Hybrid API + Worker is running!");

    File.AppendAllText(logPath, "Lanzando app.Run()...\r\n");
    app.Run();
}
catch (Exception ex)
{
    File.AppendAllText(logPath, $"FATAL ERROR: {ex}\r\n");
    throw;
}
