/**
 * ==============================================================================
 * StockPulse - Controlador Principal de la Aplicación
 * ==============================================================================
 * Orquesta la interfaz de usuario, eventos, validación, métricas y sincronización.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Referencias al DOM
    const form = document.getElementById("stock-form");
    const inputSku = document.getElementById("sku");
    const inputNombre = document.getElementById("nombre_producto");
    const inputBodega = document.getElementById("bodega");
    const inputStockActual = document.getElementById("stock_actual");
    const inputStockMinimo = document.getElementById("stock_minimo");
    const inputEmail = document.getElementById("proveedor_email");
    const btnSubmit = document.getElementById("btn-submit");
    const btnSubmitText = document.getElementById("btn-submit-text");
    const btnSubmitSpinner = document.getElementById("btn-submit-spinner");
    const btnReset = document.getElementById("btn-reset");

    // Indicadores y Alertas preventivas
    const criticalPreviewAlert = document.getElementById("critical-preview-alert");
    const configWarningBanner = document.getElementById("config-warning-banner");
    const realtimeBadge = document.getElementById("realtime-badge");

    // Elementos de error inline
    const errors = {
        sku: document.getElementById("error-sku"),
        nombre_producto: document.getElementById("error-nombre_producto"),
        bodega: document.getElementById("error-bodega"),
        stock_actual: document.getElementById("error-stock_actual"),
        stock_minimo: document.getElementById("error-stock_minimo"),
        proveedor_email: document.getElementById("error-proveedor_email")
    };

    // Tabla y Filtros
    const tableBody = document.getElementById("inventory-table-body");
    const mobileCardsContainer = document.getElementById("inventory-mobile-cards");
    const searchInput = document.getElementById("search-input");
    const filterCriticalBtn = document.getElementById("filter-critical-toggle");
    const btnRefresh = document.getElementById("btn-refresh");
    const emptyState = document.getElementById("empty-state");
    const loadingState = document.getElementById("table-loading-state");

    // Métricas / KPIs
    const kpiTotalProducts = document.getElementById("kpi-total-products");
    const kpiCriticalCount = document.getElementById("kpi-critical-count");
    const kpiTotalUnits = document.getElementById("kpi-total-units");
    const kpiWarehousesCount = document.getElementById("kpi-warehouses-count");

    // Estado interno
    let inventoryState = [];
    let filterOnlyCritical = false;
    let searchQuery = "";

    // Datos de demostración en caso de que aún no se configuren credenciales
    const DEMO_PRODUCTS = [
        { id: 1, sku: "SKU-101", nombre_producto: "Tornillo Acero Inox 1/2\"", bodega: "Bodega Central", stock_actual: 120, stock_minimo: 30, proveedor_email: "proveedor.acero@empresa.com", ultima_actualizacion: new Date().toISOString() },
        { id: 2, sku: "SKU-102", nombre_producto: "Válvula de Presión 2\"", bodega: "Bodega Norte", stock_actual: 3, stock_minimo: 10, proveedor_email: "suministros.valvulas@empresa.com", ultima_actualizacion: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, sku: "SKU-103", nombre_producto: "Empaque de Silicón 50mm", bodega: "Bodega Central", stock_actual: 85, stock_minimo: 20, proveedor_email: "plasticos.empaques@empresa.com", ultima_actualizacion: new Date(Date.now() - 7200000).toISOString() },
        { id: 4, sku: "SKU-104", nombre_producto: "Filtro de Aceite Industrial", bodega: "Bodega Sur", stock_actual: 2, stock_minimo: 8, proveedor_email: "filtros.lubricantes@empresa.com", ultima_actualizacion: new Date(Date.now() - 14400000).toISOString() },
        { id: 5, sku: "SKU-105", nombre_producto: "Cinta Teflón Alta Densidad", bodega: "Bodega Norte", stock_actual: 45, stock_minimo: 15, proveedor_email: "ferreteria.insumos@empresa.com", ultima_actualizacion: new Date(Date.now() - 86400000).toISOString() }
    ];

    /**
     * Inicialización general
     */
    async function initApp() {
        checkConfigurationStatus();
        setupEventListeners();
        await loadInventoryData();
        setupRealtimeSubscription();
    }

    /**
     * Verifica si el usuario ya reemplazó las credenciales en config.js
     */
    function checkConfigurationStatus() {
        const isConfigured = window.StockPulseConfig && window.StockPulseConfig.isConfigured();
        if (!isConfigured) {
            configWarningBanner.classList.remove("hidden");
            realtimeBadge.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="text-xs text-amber-300 font-medium">Modo Demo / Sin Conexión Supabase</span>
            `;
        } else {
            configWarningBanner.classList.add("hidden");
            realtimeBadge.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span class="text-xs text-emerald-300 font-medium">Conectado a Supabase</span>
            `;
        }
    }

    /**
     * Configuración de oyentes de eventos
     */
    function setupEventListeners() {
        // Enviar formulario
        form.addEventListener("submit", handleFormSubmit);

        // Limpiar formulario
        btnReset.addEventListener("click", resetForm);

        // Validación en tiempo real sobre los campos de stock para alerta preventiva
        inputStockActual.addEventListener("input", checkStockLevelWarning);
        inputStockMinimo.addEventListener("input", checkStockLevelWarning);

        // Al cambiar SKU, si ya existe en memoria, autocompletar datos para actualización rápida
        inputSku.addEventListener("blur", handleSkuAutocomplete);

        // Búsqueda en vivo
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderTable();
        });

        // Alternar filtro de stock crítico
        filterCriticalBtn.addEventListener("click", () => {
            filterOnlyCritical = !filterOnlyCritical;
            if (filterOnlyCritical) {
                filterCriticalBtn.classList.remove("bg-slate-800", "text-slate-300", "border-slate-700");
                filterCriticalBtn.classList.add("bg-rose-500", "text-white", "border-rose-400");
            } else {
                filterCriticalBtn.classList.remove("bg-rose-500", "text-white", "border-rose-400");
                filterCriticalBtn.classList.add("bg-slate-800", "text-slate-300", "border-slate-700");
            }
            renderTable();
        });

        // Botón de recarga manual
        btnRefresh.addEventListener("click", async () => {
            btnRefresh.classList.add("animate-spin");
            await loadInventoryData();
            setTimeout(() => btnRefresh.classList.remove("animate-spin"), 500);
            NotificationService.showToast({
                type: "info",
                title: "Inventario Actualizado",
                message: "Se sincronizaron los registros más recientes."
            });
        });
    }

    /**
     * Carga de datos desde Supabase o Modo Demo
     */
    async function loadInventoryData() {
        showTableLoading(true);
        try {
            if (window.StockPulseConfig && window.StockPulseConfig.isConfigured()) {
                const data = await SupabaseService.fetchInventory();
                inventoryState = data;
            } else {
                // Si no hay configuración aún, usar los datos demo
                inventoryState = [...DEMO_PRODUCTS];
            }
            renderTable();
            updateMetrics();
        } catch (error) {
            console.error("Error cargando inventario:", error);
            NotificationService.showToast({
                type: "error",
                title: "Error al Cargar Datos",
                message: error.message || "No fue posible conectar con la base de datos."
            });
            // En caso de fallo de red pero sin configuración, recurrir a demo
            if (inventoryState.length === 0) {
                inventoryState = [...DEMO_PRODUCTS];
                renderTable();
                updateMetrics();
            }
        } finally {
            showTableLoading(false);
        }
    }

    /**
     * Suscripción en tiempo real con Supabase
     */
    function setupRealtimeSubscription() {
        if (!window.StockPulseConfig || !window.StockPulseConfig.isConfigured()) return;

        try {
            SupabaseService.subscribeToRealtime((payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                
                if (eventType === "INSERT") {
                    // Evitar duplicados por si ya está en local
                    const exists = inventoryState.some(item => item.sku === newRecord.sku);
                    if (!exists) inventoryState.unshift(newRecord);
                } else if (eventType === "UPDATE") {
                    inventoryState = inventoryState.map(item => item.sku === newRecord.sku ? newRecord : item);
                } else if (eventType === "DELETE") {
                    inventoryState = inventoryState.filter(item => item.id !== oldRecord.id && item.sku !== oldRecord.sku);
                }

                renderTable();
                updateMetrics();

                const isCrit = Number(newRecord?.stock_actual) <= Number(newRecord?.stock_minimo);
                NotificationService.showToast({
                    type: isCrit ? "warning" : "info",
                    title: `Sincronización Realtime (${eventType})`,
                    message: `Producto ${newRecord?.sku || "ID " + oldRecord?.id} actualizado automáticamente.`
                });
            });
        } catch (err) {
            console.warn("No se pudo iniciar Realtime:", err);
        }
    }

    /**
     * Autocompleta el formulario si el SKU ya existe en la lista
     */
    function handleSkuAutocomplete() {
        const skuVal = inputSku.value.trim().toUpperCase();
        if (!skuVal) return;

        const existing = inventoryState.find(p => p.sku.toUpperCase() === skuVal);
        if (existing) {
            inputNombre.value = existing.nombre_producto;
            inputBodega.value = existing.bodega;
            inputStockActual.value = existing.stock_actual;
            inputStockMinimo.value = existing.stock_minimo;
            inputEmail.value = existing.proveedor_email;
            checkStockLevelWarning();

            NotificationService.showToast({
                type: "info",
                title: "SKU Encontrado",
                message: `Cargando datos de "${existing.nombre_producto}" para actualización rápida.`,
                duration: 2500
            });
        }
    }

    /**
     * Muestra alerta preventiva cuando el stock actual es crítico en el formulario
     */
    function checkStockLevelWarning() {
        const actual = parseInt(inputStockActual.value, 10);
        const minimo = parseInt(inputStockMinimo.value, 10);

        if (!isNaN(actual) && !isNaN(minimo) && actual <= minimo) {
            criticalPreviewAlert.classList.remove("hidden");
            const diff = minimo - actual;
            document.getElementById("critical-deficit-text").textContent = 
                diff === 0 ? "Stock en umbral límite exacto." : `Déficit de ${diff} unidad(es) bajo el mínimo.`;
        } else {
            criticalPreviewAlert.classList.add("hidden");
        }
    }

    /**
     * Valida los campos en el cliente con alertas en el DOM
     */
    function validateForm() {
        let isValid = true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Limpiar errores previos
        Object.keys(errors).forEach(key => {
            NotificationService.clearFieldError(document.getElementById(key), errors[key]);
        });

        // Validar SKU
        const sku = inputSku.value.trim();
        if (!sku) {
            NotificationService.setFieldError(inputSku, errors.sku, "El código SKU es obligatorio.");
            isValid = false;
        } else if (sku.length < 3) {
            NotificationService.setFieldError(inputSku, errors.sku, "El SKU debe tener al menos 3 caracteres.");
            isValid = false;
        }

        // Validar Nombre
        const nombre = inputNombre.value.trim();
        if (!nombre) {
            NotificationService.setFieldError(inputNombre, errors.nombre_producto, "El nombre del producto es requerido.");
            isValid = false;
        } else if (nombre.length < 3) {
            NotificationService.setFieldError(inputNombre, errors.nombre_producto, "Ingresa un nombre descriptivo (mín. 3 caracteres).");
            isValid = false;
        }

        // Validar Bodega
        const bodega = inputBodega.value.trim();
        if (!bodega) {
            NotificationService.setFieldError(inputBodega, errors.bodega, "Selecciona o ingresa la ubicación de bodega.");
            isValid = false;
        }

        // Validar Stock Actual
        const stockActual = inputStockActual.value.trim();
        if (stockActual === "" || isNaN(stockActual) || parseInt(stockActual, 10) < 0) {
            NotificationService.setFieldError(inputStockActual, errors.stock_actual, "Ingresa un stock actual válido (entero >= 0).");
            isValid = false;
        }

        // Validar Stock Mínimo
        const stockMinimo = inputStockMinimo.value.trim();
        if (stockMinimo === "" || isNaN(stockMinimo) || parseInt(stockMinimo, 10) < 0) {
            NotificationService.setFieldError(inputStockMinimo, errors.stock_minimo, "Ingresa un umbral mínimo de seguridad (>= 0).");
            isValid = false;
        }

        // Validar Email de Proveedor
        const email = inputEmail.value.trim();
        if (!email) {
            NotificationService.setFieldError(inputEmail, errors.proveedor_email, "El correo de contacto del proveedor es obligatorio.");
            isValid = false;
        } else if (!emailRegex.test(email)) {
            NotificationService.setFieldError(inputEmail, errors.proveedor_email, "Formato de correo electrónico inválido.");
            isValid = false;
        }

        return isValid;
    }

    /**
     * Manejador del submit del formulario
     */
    async function handleFormSubmit(e) {
        e.preventDefault();

        // a) Validación visual en el cliente
        if (!validateForm()) {
            NotificationService.showToast({
                type: "error",
                title: "Validación Fallida",
                message: "Corrige los campos marcados en rojo antes de continuar."
            });
            return;
        }

        const productData = {
            sku: inputSku.value.trim().toUpperCase(),
            nombre_producto: inputNombre.value.trim(),
            bodega: inputBodega.value.trim(),
            stock_actual: parseInt(inputStockActual.value, 10),
            stock_minimo: parseInt(inputStockMinimo.value, 10),
            proveedor_email: inputEmail.value.trim().toLowerCase()
        };

        const isCritical = productData.stock_actual <= productData.stock_minimo;

        // Estado visual de carga
        setSubmitLoading(true);

        try {
            // b) Envío vía POST JSON al Webhook de N8N
            let n8nResult = null;
            try {
                n8nResult = await N8NService.triggerWebhook(productData);
                if (n8nResult.simulated) {
                    NotificationService.showToast({
                        type: "warning",
                        title: "Alerta N8N Simulada",
                        message: "El Webhook no está configurado aún en config.js. Se simuló el envío."
                    });
                }
            } catch (n8nErr) {
                console.error("Error en Webhook N8N:", n8nErr);
                NotificationService.showToast({
                    type: "warning",
                    title: "Aviso de Webhook N8N",
                    message: `No se pudo entregar el evento a N8N: ${n8nErr.message}`
                });
            }

            // c) Inserción o actualización en Supabase usando el SDK oficial
            let savedRecord = null;
            if (window.StockPulseConfig && window.StockPulseConfig.isConfigured()) {
                savedRecord = await SupabaseService.upsertProduct(productData);
                
                // Actualizar estado local inmediatamente
                const existingIndex = inventoryState.findIndex(p => p.sku === savedRecord.sku);
                if (existingIndex >= 0) {
                    inventoryState[existingIndex] = savedRecord;
                } else {
                    inventoryState.unshift(savedRecord);
                }
            } else {
                // Modo Demo Local
                savedRecord = {
                    ...productData,
                    id: Date.now(),
                    ultima_actualizacion: new Date().toISOString()
                };
                const existingIndex = inventoryState.findIndex(p => p.sku === savedRecord.sku);
                if (existingIndex >= 0) {
                    inventoryState[existingIndex] = savedRecord;
                } else {
                    inventoryState.unshift(savedRecord);
                }
            }

            // Actualizar vista y métricas
            renderTable();
            updateMetrics();

            // Mensajes de éxito
            if (isCritical) {
                NotificationService.showToast({
                    type: "warning",
                    title: "¡ALERTA: STOCK CRÍTICO!",
                    message: `El producto ${productData.sku} está en o por debajo de su stock mínimo (${productData.stock_actual} <= ${productData.stock_minimo}). Evento de reabastecimiento disparado.`,
                    duration: 6000
                });
            } else {
                NotificationService.showToast({
                    type: "success",
                    title: "Registro Guardado",
                    message: `Producto ${productData.sku} actualizado con éxito en la base de datos.`
                });
            }

            // Limpiar formulario tras éxito
            resetForm();

        } catch (err) {
            console.error("Error al procesar el inventario:", err);
            NotificationService.showToast({
                type: "error",
                title: "Error de Operación",
                message: err.message || "Ocurrió un fallo al intentar registrar los datos."
            });
        } finally {
            setSubmitLoading(false);
        }
    }

    /**
     * Control del estado del botón enviar
     */
    function setSubmitLoading(isLoading) {
        if (isLoading) {
            btnSubmit.disabled = true;
            btnSubmit.classList.add("opacity-75", "cursor-not-allowed");
            btnSubmitSpinner.classList.remove("hidden");
            btnSubmitText.textContent = "Sincronizando...";
        } else {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove("opacity-75", "cursor-not-allowed");
            btnSubmitSpinner.classList.add("hidden");
            btnSubmitText.textContent = "Registrar / Actualizar Stock";
        }
    }

    /**
     * Limpia el formulario
     */
    function resetForm() {
        form.reset();
        criticalPreviewAlert.classList.add("hidden");
        Object.keys(errors).forEach(key => {
            NotificationService.clearFieldError(document.getElementById(key), errors[key]);
        });
        inputSku.focus();
    }

    /**
     * Muestra estado de carga en la tabla
     */
    function showTableLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove("hidden");
            tableBody.classList.add("opacity-30");
        } else {
            loadingState.classList.add("hidden");
            tableBody.classList.remove("opacity-30");
        }
    }

    /**
     * Renderiza la tabla y las tarjetas móviles
     */
    function renderTable() {
        // Filtrar productos
        let filtered = inventoryState.filter(item => {
            const matchesSearch = 
                item.sku.toLowerCase().includes(searchQuery) ||
                item.nombre_producto.toLowerCase().includes(searchQuery) ||
                item.bodega.toLowerCase().includes(searchQuery) ||
                (item.proveedor_email && item.proveedor_email.toLowerCase().includes(searchQuery));
            
            const isCrit = Number(item.stock_actual) <= Number(item.stock_minimo);
            const matchesCritical = filterOnlyCritical ? isCrit : true;

            return matchesSearch && matchesCritical;
        });

        // Estado vacío
        if (filtered.length === 0) {
            emptyState.classList.remove("hidden");
            tableBody.innerHTML = "";
            mobileCardsContainer.innerHTML = "";
            return;
        } else {
            emptyState.classList.add("hidden");
        }

        // Renderizado Desktop (Tabla)
        tableBody.innerHTML = filtered.map(item => {
            const isCritical = Number(item.stock_actual) <= Number(item.stock_minimo);
            const formattedDate = item.ultima_actualizacion ? new Date(item.ultima_actualizacion).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }) : "N/A";

            const rowBgClass = isCritical 
                ? "bg-rose-950/20 hover:bg-rose-900/30 border-l-4 border-l-rose-500" 
                : "hover:bg-slate-800/40 border-l-4 border-l-transparent";

            return `
                <tr class="border-b border-slate-800 transition-colors ${rowBgClass}">
                    <td class="px-5 py-4 whitespace-nowrap">
                        ${isCritical ? `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                                Crítico
                            </span>
                        ` : `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Adecuado
                            </span>
                        `}
                    </td>
                    <td class="px-5 py-4 font-mono font-bold text-indigo-300 text-sm">
                        ${escapeHtml(item.sku)}
                    </td>
                    <td class="px-5 py-4">
                        <div class="text-sm font-semibold text-white">${escapeHtml(item.nombre_producto)}</div>
                    </td>
                    <td class="px-5 py-4 text-xs text-slate-300">
                        <span class="px-2 py-1 rounded bg-slate-800 border border-slate-700">${escapeHtml(item.bodega)}</span>
                    </td>
                    <td class="px-5 py-4 text-center">
                        <span class="text-base font-bold ${isCritical ? 'text-rose-400' : 'text-slate-100'}">
                            ${item.stock_actual}
                        </span>
                    </td>
                    <td class="px-5 py-4 text-center text-xs text-slate-400 font-mono">
                        ${item.stock_minimo}
                    </td>
                    <td class="px-5 py-4 text-xs text-slate-300">
                        <a href="mailto:${escapeHtml(item.proveedor_email)}" class="hover:underline text-indigo-400">
                            ${escapeHtml(item.proveedor_email)}
                        </a>
                    </td>
                    <td class="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                        ${formattedDate}
                    </td>
                    <td class="px-5 py-4 text-right whitespace-nowrap">
                        <button 
                            onclick="window.StockPulseApp.loadProductIntoForm('${escapeHtml(item.sku)}')"
                            class="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-indigo-600 rounded-lg transition-colors border border-slate-700 hover:border-indigo-500">
                            Ajustar Stock
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        // Renderizado Móvil (Cards)
        mobileCardsContainer.innerHTML = filtered.map(item => {
            const isCritical = Number(item.stock_actual) <= Number(item.stock_minimo);
            const formattedDate = item.ultima_actualizacion ? new Date(item.ultima_actualizacion).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }) : "N/A";

            const cardBorder = isCritical 
                ? "border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30" 
                : "border-slate-800 bg-slate-900/60";

            return `
                <div class="p-4 rounded-xl border ${cardBorder} flex flex-col gap-3">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <span class="font-mono text-xs font-bold text-indigo-300">${escapeHtml(item.sku)}</span>
                            <h4 class="font-semibold text-white text-sm mt-0.5">${escapeHtml(item.nombre_producto)}</h4>
                        </div>
                        ${isCritical ? `
                            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                Crítico
                            </span>
                        ` : `
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                Normal
                            </span>
                        `}
                    </div>

                    <div class="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/50 text-xs">
                        <div>
                            <span class="text-slate-400">Stock Actual:</span>
                            <span class="font-bold ml-1 text-sm ${isCritical ? 'text-rose-400' : 'text-slate-100'}">${item.stock_actual}</span>
                        </div>
                        <div>
                            <span class="text-slate-400">Umbral Mín:</span>
                            <span class="font-medium ml-1 text-slate-300">${item.stock_minimo}</span>
                        </div>
                        <div class="col-span-2">
                            <span class="text-slate-400">Bodega:</span>
                            <span class="ml-1 text-slate-200">${escapeHtml(item.bodega)}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span class="text-slate-400">${formattedDate}</span>
                        <button 
                            onclick="window.StockPulseApp.loadProductIntoForm('${escapeHtml(item.sku)}')"
                            class="px-3 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                            Editar
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    /**
     * Actualiza los contadores de la cabecera (KPIs)
     */
    function updateMetrics() {
        const total = inventoryState.length;
        const critical = inventoryState.filter(item => Number(item.stock_actual) <= Number(item.stock_minimo)).length;
        const totalUnits = inventoryState.reduce((acc, curr) => acc + (Number(curr.stock_actual) || 0), 0);
        const warehouses = new Set(inventoryState.map(i => i.bodega.trim())).size;

        kpiTotalProducts.textContent = total;
        kpiCriticalCount.textContent = critical;
        kpiTotalUnits.textContent = totalUnits.toLocaleString();
        kpiWarehousesCount.textContent = warehouses;

        // Efecto visual en contador crítico si hay alertas
        if (critical > 0) {
            kpiCriticalCount.classList.add("text-rose-400");
            kpiCriticalCount.parentElement.classList.add("border-rose-500/40", "bg-rose-950/20");
        } else {
            kpiCriticalCount.classList.remove("text-rose-400");
            kpiCriticalCount.parentElement.classList.remove("border-rose-500/40", "bg-rose-950/20");
        }
    }

    /**
     * Carga un producto seleccionado en la tabla hacia el formulario
     */
    function loadProductIntoForm(sku) {
        const item = inventoryState.find(p => p.sku === sku);
        if (!item) return;

        inputSku.value = item.sku;
        inputNombre.value = item.nombre_producto;
        inputBodega.value = item.bodega;
        inputStockActual.value = item.stock_actual;
        inputStockMinimo.value = item.stock_minimo;
        inputEmail.value = item.proveedor_email;

        checkStockLevelWarning();

        // Scroll suave al formulario
        form.scrollIntoView({ behavior: "smooth", block: "center" });

        // Foco en el campo de stock actual
        setTimeout(() => {
            inputStockActual.focus();
            inputStockActual.select();
        }, 400);

        NotificationService.showToast({
            type: "info",
            title: "Edición Rápida",
            message: `Actualizando stock de ${item.sku}. Modifica las unidades y haz clic en Guardar.`
        });
    }

    /**
     * Sanitizador básico de cadenas para evitar XSS
     */
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Inicializar la aplicación
    initApp();

    // Exportar métodos accesibles globalmente
    window.StockPulseApp = {
        loadProductIntoForm,
        refresh: loadInventoryData
    };
});
