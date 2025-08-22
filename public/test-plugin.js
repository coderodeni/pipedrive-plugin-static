/**
 * Prosty test pluginu NIP Field z GUS dla Pipedrive
 * Sprawdza podstawową funkcjonalność bez skomplikowanych bundli
 */

console.log('🚀 NIP GUS Plugin - Test version loading...');

// Sprawdź kontekst Pipedrive
if (typeof window !== 'undefined') {
    console.log('✅ Window object available');
    console.log('🔍 Pipedrive context:', window.Pipedrive ? 'Available' : 'Not available');
    console.log('🌐 Current URL:', window.location.href);
    console.log('📍 Hostname:', window.location.hostname);
}

// Funkcja testowa do wstrzyknięcia prostego UI
function createTestPlugin() {
    console.log('🔧 Creating test plugin UI...');
    
    // Znajdź kontener
    const containers = [
        '.organization-fields',
        '.custom-fields', 
        '.details-section',
        '.organization-form',
        '.organization-details',
        '.main-content',
        '.content-area',
        '.organization-view'
    ];
    
    let container = null;
    for (const selector of containers) {
        container = document.querySelector(selector);
        if (container) {
            console.log('✅ Found container:', selector);
            break;
        }
    }
    
    if (!container) {
        container = document.body;
        console.log('⚠️ Using body as fallback container');
    }
    
    // Utwórz testowy box
    const testBox = document.createElement('div');
    testBox.id = 'nip-gus-test-plugin';
    testBox.style.cssText = `
        background: #f8f9fa;
        border: 2px solid #007bff;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    testBox.innerHTML = `
        <h4 style="color: #007bff; margin: 0 0 15px 0;">
            🎯 NIP Field z GUS - Test Plugin
        </h4>
        <p style="margin: 0 0 15px 0; color: #6c757d;">
            Plugin został pomyślnie załadowany i wstrzyknięty do strony organizacji.
        </p>
        <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Test NIP Field:</label>
            <input type="text" id="test-nip-field" placeholder="XXX-XXX-XX-XX" 
                   style="width: 200px; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
            <button id="test-authorize-btn" 
                    style="margin-left: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Test Autoryzacji
            </button>
        </div>
        <div id="test-status" style="margin-top: 15px; padding: 10px; background: #e9ecef; border-radius: 4px;">
            Status: Plugin załadowany ✅
        </div>
    `;
    
    // Wstrzyknij do kontenera
    container.appendChild(testBox);
    console.log('✅ Test plugin UI injected successfully');
    
    // Dodaj event listenery
    const nipField = document.getElementById('test-nip-field');
    const authBtn = document.getElementById('test-authorize-btn');
    const status = document.getElementById('test-status');
    
    if (nipField) {
        nipField.addEventListener('input', (e) => {
            const value = e.target.value;
            console.log('📝 NIP input:', value);
            status.textContent = `Status: Wprowadzono NIP: ${value}`;
        });
    }
    
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            console.log('🔐 Test authorization clicked');
            status.innerHTML = 'Status: <strong>Test autoryzacji kliknięty!</strong> 🚀';
            
            // Symuluj sprawdzenie localStorage
            const sessionId = localStorage.getItem('nip_gus_session_id');
            if (sessionId) {
                status.innerHTML += `<br>Session ID: ${sessionId.substring(0, 20)}...`;
            } else {
                status.innerHTML += '<br>Brak session ID w localStorage';
            }
        });
    }
    
    return testBox;
}

// Funkcja inicjalizacji
function initTestPlugin() {
    console.log('🎬 Initializing test plugin...');
    
    // Sprawdź czy jesteśmy na stronie organizacji
    const isOrgPage = window.location.pathname.includes('/organization/') || 
                     window.location.pathname.includes('/organizations/');
    
    if (!isOrgPage) {
        console.log('⚠️ Not on organization page, skipping plugin initialization');
        return;
    }
    
    console.log('✅ On organization page, proceeding with initialization');
    
    // Sprawdź czy plugin już istnieje
    if (document.getElementById('nip-gus-test-plugin')) {
        console.log('⚠️ Test plugin already exists, removing old instance');
        document.getElementById('nip-gus-test-plugin').remove();
    }
    
    // Utwórz plugin
    const plugin = createTestPlugin();
    
    // Sprawdź session z URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get('nip_gus_session');
    
    if (sessionFromUrl) {
        console.log('🔑 Found session in URL:', sessionFromUrl.substring(0, 20) + '...');
        localStorage.setItem('nip_gus_session_id', sessionFromUrl);
        
        // Usuń z URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('nip_gus_session');
        window.history.replaceState({}, '', newUrl);
        
        const status = document.getElementById('test-status');
        if (status) {
            status.innerHTML = 'Status: Session zapisana z URL ✅';
        }
    }
    
    console.log('🎉 Test plugin initialization complete!');
}

// Inicjalizacja po załadowaniu DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestPlugin);
} else {
    // DOM już załadowany
    setTimeout(initTestPlugin, 100);
}

// Eksportuj dla debugowania
window.NipGusTestPlugin = {
    init: initTestPlugin,
    create: createTestPlugin
};

console.log('📦 NIP GUS Test Plugin loaded successfully');
