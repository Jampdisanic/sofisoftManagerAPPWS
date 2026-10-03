using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SOFIManagerWS
{
    /// <summary>
    /// Cliente para interactuar con GitHub Gists.
    /// Permite subir (PATCH) y descargar (GET) el contenido del JSON.
    /// </summary>
    public class GistClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _gistId;
        private readonly string _fileName;
        private readonly ILogger _logger;

        public GistClient(string gitHubToken, string gistId, string fileName, ILogger logger)
        {
            _gistId = gistId;
            _fileName = fileName;
            _logger = logger;

            _httpClient = new HttpClient();
            _httpClient.BaseAddress = new Uri("https://api.github.com/");
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github.v3+json"));
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", gitHubToken);
            _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("SOFIManagerWS", "1.0"));
        }

        /// <summary>
        /// Sube (actualiza) el contenido JSON al Gist.
        /// </summary>
        public async Task<bool> UpdateGistAsync(string jsonContent)
        {
            try
            {
                var payload = new
                {
                    files = new Dictionary<string, object>
                    {
                        [_fileName] = new { content = jsonContent }
                    }
                };

                string payloadJson = JsonSerializer.Serialize(payload);
                _logger.LogInformation("Subiendo JSON a Gist. Tamaño: {Size} bytes", payloadJson.Length);
                var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");

                var response = await _httpClient.PatchAsync($"gists/{_gistId}", content);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Gist actualizado exitosamente.");
                    return true;
                }
                else
                {
                    string errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Error al actualizar Gist. Status: {Status}. Body: {Body}", response.StatusCode, errorBody);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excepción al intentar actualizar el Gist.");
                return false;
            }
        }

        /// <summary>
        /// Descarga el contenido actual del Gist y lo guarda en una ruta local.
        /// </summary>
        public async Task<bool> DownloadGistToFileAsync(string localPath)
        {
            try
            {
                var response = await _httpClient.GetAsync($"gists/{_gistId}");

                if (response.IsSuccessStatusCode)
                {
                    string body = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(body);

                    if (doc.RootElement.TryGetProperty("files", out var files) &&
                        files.TryGetProperty(_fileName, out var file))
                    {
                        string? content = file.TryGetProperty("content", out var cp) ? cp.GetString() : null;
                        bool truncated = file.TryGetProperty("truncated", out var tp) && tp.GetBoolean();

                        if (truncated || string.IsNullOrEmpty(content))
                        {
                            if (file.TryGetProperty("raw_url", out var ru))
                            {
                                _logger.LogInformation("Archivo grande (>1MB). Descargando desde raw_url...");
                                content = await _httpClient.GetStringAsync(ru.GetString());
                            }
                        }

                        if (content != null)
                        {
                            string? directory = Path.GetDirectoryName(localPath);
                            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                                Directory.CreateDirectory(directory);

                            await File.WriteAllTextAsync(localPath, content);
                            _logger.LogInformation("Archivo Gist descargado ({Size} bytes) en: {Path}", content.Length, localPath);
                            return true;
                        }
                    }
                }
                
                _logger.LogWarning("No se pudo descargar el archivo del Gist o el archivo no existe.");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excepción al intentar descargar el Gist localmente.");
                return false;
            }
        }
    }
}
