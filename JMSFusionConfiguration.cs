using System.Text.Json.Serialization;
using MediaBrowser.Model.Plugins;

namespace JMSFusion
{
    public class JMSFusionConfiguration : BasePluginConfiguration
    {
        [JsonPropertyName("scriptDirectory")]
        public string ScriptDirectory { get; set; } = string.Empty;

        [JsonPropertyName("playerSubdir")]
        public string PlayerSubdir { get; set; } = "modules/player";

        [JsonPropertyName("enableTransformEngine")]
        public bool EnableTransformEngine { get; set; } = true;
    }
}
