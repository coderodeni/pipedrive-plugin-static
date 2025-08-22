// Najprostszy możliwy test - czy Pipedrive w ogóle ładuje skrypty
console.log('🔥 PIPEDRIVE PLUGIN DEBUG - SCRIPT LOADED!');
alert('🎯 NIP GUS Plugin - Test skryptu załadowany!');

// Dodaj coś widocznego na stronie
setTimeout(() => {
    const body = document.body;
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '🚀 PLUGIN DZIAŁA! Skrypt został załadowany przez Pipedrive.';
    testDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: red;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 16px;
        font-weight: bold;
    `;
    body.appendChild(testDiv);

    console.log('🎯 Test div added to page');
}, 1000);
