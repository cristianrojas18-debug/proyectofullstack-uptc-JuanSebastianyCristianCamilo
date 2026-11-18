/**
 * ==============================================================================
 * StockPulse - Servicio de Integración N8N Webhook
 * ==============================================================================
 * Envía eventos de actualización de stock para disparar automatizaciones
 * (notificaciones por correo al proveedor, alertas en Slack/Telegram, etc.).
 */

const N8NService = (function () {
    /**
     * Envía los datos del producto actualizado al Webhook de N8N vía HTTP POST
     * @param {Object} productData
     * @returns {Promise<{success: boolean, response?: any, error?: string}>}
     */
    async function triggerWebhook(productData) {
        const config = window.StockPulseConfig;
        const webhookUrl = config ? config.N8N_WEBHOOK_URL : "";

        if (!webhookUrl || webhookUrl.includes("tu-instancia-n8n") || !webhookUrl.startsWith("http")) {
            console.warn("StockPulse: N8N_WEBHOOK_URL tiene un valor por defecto o no está configurada.");
            return {
                success: false,
                simulated: true,
                message: "N8N_WEBHOOK_URL pendiente de configurar en js/config.js. Notificación simulada."
            };
        }

        const isCritical = Number(productData.stock_actual) <= Number(productData.stock_minimo);

        const payload = {
            evento: "ACTUALIZACION_STOCK",
            nivel_prioridad: isCritical ? "CRITICA" : "NORMAL",
            requiere_reabastecimiento: isCritical,
            timestamp: new Date().toISOString(),
            producto: {
                sku: productData.sku,
                nombre_producto: productData.nombre_producto,
                bodega: productData.bodega,
                stock_actual: Number(productData.stock_actual),
                stock_minimo: Number(productData.stock_minimo),
                deficit: isCritical ? (Number(productData.stock_minimo) - Number(productData.stock_actual)) : 0,
                proveedor_email: productData.proveedor_email
            },
            origen: "StockPulse Web Client v1.0"
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`El Webhook N8N respondió con código HTTP ${response.status} (${response.statusText})`);
            }

            let responseData = null;
            try {
                responseData = await response.json();
            } catch (jsonErr) {
                responseData = await response.text();
            }

            return {
                success: true,
                simulated: false,
                data: responseData,
                isCritical
            };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new Error("Tiempo de espera agotado al conectar con el Webhook de N8N (Timeout 8s).");
            }
            throw error;
        }
    }

    return {
        triggerWebhook
    };
})();

if (typeof window !== "undefined") {
    window.N8NService = N8NService;
}
