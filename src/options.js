// Load saved settings
async function loadSettings() {
    const result = await browser.storage.sync.get('selectedCountries');
    return result.selectedCountries || defaultCountries;
}

// Save settings
async function saveSettings(selectedCountries) {
    await browser.storage.sync.set({ selectedCountries });
}

// Show status message
function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${isError ? 'error' : 'success'}`;
    status.style.display = 'block';

    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

// Render countries list
async function renderCountries() {
    const selectedCountries = await loadSettings();
    const container = document.getElementById('countriesList');
    container.innerHTML = '';
    
    for (const [code, name] of Object.entries(countryNames)) {
        const div = document.createElement('div');
        div.className = 'country-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `country-${code}`;
        checkbox.value = code;
        checkbox.checked = selectedCountries.includes(code);
        
        const label = document.createElement('label');
        label.htmlFor = `country-${code}`;
        label.textContent = name;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    }
}

// Get selected countries from checkboxes
function getSelectedCountries() {
    const checkboxes = document.querySelectorAll('#countriesList input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Save button handler
document.getElementById('saveBtn').addEventListener('click', async () => {
    const selected = getSelectedCountries();

    if (selected.length === 0) {
        showStatus('Please select at least one country', true);
        return;
    }

    await saveSettings(selected);
    showStatus('Settings saved successfully!');
});

// Select all button handler
document.getElementById('selectAllBtn').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#countriesList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
});

// Deselect all button handler
document.getElementById('deselectAllBtn').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#countriesList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
});

// Initialize
renderCountries();