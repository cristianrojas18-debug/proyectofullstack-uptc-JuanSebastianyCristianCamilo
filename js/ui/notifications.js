/**
 * ==============================================================================
 * StockPulse - Módulo de Notificaciones y Alertas en el DOM
 * ==============================================================================
 * Proporciona un sistema de retroalimentación visual reactivo sin usar alert().
 */

const NotificationService = (function () {
    const TOAST_CONTAINER_ID = "stockpulse-toast-container";

    /**
     * Asegura la existencia del contenedor de toasts en el DOM
     */
    function getOrCreateContainer() {
        let container = document.getElementById(TOAST_CONTAINER_ID);
        if (!container) {
            container = document.createElement("div");
            container.id = TOAST_CONTAINER_ID;
            container.className = "fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none";
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Crea y muestra una notificación tipo Toast
     * @param {Object} options
     * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
     * @param {string} options.title - Título del mensaje
     * @param {string} options.message - Detalle del mensaje
     * @param {number} [options.duration=4500] - Tiempo en ms antes de desaparecer
     */
    function showToast({ type = "info", title, message, duration = 4500 }) {
        const container = getOrCreateContainer();

        const toast = document.createElement("div");
        toast.className = "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-x-full opacity-0";

        // Estilos específicos según tipo
        let borderClass = "";
        let bgClass = "";
        let iconSvg = "";

        switch (type) {
            case "success":
                bgClass = "bg-emerald-950/90 text-emerald-100";
                borderClass = "border-emerald-500/50 shadow-emerald-950/50";
                iconSvg = `
                    <svg class="w-6 h-6 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>`;
                break;
            case "error":
                bgClass = "bg-rose-950/90 text-rose-100";
                borderClass = "border-rose-500/50 shadow-rose-950/50";
                iconSvg = `
                    <svg class="w-6 h-6 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>`;
                break;
            case "warning":
                bgClass = "bg-amber-950/90 text-amber-100";
                borderClass = "border-amber-500/50 shadow-amber-950/50";
                iconSvg = `
                    <svg class="w-6 h-6 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>`;
                break;
            case "info":
            default:
                bgClass = "bg-slate-900/90 text-slate-100";
                borderClass = "border-indigo-500/50 shadow-indigo-950/50";
                iconSvg = `
                    <svg class="w-6 h-6 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>`;
                break;
        }

        toast.className += ` ${bgClass} ${borderClass}`;

        toast.innerHTML = `
            ${iconSvg}
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-sm leading-tight">${title}</h4>
                <p class="text-xs text-slate-300 mt-1 leading-relaxed break-words">${message}</p>
            </div>
            <button class="text-slate-400 hover:text-white transition-colors p-1" aria-label="Cerrar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        // Botón de cerrar manual
        const closeBtn = toast.querySelector("button");
        const removeToast = () => {
            toast.classList.add("translate-x-full", "opacity-0");
            setTimeout(() => {
                if (toast.parentElement) toast.parentElement.removeChild(toast);
            }, 300);
        };

        closeBtn.addEventListener("click", removeToast);

        container.appendChild(toast);

        // Animación de entrada
        requestAnimationFrame(() => {
            toast.classList.remove("translate-x-full", "opacity-0");
            toast.classList.add("translate-x-0", "opacity-100");
        });

        // Auto remoción
        if (duration > 0) {
            setTimeout(removeToast, duration);
        }
    }

    /**
     * Muestra error inline bajo un input
     */
    function setFieldError(inputEl, errorEl, message) {
        if (!inputEl) return;
        inputEl.classList.add("border-rose-500", "focus:ring-rose-500", "focus:border-rose-500", "bg-rose-950/20");
        inputEl.classList.remove("border-slate-700", "focus:ring-indigo-500", "focus:border-indigo-500");
        
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove("hidden");
        }
    }

    /**
     * Limpia error inline de un input
     */
    function clearFieldError(inputEl, errorEl) {
        if (!inputEl) return;
        inputEl.classList.remove("border-rose-500", "focus:ring-rose-500", "focus:border-rose-500", "bg-rose-950/20");
        inputEl.classList.add("border-slate-700", "focus:ring-indigo-500", "focus:border-indigo-500");
        
        if (errorEl) {
            errorEl.textContent = "";
            errorEl.classList.add("hidden");
        }
    }

    return {
        showToast,
        setFieldError,
        clearFieldError
    };
})();

if (typeof window !== "undefined") {
    window.NotificationService = NotificationService;
}
