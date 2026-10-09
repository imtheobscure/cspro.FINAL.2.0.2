import { getSpinnerFeatures } from './html/spinner';

const STYLE_ID = 'spinner-widget-style';
const HOST_ID = 'spinner-widget-host';

type SpinnerApi = {
    open?: () => void;
    close?: () => void;
    isOpen?: () => boolean;
};

const api = (): SpinnerApi | null => (typeof window === 'undefined' ? null : ((window as any).SpinnerTool || null));

/**
 * Mounts the Spinner widget into the current page (styles, markup and runtime
 * are injected once) and opens its overlay. Used by the Widgets dock.
 */
export const openSpinnerWidget = (): void => {
    if (typeof document === 'undefined') return;
    const existing = api();
    if (existing && existing.open) {
        existing.open();
        return;
    }
    const sp = getSpinnerFeatures();
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = sp.css;
        document.head.appendChild(style);
    }
    if (!document.getElementById(HOST_ID)) {
        const host = document.createElement('div');
        host.id = HOST_ID;
        host.innerHTML = sp.html;
        document.body.appendChild(host);
    }
    new Function(sp.js)();
    const ready = api();
    if (ready && ready.open) ready.open();
};

export const closeSpinnerWidget = (): void => {
    const ready = api();
    if (ready && ready.close) ready.close();
};

export const isSpinnerWidgetOpen = (): boolean => {
    const ready = api();
    return !!(ready && ready.isOpen && ready.isOpen());
};
