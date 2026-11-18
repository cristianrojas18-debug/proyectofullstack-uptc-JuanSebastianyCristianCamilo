/**
 * ==============================================================================
 * StockPulse - Servicio Supabase (SDK Oficial)
 * ==============================================================================
 * Gestiona consultas, inserciones, actualizaciones y suscripciones en tiempo real.
 */

const SupabaseService = (function () {
    let client = null;
    let realtimeChannel = null;

    /**
     * Inicializa el cliente oficial de Supabase
     */
    function init() {
        const config = window.StockPulseConfig;
        if (!config || !config.isConfigured()) {
            console.warn("StockPulse: Credenciales de Supabase no configuradas aún.");
            return null;
        }

        if (typeof supabase === "undefined" || !supabase.createClient) {
            console.error("StockPulse: El SDK oficial de Supabase no se ha cargado en el DOM.");
            return null;
        }

        try {
            // Normaliza la URL base de Supabase por si incluye '/rest/v1/' o barras finales
            const cleanUrl = config.SUPABASE_URL.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
            client = supabase.createClient(cleanUrl, config.SUPABASE_ANON_KEY.trim());
            return client;
        } catch (err) {
            console.error("Error al inicializar cliente Supabase:", err);
            return null;
        }
    }

    function getClient() {
        if (!client) {
            init();
        }
        return client;
    }

    /**
     * Obtiene todos los productos de la tabla inventario_productos
     */
    async function fetchInventory() {
        const sb = getClient();
        if (!sb) {
            throw new Error("Supabase no está configurado. Por favor define SUPABASE_URL y SUPABASE_ANON_KEY en js/config.js.");
        }

        const { data, error } = await sb
            .from("inventario_productos")
            .select("*")
            .order("ultima_actualizacion", { ascending: false });

        if (error) {
            throw new Error(`Error en Supabase [${error.code || "DB"}]: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Inserta o actualiza un registro en inventario_productos usando 'sku' como clave única
     * @param {Object} product
     * @param {string} product.sku
     * @param {string} product.nombre_producto
     * @param {string} product.bodega
     * @param {number} product.stock_actual
     * @param {number} product.stock_minimo
     * @param {string} product.proveedor_email
     */
    async function upsertProduct(product) {
        const sb = getClient();
        if (!sb) {
            throw new Error("Supabase no configurado. Revisa las credenciales en js/config.js.");
        }

        const payload = {
            sku: product.sku.trim().toUpperCase(),
            nombre_producto: product.nombre_producto.trim(),
            bodega: product.bodega.trim(),
            stock_actual: parseInt(product.stock_actual, 10),
            stock_minimo: parseInt(product.stock_minimo, 10),
            proveedor_email: product.proveedor_email.trim().toLowerCase(),
            ultima_actualizacion: new Date().toISOString()
        };

        const { data, error } = await sb
            .from("inventario_productos")
            .upsert(payload, { onConflict: "sku" })
            .select();

        if (error) {
            throw new Error(`Error al guardar en Supabase: ${error.message}`);
        }

        return data && data.length > 0 ? data[0] : payload;
    }

    /**
     * Se suscribe a cambios en tiempo real en la tabla inventario_productos
     * @param {Function} onChangeCallback
     */
    function subscribeToRealtime(onChangeCallback) {
        const sb = getClient();
        if (!sb) return null;

        if (realtimeChannel) {
            sb.removeChannel(realtimeChannel);
        }

        realtimeChannel = sb
            .channel("stockpulse-realtime-inventory")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "inventario_productos" },
                (payload) => {
                    console.log("Supabase Realtime Event:", payload.eventType, payload);
                    if (typeof onChangeCallback === "function") {
                        onChangeCallback(payload);
                    }
                }
            )
            .subscribe((status) => {
                console.log("Supabase Realtime status:", status);
            });

        return realtimeChannel;
    }

    return {
        init,
        getClient,
        fetchInventory,
        upsertProduct,
        subscribeToRealtime
    };
})();

if (typeof window !== "undefined") {
    window.SupabaseService = SupabaseService;
}
