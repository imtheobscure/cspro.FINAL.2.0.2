export const getSplashScreenWidget = (config: { text?: string; subtext?: string; logo?: string; durationSeconds?: number }) => {
    const text = config.text || "Tutor Academy Presents";
    const subtext = config.subtext || "Your English journey starts here";
    const duration = (config.durationSeconds || 3) * 1000;
    const logoHtml = config.logo ? `<img src="${config.logo}" alt="Logo" class="splash-logo" />` : '';

    const html = `
    <div id="premium-splash-screen" class="premium-splash-screen">
        <div class="splash-bg-premium"></div>
        <div class="splash-content">
            ${logoHtml}
            <h1 class="splash-text">${text}</h1>
            <p class="splash-subtext">${subtext}</p>
            <div class="splash-loader">
                <div class="splash-loader-bar" style="animation-duration: ${(duration / 1000) - 0.5}s"></div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 30px; align-items: center; justify-content: center; flex-wrap: wrap;">
                <button id="splash-skip-btn" class="splash-skip-btn" style="margin-top: 0;">Skip <i class="fas fa-forward"></i></button>
                <button id="splash-load-btn" class="splash-skip-btn" style="margin-top: 0; background: rgba(139, 92, 246, 0.2); border-color: rgba(139, 92, 246, 0.4); color: #c084fc;"><i class="fas fa-folder-open"></i> Load Progress (.json)</button>
            </div>
        </div>
    </div>
    `;

    const css = `
    .premium-splash-screen {
        position: fixed;
        inset: 0;
        z-index: 100000000 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, #1a0b2e 0%, #050110 100%);
        overflow: hidden;
        transition: opacity 0.8s ease-in-out, visibility 0.8s ease-in-out;
        animation: guaranteedSplashFadeOut 0.8s ease-in-out forwards;
        animation-delay: ${(duration / 1000)}s;
    }
    .premium-splash-screen.hidden {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }
    @keyframes guaranteedSplashFadeOut {
        0% { opacity: 1; visibility: visible; }
        98% { opacity: 1; visibility: visible; }
        100% { opacity: 0; visibility: hidden; pointer-events: none; }
    }
    .splash-bg-premium {
        position: absolute;
        inset: -50%;
        background: conic-gradient(from 0deg at 50% 50%, #1a0b2e 0deg, #4f46e5 90deg, #6d28d9 180deg, #3b82f6 270deg, #1a0b2e 360deg);
        filter: blur(120px);
        opacity: 0.5;
        animation: rotateBg 15s linear infinite;
        pointer-events: none;
    }
    .splash-content {
        position: relative;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        animation: contentEnter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
    }
    .splash-logo {
        width: 120px;
        height: 120px;
        object-fit: contain;
        border-radius: 20px;
        margin-bottom: 24px;
        box-shadow: 0 0 40px rgba(139, 92, 246, 0.4);
        opacity: 0;
        transform: translateY(-20px);
        animation: itemEnter 0.6s ease forwards 0.4s;
    }
    .splash-text {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 3rem;
        font-weight: 800;
        color: #fff;
        margin: 0 0 10px 0;
        background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 4px 20px rgba(0,0,0,0.3);
        opacity: 0;
        transform: translateY(15px);
        animation: itemEnter 0.6s ease forwards 0.6s;
    }
    .splash-subtext {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 1.25rem;
        font-weight: 500;
        color: rgba(199, 210, 254, 0.8);
        margin: 0;
        opacity: 0;
        animation: itemFadeIn 0.8s ease forwards 1s;
    }
    .splash-loader {
        margin-top: 40px;
        width: 200px;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
        opacity: 0;
        animation: itemFadeIn 0.5s ease forwards 1.2s;
    }
    .splash-loader-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #8b5cf6, #3b82f6);
        border-radius: 4px;
        animation-name: loaderFill;
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        animation-fill-mode: forwards;
        animation-delay: 1.2s;
    }
    .splash-skip-btn {
        margin-top: 30px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: rgba(255,255,255,0.8);
        padding: 8px 20px;
        border-radius: 99px;
        cursor: pointer;
        opacity: 0;
        animation: itemFadeIn 0.5s ease forwards 1.5s;
        transition: all 0.2s;
    }
    .splash-skip-btn:hover {
        background: rgba(255,255,255,0.2);
        color: #fff;
        transform: scale(1.05);
    }
    
    @keyframes rotateBg {
        0% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.1); }
        100% { transform: rotate(360deg) scale(1); }
    }
    @keyframes contentEnter {
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes itemEnter {
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes itemFadeIn {
        to { opacity: 1; }
    }
    @keyframes loaderFill {
        to { width: 100%; }
    }
    
    @media (max-width: 600px) {
        .splash-text { font-size: 2.2rem; }
        .splash-subtext { font-size: 1rem; }
        .splash-logo { width: 90px; height: 90px; }
    }
    `;

    const js = `
    (function() {
        var splash = document.getElementById('premium-splash-screen');
        var skipBtn = document.getElementById('splash-skip-btn');
        var loadBtn = document.getElementById('splash-load-btn');
        var timeoutId;
        
        function hideSplash() {
            if (!splash) return;
            splash.classList.add('hidden');
            setTimeout(function() {
                if (splash.parentNode) splash.parentNode.removeChild(splash);
            }, 1000); // Wait for fade out
        }

        if (splash) {
            timeoutId = setTimeout(hideSplash, ${duration});
            
            if (skipBtn) {
                skipBtn.addEventListener('click', function() {
                    if (timeoutId) clearTimeout(timeoutId);
                    hideSplash();
                });
            }

            if (loadBtn) {
                loadBtn.addEventListener('click', function() {
                    if (window.triggerLoadProgress) {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = function(e) {
                            var file = e.target.files[0];
                            if (!file) return;
                            var reader = new FileReader();
                            reader.readAsText(file, "UTF-8");
                            reader.onload = function(readerEvent) {
                                var content = readerEvent.target.result;
                                window.loadProgressData(content);
                                if (timeoutId) clearTimeout(timeoutId);
                                hideSplash();
                                alert("Progress loaded successfully!");
                            };
                        };
                        input.click();
                    } else {
                        alert(" TutoMy loading engine is warming up, please click Skip first then use the 'Load Progress' button in the header!");
                    }
                });
            }
        }
    })();
    `;

    return { html, css, js };
};
