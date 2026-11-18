/**
 * ==============================================================================
 * StockPulse - Configuración de Conexión y Endpoints
 * ==============================================================================
 * INSTRUCCIONES:
 * Reemplaza los siguientes valores con las credenciales obtenidas de tu panel
 * de Supabase (Project Settings -> API) y el nodo Webhook de tu flujo en N8N.
 */

const SUPABASE_URL = "https://dpqmfvaugylczbjbnzwv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NAmEYrZ91o4V_BtNIv-VnQ__b9drmz5";
const N8N_WEBHOOK_URL = "https://proyectoantigravity.app.n8n.cloud/webhook/stockpulse";

// Exportación modular para navegador y módulos ES
const StockPulseConfig = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    N8N_WEBHOOK_URL,
    isConfigured: function () {
        // Valida que existan valores válidos y no sean cadenas vacías ni placeholders genéricos
        const url = (this.SUPABASE_URL || "").trim();
        const key = (this.SUPABASE_ANON_KEY || "").trim();
        
        const isUrlValid = url.startsWith("https://") && !url.includes("TU_SUPABASE");
        const isKeyValid = key.length > 20 && !key.includes("TU_SUPABASE");
        
        return isUrlValid && isKeyValid;
    }
};

if (typeof window !== "undefined") {
    window.StockPulseConfig = StockPulseConfig;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = StockPulseConfig;
}
