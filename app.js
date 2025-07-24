// Global Variables
let billItems = [];
let nextItemId = 1;
let selectedQuickItems = [];
let currentDaysUnit = 'days';

// Selected items for multi-select search
let selectedGlobalItems = [];

// Function to show/hide selected tags container
function toggleSelectedTagsContainer() {
    const selectedTagsContainer = document.getElementById('selectedTags');
    const multiSelectActions = document.getElementById('multiSelectActions');
    
    if (selectedGlobalItems && selectedGlobalItems.length > 0) {
        if (selectedTagsContainer) {
            selectedTagsContainer.style.display = 'flex';
            updateSelectedTagsDisplay();
        }
        if (multiSelectActions) {
            multiSelectActions.style.display = 'block';
            updateSelectedCount();
        }
    } else {
        if (selectedTagsContainer) {
            selectedTagsContainer.style.display = 'none';
            selectedTagsContainer.innerHTML = ''; // Clear content when hiding
        }
        if (multiSelectActions) {
            multiSelectActions.style.display = 'none';
        }
    }
}

// Function to update selected tags display
function updateSelectedTagsDisplay() {
    const selectedTagsContainer = document.getElementById('selectedTags');
    if (!selectedTagsContainer) return;
    
    let tagsHTML = '';
    selectedGlobalItems.forEach((item, index) => {
        tagsHTML += `
            <span class="selected-tag" style="background: rgba(0, 201, 167, 0.2); border: 1px solid rgba(0, 201, 167, 0.4); border-radius: 12px; padding: 4px 8px; font-size: 11px; color: var(--secondary); display: inline-flex; align-items: center; gap: 4px;">
                ${item.name}
                <i class="fas fa-times" onclick="removeSelectedGlobalItem(${index})" style="cursor: pointer; opacity: 0.7;" title="Remove"></i>
            </span>
        `;
    });
    selectedTagsContainer.innerHTML = tagsHTML;
}

// Function to update selected count
function updateSelectedCount() {
    const selectedCountElement = document.getElementById('selectedCount');
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedGlobalItems.length;
    }
}

// Function to remove selected global item
function removeSelectedGlobalItem(index) {
    if (index >= 0 && index < selectedGlobalItems.length) {
        selectedGlobalItems.splice(index, 1);
        toggleSelectedTagsContainer();
        showToast('Item removed from selection', 'info');
    }
}

// Safe localStorage wrapper with fallback
function safeLocalStorage() {
    try {
        if (typeof Storage !== "undefined" && window.localStorage) {
            // Test localStorage availability
            const testKey = '__test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return {
                getItem: (key) => localStorage.getItem(key),
                setItem: (key, value) => localStorage.setItem(key, value),
                removeItem: (key) => localStorage.removeItem(key)
            };
        }
    } catch (e) {
        console.warn('localStorage not available, using memory fallback:', e.message);
    }
    
    // Fallback to memory storage
    const memoryStorage = {};
    return {
        getItem: (key) => memoryStorage[key] || null,
        setItem: (key, value) => { memoryStorage[key] = value; },
        removeItem: (key) => { delete memoryStorage[key]; }
    };
}

// Initialize safe storage
const storage = safeLocalStorage();

// Usage tracking for smart suggestions
let itemUsageStats = {};
try {
    const stored = storage.getItem('hospitalBilling_itemUsage');
    itemUsageStats = stored ? JSON.parse(stored) : {};
} catch (e) {
    console.warn('Failed to parse usage stats, using empty object:', e.message);
    itemUsageStats = {};
}

// Initialize missing global variables
window.selectedMedicine = null;
window.currentCalculation = null;
window.currentMedicines = [];
window.currentCategoryItems = [];
window.currentCategory = '';
window.selectedORProcedures = [];
window.currentORItems = [];
window.additionalSurgeries = [];
window.selectedORProcedure = null;
window.currentORCalculation = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize selected items array
    if (!window.selectedGlobalItems) {
        window.selectedGlobalItems = [];
    }
    
    // Hide selected tags container initially
    toggleSelectedTagsContainer();
    
    addUIEnhancements();

    let retries = 0;
    const maxRetries = 5;

    function checkDatabaseAPI() {
        if (window.dbAPI) {
            init();
        } else if (retries < maxRetries) {
            retries++;
            setTimeout(checkDatabaseAPI, 500);
        } else {
            console.error('Database API not available after multiple retries');
            showToast('Database connection failed. Some features may not work.', 'warning');
            initWithoutDatabase();
        }
    }

    checkDatabaseAPI();
});

// Setup bill generator - missing function that was causing initialization errors
function setupBillGenerator() {
    try {
        // Set current date for bills
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateInput = document.getElementById('billDate');
        if (dateInput) {
            dateInput.value = dateStr;
        }

        // Generate unique bill number
        const billNumber = 'BILL-' + Date.now().toString().slice(-6);
        const billNumberInput = document.getElementById('billNumber');
        if (billNumberInput) {
            billNumberInput.value = billNumber;
        }

        // Initialize patient info display
        updatePatientInfo();

        console.log('Bill generator setup completed');
    } catch (error) {
        console.error('Error setting up bill generator:', error);
    }
}

// Add UI enhancements and animations
// Quick action buttons will not auto-populate - manual entry only

function addUIEnhancements() {
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList && 
            (e.target.classList.contains('btn') || e.target.classList.contains('export-button') || e.target.classList.contains('nav-button'))) {
            e.target.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (e.target) {
                    e.target.style.transform = '';
                }
            }, 150);
        }
    });

    const exportButtons = document.querySelectorAll('.export-button');
    exportButtons.forEach(button => {
        if (button) {
            button.addEventListener('mouseenter', function() {
                if (this && this.style) {
                    this.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            });

            button.addEventListener('mouseleave', function() {
                if (this && this.style) {
                    this.style.background = 'rgba(255, 255, 255, 0.05)';
                }
            });
        }
    });

    const totalElement = document.getElementById('topGrandTotal');
    if (totalElement) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    totalElement.style.transform = 'scale(1.1)';
                    totalElement.style.color = 'var(--secondary)';
                    setTimeout(() => {
                        totalElement.style.transform = 'scale(1)';
                        totalElement.style.color = '';
                    }, 300);
                }
            });
        });

        observer.observe(totalElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
}

// Initialize with database
async function init() {
    try {
        // Only show loading if the function exists
        if (typeof showLoading === 'function') {
            showLoading(true);
        }
        
        // Initialize basic functions
        updateBillPreview();
        updatePatientInfo();
        setCurrentDate();
        generateBillNumber();

        if (window.dbAPI) {
            try {
                const allItems = await window.dbAPI.getAllItems();
                const systemItems = await window.dbAPI.getSystemItems();
                const userItems = await window.dbAPI.getUserItems();
                
                console.log(`📊 Database Status: ${allItems.length} total items`);
                console.log(`🔧 System items: ${systemItems.length} | 👤 User items: ${userItems.length}`);
                
                // Initialize global search after database is ready
                if (typeof initializeGlobalSearch === 'function') {
                    await initializeGlobalSearch();
                } else {
                    console.log('initializeGlobalSearch function not available, skipping');
                }
                
                if (systemItems.length > 0) {
                    showToast(`✅ System Database Active: ${systemItems.length} system items loaded`, 'success');
                } else {
                    showToast('Hospital Billing System loaded - system database empty', 'info');
                }
            } catch (dbError) {
                console.error('Database connection error:', dbError);
                showToast('Database connection failed. Some features may not work properly.', 'warning');
            }
        } else {
            showToast('Database API not available - running in limited mode', 'warning');
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('System loaded with limited functionality', 'warning');
    } finally {
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
    }
}

// Initialize without database (fallback)

// Category selection function for index.html (button version)
function selectCategory(categoryName) {
    // Update the hidden select value
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = categoryName;
    }

    // Update button visual states
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Find and activate the clicked button
    const clickedBtn = document.querySelector(`[data-category="${categoryName}"]`);
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }

    // Call the existing show item input function
    if (typeof showItemInput === 'function') {
        showItemInput();
    } else {
        console.warn('showItemInput function not found');
    }
}

// Category selection function for compact list (exclusive selection)
function selectCategoryFromList(categoryName) {
    // Clear all active states from all category selection elements
    document.querySelectorAll('.category-list-item, .category-hex-item, .category-compact-btn').forEach(item => {
        item.classList.remove('active');
    });

    // Get the current item and activate it
    const currentItem = document.querySelector(`[data-category="${categoryName}"]`);
    if (currentItem) {
        currentItem.classList.add('active');
    }

    // Update the hidden select value
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = categoryName;
    }

    // Call the existing show item input function
    if (typeof showItemInput === 'function') {
        showItemInput();
    } else {
        console.warn('showItemInput function not found');
    }

    showToast(`${categoryName} category selected - working cleanly with this category only`, 'success');
}

// Make function globally available
window.selectCategoryFromList = selectCategoryFromList;

// Category selection function for checkbox list (exclusive selection) - kept for compatibility
function selectCategoryCheckbox(categoryName) {
    // Clear all other checkboxes first (only one can be active)
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        if (checkbox.value !== categoryName) {
            checkbox.checked = false;
        }
    });

    // Clear all active states
    document.querySelectorAll('.category-check-item').forEach(item => {
        item.classList.remove('active');
    });

    // Get the current checkbox
    const currentCheckbox = document.querySelector(`#category${categoryName.replace(/[^a-zA-Z]/g, '')}`);
    const currentItem = document.querySelector(`[data-category="${categoryName}"]`);

    // If the checkbox was just unchecked, clear everything
    if (!currentCheckbox || !currentCheckbox.checked) {
        // Update the hidden select value
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            categorySelect.value = '';
        }
        
        // Clear dynamic inputs
        const dynamicInputs = document.getElementById('dynamicInputs');
        if (dynamicInputs) {
            dynamicInputs.innerHTML = '';
        }
        
        showToast('Category selection cleared', 'info');
        return;
    }

    // Activate the selected category
    if (currentItem) {
        currentItem.classList.add('active');
    }

    // Update the hidden select value
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = categoryName;
    }

    // Call the existing show item input function
    if (typeof showItemInput === 'function') {
        showItemInput();
    } else {
        console.warn('showItemInput function not found');
    }

    showToast(`${categoryName} category selected - working cleanly with this category only`, 'success');
}

// Quick action handlers with exclusive category support
async function handleRegistration() {
    try {
        console.log('HandleRegistration called');
        
        // Check if Registration items exist in database
        const items = await getItemsByCategory('Registration');
        console.log('Registration items found:', items);
        
        if (items.length === 0) {
            // If no items exist, create default Registration entry
            const defaultRegistration = {
                category: 'Registration',
                name: 'Registration Fee',
                type: 'Standard',
                strength: '',
                quantity: 1,
                price: 50, // Default price
                totalPrice: 50
            };
            
            addItemToBill(defaultRegistration);
            showToast('Registration Fee added to bill - ৳50', 'success');
        } else if (items.length === 1) {
            // If only one item exists, add it directly
            const item = items[0];
            const billItem = {
                category: item.category,
                name: item.name,
                type: item.type || 'Standard',
                strength: item.strength || '',
                quantity: 1,
                price: item.price,
                totalPrice: item.price
            };
            
            addItemToBill(billItem);
            showToast(`${item.name} added to bill - ৳${item.price}`, 'success');
        } else {
            // If multiple items exist, show selection interface with checkboxes
            console.log('Showing registration selection interface for', items.length, 'items');
            showRegistrationSelection(items);
        }
    } catch (error) {
        console.error('Error handling Registration:', error);
        
        // Fallback: add default item
        const defaultRegistration = {
            category: 'Registration',
            name: 'Registration Fee',
            type: 'Standard',
            strength: '',
            quantity: 1,
            price: 50,
            totalPrice: 50
        };
        
        addItemToBill(defaultRegistration);
        showToast('Registration Fee added to bill - ৳50 (default)', 'success');
    }
}

async function handleDrFee() {
    try {
        // Check if Dr. Fee items exist in database
        const items = await getItemsByCategory('Dr. Fee');
        
        if (items.length === 0) {
            // If no items exist, create default Dr. Fee entry
            const defaultDrFee = {
                category: 'Dr. Fee',
                name: 'Doctor Consultation Fee',
                type: 'Consultation',
                strength: '',
                quantity: 1,
                price: 300, // Default price
                totalPrice: 300
            };
            
            addItemToBill(defaultDrFee);
        } else {
            // If items exist, add the first one
            const firstItem = items[0];
            addItemToBill(firstItem);
        }
    } catch (error) {
        console.error('Error handling Dr. Fee:', error);
        
        // Fallback: add default item
        const defaultDrFee = {
            category: 'Dr. Fee',
            name: 'Doctor Consultation Fee',
            type: 'Consultation',
            strength: '',
            quantity: 1,
            price: 300,
            totalPrice: 300
        };
        
        addItemToBill(defaultDrFee);
    }
}

async function handleMedicFee() {
    try {
        // Check if Medic Fee items exist in database
        const items = await getItemsByCategory('Medic Fee');
        
        if (items.length === 0) {
            // If no items exist, create default Medic Fee entry
            const defaultMedicFee = {
                category: 'Medic Fee',
                name: 'Medical Staff Fee',
                type: 'Service',
                strength: '',
                quantity: 1,
                price: 100, // Default price
                totalPrice: 100
            };
            
            addItemToBill(defaultMedicFee);
        } else {
            // If items exist, add the first one
            const firstItem = items[0];
            addItemToBill(firstItem);
        }
    } catch (error) {
        console.error('Error handling Medic Fee:', error);
        
        // Fallback: add default item
        const defaultMedicFee = {
            category: 'Medic Fee',
            name: 'Medical Staff Fee',
            type: 'Service',
            strength: '',
            quantity: 1,
            price: 100,
            totalPrice: 100
        };
        
        addItemToBill(defaultMedicFee);
    }
}



// Show Registration selection modal (multi-select with checkboxes)
function showRegistrationSelection(items) {
    console.log('Creating Registration selection modal with items:', items);
    
    // Determine category type based on first item
    const categoryType = items.length > 0 ? items[0].category : 'Registration';
    const isOffChargeOB = categoryType.toLowerCase().includes('off-charge') || categoryType.toLowerCase().includes('ob');
    
    const modalTitle = isOffChargeOB ? 'Select Off-Charge/OB Services' : 'Select Registration Services';
    const modalIcon = isOffChargeOB ? 'fas fa-baby' : 'fas fa-user-plus';
    const modalId = isOffChargeOB ? 'offChargeSelectionModal' : 'registrationSelectionModal';
    const itemPrefix = isOffChargeOB ? 'offcharge' : 'registration';
    
    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content" style="background: var(--dark); border: 1px solid rgba(0, 201, 167, 0.3);">
                    <div class="modal-header" style="border-bottom: 1px solid rgba(0, 201, 167, 0.3);">
                        <h5 class="modal-title" style="color: var(--secondary);">
                            <i class="${modalIcon} me-2"></i>${modalTitle}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                        <div class="alert alert-info" style="background: rgba(0, 201, 167, 0.1); border: 1px solid rgba(0, 201, 167, 0.3); color: white;">
                            <i class="fas fa-info-circle me-2"></i>
                            Check items to add to bill, uncheck to remove from bill
                        </div>
                        <div class="row g-2">
                            ${items.map(item => `
                                <div class="col-md-6">
                                    <div class="form-check registration-item-check">
                                        <input class="form-check-input checkbox-to-bill" 
                                               type="checkbox" 
                                               value="${item.id}" 
                                               id="${itemPrefix}_${item.id}"
                                               data-item='${JSON.stringify(item)}'
                                               onchange="handleCheckboxToBill(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                                        <label class="form-check-label" for="${itemPrefix}_${item.id}">
                                            <div class="registration-item-info">
                                                <div class="registration-item-name">${item.name}</div>
                                                <div class="registration-item-details">${item.type || 'Service'} • ৳${item.price}</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid rgba(0, 201, 167, 0.3);">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Close
                        </button>
                        <button type="button" class="btn btn-outline-warning btn-sm" onclick="clearAllCheckboxSelections('${modalId}')">
                            <i class="fas fa-times-circle me-1"></i>Clear All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if present
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store items for later use
    if (isOffChargeOB) {
        window.currentOffChargeItems = items;
    } else {
        window.currentRegistrationItems = items;
    }

    // Show modal
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }

    // Clean up when modal is hidden
    document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
        this.remove();
        if (isOffChargeOB) {
            delete window.currentOffChargeItems;
        } else {
            delete window.currentRegistrationItems;
        }
    });
}



// Legacy functions kept for compatibility but now use checkbox-to-bill system
function addSelectedRegistrationItems() {
    showToast('Items are automatically added/removed when you check/uncheck them', 'info');
}

function addSelectedOffChargeItems() {
    showToast('Items are automatically added/removed when you check/uncheck them', 'info');
}

// Populate modal function (missing function that was causing the error)
function populateModal(items, categoryName) {
    console.log(`Populating modal with ${items.length} items for category: ${categoryName}`);
    
    // Store items globally for the modal
    if (categoryName.toLowerCase().includes('off-charge') || categoryName.toLowerCase().includes('ob')) {
        window.currentOffChargeItems = items;
    } else {
        window.currentRegistrationItems = items;
    }
    
    // Show the registration selection modal (it handles both registration and off-charge items)
    showRegistrationSelection(items);
}



// Universal checkbox-to-bill functionality
function createCheckboxToBillHandler(item, checkboxId) {
    return function(isChecked) {
        if (isChecked) {
            // Add item to bill
            const billItem = {
                id: `checkbox_${checkboxId}_${item.id}`,
                category: item.category,
                name: item.name,
                type: item.type || 'Service',
                strength: item.strength || '',
                quantity: 1,
                price: item.price,
                totalPrice: item.price,
                sourceCheckbox: checkboxId
            };
            
            addItemToBill(billItem);
            showToast(`${item.name} added to bill - ৳${item.price}`, 'success');
            
            // Update checkbox styling
            const label = document.querySelector(`label[for="${checkboxId}"]`);
            if (label) {
                label.style.background = 'rgba(0, 201, 167, 0.2)';
                label.style.borderColor = 'rgba(0, 201, 167, 0.4)';
                label.style.color = 'var(--secondary)';
            }
        } else {
            // Remove item from bill - improved logic
            if (!window.billItems) return;
            
            const itemsToRemove = window.billItems.filter(billItem => 
                billItem.sourceCheckbox === checkboxId &&
                (billItem.id === `checkbox_${checkboxId}_${item.id}` || 
                 (billItem.name === item.name && billItem.category === item.category))
            );
            
            itemsToRemove.forEach(billItem => {
                const index = window.billItems.findIndex(bi => bi.id === billItem.id);
                if (index > -1) {
                    window.billItems.splice(index, 1);
                }
            });
            
            if (itemsToRemove.length > 0) {
                updateBillDisplay();
                updateGrandTotal();
                updatePatientInfo();
                showToast(`${item.name} removed from bill`, 'info');
            }
            
            // Reset checkbox styling
            const label = document.querySelector(`label[for="${checkboxId}"]`);
            if (label) {
                label.style.background = '';
                label.style.borderColor = '';
                label.style.color = 'white';
            }
        }
    };
}

// Remove item from bill by checkbox ID
function removeItemFromBillByCheckbox(checkboxId, itemId) {
    if (!window.billItems) return;
    
    const itemsToRemove = window.billItems.filter(item => 
        item.sourceCheckbox === checkboxId || 
        (itemId && item.id === `checkbox_${checkboxId}_${itemId}`)
    );
    
    let removedNames = [];
    itemsToRemove.forEach(item => {
        const index = window.billItems.findIndex(billItem => billItem.id === item.id);
        if (index > -1) {
            const removed = window.billItems.splice(index, 1)[0];
            removedNames.push(removed.name);
        }
    });
    
    if (itemsToRemove.length > 0) {
        updateBillDisplay();
        updateGrandTotal();
        updatePatientInfo();
        
        // Reset checkbox styling
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            const label = document.querySelector(`label[for="${checkboxId}"]`);
            if (label) {
                label.style.background = '';
                label.style.borderColor = '';
                label.style.color = 'white';
            }
        }
        
        console.log(`Removed ${removedNames.length} items from bill: ${removedNames.join(', ')}`);
    }
}

// Enhanced Off-Charge/OB Check Night functionality
async function toggleOffChargeCheckNight() {
    const checkbox = document.getElementById('offChargeCheckNight');
    const label = document.querySelector('label[for="offChargeCheckNight"]');
    
    if (checkbox && checkbox.checked) {
        try {
            // Fetch Off-Charge/OB items from database
            const offChargeItems = await getItemsByCategory('Off-Charge/OB');
            
            if (offChargeItems && offChargeItems.length > 0) {
                // Add the first Off-Charge item to bill
                const offChargeItem = offChargeItems[0];
                const billItem = {
                    id: `checkbox_offChargeCheckNight_${offChargeItem.id}`,
                    category: offChargeItem.category,
                    name: offChargeItem.name + ' (Check Night)',
                    type: offChargeItem.type || 'Service',
                    strength: offChargeItem.strength || '',
                    quantity: 1,
                    price: offChargeItem.price,
                    totalPrice: offChargeItem.price,
                    sourceCheckbox: 'offChargeCheckNight'
                };
                
                addItemToBill(billItem);
                showToast(`Off-Charge/OB Check Night added to bill - ৳${offChargeItem.price}`, 'success');
                
                // Update checkbox label to show it's active
                if (label) {
                    label.style.background = 'rgba(255, 140, 200, 0.2)';
                    label.style.borderColor = 'rgba(255, 140, 200, 0.4)';
                    label.style.color = '#ff8cc8';
                }
            } else {
                // If no items found, uncheck the checkbox
                checkbox.checked = false;
                showToast('No Off-Charge/OB items found in database', 'warning');
            }
        } catch (error) {
            console.error('Error fetching Off-Charge/OB items:', error);
            checkbox.checked = false;
            showToast('Error fetching Off-Charge/OB items: ' + error.message, 'danger');
        }
    } else if (checkbox && !checkbox.checked) {
        // Checkbox unchecked - remove items from bill
        if (!window.billItems) return;
        
        console.log('Unchecking Off-Charge checkbox, current bill items:', window.billItems);
        
        // Find and remove Off-Charge items using multiple criteria
        const itemsToRemove = [];
        
        for (let i = window.billItems.length - 1; i >= 0; i--) {
            const billItem = window.billItems[i];
            
            const shouldRemove = (
                billItem.sourceCheckbox === 'offChargeCheckNight' ||
                billItem.category === 'Off-Charge/OB' ||
                (billItem.name && billItem.name.toLowerCase().includes('off charge')) ||
                (billItem.name && billItem.name.toLowerCase().includes('check night')) ||
                (billItem.id && billItem.id.toString().includes('offChargeCheckNight'))
            );
            
            if (shouldRemove) {
                console.log('Removing Off-Charge item:', billItem);
                itemsToRemove.push(billItem);
                window.billItems.splice(i, 1);
            }
        }
        
        if (itemsToRemove.length > 0) {
            updateBillDisplay();
            updateGrandTotal();
            updatePatientInfo();
            showToast(`Off-Charge/OB removed from bill (${itemsToRemove.length} item${itemsToRemove.length > 1 ? 's' : ''})`, 'info');
        } else {
            console.warn('No Off-Charge items found to remove');
            showToast('No Off-Charge items found to remove', 'warning');
        }
        
        // Reset checkbox label styling
        if (label) {
            label.style.background = '';
            label.style.borderColor = '';
            label.style.color = 'white';
        }
    }
}

// Universal checkbox-to-bill handler
function handleCheckboxToBill(checkbox, item) {
    if (!checkbox || !item) {
        console.warn('handleCheckboxToBill: Missing checkbox or item');
        return;
    }
    
    console.log(`Checkbox ${checkbox.id} ${checkbox.checked ? 'checked' : 'unchecked'} for item: ${item.name}`);
    
    const handler = createCheckboxToBillHandler(item, checkbox.id);
    handler(checkbox.checked);
}

// Clear all checkbox selections in a modal
function clearAllCheckboxSelections(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const checkboxes = modal.querySelectorAll('.checkbox-to-bill:checked');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const item = JSON.parse(checkbox.getAttribute('data-item'));
        const handler = createCheckboxToBillHandler(item, checkbox.id);
        handler(false);
    });
    
    showToast('All selections cleared from bill', 'info');
}

// Enhanced remove item function to handle checkbox synchronization
function removeItemFromBill(itemId) {
    if (!window.billItems) return;
    
    const index = window.billItems.findIndex(item => item.id === itemId);
    if (index > -1) {
        const removedItem = window.billItems.splice(index, 1)[0];
        
        // Uncheck corresponding checkbox if it exists
        if (removedItem.sourceCheckbox) {
            const checkbox = document.getElementById(removedItem.sourceCheckbox);
            if (checkbox) {
                checkbox.checked = false;
                // Reset checkbox styling
                const label = document.querySelector(`label[for="${removedItem.sourceCheckbox}"]`);
                if (label) {
                    label.style.background = '';
                    label.style.borderColor = '';
                    label.style.color = 'white';
                }
            }
        }
        
        updateBillDisplay();
        updateGrandTotal();
        updatePatientInfo();
        showToast(`${removedItem.name} removed from bill`, 'info');
    }
}

// Reset category selection function
function resetCategorySelection() {
    // Clear all active category selections from all category elements
    document.querySelectorAll('.category-list-item, .category-hex-item, .category-compact-btn').forEach(item => {
        item.classList.remove('active');
    });

    // Clear the hidden select value
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = '';
    }

    // Clear dynamic inputs
    const dynamicInputs = document.getElementById('dynamicInputs');
    if (dynamicInputs) {
        dynamicInputs.innerHTML = '';
    }

    // Clear any ongoing X-ray selections
    if (window.selectedXrayName) {
        window.selectedXrayName = null;
    }
    if (window.selectedORProcedure) {
        window.selectedORProcedure = null;
    }
    if (window.selectedMedicine) {
        window.selectedMedicine = null;
    }
    if (window.currentCalculation) {
        window.currentCalculation = null;
    }
    if (window.currentORCalculation) {
        window.currentORCalculation = null;
    }

    showToast('Category selection reset', 'info');
}

// Reset X-ray selection function
function resetXraySelection() {
    // Clear search inputs
    const xraySearch = document.getElementById('xraySearch');
    const xrayBrowseSelect = document.getElementById('xrayBrowseSelect');
    const selectedXrayInfo = document.getElementById('selectedXrayInfo');
    
    if (xraySearch) xraySearch.value = '';
    if (xrayBrowseSelect) xrayBrowseSelect.value = '';
    if (selectedXrayInfo) selectedXrayInfo.style.display = 'none';

    // Uncheck all view type checkboxes
    const viewCheckboxes = ['viewAP', 'viewLAT', 'viewOBLIQUE', 'viewBOTH'];
    viewCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });

    // Uncheck portable option
    const portableOption = document.getElementById('portableOption');
    if (portableOption) portableOption.checked = false;

    // Clear pricing inputs
    const xrayUnitPrice = document.getElementById('xrayUnitPrice');
    const xrayTotal = document.getElementById('xrayTotal');
    if (xrayUnitPrice) xrayUnitPrice.value = '';
    if (xrayTotal) xrayTotal.value = '';

    // Clear manual entry if active
    const manualEntryCheckbox = document.getElementById('manualEntryCheckbox');
    const manualEntryRow = document.getElementById('manualEntryRow');
    const xrayManualName = document.getElementById('xrayManualName');
    const xrayManualAmount = document.getElementById('xrayManualAmount');
    
    if (manualEntryCheckbox) manualEntryCheckbox.checked = false;
    if (manualEntryRow) manualEntryRow.style.display = 'none';
    if (xrayManualName) xrayManualName.value = '';
    if (xrayManualAmount) xrayManualAmount.value = '';

    // Hide calculation details
    const xrayCalculation = document.getElementById('xrayCalculation');
    if (xrayCalculation) xrayCalculation.style.display = 'none';

    // Hide action buttons
    const addXrayBtn = document.getElementById('addXrayBtn');
    if (addXrayBtn) addXrayBtn.style.display = 'none';

    // Clear global variables
    window.selectedXrayName = null;

    // Disable X-ray options
    if (typeof disableXrayOptions === 'function') {
        disableXrayOptions();
    }

    showToast('X-ray selection reset', 'info');
}

// O2/ISO Functions
async function showO2ISOInput(items) {
    const dynamicInputs = document.getElementById('dynamicInputs');

    try {
        // Initialize default items if database is empty
        if (items.length === 0) {
            console.log('O2/ISO database is empty, creating default items...');
            await initializeDefaultO2ISOItems();
            // Refresh items after initialization
            items = await getItemsByCategory('O2, ISO');
            console.log('Default O2/ISO items created:', items);
        }

        // Get base rates from database or use defaults
        let o2BaseRate = 65; // Default rate per liter per hour (2L = ৳130, so 1L = ৳65)
        let isoBaseRate = 30; // Default for iso per minute 30 taka

        const o2Items = items.filter(item => item.name.toLowerCase().includes('o2'));
        const isoItems = items.filter(item => item.name.toLowerCase().includes('iso'));

        // Update rates from database if available
        if (o2Items.length > 0) {
            o2BaseRate = parseFloat(o2Items[0].price) || 130;
        }
        if (isoItems.length > 0) {
            isoBaseRate = parseFloat(isoItems[0].price) || 30;
        }

        dynamicInputs.innerHTML = `
            <div class="o2-iso-container">
                <!-- O2 Service -->
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="o2ServiceCheckbox" onchange="toggleCompactO2Service()">
                    <label class="form-check-label" for="o2ServiceCheckbox" style="color: var(--secondary); font-weight: 600;">
                        <i class="fas fa-lungs me-2"></i>O2 Service
                    </label>
                </div>

                <div id="o2CompactOptions" style="display: none;" class="compact-options mb-3">
                    <!-- First line: L/Hour, Start Date, Start Time -->
                    <div class="row g-2 mb-2">
                        <div class="col-md-4">
                            <label class="form-label small">L/Hour</label>
                            <input type="number" class="form-control form-control-sm" id="o2LitersHour" 
                                   value="2" min="0" step="0.5" oninput="calculateCompactO2()">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small">Start Date</label>
                            <div class="date-time-input-group">
                                <input type="date" class="form-control form-control-sm" id="o2StartDate" onchange="calculateCompactO2(); updateO2StartDateDisplay()">
                                <input type="text" class="form-control form-control-sm" id="o2StartDateManual" 
                                       placeholder="DD-MM-YY" maxlength="8" 
                                       oninput="handleO2ManualDateEntry('start')" 
                                       onfocus="document.getElementById('o2StartDate').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small">Start Time</label>
                            <div class="date-time-input-group">
                                <input type="time" class="form-control form-control-sm" id="o2StartTime" onchange="calculateCompactO2(); updateO2StartTimeDisplay()">
                                <input type="text" class="form-control form-control-sm" id="o2StartTimeManual" 
                                       placeholder="12:00 PM" maxlength="8" 
                                       oninput="handleO2ManualTimeEntry('start')" 
                                       onfocus="document.getElementById('o2StartTime').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                    </div>
                    <!-- Second line: End Date, End Time, Total Hours, Total Cost -->
                    <div class="row g-2">
                        <div class="col-md-3">
                            <label class="form-label small">End Date</label>
                            <div class="date-time-input-group">
                                <input type="date" class="form-control form-control-sm" id="o2EndDate" onchange="calculateCompactO2FromEnd(); updateO2EndDateDisplay()">
                                <input type="text" class="form-control form-control-sm" id="o2EndDateManual" 
                                       placeholder="DD-MM-YY" maxlength="8" 
                                       oninput="handleO2ManualDateEntry('end')" 
                                       onfocus="document.getElementById('o2EndDate').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small">End Time</label>
                            <div class="date-time-input-group">
                                <input type="time" class="form-control form-control-sm" id="o2EndTime" onchange="calculateCompactO2FromEnd(); updateO2EndTimeDisplay()">
                                <input type="text" class="form-control form-control-sm" id="o2EndTimeManual" 
                                       placeholder="12:00 PM" maxlength="8" 
                                       oninput="handleO2ManualTimeEntry('end')" 
                                       onfocus="document.getElementById('o2EndTime').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small">Total Oxygen</label>
                            <input type="text" class="form-control form-control-sm" id="o2TotalHours" 
                                   readonly style="background: rgba(255,255,255,0.1);">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small">Total Cost</label>
                            <input type="text" class="form-control form-control-sm" id="o2TotalCost" 
                                   readonly style="background: rgba(0,201,167,0.1); color: var(--secondary); font-weight: bold;">
                        </div>
                    </div>
                </div>

                <!-- ISO Service -->
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="isoServiceCheckbox" onchange="toggleCompactISOService()">
                    <label class="form-check-label" for="isoServiceCheckbox" style="color: var(--secondary); font-weight: 600;">
                        <i class="fas fa-gas-pump me-2"></i>ISO Service
                    </label>
                </div>

                <div id="isoCompactOptions" style="display: none;" class="compact-options mb-3">
                    <!-- First line: Start Date, Start Time -->
                    <div class="row g-2 mb-2">
                        <div class="col-md-6">
                            <label class="form-label small">Start Date</label>
                            <div class="date-time-input-group">
                                <input type="date" class="form-control form-control-sm" id="isoStartDate" onchange="calculateCompactISO(); updateISOStartDateDisplay()">
                                <input type="text" class="form-control form-control-sm" id="isoStartDateManual" 
                                       placeholder="DD-MM-YY" maxlength="8" 
                                       oninput="handleISOManualDateEntry('start')" 
                                       onfocus="document.getElementById('isoStartDate').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small">Start Time</label>
                            <div class="date-time-input-group">
                                <input type="time" class="form-control form-control-sm" id="isoStartTime" onchange="calculateCompactISO(); updateISOStartTimeDisplay()">
                                <input type="text" class="form-control form-control-sm" id="isoStartTimeManual" 
                                       placeholder="12:00 PM" maxlength="8" 
                                       oninput="handleISOManualTimeEntry('start')" 
                                       onfocus="document.getElementById('isoStartTime').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                    </div>
                    <!-- Second line: End Date, End Time, Total Cost -->
                    <div class="row g-2">
                        <div class="col-md-3">
                            <label class="form-label small">End Date</label>
                            <div class="date-time-input-group">
                                <input type="date" class="form-control form-control-sm" id="isoEndDate" onchange="calculateCompactISOFromEnd(); updateISOEndDateDisplay()">
                                <input type="text" class="form-control form-control-sm" id="isoEndDateManual" 
                                       placeholder="DD-MM-YY" maxlength="8" 
                                       oninput="handleISOManualDateEntry('end')" 
                                       onfocus="document.getElementById('isoEndDate').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small">End Time</label>
                            <div class="date-time-input-group">
                                <input type="time" class="form-control form-control-sm" id="isoEndTime" onchange="calculateCompactISOFromEnd(); updateISOEndTimeDisplay()">
                                <input type="text" class="form-control form-control-sm" id="isoEndTimeManual" 
                                       placeholder="12:00 PM" maxlength="8" 
                                       oninput="handleISOManualTimeEntry('end')" 
                                       onfocus="document.getElementById('isoEndTime').focus()"
                                       style="cursor: pointer; display: none;">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small">Minutes</label>
                            <input type="number" class="form-control form-control-sm" id="isoTotalMinutes" 
                                   readonly style="background: rgba(255,255,255,0.1);">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small">Total Cost</label>
                            <input type="text" class="form-control form-control-sm" id="isoTotalCost" 
                                   readonly style="background: rgba(0,201,167,0.1); color: var(--secondary); font-weight: bold;">
                        </div>
                    </div>
                </div>

                <!-- Add Button -->
                <div class="text-center">
                    <button type="button" class="btn btn-primary" onclick="addCompactO2ISOToBill()" id="addCompactO2ISOBtn" style="display: none;">
                        <i class="fas fa-plus-circle me-1"></i>Add to Bill
                    </button>
                </div>
            </div>
        `;

        // Store rates globally
        window.compactO2BaseRate = o2BaseRate;
        window.compactISOBaseRate = isoBaseRate;

        // Initialize date/time values immediately after DOM is ready
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');

        // Use setTimeout to ensure DOM elements are fully rendered
        setTimeout(() => {
            // Set hidden inputs with existence checks
            const o2StartDate = document.getElementById('o2StartDate');
            const o2StartTime = document.getElementById('o2StartTime');
            const isoStartDate = document.getElementById('isoStartDate');
            const isoStartTime = document.getElementById('isoStartTime');

            if (o2StartDate) {
                o2StartDate.value = currentDate;
                console.log('Set O2 start date:', currentDate);
            }
            
            if (o2StartTime) {
                o2StartTime.value = currentTime;
                console.log('Set O2 start time:', currentTime);
            }
            
            if (isoStartDate) {
                isoStartDate.value = currentDate;
                console.log('Set ISO start date:', currentDate);
            }
            
            if (isoStartTime) {
                isoStartTime.value = currentTime;
                console.log('Set ISO start time:', currentTime);
            }

            // Set manual display inputs with existence checks and make them functional
            const o2StartDateManual = document.getElementById('o2StartDateManual');
            const o2StartTimeManual = document.getElementById('o2StartTimeManual');
            const isoStartDateManual = document.getElementById('isoStartDateManual');
            const isoStartTimeManual = document.getElementById('isoStartTimeManual');

            if (o2StartDateManual) {
                o2StartDateManual.value = formatDateToManual(currentDate);
                console.log('Set O2 manual date display:', formatDateToManual(currentDate));
            }
            
            if (o2StartTimeManual) {
                o2StartTimeManual.value = formatTimeTo12Hour(currentTime);
                console.log('Set O2 manual time display:', formatTimeTo12Hour(currentTime));
            }
            
            if (isoStartDateManual) {
                isoStartDateManual.value = formatDateToManual(currentDate);
                console.log('Set ISO manual date display:', formatDateToManual(currentDate));
            }
            
            if (isoStartTimeManual) {
                isoStartTimeManual.value = formatTimeTo12Hour(currentTime);
                console.log('Set ISO manual time display:', formatTimeTo12Hour(currentTime));
            }

            // Enable all form controls and make them functional
            const allInputs = document.querySelectorAll('#dynamicInputs input, #dynamicInputs select');
            allInputs.forEach(input => {
                input.disabled = false;
                input.readOnly = false;
            });

            // Add event listeners to ensure real-time updates
            const o2LitersHour = document.getElementById('o2LitersHour');
            if (o2LitersHour) {
                o2LitersHour.addEventListener('input', calculateCompactO2);
                o2LitersHour.addEventListener('change', calculateCompactO2);
            }

            // Make sure checkboxes work properly
            const o2Checkbox = document.getElementById('o2ServiceCheckbox');
            const isoCheckbox = document.getElementById('isoServiceCheckbox');
            
            if (o2Checkbox) {
                o2Checkbox.addEventListener('change', toggleCompactO2Service);
            }
            
            if (isoCheckbox) {
                isoCheckbox.addEventListener('change', toggleCompactISOService);
            }
        }, 200);

    } catch (error) {
        console.error('Error loading O2/ISO items:', error);
        showToast('Error loading O2/ISO items', 'danger');
        dynamicInputs.innerHTML = '<div class="alert alert-danger">Failed to load O2/ISO services</div>';
    }
}

function toggleCompactO2Service() {
    const checkbox = document.getElementById('o2ServiceCheckbox');
    const options = document.getElementById('o2CompactOptions');
    const addButton = document.getElementById('addCompactO2ISOBtn');
    
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
        calculateCompactO2();
        updateCompactAddButton();
    }
}

function toggleCompactISOService() {
    const checkbox = document.getElementById('isoServiceCheckbox');
    const options = document.getElementById('isoCompactOptions');
    const addButton = document.getElementById('addCompactO2ISOBtn');
    
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
        calculateCompactISO();
        updateCompactAddButton();
    }
}

function calculateCompactO2() {
    const litersHour = parseFloat(document.getElementById('o2LitersHour')?.value) || 2;
    const startDate = document.getElementById('o2StartDate')?.value;
    const startTime = document.getElementById('o2StartTime')?.value;
    const endDate = document.getElementById('o2EndDate')?.value;
    const endTime = document.getElementById('o2EndTime')?.value;
    
    if (startDate && startTime && endDate && endTime) {
        // Calculate duration from start to end
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);
        
        if (endDateTime <= startDateTime) {
            document.getElementById('o2TotalHours').value = '';
            document.getElementById('o2TotalCost').value = '';
            window.compactO2Calculation = null;
            updateCompactAddButton();
            return;
        }
        
        const totalHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
        
        // Update total oxygen display (liters/hour × hours = total liters)
        const totalOxygen = litersHour * totalHours;
        document.getElementById('o2TotalHours').value = totalOxygen.toFixed(2) + 'L';
        
        // Calculate cost: liters/hour × hours × base rate per liter
        const totalCost = litersHour * totalHours * window.compactO2BaseRate;
        document.getElementById('o2TotalCost').value = `৳${totalCost.toFixed(2)}`;
        
        // Store calculation
        window.compactO2Calculation = {
            litersHour: litersHour,
            startDate: startDate,
            startTime: startTime,
            endDate: endDate,
            endTime: endTime,
            totalHours: totalHours,
            totalOxygen: totalOxygen,
            totalCost: totalCost
        };
    } else {
        document.getElementById('o2TotalHours').value = '';
        document.getElementById('o2TotalCost').value = '';
        window.compactO2Calculation = null;
    }
    
    updateCompactAddButton();
}

function calculateCompactO2FromEnd() {
    calculateCompactO2();
}

function calculateCompactISO() {
    const startDate = document.getElementById('isoStartDate')?.value;
    const startTime = document.getElementById('isoStartTime')?.value;
    const endDate = document.getElementById('isoEndDate')?.value;
    const endTime = document.getElementById('isoEndTime')?.value;
    
    if (startDate && startTime && endDate && endTime) {
        // Calculate duration from start to end
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);
        
        if (endDateTime <= startDateTime) {
            document.getElementById('isoTotalMinutes').value = '';
            document.getElementById('isoTotalCost').value = '';
            document.getElementById('isoTotalHours').value = '';
            document.getElementById('isoTotalDays').value = '';
            window.compactISOCalculation = null;
            updateCompactAddButton();
            return;
        }
        
        const totalMinutes = (endDateTime - startDateTime) / (1000 * 60);
        const totalHours = totalMinutes / 60;
        const totalDays = totalHours / 24;
        
        // Update displays
        document.getElementById('isoTotalMinutes').value = Math.round(totalMinutes);
        document.getElementById('isoTotalHours').value = totalHours.toFixed(2);
        document.getElementById('isoTotalDays').value = totalDays.toFixed(2);
        
        // Calculate cost: minutes × base rate per minute
        const totalCost = totalMinutes * window.compactISOBaseRate;
        document.getElementById('isoTotalCost').value = `৳${totalCost.toFixed(2)}`;
        
        // Store calculation
        window.compactISOCalculation = {
            startDate: startDate,
            startTime: startTime,
            endDate: endDate,
            endTime: endTime,
            totalMinutes: totalMinutes,
            totalHours: totalHours,
            totalDays: totalDays,
            totalCost: totalCost
        };
    } else {
        document.getElementById('isoTotalMinutes').value = '';
        document.getElementById('isoTotalCost').value = '';
        document.getElementById('isoTotalHours').value = '';
        document.getElementById('isoTotalDays').value = '';
        window.compactISOCalculation = null;
    }
    
    updateCompactAddButton();
}

function calculateCompactISOFromEnd() {
    calculateCompactISO();
}

function updateCompactAddButton() {
    const o2Checkbox = document.getElementById('o2ServiceCheckbox');
    const isoCheckbox = document.getElementById('isoServiceCheckbox');
    const addButton = document.getElementById('addCompactO2ISOBtn');
    
    const hasO2 = o2Checkbox?.checked && window.compactO2Calculation?.totalCost > 0;
    const hasISO = isoCheckbox?.checked && window.compactISOCalculation?.totalCost > 0;
    
    if (addButton) {
        addButton.style.display = (hasO2 || hasISO) ? 'block' : 'none';
    }
}

function addCompactO2ISOToBill() {
    const o2Checkbox = document.getElementById('o2ServiceCheckbox');
    const isoCheckbox = document.getElementById('isoServiceCheckbox');
    let addedItems = 0;
    
    // Add O2 service if selected and calculated
    if (o2Checkbox?.checked && window.compactO2Calculation?.totalCost > 0) {
        const calc = window.compactO2Calculation;
        const o2Item = {
            id: Date.now() + Math.random(),
            category: 'O2, ISO',
            name: 'O2 Service',
            type: 'Oxygen Therapy',
            strength: `${calc.totalOxygen}L total (${calc.litersHour}L/hr × ${calc.totalHours}hrs)`,
            quantity: 1,
            price: calc.totalCost,
            totalPrice: calc.totalCost,
            description: `O2: ${calc.totalOxygen}L total - ${calc.litersHour}L/hr from ${calc.startDate} ${calc.startTime} to ${calc.endDate} ${calc.endTime} (${calc.totalHours}hrs)`
        };
        
        addItemToBill(o2Item);
        addedItems++;
    }
    
    // Add ISO service if selected and calculated
    if (isoCheckbox?.checked && window.compactISOCalculation?.totalCost > 0) {
        const calc = window.compactISOCalculation;
        const isoItem = {
            id: Date.now() + Math.random(),
            category: 'O2, ISO',
            name: 'ISO Service',
            type: 'Isoflurane Therapy',
            strength: `${Math.round(calc.totalMinutes)}min (${calc.totalHours}hrs)`,
            quantity: 1,
            price: calc.totalCost,
            totalPrice: calc.totalCost,
            description: `ISO: ${Math.round(calc.totalMinutes)} minutes from ${calc.startDate} ${calc.startTime} to ${calc.endDate} ${calc.endTime} (${calc.totalHours}hrs, ${calc.totalDays}days)`
        };
        
        addItemToBill(isoItem);
        addedItems++;
    }
    
    if (addedItems > 0) {
        const totalCost = (window.compactO2Calculation?.totalCost || 0) + (window.compactISOCalculation?.totalCost || 0);
        showToast(`${addedItems} O2/ISO service${addedItems > 1 ? 's' : ''} added to bill - ৳${totalCost.toFixed(2)}`, 'success');
        resetCompactO2ISOForm();
    } else {
        showToast('No services calculated to add', 'warning');
    }
}

function resetCompactO2ISOForm() {
    // Reset checkboxes
    const o2Checkbox = document.getElementById('o2ServiceCheckbox');
    const isoCheckbox = document.getElementById('isoServiceCheckbox');
    if (o2Checkbox) o2Checkbox.checked = false;
    if (isoCheckbox) isoCheckbox.checked = false;
    
    // Hide options
    const o2Options = document.getElementById('o2CompactOptions');
    const isoOptions = document.getElementById('isoCompactOptions');
    if (o2Options) o2Options.style.display = 'none';
    if (isoOptions) isoOptions.style.display = 'none';
    
    // Clear calculations
    window.compactO2Calculation = null;
    window.compactISOCalculation = null;
    
    // Update button
    updateCompactAddButton();
}

// Initialize default O2/ISO items when database is empty
async function initializeDefaultO2ISOItems() {
    try {
        console.log('Creating default O2/ISO items...');
        
        // Create default O2 service item
        const o2Item = {
            category: 'O2, ISO',
            name: 'O2 Service',
            type: 'Oxygen Therapy',
            strength: 'Per L/hr',
            price: 65, // Base rate per liter per hour (2L = ৳130, so 1L = ৳65)
            description: 'Oxygen therapy service - ৳65 per liter per hour'
        };

        // Create default ISO service item
        const isoItem = {
            category: 'O2, ISO',
            name: 'ISO Service',
            type: 'Isoflurane Therapy',
            strength: 'Per minute',
            price: 30, // Base rate per minute
            description: 'Isoflurane therapy service - ৳30 per minute base rate'
        };

        // Add items to database
        await window.dbAPI.addItem(o2Item);
        await window.dbAPI.addItem(isoItem);

        console.log('Default O2/ISO items created successfully');
        showToast('Default O2/ISO services initialized', 'success');
        
    } catch (error) {
        console.error('Error creating default O2/ISO items:', error);
        showToast('Failed to initialize O2/ISO services: ' + error.message, 'warning');
    }
}

// Make functions globally available
window.selectCategory = selectCategory;
window.selectCategoryFromList = selectCategoryFromList;
window.selectCategoryCheckbox = selectCategoryCheckbox;
window.handleRegistration = handleRegistration;
window.handleDrFee = handleDrFee;
window.handleMedicFee = handleMedicFee;
window.showRegistrationSelection = showRegistrationSelection;
window.addSelectedRegistrationItems = addSelectedRegistrationItems;
window.addSelectedOffChargeItems = addSelectedOffChargeItems;
window.populateModal = populateModal;
window.toggleOffChargeCheckNight = toggleOffChargeCheckNight;
window.handleCheckboxToBill = handleCheckboxToBill;
window.clearAllCheckboxSelections = clearAllCheckboxSelections;
window.createCheckboxToBillHandler = createCheckboxToBillHandler;
window.removeItemFromBillByCheckbox = removeItemFromBillByCheckbox;
window.selectGlobalFromQuickButton = selectGlobalFromQuickButton;
window.addAllSelectedItems = addAllSelectedItems;
window.clearAllSelectedItems = clearAllSelectedItems;
window.showSelectedItemsTotal = showSelectedItemsTotal;
window.removeSelectedGlobalItem = removeSelectedGlobalItem;
window.resetCategorySelection = resetCategorySelection;
window.resetXraySelection = resetXraySelection;
window.showO2ISOInput = showO2ISOInput;
window.toggleCompactO2Service = toggleCompactO2Service;
window.toggleCompactISOService = toggleCompactISOService;
window.calculateCompactO2 = calculateCompactO2;
window.calculateCompactISO = calculateCompactISO;
window.updateCompactAddButton = updateCompactAddButton;
window.addCompactO2ISOToBill = addCompactO2ISOToBill;
window.resetCompactO2ISOForm = resetCompactO2ISOForm;

// Manual Date and Time Entry Functions for O2/ISO
function formatDateToManual(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
}

function parseDateFromManual(manualString) {
    if (!manualString) return '';
    const parts = manualString.split('-');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        if (day.length === 2 && month.length === 2 && year.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    return '';
}

function formatTimeTo12Hour(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
}

function parseTimeFrom12Hour(timeString) {
    if (!timeString) return '';
    const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
        let hour = parseInt(match[1]);
        const minute = match[2];
        const ampm = match[3].toUpperCase();
        
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        return `${String(hour).padStart(2, '0')}:${minute}`;
    }
    return '';
}

// O2 Date/Time Handlers
function handleO2ManualDateEntry(type) {
    const manualInput = document.getElementById(`o2${type.charAt(0).toUpperCase() + type.slice(1)}DateManual`);
    const hiddenInput = document.getElementById(`o2${type.charAt(0).toUpperCase() + type.slice(1)}Date`);
    
    if (manualInput && hiddenInput) {
        const manualValue = manualInput.value.trim();
        const parsedDate = parseDateFromManual(manualValue);
        
        if (parsedDate) {
            hiddenInput.value = parsedDate;
            calculateCompactO2();
        } else if (manualValue === '') {
            hiddenInput.value = '';
            calculateCompactO2();
        }
    }
}

function handleO2ManualTimeEntry(type) {
    const manualInput = document.getElementById(`o2${type.charAt(0).toUpperCase() + type.slice(1)}TimeManual`);
    const hiddenInput = document.getElementById(`o2${type.charAt(0).toUpperCase() + type.slice(1)}Time`);
    
    if (manualInput && hiddenInput) {
        const manualValue = manualInput.value.trim();
        const parsedTime = parseTimeFrom12Hour(manualValue);
        
        if (parsedTime) {
            hiddenInput.value = parsedTime;
            calculateCompactO2();
        } else if (manualValue === '') {
            hiddenInput.value = '';
            calculateCompactO2();
        }
    }
}

function toggleO2DatePicker(type) {
    const hiddenInput = document.getElementById(`o2${type.charAt(0).toUpperCase() + type.slice(1)}Date`);
    if (hiddenInput) {
        hiddenInput.style.display = 'block';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.focus();
        hiddenInput.click();
        setTimeout(() => {
            hiddenInput.style.display = 'none';
        }, 100);
    }
}

function toggleO2TimePicker(type) {
    const hiddenInput = document.getElementById(`o2${type.charAt(0).toUpperCase() + type.slice(1)}Time`);
    if (hiddenInput) {
        hiddenInput.style.display = 'block';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.focus();
        hiddenInput.click();
        setTimeout(() => {
            hiddenInput.style.display = 'none';
        }, 100);
    }
}

function updateO2StartDateDisplay() {
    const hiddenInput = document.getElementById('o2StartDate');
    const manualInput = document.getElementById('o2StartDateManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatDateToManual(hiddenInput.value);
    }
}

function updateO2StartTimeDisplay() {
    const hiddenInput = document.getElementById('o2StartTime');
    const manualInput = document.getElementById('o2StartTimeManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatTimeTo12Hour(hiddenInput.value);
    }
}

function updateO2EndDateDisplay() {
    const hiddenInput = document.getElementById('o2EndDate');
    const manualInput = document.getElementById('o2EndDateManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatDateToManual(hiddenInput.value);
    }
}

function updateO2EndTimeDisplay() {
    const hiddenInput = document.getElementById('o2EndTime');
    const manualInput = document.getElementById('o2EndTimeManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatTimeTo12Hour(hiddenInput.value);
    }
}

// ISO Date/Time Handlers
function handleISOManualDateEntry(type) {
    const manualInput = document.getElementById(`iso${type.charAt(0).toUpperCase() + type.slice(1)}DateManual`);
    const hiddenInput = document.getElementById(`iso${type.charAt(0).toUpperCase() + type.slice(1)}Date`);
    
    if (manualInput && hiddenInput) {
        const manualValue = manualInput.value.trim();
        const parsedDate = parseDateFromManual(manualValue);
        
        if (parsedDate) {
            hiddenInput.value = parsedDate;
            calculateCompactISO();
        } else if (manualValue === '') {
            hiddenInput.value = '';
            calculateCompactISO();
        }
    }
}

function handleISOManualTimeEntry(type) {
    const manualInput = document.getElementById(`iso${type.charAt(0).toUpperCase() + type.slice(1)}TimeManual`);
    const hiddenInput = document.getElementById(`iso${type.charAt(0).toUpperCase() + type.slice(1)}Time`);
    
    if (manualInput && hiddenInput) {
        const manualValue = manualInput.value.trim();
        const parsedTime = parseTimeFrom12Hour(manualValue);
        
        if (parsedTime) {
            hiddenInput.value = parsedTime;
            calculateCompactISO();
        } else if (manualValue === '') {
            hiddenInput.value = '';
            calculateCompactISO();
        }
    }
}

function toggleISODatePicker(type) {
    const hiddenInput = document.getElementById(`iso${type.charAt(0).toUpperCase() + type.slice(1)}Date`);
    if (hiddenInput) {
        hiddenInput.style.display = 'block';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.focus();
        hiddenInput.click();
        setTimeout(() => {
            hiddenInput.style.display = 'none';
        }, 100);
    }
}

function toggleISOTimePicker(type) {
    const hiddenInput = document.getElementById(`iso${type.charAt(0).toUpperCase() + type.slice(1)}Time`);
    if (hiddenInput) {
        hiddenInput.style.display = 'block';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.focus();
        hiddenInput.click();
        setTimeout(() => {
            hiddenInput.style.display = 'none';
        }, 100);
    }
}

function updateISOStartDateDisplay() {
    const hiddenInput = document.getElementById('isoStartDate');
    const manualInput = document.getElementById('isoStartDateManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatDateToManual(hiddenInput.value);
    }
}

function updateISOStartTimeDisplay() {
    const hiddenInput = document.getElementById('isoStartTime');
    const manualInput = document.getElementById('isoStartTimeManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatTimeTo12Hour(hiddenInput.value);
    }
}

function updateISOEndDateDisplay() {
    const hiddenInput = document.getElementById('isoEndDate');
    const manualInput = document.getElementById('isoEndDateManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatDateToManual(hiddenInput.value);
    }
}

function updateISOEndTimeDisplay() {
    const hiddenInput = document.getElementById('isoEndTime');
    const manualInput = document.getElementById('isoEndTimeManual');
    if (hiddenInput && manualInput && hiddenInput.value) {
        manualInput.value = formatTimeTo12Hour(hiddenInput.value);
    }
}

// Limb and Brace Input - Manual Entry Only
async function showLimbAndBraceInput() {
    const dynamicInputs = document.getElementById('dynamicInputs');

    try {
        dynamicInputs.innerHTML = `
            <div class="limb-brace-container">
                <div class="alert alert-info mb-3" style="background: rgba(255, 153, 118, 0.1); border: 1px solid rgba(255, 153, 118, 0.3); color: white;">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Limb & Brace Equipment - Manual Entry Only</strong>
                    <div class="mt-1 small">Enter custom limb and brace equipment details manually</div>
                </div>

                <div class="manual-entry-section">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Equipment Name</label>
                            <input type="text" class="form-control" id="limbBraceName" 
                                   placeholder="e.g., Knee Brace, Arm Support, etc." 
                                   oninput="updateLimbBraceButton()">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Quantity</label>
                            <input type="number" class="form-control" id="limbBraceQuantity" 
                                   value="1" min="1" oninput="updateLimbBraceButton()">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Price</label>
                            <input type="number" class="form-control" id="limbBracePrice" 
                                   placeholder="0.00" min="0" step="0.01" oninput="updateLimbBraceButton()">
                        </div>
                    </div>

                    <div class="row g-3 mt-2">
                        <div class="col-md-6">
                            <label class="form-label">Type/Model</label>
                            <input type="text" class="form-control" id="limbBraceType" 
                                   placeholder="Optional: Model or type specification">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Size/Specifications</label>
                            <input type="text" class="form-control" id="limbBraceSize" 
                                   placeholder="Optional: Size, measurements, etc.">
                        </div>
                    </div>

                    <div class="row g-3 mt-2">
                        <div class="col-12">
                            <label class="form-label">Additional Notes</label>
                            <textarea class="form-control" id="limbBraceNotes" rows="2" 
                                      placeholder="Optional: Additional specifications, fitting notes, etc."></textarea>
                        </div>
                    </div>

                    <div class="text-center mt-4">
                        <button type="button" class="btn btn-primary" id="addLimbBraceBtn" 
                                onclick="addLimbBraceToCart()" style="display: none;" disabled>
                            <i class="fas fa-plus-circle me-1"></i>Add to Bill
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Limb & Brace manual entry interface loaded');
        
    } catch (error) {
        console.error('Error loading Limb & Brace interface:', error);
        showToast('Error loading Limb & Brace interface', 'danger');
        dynamicInputs.innerHTML = '<div class="alert alert-danger">Failed to load Limb & Brace interface</div>';
    }
}

function updateLimbBraceButton() {
    const name = document.getElementById('limbBraceName')?.value.trim();
    const quantity = document.getElementById('limbBraceQuantity')?.value;
    const price = document.getElementById('limbBracePrice')?.value;
    const addButton = document.getElementById('addLimbBraceBtn');
    
    if (addButton) {
        if (name && quantity && price && parseFloat(price) > 0) {
            addButton.style.display = 'block';
            addButton.disabled = false;
        } else {
            addButton.style.display = 'none';
            addButton.disabled = true;
        }
    }
}

function addLimbBraceToCart() {
    const name = document.getElementById('limbBraceName')?.value.trim();
    const quantity = parseInt(document.getElementById('limbBraceQuantity')?.value) || 1;
    const price = parseFloat(document.getElementById('limbBracePrice')?.value) || 0;
    const type = document.getElementById('limbBraceType')?.value.trim();
    const size = document.getElementById('limbBraceSize')?.value.trim();
    const notes = document.getElementById('limbBraceNotes')?.value.trim();
    
    if (!name || price <= 0) {
        showToast('Please enter equipment name and valid price', 'warning');
        return;
    }
    
    // Create strength field from type and size
    let strength = '';
    if (type && size) {
        strength = `${type} - ${size}`;
    } else if (type) {
        strength = type;
    } else if (size) {
        strength = size;
    }
    
    const limbBraceItem = {
        id: Date.now() + Math.random(),
        category: 'Limb and Brace',
        name: name,
        type: type || 'Equipment',
        strength: strength,
        quantity: quantity,
        price: price,
        totalPrice: price * quantity,
        description: notes || `Custom limb & brace equipment: ${name}`
    };
    
    addItemToBill(limbBraceItem);
    showToast(`${name} added to bill - ৳${(price * quantity).toFixed(2)}`, 'success');
    
    // Clear form
    resetLimbBraceForm();
}

function resetLimbBraceForm() {
    const fields = ['limbBraceName', 'limbBraceQuantity', 'limbBracePrice', 'limbBraceType', 'limbBraceSize', 'limbBraceNotes'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (fieldId === 'limbBraceQuantity') {
                field.value = '1';
            } else {
                field.value = '';
            }
        }
    });
    
    const addButton = document.getElementById('addLimbBraceBtn');
    if (addButton) {
        addButton.style.display = 'none';
        addButton.disabled = true;
    }
}

// Make functions globally available
window.showLimbAndBraceInput = showLimbAndBraceInput;
window.updateLimbBraceButton = updateLimbBraceButton;
window.addLimbBraceToCart = addLimbBraceToCart;
window.resetLimbBraceForm = resetLimbBraceForm;
window.handleO2ManualDateEntry = handleO2ManualDateEntry;
window.handleO2ManualTimeEntry = handleO2ManualTimeEntry;
window.toggleO2DatePicker = toggleO2DatePicker;
window.toggleO2TimePicker = toggleO2TimePicker;
window.updateO2StartDateDisplay = updateO2StartDateDisplay;
window.updateO2StartTimeDisplay = updateO2StartTimeDisplay;
window.updateO2EndDateDisplay = updateO2EndDateDisplay;
window.updateO2EndTimeDisplay = updateO2EndTimeDisplay;
window.handleISOManualDateEntry = handleISOManualDateEntry;
window.handleISOManualTimeEntry = handleISOManualTimeEntry;
window.toggleISODatePicker = toggleISODatePicker;
window.toggleISOTimePicker = toggleISOTimePicker;
window.updateISOStartDateDisplay = updateISOStartDateDisplay;
window.updateISOStartTimeDisplay = updateISOStartTimeDisplay;
window.updateISOEndDateDisplay = updateISOEndDateDisplay;
window.updateISOEndTimeDisplay = updateISOEndTimeDisplay;
window.initializeDefaultO2ISOItems = initializeDefaultO2ISOItems;

// Ensure showLoading function exists
if (typeof window.showLoading === 'undefined') {
    window.showLoading = function(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    };
}

// Ensure showToast function exists
if (typeof window.showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        try {
            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast text-bg-${type}`;
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="toast-body">
                    ${message}
                    <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast"></button>
                </div>
            `;

            // Add to container
            const container = document.querySelector('.toast-container');
            if (container) {
                container.appendChild(toast);

                // Check if bootstrap is available
                if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                    // Show toast
                    const bsToast = new bootstrap.Toast(toast);
                    bsToast.show();

                    // Remove after hiding
                    toast.addEventListener('hidden.bs.toast', () => {
                        if (toast.parentNode) {
                            toast.remove();
                        }
                    });
                } else {
                    // Fallback if bootstrap is not available
                    toast.style.display = 'block';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.remove();
                        }
                    }, 3000);
                }
            } else {
                // Fallback to console log
                console.log(`Toast ${type}: ${message}`);
            }
        } catch (error) {
            console.error('Error showing toast:', error);
            console.log(`Toast ${type}: ${message}`);
        }
    };
}
function initWithoutDatabase() {
    updateBillPreview();
    updatePatientInfo();
    setCurrentDate();
    generateBillNumber();
    showToast('System loaded in offline mode', 'info');
}

// Missing function implementations
function updateBillPreview() {
    // Update bill preview display
    const billPreview = document.getElementById('billPreview');
    if (billPreview) {
        updateBillDisplay();
    }
}

function setCurrentDate() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const dateInput = document.getElementById('billDate');
    if (dateInput) {
        dateInput.value = dateStr;
    }
}

function generateBillNumber() {
    const billNumber = 'BILL-' + Date.now().toString().slice(-6);
    const billNumberInput = document.getElementById('billNumber');
    if (billNumberInput) {
        billNumberInput.value = billNumber;
    }
}

function updatePatientInfo() {
    // Update patient info display
    const patientName = document.getElementById('patientName')?.value || '';
    const opdNumber = document.getElementById('opdNumber')?.value || '';
    
    // Update preview if elements exist
    const previewName = document.getElementById('previewPatientName');
    const previewOPD = document.getElementById('previewOPDNumber');
    
    if (previewName) previewName.textContent = patientName || 'Not specified';
    if (previewOPD) previewOPD.textContent = opdNumber || 'Not specified';
}

// Database operations using API
async function getAllItems() {
    try {
        return await window.dbAPI.getAllItems();
    } catch (error) {
        console.error('Error getting all items:', error);
        return [];
    }
}

async function getItemsByCategory(category) {
    try {
        console.log(`Fetching items for category: ${category}`);
        
        // Check if database API is available
        if (!window.dbAPI) {
            console.error('Database API not available');
            showToast('Database not available. Please refresh the page.', 'danger');
            return [];
        }
        
        const items = await window.dbAPI.getItemsByCategory(category);
        console.log(`Received ${items ? items.length : 0} items for category: ${category}`, items);
        
        // Handle null or undefined response
        if (!items) {
            console.warn(`No items returned for category ${category}`);
            return [];
        }
        
        // Ensure we return an array
        if (!Array.isArray(items)) {
            console.warn(`Invalid data structure returned for category ${category}:`, items);
            return [];
        }
        
        return items;
    } catch (error) {
        console.error('Error getting items by category:', error);
        showToast(`Error loading ${category} items: ${error.message}`, 'danger');
        return [];
    }
}

async function addItemToDatabase(item) {
    try {
        return await window.dbAPI.addItem(item);
    } catch (error) {
        console.error('Error adding item:', error);
        throw error;
    }
}

async function updateItemInDatabase(item) {
    try {
        return await window.dbAPI.updateItem(item);
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
}

// UI Functions
// Category selection function that was missing
function selectCategory(category) {
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = category;
    }
    
    // Update visual selection for category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn && btn.classList) {
            btn.classList.remove('active');
        }
    });
    
    const selectedBtn = document.querySelector(`[data-category="${category}"]`);
    if (selectedBtn && selectedBtn.classList) {
        selectedBtn.classList.add('active');
    }
    
    // Show the item input for the selected category
    showItemInput();
    
    showToast(`${category} category selected`, 'success');
}

window.showItemInput = async function() {
    const category = document.getElementById('categorySelect').value;
    const dynamicInputs = document.getElementById('dynamicInputs');

    if (!category) {
        dynamicInputs.innerHTML = '';
        const selectedTestsContainer = document.getElementById('selectedTestsContainer');
        if (selectedTestsContainer) {
            selectedTestsContainer.style.display = 'none';
        }
        return;
    }

    try {
        console.log(`Loading items for category: ${category}`);
        
        if (category === 'Medicine') {
            await showMedicineInput();
        } else if (category === 'X-ray') {
            console.log('Fetching X-ray items...');
            const xrayItems = await getItemsByCategory('X-ray');
            console.log('X-ray items fetched:', xrayItems);
            
            if (!xrayItems) {
                throw new Error('Failed to fetch X-ray items - null response');
            }
            
            if (!Array.isArray(xrayItems)) {
                throw new Error(`Invalid X-ray data format - expected array, got: ${typeof xrayItems}`);
            }
            
            await showXrayInput(xrayItems);
        } else if (category === 'O2, ISO') {
            console.log('Fetching O2, ISO items...');
            const o2ISOItems = await getItemsByCategory('O2, ISO');
            console.log('O2, ISO items fetched:', o2ISOItems);
            await showO2ISOInput(o2ISOItems);
        } else {
            await showGenericInput(category);
        }

        if (category === 'Lab') {
            updateSelectedTestsDisplay();
        }
        
        console.log(`Successfully loaded ${category} category interface`);
        
    } catch (error) {
        console.error('Error loading category items:', error);
        console.error('Error details:', {
            category: category,
            error: error.message,
            stack: error.stack
        });
        
        showToast(`Error loading ${category} items: ${error.message}`, 'danger');
        
        dynamicInputs.innerHTML = `
            <div class="alert alert-danger">
                <h6>Error loading ${category} items</h6>
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Please check the console for more details and try refreshing the page.</p>
                <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                    <i class="fas fa-refresh"></i> Refresh Page
                </button>
            </div>
        `;
    }
};

async function showMedicineInput() {
    const dynamicInputs = document.getElementById('dynamicInputs');

    try {
        const medicines = await getItemsByCategory('Medicine');

        dynamicInputs.innerHTML = `
            <div class="medicine-search-container">
                <label class="form-label">Search & Select Medicine</label>
                <div class="autocomplete-container">
                    <input type="text" class="form-control search-box" id="medicineSearch" 
                           placeholder="Type medicine name..." 
                           oninput="handleMedicineSearch()" 
                           onkeydown="handleSearchKeydown(event)"
                           autocomplete="off">
                    <div id="medicineDropdown" class="medicine-dropdown" style="display: none;"></div>
                </div>

                <div class="mt-3">
                    <label class="form-label">Or Browse All Medicines</label>
                    <select id="medicineSelect" class="form-select" onchange="selectMedicineFromDropdown(this.value)">
                        <option value="">-- Browse all medicines --</option>
                        ${medicines.map(med => 
                            `<option value="${med.id}">${med.name} (${med.type || 'N/A'}) - ${med.strength || 'N/A'} - ৳${med.price}</option>`
                        ).join('')}
                    </select>
                </div>

                <div id="selectedMedicineInfo" class="selected-medicine-info" style="display: none;">
                    <div class="alert alert-info">
                        <strong id="selectedMedicineName"></strong>
                        <div class="strength-display" id="selectedMedicineDetails"></div>
                    </div>
                </div>
            </div>

            <div class="med-input-group">
                <div>
                    <label class="form-label small text-muted">Dose Prescribed</label>
                    <input type="number" id="medDoseAmount" placeholder="Default: 1 unit" class="form-control" oninput="calculateMedicineDose()">
                </div>
                <div>
                    <label class="form-label small text-muted">Dose Unit</label>
                    <select id="medDoseUnit" class="form-select" onchange="calculateMedicineDose()">
                        <option value="qty">qty</option>
                        <option value="capsule">capsule</option>
                        <option value="cc">cc</option>
                        <option value="drops">drops</option>
                        <option value="formula">formula</option>
                        <option value="g">g</option>
                        <option value="inhaler">inhaler</option>
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                        <option value="ointment">ointment</option>
                        <option value="puffs">puffs</option>
                        <option value="solution">solution</option>
                        <option value="tablet">tablet</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="tube">tube</option>
                    </select>
                </div>
                <div>
                    <label class="form-label small text-muted">Frequency</label>
                    <select id="medFreq" class="form-select" onchange="calculateMedicineDose()">
                        <option value="1" selected>QD (Once daily)</option>
                        <option value="2">BID (Twice daily)</option>
                        <option value="3">TID (Thrice daily)</option>
                        <option value="4">QID (Four times daily)</option>
                        <option value="0.5">QOD (Every other day)</option>
                        <option value="0.14">QWEEK (Once weekly)</option>
                    </select>
                </div>
                <div>
                    <label class="form-label small text-muted">Duration</label>
                    <div class="d-flex gap-2">
                        <input type="number" id="medDays" placeholder="e.g. 1" class="form-control" value="1" oninput="updateDaysDisplay(); calculateMedicineDose();" style="flex: 2;">
                        <select id="daysUnitSelect" class="form-select" onchange="changeDaysUnit()" style="flex: 1;">
                            <option value="days">Day(s)</option>
                            <option value="weeks">Week(s)</option>
                            <option value="months">Month(s)</option>
                        </select>
                    </div>

                    <div class="mt-3">
                        <button class="btn btn-primary btn-sm" onclick="addMedicineToCart()" id="addMedicineBtn">
                            <i class="fas fa-plus-circle me-1"></i> Add Medicine
                        </button>
                    </div>
                </div>
            </div>
            `;

        window.currentMedicines = medicines;
        const addMedicineBtn = document.getElementById('addMedicineBtn');
        if (addMedicineBtn) {
            addMedicineBtn.style.display = 'none';
            addMedicineBtn.disabled = true;
        }
        
        // No auto-generation of medicine items - manual entry only

        const medDoseAmount = document.getElementById('medDoseAmount');
        const medDays = document.getElementById('medDays');
        const medDoseUnit = document.getElementById('medDoseUnit');
        const medFreq = document.getElementById('medFreq');

        [medDoseAmount, medDays, medDoseUnit, medFreq].forEach(el => {
            if (el) {
                el.addEventListener('input', toggleMedicineAddButton);
                el.addEventListener('change', toggleMedicineAddButton);
            }
        });

    } catch (error) {
        console.error('Error loading medicines:', error);
        showToast('Error loading medicines', 'danger');
        dynamicInputs.innerHTML = '<div class="alert alert-warning">Error loading medicines. Please try again.</div>';
    }
}

// Enhanced addItemToBill function for global search and multi-select
async function addItemToBill(item) {
    if (!item) {
        showToast('Invalid item data', 'warning');
        return;
    }

    try {
        // Check if billItems array exists
        if (typeof window.billItems === 'undefined') {
            window.billItems = [];
        }

        // Define exclusive categories (only one item allowed per category)
        const exclusiveCategories = ['Registration', 'Dr. Fee', 'Medic Fee'];
        
        // Check if this is an exclusive category
        if (exclusiveCategories.includes(item.category)) {
            // Remove any existing items from this category and uncheck their checkboxes
            const existingItemsInCategory = window.billItems.filter(billItem => billItem.category === item.category);
            if (existingItemsInCategory.length > 0) {
                existingItemsInCategory.forEach(existingItem => {
                    // Uncheck corresponding checkbox if it exists
                    if (existingItem.sourceCheckbox) {
                        const checkbox = document.getElementById(existingItem.sourceCheckbox);
                        if (checkbox) {
                            checkbox.checked = false;
                            // Reset checkbox styling
                            const label = document.querySelector(`label[for="${existingItem.sourceCheckbox}"]`);
                            if (label) {
                                label.style.background = '';
                                label.style.borderColor = '';
                                label.style.color = 'white';
                            }
                        }
                    }
                });
                
                // Remove all items from this category
                window.billItems = window.billItems.filter(billItem => billItem.category !== item.category);
                const removedNames = existingItemsInCategory.map(item => item.name).join(', ');
                showToast(`Removed previous ${item.category}: ${removedNames}`, 'info');
            }
        } else {
            // For non-exclusive categories, check for duplicates by ID if from checkbox
            if (item.id && item.id.toString().startsWith('checkbox_')) {
                const existingItem = window.billItems.find(billItem => billItem.id === item.id);
                if (existingItem) {
                    showToast(`${item.name} already in bill`, 'warning');
                    return;
                }
            } else {
                // Check for duplicates by name and category for regular items
                const existingItem = window.billItems.find(billItem => 
                    billItem.name === item.name && billItem.category === item.category
                );

                if (existingItem) {
                    // Increase quantity instead of adding duplicate
                    existingItem.quantity += 1;
                    existingItem.totalPrice = existingItem.quantity * existingItem.price;
                    showToast(`${item.name} quantity increased to ${existingItem.quantity}`, 'info');
                    
                    // Update displays
                    updateBillDisplay();
                    updateGrandTotal();
                    updatePatientInfo();
                    return;
                }
            }
        }

        // Create new bill item
        const billItem = {
            id: item.id || (Date.now() + Math.random()),
            category: item.category,
            name: item.name,
            type: item.type || '',
            strength: item.strength || '',
            quantity: 1,
            price: item.price || 0,
            totalPrice: item.price || 0,
            sourceCheckbox: item.sourceCheckbox || null
        };

        // Add to bill
        window.billItems.push(billItem);
        showToast(`${item.name} added to bill`, 'success');

        // Update displays
        updateBillDisplay();
        updateGrandTotal();
        updatePatientInfo();

    } catch (error) {
        console.error('Error adding item to bill:', error);
        showToast('Error adding item to bill: ' + error.message, 'danger');
    }
}

// Global search multi-select functions
function selectGlobalFromQuickButton(buttonElement) {
    const itemName = buttonElement.querySelector('span').textContent;
    const itemData = {
        name: itemName,
        category: 'Quick Selection',
        price: 0 // Will be determined from database
    };
    
    // Check if already selected
    const alreadySelected = selectedGlobalItems.some(item => item.name === itemName);
    if (alreadySelected) {
        showToast(`${itemName} already selected`, 'warning');
        return;
    }
    
    selectedGlobalItems.push(itemData);
    toggleSelectedTagsContainer();
    showToast(`${itemName} added to selection`, 'success');
}

function addAllSelectedItems() {
    if (selectedGlobalItems.length === 0) {
        showToast('No items selected', 'warning');
        return;
    }
    
    let addedCount = 0;
    selectedGlobalItems.forEach(item => {
        const billItem = {
            id: Date.now() + Math.random(),
            category: item.category,
            name: item.name,
            type: item.type || '',
            strength: item.strength || '',
            quantity: 1,
            price: item.price || 0,
            totalPrice: item.price || 0
        };
        
        // Check for duplicates
        const existingItem = window.billItems.find(billItem => 
            billItem.name === item.name && billItem.category === item.category
        );
        
        if (!existingItem) {
            window.billItems.push(billItem);
            addedCount++;
        }
    });
    
    if (addedCount > 0) {
        updateBillDisplay();
        updateGrandTotal();
        updatePatientInfo();
        showToast(`${addedCount} item${addedCount > 1 ? 's' : ''} added to bill`, 'success');
    }
    
    // Clear selections
    clearAllSelectedItems();
}

function clearAllSelectedItems() {
    selectedGlobalItems = [];
    toggleSelectedTagsContainer();
    showToast('All selections cleared', 'info');
}

function showSelectedItemsTotal() {
    const totalPreviewElement = document.getElementById('totalPreview');
    const selectedItemsTotalDiv = document.getElementById('selectedItemsTotal');
    
    if (!totalPreviewElement || !selectedItemsTotalDiv) return;
    
    const total = selectedGlobalItems.reduce((sum, item) => sum + (item.price || 0), 0);
    totalPreviewElement.textContent = `৳${total.toFixed(2)}`;
    
    if (selectedItemsTotalDiv.style.display === 'none') {
        selectedItemsTotalDiv.style.display = 'block';
    } else {
        selectedItemsTotalDiv.style.display = 'none';
    }
}

// Add missing bill display functions
function updateBillDisplay() {
    const billItemsContainer = document.getElementById('billItems');
    if (!billItemsContainer || !window.billItems) {
        return;
    }

    if (window.billItems.length === 0) {
        billItemsContainer.innerHTML = '<div class="text-center text-muted p-3">No items added yet</div>';
        return;
    }

    let html = '';
    window.billItems.forEach(item => {
        html += `
            <div class="bill-item d-flex justify-content-between align-items-center p-2 mb-2" style="background: rgba(255,255,255,0.1); border-radius: 8px;">
                <div>
                    <strong>${item.name}</strong>
                    ${item.type ? `<br><small class="text-muted">${item.type}</small>` : ''}
                </div>
                <div class="text-end">
                    <div>Qty: ${item.quantity} × ৳${item.price}</div>
                    <div><strong>৳${item.totalPrice}</strong></div>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeItemFromBill(${item.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });

    billItemsContainer.innerHTML = html;
}

function updateGrandTotal() {
    if (!window.billItems) return;
    
    const total = window.billItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    const grandTotalElement = document.getElementById('grandTotal');
    const topGrandTotal = document.getElementById('topGrandTotal');
    
    if (grandTotalElement) grandTotalElement.textContent = `৳${total.toFixed(2)}`;
    if (topGrandTotal) topGrandTotal.textContent = `৳${total.toFixed(2)}`;
}

function removeItemFromBill(itemId) {
    if (!window.billItems) return;
    
    const index = window.billItems.findIndex(item => item.id === itemId);
    if (index > -1) {
        const removedItem = window.billItems.splice(index, 1)[0];
        updateBillDisplay();
        updateGrandTotal();
        showToast(`${removedItem.name} removed from bill`, 'info');
    }
}

// Main showItemInput function - consolidated and fixed
if (typeof window.showItemInput === 'undefined') {
    window.showItemInput = async function() {
        const categorySelect = document.getElementById('categorySelect');
        const category = categorySelect ? categorySelect.value : '';
        
        if (!category) {
            const dynamicInputs = document.getElementById('dynamicInputs');
            if (dynamicInputs) dynamicInputs.innerHTML = '';
            return;
        }

        try {
            if (category === 'Medicine') {
                await showMedicineInput();
            } else if (category === 'X-ray') {
                const xrayItems = await getItemsByCategory('X-ray');
                await showXrayInput(xrayItems);
            } else if (category === 'OR') {
                const orItems = await getItemsByCategory('OR');
                await showORInput(orItems);
            } else if (category === 'Lab') {
                const labItems = await getItemsByCategory('Lab');
                await showLabInput(labItems);
            } else {
                await showGenericInput(category);
            }
        } catch (error) {
            console.error('Error in showItemInput:', error);
            showToast(`Error loading ${category} interface: ${error.message}`, 'danger');
        }
    };
}

// Add selected item function
window.addSelectedItem = function(category) {
    const selectElement = document.getElementById(`itemSelect_${category}`);
    const quantityElement = document.getElementById(`itemQuantity_${category}`);
    
    if (!selectElement || !selectElement.value) {
        showToast('Please select an item', 'warning');
        return;
    }

    try {
        const item = JSON.parse(selectElement.value);
        const quantity = parseInt(quantityElement ? quantityElement.value : 1) || 1;
        
        // Create bill item
        const billItem = {
            id: Date.now() + Math.random(),
            category: item.category,
            name: item.name,
            type: item.type || '',
            strength: item.strength || '',
            quantity: quantity,
            price: item.price || 0,
            totalPrice: (item.price || 0) * quantity
        };

        // Initialize billItems if not exists
        if (typeof window.billItems === 'undefined') {
            window.billItems = [];
        }

        // Add to bill
        window.billItems.push(billItem);

        // Update displays
        if (typeof updateBillDisplay === 'function') {
            updateBillDisplay();
        }
        if (typeof updateGrandTotal === 'function') {
            updateGrandTotal();
        }
        if (typeof updatePatientInfo === 'function') {
            updatePatientInfo();
        }

        showToast(`${item.name} added to bill`, 'success');

        // Reset form
        selectElement.value = '';
        if (quantityElement) quantityElement.value = '1';
        const priceElement = document.getElementById(`itemPrice_${category}`);
        if (priceElement) priceElement.value = '';

    } catch (error) {
        console.error('Error adding selected item:', error);
        showToast('Error adding item to bill', 'danger');
    }
};

function toggleMedicineAddButton() {
    const addMedicineBtn = document.getElementById('addMedicineBtn');
    const medicineSearchInput = document.getElementById('medicineSearch');
    const medicineSelect = document.getElementById('medicineSelect');
    const medDoseAmount = document.getElementById('medDoseAmount');
    const medDays = document.getElementById('medDays');

    if (!addMedicineBtn || !medicineSearchInput || !medicineSelect || !medDoseAmount || !medDays) {
        console.warn('One or more required elements not found.');
        return;
    }

    const isMedicineSelected = medicineSearchInput.value.trim().length > 0 || medicineSelect.value.trim().length > 0;
    const hasDoseAmount = medDoseAmount.value.trim().length > 0;
    const hasDays = medDays.value.trim().length > 0;

    if (isMedicineSelected && hasDoseAmount && hasDays) {
        addMedicineBtn.style.display = 'block';
        addMedicineBtn.disabled = false;
    } else {
        addMedicineBtn.style.display = 'none';
        addMedicineBtn.disabled = true;
    }
}

function handleMedicineSearch() {
    const searchInput = document.getElementById('medicineSearch');
    const dropdown = document.getElementById('medicineDropdown');

    if (!searchInput || !dropdown) {
        console.warn('Medicine search elements not found');
        return;
    }

    const searchTerm = searchInput.value.toLowerCase().trim();

    const medicineSelect = document.getElementById('medicineSelect');
    if (medicineSelect && searchTerm.length > 0) {
        medicineSelect.value = '';
    }

    if (searchTerm.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    if (!window.currentMedicines || window.currentMedicines.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    const filteredMedicines = window.currentMedicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchTerm) ||
        (medicine.type && medicine.type.toLowerCase().includes(searchTerm)) ||
        (medicine.strength && medicine.strength.toLowerCase().includes(searchTerm))
    );

    if (filteredMedicines.length === 0) {
        if (dropdown) {
            dropdown.innerHTML = '<div class="dropdown-item-empty">No medicines found</div>';
            dropdown.style.display = 'block';
        }
        return;
    }

    let dropdownHTML = '';
    filteredMedicines.slice(0, 8).forEach((medicine, index) => {
        dropdownHTML += `
            <div class="dropdown-item" 
                 onclick="selectMedicineFromDropdown(${medicine.id})" 
                 data-index="${index}">
                <div class="medicine-name">${medicine.name}</div>
                <div class="medicine-details">
                    ${medicine.type || 'N/A'} • ${medicine.strength || 'N/A'} • ৳${medicine.price}
                </div>
            </div>
        `;
    });

    if (dropdown) {
        dropdown.innerHTML = dropdownHTML;
        dropdown.style.display = 'block';
    }
}

function handleSearchKeydown(event) {
    const dropdown = document.getElementById('medicineDropdown');
    const items = dropdown.querySelectorAll('.dropdown-item:not(.dropdown-item-empty)');

    if (items.length === 0) return;

    let currentSelected = dropdown.querySelector('.dropdown-item.selected');
    let currentIndex = currentSelected ? Array.from(items).indexOf(currentSelected) : -1;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add('selected');
            break;

        case 'ArrowUp':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[currentIndex].classList.add('selected');
            break;

        case 'Enter':
            event.preventDefault();
            if (currentSelected) {
                currentSelected.click();
            }
            break;

        case 'Escape':
            if (dropdown) {
                dropdown.style.display = 'none';
            }
            break;
    }
}

function selectMedicineFromDropdown(medicineId) {
    if (!medicineId) return;

    const medicine = window.currentMedicines.find(med => med.id == medicineId);
    if (!medicine) return;

    document.getElementById('medicineSearch').value = medicine.name;

    const medicineSelect = document.getElementById('medicineSelect');
    if (medicineSelect) {
        medicineSelect.value = medicineId;
        toggleMedicineAddButton();
    }

    const dropdown = document.getElementById('medicineDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }

    const selectedInfo = document.getElementById('selectedMedicineInfo');
    const selectedName = document.getElementById('selectedMedicineName');
    const selectedDetails = document.getElementById('selectedMedicineDetails');

    if (selectedName && selectedDetails && selectedInfo) {
        selectedName.textContent = medicine.name;
        selectedDetails.innerHTML = `
            Type: ${medicine.type || 'N/A'} • Strength: ${medicine.strength || 'N/A'} • Price: ৳${medicine.price}
        `;
        selectedInfo.style.display = 'block';
    }

    window.selectedMedicine = medicine;
    setDefaultDoseUnit(medicine.type);
    calculateMedicineDose();

    showToast(`Selected: ${medicine.name}`, 'success');
}

function setDefaultDoseUnit(medicineType) {
    const doseUnitSelect = document.getElementById('medDoseUnit');
    if (!doseUnitSelect) return;

    const typeToUnit = {
        'Tablet': 'tablet',
        'Capsule': 'capsule',
        'Injection': 'ml',
        'Syrup': 'ml',
        'Inhaler': 'puffs',
        'Ointment': 'ointment',
        'Nasal Drops': 'drops',
        'Powder': 'formula',
        'Formula/Sol': 'formula',
        'Nebulizer': 'ml'
    };

    const defaultUnit = typeToUnit[medicineType] || 'qty';
    doseUnitSelect.value = defaultUnit;
}

function changeDaysUnit() {
    const select = document.getElementById('daysUnitSelect');
    currentDaysUnit = select.value;
    updateDaysDisplay();

    const input = document.getElementById('medDays');
    if (input.value) {
        calculateMedicineDose();
    }
}

function convertToDays(value, unit) {
    switch(unit) {
        case 'days':
            return value;
        case 'weeks':
            return value * 7;
        case 'months':
            return value * 30;
        default:
            return value;
    }
}

function updateDaysDisplay() {
    const display = document.getElementById('daysUnitDisplay');
    const input = document.getElementById('medDays');
    const select = document.getElementById('daysUnitSelect');

    if (!display || !input || !select) return;

    currentDaysUnit = select.value;

    const currentValue = parseInt(input.value) || 1;
    const daysEquivalent = convertToDays(currentValue, currentDaysUnit);

    switch(currentDaysUnit) {
        case 'days':
            if (display) display.textContent = '';
            input.placeholder = 'e.g. 7';
            break;
        case 'weeks':
            if (display) display.textContent = `${currentValue} week${currentValue !== 1 ? 's' : ''} = ${daysEquivalent} days`;
            input.placeholder = 'e.g. 1';
            break;
        case 'months':
            if (display) display.textContent = `${currentValue} month${currentValue !== 1 ? 's' : ''} = ${daysEquivalent} days`;
            input.placeholder = 'e.g. 1';
            break;
    }
}

function calculateMedicineDose() {
    if (!window.selectedMedicine) {
        const calculationDetails = document.getElementById('calculationDetails');
        if (calculationDetails) {
            calculationDetails.style.display = 'none';
        }
        return;
    }

    const doseAmountInput = document.getElementById('medDoseAmount');
    const doseUnitInput = document.getElementById('medDoseUnit');
    const frequencyInput = document.getElementById('medFreq');
    const daysInput = document.getElementById('medDays');

    if (!doseAmountInput || !doseUnitInput || !frequencyInput || !daysInput) {
        console.warn('Medicine calculation elements not found');
        return;
    }

    let doseAmount = parseFloat(doseAmountInput.value);
    if (isNaN(doseAmount) || doseAmount <= 0) {
        doseAmount = 1;
    }

    const doseUnit = doseUnitInput.value;
    const frequency = parseFloat(frequencyInput.value);
    const inputDuration = parseInt(daysInput.value) || 1;
    const days = convertToDays(inputDuration, currentDaysUnit || 'days');

    if (!frequency || !days || frequency <= 0 || days <= 0) {
        const calculationDetails = document.getElementById('calculationDetails');
        if (calculationDetails) {
            calculationDetails.style.display = 'none';
        }
        return;
    }

    const medicine = window.selectedMedicine;
    const medicineType = medicine.type ? medicine.type.toLowerCase() : '';
    const strengthValue = extractStrengthNumber(medicine.strength);

    let totalQuantity = 0;
    let totalCost = 0;
    let calculationMethod = '';
    let actualUnitsNeeded = 0;

    if (medicineType === 'tablet' || medicineType === 'capsule') {
        if (doseUnit === 'qty' || doseUnit === 'tablet' || doseUnit === 'capsule') {
            totalQuantity = doseAmount * frequency * days;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `${doseAmount} × ${frequency} × ${days} = ${totalQuantity.toFixed(2)} ${medicineType}s → ${actualUnitsNeeded} ${medicineType}s (rounded up)`;
        } else if (doseUnit === 'mg' && strengthValue > 0) {
            const tabletsPerDose = doseAmount / strengthValue;
            totalQuantity = tabletsPerDose * frequency * days;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `(${doseAmount}mg ÷ ${strengthValue}mg) × ${frequency} × ${days} = ${totalQuantity.toFixed(2)} ${medicineType}s → ${actualUnitsNeeded} ${medicineType}s (rounded up)`;
        } else {
            totalQuantity = doseAmount * frequency * days;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `${doseAmount} × ${frequency} × ${days} = ${totalQuantity.toFixed(2)} ${medicineType}s → ${actualUnitsNeeded} ${medicineType}s (rounded up)`;
        }
    } else if (doseUnit === 'tbsp') {
        // Handle tbsp FIRST before checking medicine type - this is the special case
        // 1 tbsp = 3 units: (dose prescribed × 3 × frequency × total days) × unit price
        const totalUnitsNeeded = doseAmount * 3 * frequency * days;
        actualUnitsNeeded = totalUnitsNeeded; // Don't round up for tbsp
        totalCost = totalUnitsNeeded * medicine.price;
        calculationMethod = `(${doseAmount}tbsp × 3 × ${frequency} × ${days}) = ${totalUnitsNeeded} units × ৳${medicine.price} = ৳${totalCost.toFixed(2)}`;
        totalQuantity = totalUnitsNeeded;
    } else if (['syrup', 'solution', 'formula', 'formula/sol'].includes(medicineType)) {
        if (doseUnit === 'qty') {
            // For quantity unit: just the dose amount (usually means number of bottles)
            totalQuantity = doseAmount;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `${doseAmount} bottle(s) → ${actualUnitsNeeded} bottles (rounded up)`;
        } else if (doseUnit === 'ml' || doseUnit === 'cc') {
            // For ml/cc: calculate total ml needed, then divide by bottle size
            const totalMlNeeded = doseAmount * frequency * days;
            if (strengthValue > 0) {
                totalQuantity = totalMlNeeded / strengthValue; // strength is bottle size in ml
                actualUnitsNeeded = Math.ceil(totalQuantity);
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `(${doseAmount}ml × ${frequency} × ${days}) ÷ ${strengthValue}ml = ${totalQuantity.toFixed(2)} bottles → ${actualUnitsNeeded} bottles (rounded up)`;
            } else {
                // If no strength specified, assume 100ml bottle default
                actualUnitsNeeded = Math.ceil(totalMlNeeded / 100);
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `${doseAmount}ml × ${frequency} × ${days} = ${totalMlNeeded}ml → ${actualUnitsNeeded} bottles (assuming 100ml bottles)`;
            }
        } else if (doseUnit === 'tsp') {
            // 1 tsp = 5ml
            const totalMlNeeded = doseAmount * 5 * frequency * days;
            if (strengthValue > 0) {
                totalQuantity = totalMlNeeded / strengthValue;
                actualUnitsNeeded = Math.ceil(totalQuantity);
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `(${doseAmount}tsp × 5ml × ${frequency} × ${days}) ÷ ${strengthValue}ml = ${totalQuantity.toFixed(2)} bottles → ${actualUnitsNeeded} bottles (rounded up)`;
            } else {
                actualUnitsNeeded = Math.ceil(totalMlNeeded / 100); // Assume 100ml bottle
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `${doseAmount}tsp × 5ml × ${frequency} × ${days} = ${totalMlNeeded}ml → ${actualUnitsNeeded} bottles (assuming 100ml bottles)`;
            }
        } else {
            // Default for syrups: assume quantity
            totalQuantity = doseAmount * frequency * days;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `${doseAmount} × ${frequency} × ${days} = ${totalQuantity.toFixed(2)} units → ${actualUnitsNeeded} units (rounded up)`;
        }
    } else if (medicineType === 'injection') {
        if (doseUnit === 'ml' || doseUnit === 'cc') {
            // For injections: usually dose × frequency × days gives total ml needed
            const totalMlNeeded = doseAmount * frequency * days;
            if (strengthValue > 0) {
                totalQuantity = totalMlNeeded / strengthValue; // strength is vial size
                actualUnitsNeeded = Math.ceil(totalQuantity);
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `(${doseAmount}ml × ${frequency} × ${days}) ÷ ${strengthValue}ml = ${totalQuantity.toFixed(2)} vials → ${actualUnitsNeeded} vials (rounded up)`;
            } else {
                actualUnitsNeeded = Math.ceil(totalMlNeeded);
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `${doseAmount}ml × ${frequency} × ${days} = ${totalMlNeeded}ml → ${actualUnitsNeeded} vials (rounded up)`;
            }
        } else if (doseUnit === 'mg' && strengthValue > 0) {
            // For mg dosing: calculate how many vials needed
            const vialsPerDose = doseAmount / strengthValue;
            totalQuantity = vialsPerDose * frequency * days;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `(${doseAmount}mg ÷ ${strengthValue}mg) × ${frequency} × ${days} = ${totalQuantity.toFixed(2)} vials → ${actualUnitsNeeded} vials (rounded up)`;
        } else {
            // Default for injections
            totalQuantity = doseAmount * frequency * days;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `${doseAmount} × ${frequency} × ${days} = ${totalQuantity.toFixed(2)} vials → ${actualUnitsNeeded} vials (rounded up)`;
        }
    } else if (medicineType === 'inhaler') {
        if (doseUnit === 'puffs') {
            // For inhalers: calculate total puffs needed
            const totalPuffsNeeded = doseAmount * frequency * days;
            if (strengthValue > 0) {
                totalQuantity = totalPuffsNeeded / strengthValue; // strength is puffs per inhaler
                actualUnitsNeeded = Math.ceil(totalQuantity);
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `(${doseAmount}puffs × ${frequency} × ${days}) ÷ ${strengthValue}puffs = ${totalQuantity.toFixed(2)} inhalers → ${actualUnitsNeeded} inhalers (rounded up)`;
            } else {
                actualUnitsNeeded = Math.ceil(totalPuffsNeeded / 200); // Assume 200 puffs per inhaler
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `${doseAmount}puffs × ${frequency} × ${days} = ${totalPuffsNeeded}puffs → ${actualUnitsNeeded} inhalers (assuming 200 puffs per inhaler)`;
            }
        } else {
            // Default for inhalers
            totalQuantity = doseAmount;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `${doseAmount} inhaler(s) → ${actualUnitsNeeded} inhalers (rounded up)`;
        }
    } else if (['ointment', 'cream', 'gel'].includes(medicineType)) {
        if (doseUnit === 'g' || doseUnit === 'gm') {
            // For ointments in grams
            const totalGramsNeeded = doseAmount * frequency * days;
            if (strengthValue > 0) {
                totalQuantity = totalGramsNeeded / strengthValue; // strength is tube size in grams
                actualUnitsNeeded = Math.ceil(totalQuantity);
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `(${doseAmount}g × ${frequency} × ${days}) ÷ ${strengthValue}g = ${totalQuantity.toFixed(2)} tubes → ${actualUnitsNeeded} tubes (rounded up)`;
            } else {
                actualUnitsNeeded = Math.ceil(totalGramsNeeded / 10); // Assume 10g tube
                totalCost = actualUnitsNeeded * medicine.price;
                calculationMethod = `${doseAmount}g × ${frequency} × ${days} = ${totalGramsNeeded}g → ${actualUnitsNeeded} tubes (assuming 10g tubes)`;
            }
        } else {
            // Default for ointments
            totalQuantity = doseAmount;
            actualUnitsNeeded = Math.ceil(totalQuantity);
            totalCost = actualUnitsNeeded * medicine.price;
            calculationMethod = `${doseAmount} tube(s) → ${actualUnitsNeeded} tubes (rounded up)`;
        }
    } else {
        // Default calculation for other types
        totalQuantity = doseAmount * frequency * days;
        actualUnitsNeeded = Math.ceil(totalQuantity);
        totalCost = actualUnitsNeeded * medicine.price;
        calculationMethod = `${doseAmount} × ${frequency} × ${days} = ${totalQuantity.toFixed(2)} units → ${actualUnitsNeeded} units (rounded up)`;
    }

    let calculationDetails = document.getElementById('calculationDetails');
    if (!calculationDetails) {
        calculationDetails = document.createElement('div');
        calculationDetails.id = 'calculationDetails';
        calculationDetails.className = 'calculation-display mt-3';
        calculationDetails.style.display = 'none';
        calculationDetails.innerHTML = '<div class="alert alert-info"><strong>Calculation:</strong><div id="calculationBreakdown"></div></div>';

        const medicineInputGroup = document.querySelector('.med-input-group');
        if (medicineInputGroup && medicineInputGroup.parentNode) {
            medicineInputGroup.parentNode.insertBefore(calculationDetails, medicineInputGroup.nextSibling);
        } else {
            const dynamicInputs = document.getElementById('dynamicInputs');
            if (dynamicInputs) {
                dynamicInputs.appendChild(calculationDetails);
            } else {
                console.warn('No valid parent found for calculation details');
                return;
            }
        }
    }

    const breakdown = document.getElementById('calculationBreakdown');
    if (!breakdown) return;

    breakdown.innerHTML = `
        <div class="calculation-result mb-3">
            <strong>Total Cost: ৳${totalCost.toFixed(2)}</strong>
        </div>
        <div class="calculation-row">
            <span>Medicine:</span>
            <span>${medicine.name}</span>
        </div>
        <div class="calculation-row">
            <span>Type & Strength:</span>
            <span>${medicine.type || 'N/A'} - ${medicine.strength || 'N/A'}</span>
        </div>
        <div class="calculation-row">
            <span>Dose:</span>
            <span>${doseAmount} ${doseUnit} × ${frequency}/day × ${days} days</span>
        </div>
        <div class="calculation-row">
            <span>Calculation:</span>
            <span>${calculationMethod}</span>
        </div>
        <div class="calculation-row">
            <span>Quantity needed:</span>
            <span><strong>${actualUnitsNeeded} units @ ৳${medicine.price} each</strong></span>
        </div>
    `;

    calculationDetails.style.display = 'block';

    const addMedicineBtn = document.getElementById('addMedicineBtn');
    if (addMedicineBtn) {
        addMedicineBtn.disabled = false;
    }

    window.currentCalculation = {
        medicine: medicine,
        doseAmount: doseAmount,
        doseUnit: doseUnit,
        frequency: frequency,
        days: days,
        totalQuantity: actualUnitsNeeded,
        totalCost: totalCost,
        calculationMethod: calculationMethod
    };
}

function extractStrengthNumber(strengthStr) {
    if (!strengthStr || typeof strengthStr !== 'string') return 0;

    const match = strengthStr.match(/(\d+(?:\.\d+)?)/);
    const value = match ? parseFloat(match[1]) : 0;

    return isNaN(value) ? 0 : value;
}

// Add missing medicine functions
function addMedicineToCart() {
    if (!window.currentCalculation || !window.selectedMedicine) {
        showToast('Please configure medicine dosage first', 'warning');
        return;
    }

    const calc = window.currentCalculation;
    
    const medicineItem = {
        id: nextItemId++,
        category: 'Medicine',
        name: calc.medicine.name,
        type: calc.medicine.type || '',
        strength: calc.medicine.strength || '',
        quantity: calc.totalQuantity,
        price: calc.medicine.price,
        totalPrice: calc.totalCost,
        description: `${calc.doseAmount} ${calc.doseUnit} × ${calc.frequency}/day × ${calc.days} days`
    };

    billItems.push(medicineItem);
    updateBillDisplay();
    updateGrandTotal();
    
    showToast(`${calc.medicine.name} added to bill - ৳${calc.totalCost}`, 'success');
    
    // Reset form
    resetMedicineForm();
}

function resetMedicineForm() {
    const inputs = ['medicineSearch', 'medDoseAmount', 'medDays'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    const medicineSelect = document.getElementById('medicineSelect');
    if (medicineSelect) medicineSelect.value = '';
    
    const selectedInfo = document.getElementById('selectedMedicineInfo');
    if (selectedInfo) selectedInfo.style.display = 'none';
    
    const calculationDetails = document.getElementById('calculationDetails');
    if (calculationDetails) calculationDetails.style.display = 'none';
    
    window.selectedMedicine = null;
    window.currentCalculation = null;
}

async function showGenericInput(category) {
    const dynamicInputs = document.getElementById('dynamicInputs');

    try {
        const items = await getItemsByCategory(category);

        if (category === 'X-ray') {
            await showXrayInput(items);
            return;
        }

        if (category === 'Lab') {
            await showLabInput(items);
            return;
        }

        if (category === 'OR') {
            await showORInput(items);
            return;
        }

        // Special handling for O2, ISO
        if (category === 'O2, ISO') {
            await showO2ISOInput(items);
            return;
        }

        // Special handling for Limb and Brace - manual entry only
        if (category === 'Limb and Brace') {
            await showLimbAndBraceInput();
            return;
        }

        let itemsHTML = '';
        if (items.length > 0) {
            itemsHTML = items.map(item => 
                `<option value="${item.id}">${item.name} - ৳${item.price}</option>`
            ).join('');
        }

        dynamicInputs.innerHTML = `
            <div class="generic-search-container">
                <label class="form-label">Search & Select ${category}</label>
                <div class="autocomplete-container">
                    <input type="text" class="form-control search-box" id="genericItemSearch" 
                           placeholder="Type ${category.toLowerCase()} name..." 
                           oninput="handleGenericItemSearch()" 
                           onkeydown="handleGenericSearchKeydown(event)"
                           autocomplete="off" autofocus>
                    <div id="genericItemDropdown" class="medicine-dropdown" style="display: none;"></div>
                </div>

                <div class="mt-3">
                    <label class="form-label">Or Browse All ${category}</label>
                    <select id="itemSelect" class="form-select" onchange="selectGenericItemFromDropdown(this.value)">
                        <option value="">-- Browse all ${category.toLowerCase()} --</option>
                        ${itemsHTML}
                    </select>
                </div>

                <div class="mt-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="genericManualEntryCheckbox" onchange="toggleGenericManualEntry('${category}')">
                        <label class="form-check-label" for="genericManualEntryCheckbox" style="color: #ffd43b; font-weight: 600;">
                            <i class="fas fa-edit me-1"></i>Manual Entry (Custom ${category})
                        </label>
                    </div>
                </div>

                <div id="selectedGenericInfo" class="selected-medicine-info" style="display: none;">
                    <div class="alert alert-info">
                        <strong id="selectedGenericName"></strong>
                        <div class="strength-display" id="selectedGenericDetails"></div>
                    </div>
                </div>
            </div>

            <!-- Manual Entry Row -->
            <div class="row mb-2" id="genericManualEntryRow" style="display: none;">
                <div class="col-md-6 mb-1">
                    <label class="form-label">${category} Name</label>
                    <input type="text" id="genericManualName" class="form-control" placeholder="Enter ${category.toLowerCase()} name">
                </div>
                <div class="col-md-6 mb-1">
                    <label class="form-label">Amount</label>
                    <input type="number" id="genericManualAmount" class="form-control" min="0" step="0.01" placeholder="Enter amount">
                </div>
            </div>

            <div class="item-row mt-3">
                <div>
                    <label class="form-label">Quantity</label>
                    <input type="number" id="itemQuantity" class="form-control" value="1" min="1" oninput="updateItemTotal()">
                </div>
                <div>
                    <label class="form-label">Unit Price</label>
                    <input type="number" id="itemPrice" class="form-control" readonly>
                </div>
                <div>
                    <label class="form-label">Total</label>
                    <input type="number" id="itemTotal" class="form-control" readonly>
                </div>
            </div>
            <div class="item-row mt-3">
                <button class="btn btn-primary" onclick="addGenericItem()" id="addGenericItemBtn" style="display: none;">
                    <i class="fas fa-plus-circle me-1"></i> Add to Bill
                </button>
                <button class="btn btn-primary" onclick="addGenericManualEntry('${category}')" id="addGenericManualBtn" style="display: none;">
                    <i class="fas fa-plus-circle me-1"></i> Add Custom ${category}
                </button>
            </div>
        `;

        window.currentCategoryItems = items;
        window.currentCategory = category;

    } catch (error) {
        console.error('Error loading category items:', error);
        showToast('Error loading ' + category + ' items', 'danger');
        dynamicInputs.innerHTML = `<div class="alert alert-warning">Error loading ${category} items. Please try again.</div>`;
    }
}

async function showORInput(items) {
    const dynamicInputs = document.getElementById('dynamicInputs');

    try {
        dynamicInputs.innerHTML = `
            <div class="or-container">
                <!-- OR Search Section -->
                <div class="or-search-container mb-3">
                    <label class="form-label">Search & Select OR Procedure</label>
                    <div class="autocomplete-container">
                        <input type="text" class="form-control search-box" id="orSearch" 
                               placeholder="Type procedure name..." 
                               oninput="handleORSearch()" 
                               onkeydown="handleORSearchKeydown(event)"
                               autocomplete="off" autofocus>
                        <div id="orDropdown" class="medicine-dropdown" style="display:none;"></div>
                    </div>

                    <div class="mt-3">
                        <label class="form-label">Or Browse All Procedures</label>
                        <select id="orBrowseSelect" class="form-select" onchange="selectORFromBrowse(this.value)">
                            <option value="">-- Browse all OR procedures --</option>
                            ${items.map(item => 
                                `<option value="${item.id}">${item.name} - ৳${item.price} per unit</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="mt-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="orManualEntryCheckbox" onchange="toggleORManualEntry()">
                            <label class="form-check-label" for="orManualEntryCheckbox" style="color: #ffd43b; font-weight: 600;">
                                <i class="fas fa-edit me-1"></i>Manual Entry (Custom OR Procedure)
                            </label>
                        </div>
                    </div>

                    <div id="selectedORInfo" class="selected-medicine-info" style="display: none;">
                        <div class="alert alert-info">
                            <strong id="selectedORName"></strong>
                            <div class="strength-display" id="selectedORDetails"></div>
                        </div>
                    </div>
                </div>

                <!-- OR Configuration -->
                <div class="row mb-3" id="orConfigurationSection">
                    <div class="col-md-12 or-config-section">
                        <label class="form-label">OR Configuration</label>
                        
                        <!-- Selection Overlay -->
                        <div class="or-selection-overlay">
                            <div class="or-selection-icon">
                                <i class="fas fa-hand-point-up"></i>
                            </div>
                            <div class="or-selection-message">
                                Please Select an OR Procedure First
                            </div>
                        </div>
                        
                        <!-- Complex Surgery Option -->
                        <div class="or-complex-section mb-3" style="display: block;">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="complexSurgery" onchange="calculateORTotal()" disabled>
                                <label class="form-check-label" for="complexSurgery" style="color: rgba(255, 255, 255, 0.5); font-size: 14px; font-weight: 500;">
                                    <i class="fas fa-star me-1" style="color: #ffd43b;"></i>
                                    Complex Surgery (+150% of base fee)
                                </label>
                            </div>
                            <small class="text-muted ms-4" style="font-size: 11px; color: rgba(255, 255, 255, 0.6) !important;">
                                For challenging procedures requiring additional expertise
                            </small>
                        </div>

                        <!-- Units Counter -->
                        <div class="or-units-section mb-3">
                            <label class="form-label">Number of Units</label>
                            <div class="d-flex align-items-center gap-3">
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustORUnits(-1)" id="decreaseUnits" disabled>
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" id="orUnits" class="form-control text-center" 
                                       value="1" min="1" max="10" 
                                       oninput="calculateORTotal()" 
                                       onchange="calculateORTotal()" 
                                       style="max-width: 80px;" disabled>
                                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="adjustORUnits(1)" id="increaseUnits" disabled>
                                    <i class="fas fa-plus"></i>
                                </button>
                                <small class="text-muted ms-2">Rate: ৳65 per L/hr</small>
                            </div>
                        </div>

                        <!-- C-Arm Option -->
                        <div class="or-carm-section mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="cArmOption" onchange="calculateORTotal()" disabled>
                                <label class="form-check-label" for="cArmOption" style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">
                                    C-Arm (+৳4000)
                                </label>
                            </div>
                        </div>

                        <!-- Multiple Surgeries Option -->
                        <div class="or-multiple-section mb-3" style="display: block;">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="multipleSurgeriesOption" onchange="toggleMultipleSurgeries()" disabled>
                                <label class="form-check-label" for="multipleSurgeriesOption" style="color: rgba(255, 255, 255, 0.5); font-size: 14px; font-weight: 500;">
                                    <i class="fas fa-layer-group me-1" style="color: #4dabf7;"></i>
                                    Multiple Surgeries (allows selecting additional procedures)
                                </label>
                            </div>
                            <small class="text-muted ms-4" style="font-size: 11px; color: rgba(255, 255, 255, 0.6) !important;">
                                Enable this to add multiple surgical procedures in one session
                            </small>
                        </div>

                        <!-- Additional Surgeries Selection -->
                        <div class="or-additional-surgeries mb-3" id="additionalSurgeriesSection" style="display: none;">
                            <label class="form-label mb-2" style="color: var(--secondary); font-size: 14px; font-weight: 600;">
                                <i class="fas fa-plus-circle me-1"></i>Additional Surgeries
                            </label>
                            <div class="additional-surgeries-container" style="background: rgba(0, 123, 255, 0.1); border: 1px solid rgba(0, 123, 255, 0.3); border-radius: 8px; padding: 15px;">
                                <div id="additionalSurgeriesList">
                                    <!-- Additional surgeries will be populated here -->
                                </div>
                                <small class="text-muted" style="font-size: 11px; color: rgba(255, 255, 255, 0.6) !important;">
                                    Select additional procedures to be performed in the same session
                                </small>
                            </div>
                        </div>

                        <!-- 50% Discount Option -->
                        <div class="or-discount-section mb-3" style="display: block;">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="fiftyPercentDiscount" onchange="calculateORTotal()" disabled>
                                <label class="form-check-label" for="fiftyPercentDiscount" style="color: rgba(255, 255, 255, 0.5); font-size: 14px; font-weight: 500;">
                                    <i class="fas fa-percentage me-1" style="color: #ff8787;"></i>
                                    Apply 50% discount (for subsequent surgeries)
                                </label>
                            </div>
                            <small class="text-muted ms-4" style="font-size: 11px; color: rgba(255, 255, 255, 0.6) !important;">
                                Reduced rate for additional procedures in same session
                            </small>
                        </div>

                        <div class="mt-2" id="orHelpText">
                            <small style="color: rgba(255, 255, 255, 0.6); font-style: italic;">
                                <i class="fas fa-info-circle me-1"></i>Please select an OR procedure first to enable options
                            </small>
                        </div>
                    </div>
                </div>

                <!-- Calculation Display -->
                <div class="calculation-display mb-3" id="orCalculation" style="display: none;">
                    <div class="alert alert-info">
                        <strong>OR Calculation:</strong>
                        <div id="orCalculationDetails"></div>
                    </div>
                </div>

                <!-- Manual Entry Row -->
                <div class="row mb-2" id="orManualEntryRow" style="display: none;">
                    <div class="col-md-6 mb-1">
                        <label class="form-label">OR Procedure Name</label>
                        <input type="text" id="orManualName" class="form-control" placeholder="Enter procedure name">
                    </div>
                    <div class="col-md-6 mb-1">
                        <label class="form-label">Base Price</label>
                        <input type="number" id="orManualPrice" class="form-control" min="0" step="0.01" placeholder="Enter base price">
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="or-action-buttons">
                    <div class="row">
                        <div class="col-12 mb-2">
                            <button class="btn btn-primary" onclick="addORToBill()" id="addORBtn" style="display: none;">
                                <i class="fas fa-plus me-1"></i> Add OR to Selection
                            </button>
                            <button class="btn btn-primary" onclick="addORManualEntry()" id="addORManualBtn" style="display: none;">
                                <i class="fas fa-plus-circle me-1"></i> Add Custom OR Procedure
                            </button>
                        </div>
                        <div class="col-12">
                            <button class="btn btn-success me-2" onclick="saveAllORs()" id="saveAllORsBtn" style="display: none;">
                                <i class="fas fa-save me-1"></i> Save All ORs to Bill
                            </button>
                            <button class="btn btn-outline-secondary" onclick="clearAllORs()" id="clearAllORsBtn" style="display: none;">
                                <i class="fas fa-trash me-1"></i> Clear All ORs
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Selected ORs Display -->
                <div id="selectedORsContainer" style="display: none;" class="mt-3">
                    <h6 class="mb-3" style="color: var(--secondary);">
                        <i class="fas fa-list me-2"></i>Selected OR Procedures
                        <span id="orCountBadge" class="badge bg-success ms-2">0</span>
                    </h6>
                    <div id="selectedORsList" class="selected-ors-list"></div>
                    <div class="mt-3 p-3" style="background: rgba(0, 201, 167, 0.1); border-radius: 8px; border: 1px solid rgba(0, 201, 167, 0.3);">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong style="color: var(--secondary);">Total OR Cost:</strong>
                            <strong id="totalORCost" style="color: var(--secondary); font-size: 1.2em;">৳0.00</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Store OR items and initialize OR selection array
        window.currentORItems = items;
        window.selectedORProcedures = [];
        
        console.log('OR system initialized successfully:');
        console.log('- Total procedures:', items.length);
        
    } catch (error) {
        console.error('Error loading OR procedures:', error);
        showToast('Error loading OR procedures', 'danger');
        dynamicInputs.innerHTML = '<div class="alert alert-danger">Failed to load OR procedures</div>';
    }
}

// OR search functionality
function handleORSearch() {
    const searchInput = document.getElementById('orSearch');
    const dropdown = document.getElementById('orDropdown');
    
    if (!searchInput || !dropdown) {
        console.error('OR search elements not found');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Clear browse dropdown when typing in search
    const orBrowseSelect = document.getElementById('orBrowseSelect');
    if (orBrowseSelect && searchTerm.length > 0) {
        orBrowseSelect.value = '';
    }

    if (searchTerm.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    if (!window.currentORItems || window.currentORItems.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item-empty">No OR procedures available</div>';
        dropdown.style.display = 'block';
        return;
    }

    // Filter OR procedures based on search term
    const filteredProcedures = window.currentORItems.filter(procedure =>
        procedure.name.toLowerCase().includes(searchTerm)
    );

    if (filteredProcedures.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item-empty">No procedures found</div>';
        dropdown.style.display = 'block';
        return;
    }

    // Create dropdown items
    let dropdownHTML = '';
    filteredProcedures.slice(0, 8).forEach((procedure, index) => {
        dropdownHTML += `
            <div class="dropdown-item" 
                 onclick="selectORFromDropdown(${procedure.id})" 
                 data-index="${index}">
                <div class="medicine-name">${procedure.name}</div>
                <div class="medicine-details">
                    OR Procedure • ৳${procedure.price} per unit • Units: ৳440 each
                </div>
            </div>
        `;
    });

    dropdown.innerHTML = dropdownHTML;
    dropdown.style.display = 'block';
}

function handleORSearchKeydown(event) {
    const dropdown = document.getElementById('orDropdown');
    const items = dropdown.querySelectorAll('.dropdown-item:not(.dropdown-item-empty)');

    if (items.length === 0) return;

    let currentSelected = dropdown.querySelector('.dropdown-item.selected');
    let currentIndex = currentSelected ? Array.from(items).indexOf(currentSelected) : -1;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add('selected');
            break;

        case 'ArrowUp':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[currentIndex].classList.add('selected');
            break;

        case 'Enter':
            event.preventDefault();
            if (currentSelected) {
                currentSelected.click();
            } else if (items.length > 0) {
                items[0].click();
            }
            break;

        case 'Escape':
            dropdown.style.display = 'none';
            const searchInput = document.getElementById('orSearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            break;
    }
}

function selectORFromDropdown(procedureId) {
    if (!procedureId) return;

    const procedure = window.currentORItems.find(item => item.id == procedureId);
    if (!procedure) return;

    // Update search input
    const searchInput = document.getElementById('orSearch');
    if (searchInput) {
        searchInput.value = procedure.name;
    }

    // Clear browse dropdown if it exists
    const orBrowseSelect = document.getElementById('orBrowseSelect');
    if (orBrowseSelect) {
        orBrowseSelect.value = procedureId;
    }

    // Hide search dropdown
    const dropdown = document.getElementById('orDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }

    // Show selected OR info
    const selectedInfo = document.getElementById('selectedORInfo');
    const selectedName = document.getElementById('selectedORName');
    const selectedDetails = document.getElementById('selectedORDetails');

    if (selectedInfo && selectedName && selectedDetails) {
        selectedName.textContent = procedure.name;
        selectedDetails.innerHTML = `
            Base Price: ৳${procedure.price} • Units: ৳440 each • C-Arm: +৳4000
        `;
        selectedInfo.style.display = 'block';
    }

    // Store the selected procedure
    window.selectedORProcedure = procedure;

    // Enable OR options
    enableOROptions();

    // Calculate initial total
    calculateORTotal();

    showToast(`Selected: ${procedure.name}`, 'success');
}

function selectORFromBrowse(procedureId) {
    if (!procedureId) {
        // Clear search when browse is cleared
        const searchInput = document.getElementById('orSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        const selectedInfo = document.getElementById('selectedORInfo');
        if (selectedInfo) {
            selectedInfo.style.display = 'none';
        }
        
        // Disable OR options
        disableOROptions();
        window.selectedORProcedure = null;
        return;
    }

    selectORFromDropdown(parseInt(procedureId));
}

function enableOROptions() {
    console.log('Enabling OR options...');
    
    // Enable units counter
    const orUnits = document.getElementById('orUnits');
    const decreaseBtn = document.getElementById('decreaseUnits');
    const increaseBtn = document.getElementById('increaseUnits');
    
    if (orUnits) {
        orUnits.disabled = false;
        console.log('OR units enabled');
    }
    if (decreaseBtn) decreaseBtn.disabled = false;
    if (increaseBtn) increaseBtn.disabled = false;

    // Enable C-Arm option
    const cArmOption = document.getElementById('cArmOption');
    const cArmLabel = document.querySelector('label[for="cArmOption"]');
    if (cArmOption) {
        cArmOption.disabled = false;
        console.log('C-Arm option enabled');
    }
    if (cArmLabel) cArmLabel.style.color = 'white';

    // Enable multiple surgeries option
    const multipleSurgeriesOption = document.getElementById('multipleSurgeriesOption');
    const multipleSurgeriesLabel = document.querySelector('label[for="multipleSurgeriesOption"]');
    if (multipleSurgeriesOption) {
        multipleSurgeriesOption.disabled = false;
        console.log('Multiple surgeries option enabled');
    }
    if (multipleSurgeriesLabel) {
        multipleSurgeriesLabel.style.color = 'white';
        multipleSurgeriesLabel.style.fontSize = '12px';
    }

    // Enable complex surgery option
    const complexSurgery = document.getElementById('complexSurgery');
    const complexLabel = document.querySelector('label[for="complexSurgery"]');
    if (complexSurgery) {
        complexSurgery.disabled = false;
        console.log('Complex surgery option enabled');
    }
    if (complexLabel) {
        complexLabel.style.color = 'white';
        complexLabel.style.fontSize = '12px';
        console.log('Complex surgery label updated');
    }

    // Enable 50% discount option
    const fiftyPercentDiscount = document.getElementById('fiftyPercentDiscount');
    const discountLabel = document.querySelector('label[for="fiftyPercentDiscount"]');
    if (fiftyPercentDiscount) {
        fiftyPercentDiscount.disabled = false;
        console.log('50% discount option enabled');
    }
    if (discountLabel) {
        discountLabel.style.color = 'white';
        discountLabel.style.fontSize = '12px';
    }

    // Hide helper text
    const helpText = document.getElementById('orHelpText');
    if (helpText) {
        helpText.style.display = 'none';
        console.log('Helper text hidden');
    }

    // Hide overlay by adding procedure-selected class
    const orConfigSection = document.getElementById('orConfigurationSection');
    if (orConfigSection) {
        const configDiv = orConfigSection.querySelector('.or-config-section') || 
                         orConfigSection.querySelector('.col-md-12');
        if (configDiv) {
            configDiv.classList.add('procedure-selected');
            console.log('OR selection overlay hidden');
        }
    }
}

function toggleMultipleSurgeries() {
    const multipleSurgeriesOption = document.getElementById('multipleSurgeriesOption');
    const additionalSurgeriesSection = document.getElementById('additionalSurgeriesSection');
    
    if (!multipleSurgeriesOption || !additionalSurgeriesSection) return;
    
    if (multipleSurgeriesOption.checked) {
        additionalSurgeriesSection.style.display = 'block';
        populateAdditionalSurgeries();
    } else {
        additionalSurgeriesSection.style.display = 'none';
        clearAdditionalSurgeries();
    }
    
    calculateORTotal();
}

function populateAdditionalSurgeries() {
    const additionalSurgeriesList = document.getElementById('additionalSurgeriesList');
    
    if (!window.currentORItems || !additionalSurgeriesList) return;
    
    // Initialize additional surgeries array if not exists
    if (!window.additionalSurgeries) {
        window.additionalSurgeries = [];
    }
    
    let html = `
        <div class="additional-surgeries-header mb-3">
            <button type="button" class="btn btn-sm" 
                    style="background: rgba(0, 123, 255, 0.2); border: 1px solid rgba(0, 123, 255, 0.5); color: white; font-size: 12px; padding: 8px 16px;"
                    onclick="addNewSurgeryDropdown()">
                <i class="fas fa-plus me-1"></i>Add Another Surgery
            </button>
        </div>
        <div id="surgeryDropdownsList">
    `;
    
    // Display existing surgery dropdowns
    window.additionalSurgeries.forEach((surgery, index) => {
        html += createSurgeryDropdownHTML(index, surgery.selectedId);
    });
    
    html += '</div>';
    
    additionalSurgeriesList.innerHTML = html;
}

function createSurgeryDropdownHTML(index, selectedId = '') {
    const availableProcedures = window.currentORItems.filter(procedure => {
        // Exclude main selected procedure
        if (window.selectedORProcedure && procedure.id === window.selectedORProcedure.id) {
            return false;
        }
        // Exclude already selected additional surgeries (except current one)
        const otherSelected = window.additionalSurgeries
            .filter((_, i) => i !== index)
            .map(s => s.selectedId);
        return !otherSelected.includes(procedure.id);
    });
    
    return `
        <div class="surgery-dropdown-panel mb-3" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 15px;">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 style="color: white; font-size: 14px; margin: 0;">
                    <i class="fas fa-surgical-tong me-1" style="color: #4dabf7;"></i>
                    Additional Surgery ${index + 1}
                </h6>
                <button type="button" class="btn btn-sm" 
                        style="background: rgba(220, 53, 69, 0.2); border: 1px solid rgba(220, 53, 69, 0.5); color: #ff6b6b; font-size: 10px; padding: 4px 8px;"
                        onclick="removeSurgeryDropdown(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="mb-3">
                <label class="form-label" style="color: rgba(255, 255, 255, 0.8); font-size: 12px;">Select Surgery</label>
                <select class="form-select form-select-sm" 
                        id="additionalSurgery_${index}" 
                        onchange="updateAdditionalSurgery(${index}, this.value)"
                        style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); color: white; font-size: 12px;">
                    <option value="">-- Choose Surgery --</option>
                    ${availableProcedures.map(procedure => 
                        `<option value="${procedure.id}" ${selectedId == procedure.id ? 'selected' : ''}>
                            ${procedure.name} - ৳${procedure.price}
                        </option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="row g-2">
                <div class="col-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" 
                               id="complexSurgery_${index}" 
                               onchange="updateSurgeryOptions(${index})"
                               ${window.additionalSurgeries[index]?.isComplex ? 'checked' : ''}>
                        <label class="form-check-label" for="complexSurgery_${index}" 
                               style="color: rgba(255, 255, 255, 0.8); font-size: 11px;">
                            <i class="fas fa-star me-1" style="color: #ffd43b;"></i>Complex (+150%)
                        </label>
                    </div>
                </div>
                <div class="col-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" 
                               id="discountSurgery_${index}" 
                               onchange="updateSurgeryOptions(${index})"
                               ${window.additionalSurgeries[index]?.hasDiscount ? 'checked' : ''}>
                        <label class="form-check-label" for="discountSurgery_${index}" 
                               style="color: rgba(255, 255, 255, 0.8); font-size: 11px;">
                            <i class="fas fa-percentage me-1" style="color: #51cf66;"></i>50% Discount
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="mt-2">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           id="cArmSurgery_${index}" 
                           onchange="updateSurgeryOptions(${index})"
                           ${window.additionalSurgeries[index]?.hasCArm ? 'checked' : ''}>
                    <label class="form-check-label" for="cArmSurgery_${index}" 
                           style="color: rgba(255, 255, 255, 0.8); font-size: 11px;">
                        <i class="fas fa-x-ray me-1" style="color: #ff8cc8;"></i>C-Arm (+৳4000)
                    </label>
                </div>
            </div>
            
            ${selectedId ? `
                <div class="mt-3 p-2" style="background: rgba(0, 123, 255, 0.1); border-radius: 4px;">
                    <div class="surgery-calculation" style="color: rgba(255, 255, 255, 0.9); font-size: 11px;">
                        <div class="d-flex justify-content-between">
                            <span>Surgery Cost:</span>
                            <span id="surgeryCalc_${index}">৳0</span>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function addNewSurgeryDropdown() {
    if (!window.additionalSurgeries) {
        window.additionalSurgeries = [];
    }
    
    // Check if there are available procedures
    const availableProcedures = window.currentORItems.filter(procedure => {
        if (window.selectedORProcedure && procedure.id === window.selectedORProcedure.id) {
            return false;
        }
        const selectedIds = window.additionalSurgeries.map(s => s.selectedId).filter(id => id);
        return !selectedIds.includes(procedure.id);
    });
    
    if (availableProcedures.length === 0) {
        showToast('No more surgeries available to add', 'warning');
        return;
    }
    
    window.additionalSurgeries.push({
        selectedId: '',
        isComplex: false,
        hasDiscount: false,
        hasCArm: false
    });
    
    populateAdditionalSurgeries();
    calculateORTotal();
}

function removeSurgeryDropdown(index) {
    if (window.additionalSurgeries && window.additionalSurgeries[index]) {
        window.additionalSurgeries.splice(index, 1);
        populateAdditionalSurgeries();
        calculateORTotal();
    }
}

function updateAdditionalSurgery(index, surgeryId) {
    if (!window.additionalSurgeries[index]) return;
    
    window.additionalSurgeries[index].selectedId = surgeryId;
    
    // Refresh the display to update available options for other dropdowns
    populateAdditionalSurgeries();
    calculateORTotal();
}

function updateSurgeryOptions(index) {
    if (!window.additionalSurgeries[index]) return;
    
    const complexCheckbox = document.getElementById(`complexSurgery_${index}`);
    const discountCheckbox = document.getElementById(`discountSurgery_${index}`);
    const cArmCheckbox = document.getElementById(`cArmSurgery_${index}`);
    
    window.additionalSurgeries[index].isComplex = complexCheckbox ? complexCheckbox.checked : false;
    window.additionalSurgeries[index].hasDiscount = discountCheckbox ? discountCheckbox.checked : false;
    window.additionalSurgeries[index].hasCArm = cArmCheckbox ? cArmCheckbox.checked : false;
    
    calculateORTotal();
}

function clearAdditionalSurgeries() {
    const additionalSurgeriesList = document.getElementById('additionalSurgeriesList');
    if (additionalSurgeriesList) {
        additionalSurgeriesList.innerHTML = '';
    }
    
    // Clear the additional surgeries array
    window.additionalSurgeries = [];
    
    // Clear any stored additional surgeries
    if (window.currentORCalculation) {
        window.currentORCalculation.additionalSurgeries = [];
    }
}

function disableOROptions() {
    // Disable units counter
    const orUnits = document.getElementById('orUnits');
    const decreaseBtn = document.getElementById('decreaseUnits');
    const increaseBtn = document.getElementById('increaseUnits');
    
    if (orUnits) {
        orUnits.disabled = true;
        orUnits.value = 1;
    }
    if (decreaseBtn) decreaseBtn.disabled = true;
    if (increaseBtn) increaseBtn.disabled = true;

    // Disable and uncheck C-Arm option
    const cArmOption = document.getElementById('cArmOption');
    const cArmLabel = document.querySelector('label[for="cArmOption"]');
    if (cArmOption) {
        cArmOption.disabled = true;
        cArmOption.checked = false;
    }
    if (cArmLabel) cArmLabel.style.color = 'rgba(255, 255, 255, 0.5)';

    // Disable and uncheck multiple surgeries option
    const multipleSurgeriesOption = document.getElementById('multipleSurgeriesOption');
    const multipleSurgeriesLabel = document.querySelector('label[for="multipleSurgeriesOption"]');
    const additionalSurgeriesSection = document.getElementById('additionalSurgeriesSection');
    if (multipleSurgeriesOption) {
        multipleSurgeriesOption.disabled = true;
        multipleSurgeriesOption.checked = false;
    }
    if (multipleSurgeriesLabel) multipleSurgeriesLabel.style.color = 'rgba(255, 255, 255, 0.5)';
    if (additionalSurgeriesSection) additionalSurgeriesSection.style.display = 'none';

    // Disable and uncheck complex surgery option
    const complexSurgery = document.getElementById('complexSurgery');
    const complexLabel = document.querySelector('label[for="complexSurgery"]');
    if (complexSurgery) {
        complexSurgery.disabled = true;
        complexSurgery.checked = false;
    }
    if (complexLabel) complexLabel.style.color = 'rgba(255, 255, 255, 0.5)';

    // Disable and uncheck 50% discount option
    const fiftyPercentDiscount = document.getElementById('fiftyPercentDiscount');
    const discountLabel = document.querySelector('label[for="fiftyPercentDiscount"]');
    if (fiftyPercentDiscount) {
        fiftyPercentDiscount.disabled = true;
        fiftyPercentDiscount.checked = false;
    }
    if (discountLabel) discountLabel.style.color = 'rgba(255, 255, 255, 0.5)';

    // Show helper text
    const helpText = document.getElementById('orHelpText');
    if (helpText) helpText.style.display = 'block';

    // Hide calculation and add button
    const orCalculation = document.getElementById('orCalculation');
    const addORBtn = document.getElementById('addORBtn');
    if (orCalculation) orCalculation.style.display = 'none';
    if (addORBtn) addORBtn.style.display = 'none';

    // Show overlay by removing procedure-selected class
    const orConfigSection = document.getElementById('orConfigurationSection');
    if (orConfigSection) {
        const configDiv = orConfigSection.querySelector('.or-config-section') || 
                         orConfigSection.querySelector('.col-md-12');
        if (configDiv) {
            configDiv.classList.remove('procedure-selected');
            console.log('OR selection overlay shown');
        }
    }

    // Clear additional surgeries
    clearAdditionalSurgeries();
}

function adjustORUnits(delta) {
    const orUnits = document.getElementById('orUnits');
    if (!orUnits) return;

    let currentUnits = parseInt(orUnits.value) || 1;
    currentUnits += delta;
    
    if (currentUnits < 1) currentUnits = 1;
    if (currentUnits > 10) currentUnits = 10;
    
    orUnits.value = currentUnits;
    calculateORTotal();
}

function calculateORTotal() {
    if (!window.selectedORProcedure) {
        const orCalculation = document.getElementById('orCalculation');
        const addORBtn = document.getElementById('addORBtn');
        if (orCalculation) orCalculation.style.display = 'none';
        if (addORBtn) addORBtn.style.display = 'none';
        return;
    }

    const procedure = window.selectedORProcedure;
    const orUnits = document.getElementById('orUnits');
    const cArmOption = document.getElementById('cArmOption');
    const complexSurgery = document.getElementById('complexSurgery');
    const fiftyPercentDiscount = document.getElementById('fiftyPercentDiscount');
    const multipleSurgeriesOption = document.getElementById('multipleSurgeriesOption');
    
    if (!orUnits) return;

    const units = parseInt(orUnits.value) || 1;
    const hasCArm = cArmOption && cArmOption.checked;
    const isComplex = complexSurgery && complexSurgery.checked;
    const hasDiscount = fiftyPercentDiscount && fiftyPercentDiscount.checked;
    const hasMultipleSurgeries = multipleSurgeriesOption && multipleSurgeriesOption.checked;
    
    // Calculate base cost
    let baseCost = procedure.price;
    
    // Apply complex surgery pricing (150% of original)
    if (isComplex) {
        baseCost = baseCost * 1.5;
    }
    
    // Apply 50% discount if selected
    if (hasDiscount) {
        baseCost = baseCost * 0.5;
    }
    
    // Calculate additional surgeries cost
    let additionalSurgeriesCost = 0;
    const additionalSurgeries = [];
    
    if (hasMultipleSurgeries && window.additionalSurgeries) {
        window.additionalSurgeries.forEach((surgeryConfig, index) => {
            if (surgeryConfig.selectedId) {
                const surgery = window.currentORItems.find(item => item.id == surgeryConfig.selectedId);
                if (surgery) {
                    let surgeryPrice = surgery.price;
                    
                    // Apply complex surgery pricing (150% of original)
                    if (surgeryConfig.isComplex) {
                        surgeryPrice = surgeryPrice * 1.5;
                    }
                    
                    // Apply 50% discount to individual surgery if selected
                    if (surgeryConfig.hasDiscount) {
                        surgeryPrice = surgeryPrice * 0.5;
                    }
                    
                    // Add C-Arm cost for individual surgery
                    if (surgeryConfig.hasCArm) {
                        surgeryPrice += 4000;
                    }
                    
                    additionalSurgeriesCost += surgeryPrice;
                    additionalSurgeries.push({
                        ...surgery,
                        adjustedPrice: surgeryPrice,
                        isComplex: surgeryConfig.isComplex,
                        hasDiscount: surgeryConfig.hasDiscount,
                        hasCArm: surgeryConfig.hasCArm
                    });
                    
                    // Update individual surgery calculation display
                    const calcElement = document.getElementById(`surgeryCalc_${index}`);
                    if (calcElement) {
                        calcElement.textContent = `৳${surgeryPrice.toFixed(2)}`;
                    }
                }
            }
        });
    }
    
    // Calculate units cost (440 per unit)
    const unitsCost = units * 440;
    
    // Add C-Arm cost if selected
    const cArmCost = hasCArm ? 4000 : 0;
    
    // Calculate total
    const totalCost = baseCost + additionalSurgeriesCost + unitsCost + cArmCost;
    
    // Update calculation display
    const orCalculation = document.getElementById('orCalculation');
    const orCalculationDetails = document.getElementById('orCalculationDetails');
    const addORBtn = document.getElementById('addORBtn');
    
    if (orCalculation && orCalculationDetails) {
        let calculationHTML = `
            <div class="calculation-row">
                <span>Procedure:</span>
                <span>${procedure.name}</span>
            </div>
            <div class="calculation-row">
                <span>Base Cost:</span>
                <span>৳${procedure.price.toFixed(2)}</span>
            </div>
        `;
        
        if (isComplex) {
            calculationHTML += `
                <div class="calculation-row">
                    <span>Complex Surgery (150%):</span>
                    <span>৳${(procedure.price * 1.5).toFixed(2)}</span>
                </div>
            `;
        }
        
        if (hasDiscount) {
            calculationHTML += `
                <div class="calculation-row">
                    <span>After Discount (50%):</span>
                    <span>৳${baseCost.toFixed(2)}</span>
                </div>
            `;
        }
        
        calculationHTML += `
            <div class="calculation-row">
                <span>Units (${units} × ৳440):</span>
                <span>৳${unitsCost.toFixed(2)}</span>
            </div>
        `;
        
        if (hasMultipleSurgeries && additionalSurgeries.length > 0) {
            additionalSurgeries.forEach(surgery => {
                calculationHTML += `
                    <div class="calculation-row">
                        <span>Additional: ${surgery.name}${hasDiscount ? ' (50% off)' : ''}:</span>
                        <span>৳${surgery.adjustedPrice.toFixed(2)}</span>
                    </div>
                `;
            });
        }
        
        if (hasCArm) {
            calculationHTML += `
                <div class="calculation-row">
                    <span>C-Arm:</span>
                    <span>৳${cArmCost.toFixed(2)}</span>
                </div>
            `;
        }
        
        calculationHTML += `
            <div class="calculation-row total-row">
                <span><strong>Total:</strong></span>
                <span><strong>৳${totalCost.toFixed(2)}</strong></span>
            </div>
        `;
        
        orCalculationDetails.innerHTML = calculationHTML;
        orCalculation.style.display = 'block';
    }
    
    // Show add button
    if (addORBtn) addORBtn.style.display = 'block';
    
    // Store calculation for later use
    window.currentORCalculation = {
        procedure: procedure,
        units: units,
        unitsCost: unitsCost,
        baseCost: baseCost,
        additionalSurgeries: additionalSurgeries,
        additionalSurgeriesCost: additionalSurgeriesCost,
        cArmCost: cArmCost,
        totalCost: totalCost,
        isComplex: isComplex,
        hasDiscount: hasDiscount,
        hasCArm: hasCArm,
        hasMultipleSurgeries: hasMultipleSurgeries
    };
}

function addORToBill() {
    if (!window.currentORCalculation) {
        showToast('Please configure OR procedure first', 'warning');
        return;
    }

    const calc = window.currentORCalculation;
    
    // Create description
    let description = `${calc.units} units`;
    if (calc.isComplex) description += ', Complex Surgery';
    if (calc.hasMultipleSurgeries && calc.additionalSurgeries.length > 0) {
        description += `, Additional: ${calc.additionalSurgeries.map(s => s.name).join(', ')}`;
    }
    if (calc.hasCArm) description += ', C-Arm';
    if (calc.hasDiscount) description += ', 50% discount';
    
    // Create OR selection object
    const orSelection = {
        id: Date.now() + Math.random(), // Unique ID for selection
        procedure: calc.procedure,
        units: calc.units,
        unitsCost: calc.unitsCost,
        baseCost: calc.baseCost,
        additionalSurgeries: calc.additionalSurgeries || [],
        additionalSurgeriesCost: calc.additionalSurgeriesCost || 0,
        cArmCost: calc.cArmCost,
        totalCost: calc.totalCost,
        isComplex: calc.isComplex,
        hasDiscount: calc.hasDiscount,
        hasCArm: calc.hasCArm,
        hasMultipleSurgeries: calc.hasMultipleSurgeries,
        description: description
    };

    // Add to selected ORs
    if (!window.selectedORProcedures) {
        window.selectedORProcedures = [];
    }
    
    window.selectedORProcedures.push(orSelection);
    
    // Update display
    updateSelectedORsDisplay();
    
    showToast(`OR added to selection: ${calc.procedure.name}`, 'success');
    
    // Reset form for next selection
    clearORFormForNext();
}

function clearORFormForNext() {
    // Clear search and browse selections
    const orSearch = document.getElementById('orSearch');
    const orBrowseSelect = document.getElementById('orBrowseSelect');
    const selectedORInfo = document.getElementById('selectedORInfo');
    
    if (orSearch) orSearch.value = '';
    if (orBrowseSelect) orBrowseSelect.value = '';
    if (selectedORInfo) selectedORInfo.style.display = 'none';
    
    // Reset units
    const orUnits = document.getElementById('orUnits');
    if (orUnits) orUnits.value = 1;
    
    // Uncheck options
    const cArmOption = document.getElementById('cArmOption');
    const multipleSurgeriesOption = document.getElementById('multipleSurgeriesOption');
    const complexSurgery = document.getElementById('complexSurgery');
    const fiftyPercentDiscount = document.getElementById('fiftyPercentDiscount');
    
    if (cArmOption) cArmOption.checked = false;
    if (multipleSurgeriesOption) {
        multipleSurgeriesOption.checked = false;
        toggleMultipleSurgeries(); // This will hide the additional surgeries section
    }
    if (complexSurgery) complexSurgery.checked = false;
    if (fiftyPercentDiscount) fiftyPercentDiscount.checked = false;
    
    // Hide calculation and add button
    const orCalculation = document.getElementById('orCalculation');
    const addORBtn = document.getElementById('addORBtn');
    if (orCalculation) orCalculation.style.display = 'none';
    if (addORBtn) addORBtn.style.display = 'none';
    
    // Disable options and clear selection
    disableOROptions();
    window.selectedORProcedure = null;
    window.currentORCalculation = null;
}

function clearORForm() {
    clearORFormForNext();
    
    // Also clear all selected ORs
    window.selectedORProcedures = [];
    updateSelectedORsDisplay();
}

function updateSelectedORsDisplay() {
    const container = document.getElementById('selectedORsContainer');
    const list = document.getElementById('selectedORsList');
    const badge = document.getElementById('orCountBadge');
    const totalCost = document.getElementById('totalORCost');
    const saveBtn = document.getElementById('saveAllORsBtn');
    const clearBtn = document.getElementById('clearAllORsBtn');
    
    if (!window.selectedORProcedures) {
        window.selectedORProcedures = [];
    }
    
    const count = window.selectedORProcedures.length;
    
    if (count === 0) {
        if (container) container.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    
    // Show container and buttons
    if (container) container.style.display = 'block';
    if (saveBtn) saveBtn.style.display = 'inline-block';
    if (clearBtn) clearBtn.style.display = 'inline-block';
    
    // Update badge
    if (badge) badge.textContent = count;
    
    // Calculate total cost
    const total = window.selectedORProcedures.reduce((sum, or) => sum + or.totalCost, 0);
    if (totalCost) totalCost.textContent = `৳${total.toFixed(2)}`;
    
    // Update list
    if (list) {
        let html = '';
        window.selectedORProcedures.forEach((or, index) => {
            const complexBadge = or.isComplex ? '<span class="badge bg-danger ms-2">Complex</span>' : '';
            const discountBadge = or.hasDiscount ? '<span class="badge bg-warning text-dark ms-2">50% OFF</span>' : '';
            const cArmBadge = or.hasCArm ? '<span class="badge bg-info ms-2">C-Arm</span>' : '';
            const multipleBadge = or.hasMultipleSurgeries && or.additionalSurgeries && or.additionalSurgeries.length > 0 ? '<span class="badge bg-primary ms-2">Multiple</span>' : '';
            
            html += `
                <div class="selected-or-item" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-2" style="color: white; font-weight: 600;">
                                ${or.procedure.name}
                                ${complexBadge}
                                ${discountBadge}
                                ${cArmBadge}
                                ${multipleBadge}
                            </h6>
                            <div class="or-details" style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.8);">
                                <div>Units: ${or.units} × ৳440 = ৳${or.unitsCost.toFixed(2)}</div>
                                <div>Base Cost: ৳${or.procedure.price.toFixed(2)} ${or.isComplex ? '→ ৳' + (or.procedure.price * 1.5).toFixed(2) + ' (Complex 150%)' : ''} ${or.hasDiscount ? '→ ৳' + or.baseCost.toFixed(2) + ' (50% off)' : ''}</div>
                                ${or.hasMultipleSurgeries && or.additionalSurgeries && or.additionalSurgeries.length > 0 ? 
                                    '<div>Additional Surgeries: ' + or.additionalSurgeries.map(s => s.name + ' ৳' + s.adjustedPrice.toFixed(2)).join(', ') + '</div>' : ''}
                                ${or.hasCArm ? '<div>C-Arm: ৳' + or.cArmCost.toFixed(2) + '</div>' : ''}
                            </div>
                        </div>
                        <div class="or-actions d-flex flex-column align-items-end">
                            <div class="or-cost mb-2" style="color: var(--secondary); font-weight: 700; font-size: 1.1rem;">
                                ৳${or.totalCost.toFixed(2)}
                            </div>
                            <button class="btn btn-sm btn-outline-danger" onclick="removeSelectedOR(${index})" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    }
}

function removeSelectedOR(index) {
    if (window.selectedORProcedures && window.selectedORProcedures[index]) {
        const removed = window.selectedORProcedures.splice(index, 1)[0];
        updateSelectedORsDisplay();
        showToast(`Removed: ${removed.procedure.name}`, 'info');
    }
}

function saveAllORs() {
    if (!window.selectedORProcedures || window.selectedORProcedures.length === 0) {
        showToast('No OR procedures selected', 'warning');
        return;
    }
    
    let savedCount = 0;
    
    window.selectedORProcedures.forEach(or => {
        const billItem = {
            id: nextItemId++,
            category: 'OR',
            name: or.procedure.name,
            type: 'Surgery',
            strength: '',
            quantity: or.units,
            unitPrice: or.totalCost,
            totalPrice: or.totalCost,
            description: or.description
        };
        
        // Add directly to bill without duplicate check since these are configured selections
        billItems.push(billItem);
        savedCount++;
    });
    
    if (savedCount > 0) {
        updateBillPreview();
        showToast(`${savedCount} OR procedures added to bill`, 'success');
        
        // Clear all selections
        window.selectedORProcedures = [];
        updateSelectedORsDisplay();
        clearORFormForNext();
    }
}

function clearAllORs() {
    if (!window.selectedORProcedures || window.selectedORProcedures.length === 0) {
        showToast('No OR procedures to clear', 'info');
        return;
    }
    
    const count = window.selectedORProcedures.length;
    window.selectedORProcedures = [];
    updateSelectedORsDisplay();
    clearORFormForNext();
    showToast(`Cleared ${count} OR procedures`, 'success');
}

// OR Manual Entry Functions
function toggleORManualEntry() {
    const checkbox = document.getElementById('orManualEntryCheckbox');
    const searchInput = document.getElementById('orSearch');
    const browseSelect = document.getElementById('orBrowseSelect');
    const selectedInfo = document.getElementById('selectedORInfo');
    const selectedName = document.getElementById('selectedORName');
    const selectedDetails = document.getElementById('selectedORDetails');
    const manualEntryRow = document.getElementById('orManualEntryRow');
    const addORBtn = document.getElementById('addORBtn');
    const addORManualBtn = document.getElementById('addORManualBtn');

    if (checkbox && checkbox.checked) {
        // Manual entry selected
        if (searchInput) searchInput.value = 'Manual Entry';
        if (browseSelect) browseSelect.value = '';

        if (selectedInfo && selectedName && selectedDetails) {
            selectedName.textContent = 'Manual Entry';
            selectedDetails.innerHTML = 'Custom OR procedure with manual pricing';
            selectedInfo.style.display = 'block';
        }

        if (manualEntryRow) manualEntryRow.style.display = 'flex';
        if (addORManualBtn) addORManualBtn.style.display = 'block';
        if (addORBtn) addORBtn.style.display = 'none';

        // Disable regular OR options
        disableOROptions();

        showToast('Manual entry enabled - enter custom OR procedure details', 'success');
    } else {
        // Manual entry unchecked
        if (searchInput) searchInput.value = '';
        if (selectedInfo) selectedInfo.style.display = 'none';
        if (manualEntryRow) manualEntryRow.style.display = 'none';
        if (addORManualBtn) addORManualBtn.style.display = 'none';
        if (addORBtn) addORBtn.style.display = 'none';

        // Clear selected procedure
        window.selectedORProcedure = null;
        window.currentORCalculation = null;

        showToast('Manual entry disabled', 'info');
    }
}

function toggleORManualEntry() {
    const checkbox = document.getElementById('orManualEntryCheckbox');
    const searchInput = document.getElementById('orSearch');
    const browseSelect = document.getElementById('orBrowseSelect');
    const selectedInfo = document.getElementById('selectedORInfo');
    const selectedName = document.getElementById('selectedORName');
    const selectedDetails = document.getElementById('selectedORDetails');
    const manualEntryRow = document.getElementById('orManualEntryRow');
    const addORBtn = document.getElementById('addORBtn');
    const addORManualBtn = document.getElementById('addORManualBtn');

    if (checkbox && checkbox.checked) {
        // Manual entry selected
        if (searchInput) searchInput.value = 'Manual Entry';
        if (browseSelect) browseSelect.value = '';

        if (selectedInfo && selectedName && selectedDetails) {
            selectedName.textContent = 'Manual Entry';
            selectedDetails.innerHTML = 'Custom OR procedure with manual pricing';
            selectedInfo.style.display = 'block';
        }

        if (manualEntryRow) manualEntryRow.style.display = 'flex';
        if (addORManualBtn) addORManualBtn.style.display = 'block';
        if (addORBtn) addORBtn.style.display = 'none';

        // Disable regular OR options
        disableOROptions();

        showToast('Manual entry enabled - enter custom OR procedure details', 'success');
    } else {
        // Manual entry unchecked
        if (searchInput) searchInput.value = '';
        if (selectedInfo) selectedInfo.style.display = 'none';
        if (manualEntryRow) manualEntryRow.style.display = 'none';
        if (addORManualBtn) addORManualBtn.style.display = 'none';
        if (addORBtn) addORBtn.style.display = 'none';

        // Clear selected procedure
        window.selectedORProcedure = null;
        window.currentORCalculation = null;

        showToast('Manual entry disabled', 'info');
    }
}

function addORManualEntry() {
    const orManualName = document.getElementById('orManualName');
    const orManualPrice = document.getElementById('orManualPrice');

    if (!orManualName || !orManualPrice || !orManualName.value || !orManualPrice.value) {
        showToast('Please enter OR procedure name and base price for manual entry', 'warning');
        return;
    }

    const procedureName = orManualName.value.trim();
    const procedurePrice = parseFloat(orManualPrice.value) || 0;

    if (procedurePrice <= 0) {
        showToast('Invalid OR procedure price', 'warning');
        return;
    }

    // Create a manual entry as a complete OR procedure
    const manualOREntry = {
        id: Date.now() + Math.random(), // Unique ID for selection
        procedure: {
            id: 'manual_' + Date.now(),
            name: procedureName,
            price: procedurePrice,
            category: 'OR'
        },
        units: 1,
        unitsCost: 440, // Standard unit cost
        baseCost: procedurePrice,
        additionalSurgeries: [],
        additionalSurgeriesCost: 0,
        cArmCost: 0,
        totalCost: procedurePrice + 440, // Base price + 1 unit
        isComplex: false,
        hasDiscount: false,
        hasCArm: false,
        hasMultipleSurgeries: false,
        description: '1 units, Manual Entry'
    };

    // Add to selected ORs
    if (!window.selectedORProcedures) {
        window.selectedORProcedures = [];
    }
    
    window.selectedORProcedures.push(manualOREntry);
    
    // Update display
    updateSelectedORsDisplay();
    
    showToast(`Custom OR procedure added: ${procedureName}`, 'success');
    
    // Clear manual entry fields
    orManualName.value = '';
    orManualPrice.value = '';
    
    // Reset checkbox and hide manual entry
    const manualCheckbox = document.getElementById('orManualEntryCheckbox');
    if (manualCheckbox) {
        manualCheckbox.checked = false;
        toggleORManualEntry();
    }
}

async function showXrayInput(items) {
    const dynamicInputs = document.getElementById('dynamicInputs');

    // Debug: Log items received
    console.log('X-ray items received:', items);
    console.log('Items type:', typeof items);
    console.log('Items length:', items ? items.length : 'N/A');
    
    // Validate items data structure
    if (!items) {
        console.error('X-ray items is null or undefined');
        dynamicInputs.innerHTML = `
            <div class="alert alert-danger">
                <h6>Error loading X-ray items</h6>
                <p>Failed to retrieve X-ray data from server. Please refresh the page and try again.</p>
            </div>
        `;
        return;
    }
    
    if (!Array.isArray(items)) {
        console.error('X-ray items is not an array:', items);
        dynamicInputs.innerHTML = `
            <div class="alert alert-danger">
                <h6>Data format error</h6>
                <p>Invalid data format received from server. Expected array but got: ${typeof items}</p>
            </div>
        `;
        return;
    }
    
    if (items.length === 0) {
        console.warn('X-ray items array is empty');
        dynamicInputs.innerHTML = `
            <div class="alert alert-warning">
                <h6>No X-ray items available</h6>
                <p>No X-ray services found in the database. Please add X-ray items through the database management interface.</p>
            </div>
        `;
        return;
    }
    
    // Validate individual items
    const validItems = items.filter(item => {
        if (!item || typeof item !== 'object') {
            console.warn('Invalid item found:', item);
            return false;
        }
        if (!item.name || !item.price) {
            console.warn('Item missing required fields:', item);
            return false;
        }
        return true;
    });
    
    if (validItems.length === 0) {
        console.error('No valid X-ray items found after filtering');
        dynamicInputs.innerHTML = `
            <div class="alert alert-warning">
                <h6>Invalid X-ray data</h6>
                <p>X-ray items found but none have valid data structure. Please check the database.</p>
            </div>
        `;
        return;
    }
    
    console.log(`Using ${validItems.length} valid X-ray items out of ${items.length} total items`);
    
    // Use validItems instead of items for the rest of the function
    items = validItems;

    // Process X-ray items and extract view types from names
    const processedXrays = items.map(item => {
        let baseName = item.name;
        let viewType = null;
        
        // Extract view type from item name
        if (item.name.toLowerCase().includes(' ap') || item.name.toLowerCase().includes('-ap')) {
            viewType = 'AP';
            baseName = item.name.replace(/[\s\-]ap.*$/gi, '').trim();
        } else if (item.name.toLowerCase().includes(' lat') || item.name.toLowerCase().includes('-lat')) {
            viewType = 'LAT';
            baseName = item.name.replace(/[\s\-]lat.*$/gi, '').trim();
        } else if (item.name.toLowerCase().includes(' oblique') || item.name.toLowerCase().includes('-oblique')) {
            viewType = 'OBLIQUE';
            baseName = item.name.replace(/[\s\-]oblique.*$/gi, '').trim();
        } else if (item.name.toLowerCase().includes(' both') || item.name.toLowerCase().includes('-both')) {
            viewType = 'BOTH';
            baseName = item.name.replace(/[\s\-]both.*$/gi, '').trim();
        } else {
            // If no specific view type found, treat as general X-ray
            viewType = 'GENERAL';
        }
        
        // Clean up base name further
        baseName = baseName.replace(/\s*\d+\s*$/g, '').trim(); // Remove trailing numbers
        baseName = baseName.replace(/\s*৳.*$/g, '').trim(); // Remove any price mentions
        
        return {
            ...item,
            xrayBaseName: baseName,
            viewType: viewType
        };
    });

    // Group X-ray items by base name
    const groupedXrays = {};
    processedXrays.forEach(item => {
        if (!groupedXrays[item.xrayBaseName]) {
            groupedXrays[item.xrayBaseName] = [];
        }
        groupedXrays[item.xrayBaseName].push(item);
    });

    let xrayOptionsHTML = '';
    Object.keys(groupedXrays).forEach(baseName => {
        const xrayItems = groupedXrays[baseName];
        // Use the lowest price as base price
        const basePrice = Math.min(...xrayItems.map(item => item.price));
        xrayOptionsHTML += `<option value="${baseName}" data-base-price="${basePrice}">${baseName}</option>`;
    });

    dynamicInputs.innerHTML = `
        <div class="xray-container">
            <!-- X-ray Search Section -->
            <div class="xray-search-container mb-3">
                <label class="form-label">Search & Select X-ray</label>
                <div class="autocomplete-container">
                    <input type="text" class="form-control search-box" id="xraySearch" 
                           placeholder="Type X-ray name..." 
                           oninput="handleXraySearch()" 
                           onkeydown="handleXraySearchKeydown(event)"
                           autocomplete="off" autofocus>
                    <div id="xrayDropdown" class="medicine-dropdown" style="display:none;"></div>
                </div>

                <div class="mt-3">
                    <label class="form-label">Or Browse All X-rays</label>
                    <select id="xrayBrowseSelect" class="form-select" onchange="selectXrayFromBrowse(this.value)">
                        <option value="">-- Browse all X-rays --</option>
                        ${xrayOptionsHTML}
                    </select>
                </div>

                <div class="mt-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="manualEntryCheckbox" onchange="toggleManualEntry()">
                        <label class="form-check-label" for="manualEntryCheckbox" style="color: #ffd43b; font-weight: 600;">
                            <i class="fas fa-edit me-1"></i>Manual Entry (Custom X-ray)
                        </label>
                    </div>
                </div>

                <div id="selectedXrayInfo" class="selected-medicine-info" style="display: none;">
                    <div class="alert alert-info">
                        <strong id="selectedXrayName"></strong>
                        <div class="strength-display" id="selectedXrayDetails"></div>
                    </div>
                </div>

                <div id="quickXraySuggestions" class="quick-lab-suggestions mt-3" style="display: none;">
                    <div class="quick-lab-container">
                        <div id="xraySuggestion1" class="lab-quick-button" style="display: none;" onclick="selectXrayFromQuickButton(this)">
                            <i class="fas fa-x-ray"></i>
                            <span></span>
                        </div>
                        <div id="xraySuggestion2" class="lab-quick-button" style="display: none;" onclick="selectXrayFromQuickButton(this)">
                            <i class="fas fa-lungs"></i>
                            <span></span>
                        </div>
                        <div id="xraySuggestion3" class="lab-quick-button" style="display: none;" onclick="selectXrayFromQuickButton(this)">
                            <i class="fas fa-bone"></i>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- X-ray Configuration -->
            <div class="row mb-3" id="xrayConfigurationSection">
                <div class="col-md-12 xray-config-section">
                    <label class="form-label">X-ray Configuration</label>
                    
                    <!-- Selection Overlay -->
                    <div class="xray-selection-overlay">
                        <div class="xray-selection-icon">
                            <i class="fas fa-hand-point-up"></i>
                        </div>
                        <div class="xray-selection-message">
                            Please Select an X-ray First
                        </div>
                    </div>
                    
                    <!-- View Type Options -->
                    <div class="xray-views-section mb-3" style="display: block;">
                        <div class="form-label mb-2" style="color: var(--secondary); font-size: 14px; font-weight: 600;">
                            <i class="fas fa-eye me-1"></i>View Type Options
                        </div>
                        <div class="view-type-checkboxes">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="viewAP" value="AP" onchange="handleViewTypeChange('AP')" disabled>
                                <label class="form-check-label" for="viewAP" style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">
                                    AP
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="viewLAT" value="LAT" onchange="handleViewTypeChange('LAT')" disabled>
                                <label class="form-check-label" for="viewLAT" style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">
                                    LAT
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="viewOBLIQUE" value="OBLIQUE" onchange="handleViewTypeChange('OBLIQUE')" disabled>
                                <label class="form-check-label" for="viewOBLIQUE" style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">
                                    OBLIQUE
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="viewBOTH" value="BOTH" onchange="handleViewTypeChange('BOTH')" disabled>
                                <label class="form-check-label" for="viewBOTH" style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">
                                    BOTH
                                </label>
                            </div>
                            
                        </div>
                    </div>

                    <!-- Additional Options -->
                    <div class="xray-additional-section mb-3">
                        <div class="form-label mb-2" style="color: var(--secondary); font-size: 14px; font-weight: 600;">
                            <i class="fas fa-plus-circle me-1"></i>Additional Options
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="portableOption" onchange="togglePortableCharge()" disabled>
                            <label class="form-check-label" for="portableOption" style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">
                                Portable (+70৳)
                            </label>
                        </div>
                    </div>

                    <!-- Reset Button -->
                    <div class="xray-reset-section mb-3">
                        <button type="button" class="btn btn-outline-warning btn-sm" onclick="resetXraySelection()">
                            <i class="fas fa-undo me-1"></i>Reset Selection
                        </button>
                    </div>

                    <div class="mt-2" id="xrayHelpText">
                        <small style="color: rgba(255, 255, 255, 0.6); font-style: italic;">
                            <i class="fas fa-info-circle me-1"></i>Please select an X-ray first to enable options
                        </small>
                    </div>
                </div>
            </div>

            <!-- Manual Entry Row -->
            <div class="row mb-2" id="manualEntryRow" style="display: none;">
                <div class="col-md-6 mb-1">
                    <label class="form-label">X-ray Name</label>
                    <input type="text" id="xrayManualName" class="form-control" placeholder="Enter X-ray name">
                </div>
                <div class="col-md-6 mb-1">
                    <label class="form-label">Amount</label>
                    <input type="number" id="xrayManualAmount" class="form-control" min="0" step="0.01" placeholder="Enter amount" oninput="calculateXrayTotal()">
                </div>
            </div>

            <!-- Hidden inputs for calculations -->
            <input type="hidden" id="xrayUnitPrice">
            <input type="hidden" id="xrayTotal">

            <!-- Calculation Display -->
            <div class="calculation-display mb-3" id="xrayCalculation" style="display: none;">
                <div class="alert alert-info">
                    <strong>Calculation:</strong>
                    <div id="xrayCalculationDetails"></div>
                </div>
            </div>

            <!-- Action Buttons - Two Lines -->
            <div class="xray-action-buttons">
                <div class="row">
                    <div class="col-12 mb-2">
                        <button class="btn btn-primary" onclick="addXrayToCart()" id="addXrayBtn" style="display: none;">
                            <i class="fas fa-plus me-1"></i> Add to Selection
                        </button>
                    </div>
                </div>
                <div class="row" id="xraySecondaryActions" style="display: none;">
                    <div class="col-12">
                        <button class="btn btn-success me-2" onclick="saveAllXrays()" id="saveAllXraysBtn">
                            <i class="fas fa-save me-1"></i> Save All X-rays
                        </button>
                        <button class="btn btn-outline-secondary" onclick="cancelXraySelection()" id="cancelXraySelectionBtn">
                            <i class="fas fa-times me-1"></i> Cancel Selection
                        </button>
                    </div>
                </div>
            </div>

            <!-- Pending X-rays Display -->
            <div id="pendingXraysContainer" style="display: none;" class="mt-3"></div>
        </div>
    `;

    // Store processed X-rays for later use
    window.groupedXrays = groupedXrays;
    window.currentCategoryItems = items;
    window.currentXrayItems = processedXrays;
    
    console.log('X-ray system initialized successfully:');
    console.log('- Total items:', items.length);
    console.log('- Grouped categories:', Object.keys(groupedXrays).length);
    console.log('- Group names:', Object.keys(groupedXrays));
    
    // Initialize X-ray suggestions
    updateQuickXraySuggestions('');
    
    // Validate that X-ray functions are available
    if (typeof updateXraySelection !== 'function') {
        console.error('updateXraySelection function not found');
    }
    if (typeof calculateXrayTotal !== 'function') {
        console.error('calculateXrayTotal function not found');
    }
}

// X-ray search functionality
function handleXraySearch() {
    const searchInput = document.getElementById('xraySearch');
    const dropdown = document.getElementById('xrayDropdown');
    
    if (!searchInput || !dropdown) {
        console.error('X-ray search elements not found');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Clear browse dropdown when typing in search
    const xrayBrowseSelect = document.getElementById('xrayBrowseSelect');
    if (xrayBrowseSelect && searchTerm.length > 0) {
        xrayBrowseSelect.value = '';
    }

    // Update quick suggestions based on search
    updateQuickXraySuggestions(searchTerm);

    if (searchTerm.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    if (!window.currentXrayItems) {
        console.error('window.currentXrayItems is not defined');
        dropdown.innerHTML = '<div class="dropdown-item-empty">X-ray data not loaded</div>';
        dropdown.style.display = 'block';
        return;
    }
    
    if (!Array.isArray(window.currentXrayItems)) {
        console.error('window.currentXrayItems is not an array:', typeof window.currentXrayItems);
        dropdown.innerHTML = '<div class="dropdown-item-empty">Invalid X-ray data format</div>';
        dropdown.style.display = 'block';
        return;
    }
    
    if (window.currentXrayItems.length === 0) {
        console.warn('window.currentXrayItems is empty');
        dropdown.innerHTML = '<div class="dropdown-item-empty">No X-ray items available</div>';
        dropdown.style.display = 'block';
        return;
    }

    // Create unique X-ray types for search
    const uniqueXrays = {};
    window.currentXrayItems.forEach(item => {
        let baseName = item.name.replace(/\s*\d+\s*$/g, '').trim();
        baseName = baseName.replace(/\s*৳.*$/g, '').trim();
        baseName = baseName.replace(/\s*-\s*AP|LAT|OBLIQUE|BOTH.*$/gi, '').trim();

        if (!uniqueXrays[baseName]) {
            const basePrice = Math.min(...window.currentXrayItems
                .filter(xray => {
                    let xrayBaseName = xray.name.replace(/\s*\d+\s*$/g, '').trim();
                    xrayBaseName = xrayBaseName.replace(/\s*৳.*$/g, '').trim();
                    xrayBaseName = xrayBaseName.replace(/\s*-\s*AP|LAT|OBLIQUE|BOTH.*$/gi, '').trim();
                    return xrayBaseName === baseName;
                })
                .map(xray => xray.price)
            );
            uniqueXrays[baseName] = {
                name: baseName,
                price: basePrice,
                originalItem: item
            };
        }
    });

    // Filter X-rays based on search term
    const filteredXrays = Object.values(uniqueXrays).filter(xray =>
        xray.name.toLowerCase().includes(searchTerm)
    );

    if (filteredXrays.length === 0) {
        if (dropdown) {
            dropdown.innerHTML = '<div class="dropdown-item-empty">No X-rays found</div>';
            dropdown.style.display = 'block';
        }
        return;
    }

    // Create dropdown items
    let dropdownHTML = '';
    filteredXrays.slice(0, 8).forEach((xray, index) => {
        dropdownHTML += `
            <div class="dropdown-item" 
                 onclick="selectXrayFromDropdown('${xray.name.replace(/'/g, '&#39;')}')" 
                 data-index="${index}">
                <div class="medicine-name">${xray.name}</div>
                <div class="medicine-details">
                    X-ray • Starting from ৳${xray.price}
                </div>
            </div>
        `;
    });

    if (dropdown) {
        dropdown.innerHTML = dropdownHTML;
        dropdown.style.display = 'block';
    }
}

function handleXraySearchKeydown(event) {
    const dropdown = document.getElementById('xrayDropdown');
    const items = dropdown.querySelectorAll('.dropdown-item:not(.dropdown-item-empty)');

    if (items.length === 0) return;

    let currentSelected = dropdown.querySelector('.dropdown-item.selected');
    let currentIndex = currentSelected ? Array.from(items).indexOf(currentSelected) : -1;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add('selected');
            break;

        case 'ArrowUp':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[currentIndex].classList.add('selected');
            break;

        case 'Enter':
            event.preventDefault();
            if (currentSelected) {
                currentSelected.click();
            } else if (items.length > 0) {
                items[0].click();
            }
            break;

        case 'Escape':
            if (dropdown) {
                dropdown.style.display = 'none';
            }
            const searchInput = document.getElementById('xraySearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            break;
    }
}

function selectXrayFromDropdown(xrayName) {
    if (!xrayName) return;

    // Update search input
    const searchInput = document.getElementById('xraySearch');
    if (searchInput) {
        searchInput.value = xrayName;
    }

    // Clear browse dropdown if it exists
    const xrayBrowseSelect = document.getElementById('xrayBrowseSelect');
    if (xrayBrowseSelect) {
        xrayBrowseSelect.value = '';
    }

    // Uncheck manual entry when selecting from dropdown
    const manualCheckbox = document.getElementById('manualEntryCheckbox');
    if (manualCheckbox) {
        manualCheckbox.checked = false;
    }

    // Hide search dropdown
    const dropdown = document.getElementById('xrayDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }

    // Show selected X-ray info
    const selectedInfo = document.getElementById('selectedXrayInfo');
    const selectedName = document.getElementById('selectedXrayName');
    const selectedDetails = document.getElementById('selectedXrayDetails');

    if (selectedInfo && selectedName && selectedDetails) {
        selectedName.textContent = xrayName;

        // Get price information
        const xrayItems = window.currentXrayItems.filter(item => {
            let baseName = item.name.replace(/\s*\d+\s*$/g, '').trim();
            baseName = baseName.replace(/\s*৳.*$/g, '').trim();
            baseName = baseName.replace(/\s*-\s*AP|LAT|OBLIQUE|BOTH.*$/gi, '').trim();
            return baseName === xrayName;
        });

        const basePrice = Math.min(...xrayItems.map(item => item.price));

        selectedDetails.innerHTML = `
            X-ray Service • Starting from ৳${basePrice}
        `;
        selectedInfo.style.display = 'block';
    }

    // Store the selected X-ray name for calculations
    window.selectedXrayName = xrayName;

    // Enable view type and portable options
    enableXrayOptions();

    showToast(`Selected: ${xrayName}`, 'success');
}

function selectXrayFromBrowse(xrayName) {
    if (!xrayName) {
        // Clear search when browse is cleared
        const searchInput = document.getElementById('xraySearch');
        if (searchInput) {
            searchInput.value = '';
        }
        const selectedInfo = document.getElementById('selectedXrayInfo');
        if (selectedInfo) {
            selectedInfo.style.display = 'none';
        }
        
        // Uncheck manual entry if it was selected
        const manualCheckbox = document.getElementById('manualEntryCheckbox');
        if (manualCheckbox) {
            manualCheckbox.checked = false;
        }
        
        // Disable view type and portable options
        disableXrayOptions();
        window.selectedXrayName = null;
        return;
    }

    // Uncheck manual entry when selecting from browse
    const manualCheckbox = document.getElementById('manualEntryCheckbox');
    if (manualCheckbox) {
        manualCheckbox.checked = false;
    }
    
    selectXrayFromDropdown(xrayName);
}

async function showLabInput(items) {
    const dynamicInputs = document.getElementById('dynamicInputs');

    try {
        dynamicInputs.innerHTML = `
            <div class="lab-search-container">
                <label class="form-label">Search & Select Lab Tests</label>
                <div class="autocomplete-container">
                    <input type="text" class="form-control search-box" id="labSearch" 
                           placeholder="Type test name..." 
                           oninput="handleLabSearch()" 
                           onkeydown="handleLabSearchKeydown(event)"
                           autocomplete="off" autofocus>
                    <div id="labDropdown" class="medicine-dropdown" style="display: none;"></div>
                </div>

                <div id="quickLabSuggestions" class="quick-lab-suggestions mt-3" style="display: none;">
                    <div class="quick-lab-container">
                        <div id="labSuggestion1" class="lab-quick-button" style="display: none;" onclick="selectLabFromQuickButton(this)">
                            <i class="fas fa-vial"></i>
                            <span></span>
                        </div>
                        <div id="labSuggestion2" class="lab-quick-button" style="display: none;" onclick="selectLabFromQuickButton(this)">
                            <i class="fas fa-microscope"></i>
                            <span></span>
                        </div>
                        <div id="labSuggestion3" class="lab-quick-button" style="display: none;" onclick="selectLabFromQuickButton(this)">
                            <i class="fas fa-heartbeat"></i>
                            <span></span>
                        </div>
                    </div>
                </div>

                <div class="mt-3">
                    <label class="form-label">Or Browse All Tests</label>
                    <select id="labSelect" class="form-select" onchange="selectLabFromDropdown(this.value)">
                        <option value="">-- Browse all lab tests --</option>
                        ${items.map(test => 
                            `<option value="${test.id}">${test.name} - ৳${test.price}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="mt-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="labManualEntryCheckbox" onchange="toggleLabManualEntry()">
                        <label class="form-check-label" for="labManualEntryCheckbox" style="color: #ffd43b; font-weight: 600;">
                            <i class="fas fa-edit me-1"></i>Manual Entry (Custom Lab Test)
                        </label>
                    </div>
                </div>

                <div id="selectedLabInfo" class="selected-medicine-info" style="display: none;">
                    <div class="alert alert-info">
                        <strong id="selectedLabName"></strong>
                        <div class="strength-display" id="selectedLabDetails"></div>
                    </div>
                </div>

                <div class="mt-3" id="selectedTestsContainer">
                    <div id="selectedTestsDisplay" class="selected-tests-display">No tests selected</div>
                </div>
            </div>

            <!-- Manual Entry Row -->
            <div class="row mb-2" id="labManualEntryRow" style="display: none;">
                <div class="col-md-6 mb-1">
                    <label class="form-label">Lab Test Name</label>
                    <input type="text" id="labManualName" class="form-control" placeholder="Enter test name">
                </div>
                <div class="col-md-6 mb-1">
                    <label class="form-label">Amount</label>
                    <input type="number" id="labManualAmount" class="form-control" min="0" step="0.01" placeholder="Enter amount">
                </div>
            </div>

            <div class="manual-entry-section">
                <div class="manual-entry-row">
                    <div class="manual-entry-field">
                        <label class="form-label">Test Name</label>
                        <input type="text" id="manualTestName" class="form-control" placeholder="Enter test name manually" oninput="toggleManualTestButton()">
                    </div>
                    <div class="manual-entry-field">
                        <label class="form-label">Price (৳)</label>
                        <input type="number" id="manualTestPrice" class="form-control" step="0.01" min="0" placeholder="0.00">
                    </div>
                    <div class="manual-entry-button">
                        <label class="form-label">&nbsp;</label>
                        <button class="btn btn-primary" onclick="addManualLabTest()" id="addManualTestBtn" style="display: none;">
                            <i class="fas fa-plus-circle me-1"></i> Add Test
                        </button>
                        <button class="btn btn-primary" onclick="addLabManualEntry()" id="addLabManualBtn" style="display: none;">
                            <i class="fas fa-plus-circle me-1"></i> Add Custom Test
                        </button>
                    </div>
                </div>
            </div>
        `;

        window.currentLabTests = items;

    } catch (error) {
        console.error('Error loading lab tests:', error);
        showToast('Error loading lab tests', 'danger');
        dynamicInputs.innerHTML = '<div class="alert alert-warning">Error loading lab tests. Please try again.</div>';
    }
}

function handleLabSearch() {
    const searchInput = document.getElementById('labSearch');
    const dropdown = document.getElementById('labDropdown');
    const searchTerm = searchInput.value.toLowerCase().trim();

    const labSelect = document.getElementById('labSelect');
    if (labSelect && searchTerm.length > 0) {
        labSelect.value = '';
    }

    // Update quick suggestions based on search
    updateQuickLabSuggestions(searchTerm);

    if (searchTerm.length < 2) {
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        return;
    }

    if (!window.currentLabTests || window.currentLabTests.length === 0) {
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        return;
    }

    const filteredTests = window.currentLabTests.filter(test =>
        test.name.toLowerCase().includes(searchTerm) ||
        (test.type && test.type.toLowerCase().includes(searchTerm))
    );

    if (filteredTests.length === 0) {
        if (dropdown) {
            dropdown.innerHTML = '<div class="dropdown-item-empty">No tests found</div>';
            dropdown.style.display = 'block';
        }
        return;
    }

    let dropdownHTML = '';
    filteredTests.slice(0, 8).forEach((test, index) => {
        dropdownHTML += `
            <div class="dropdown-item" 
                 onclick="selectLabFromDropdown(${test.id})" 
                 data-index="${index}">
                <div class="medicine-name">${test.name}</div>
                <div class="medicine-details">
                    ${test.type || 'Test'} • ৳${test.price}
                </div>
            </div>
        `;
    });

    if (dropdown) {
        dropdown.innerHTML = dropdownHTML;
        dropdown.style.display = 'block';
    }
}

function updateQuickLabSuggestions(searchTerm) {
    if (!window.currentLabTests || window.currentLabTests.length === 0) return;

    let suggestedTests = [];
    const quickSuggestionsContainer = document.getElementById('quickLabSuggestions');

    if (searchTerm && searchTerm.length > 0) {
        // Show search-related suggestions prioritized by usage
        const searchResults = window.currentLabTests.filter(test =>
            test.name.toLowerCase().includes(searchTerm) ||
            (test.type && test.type.toLowerCase().includes(searchTerm))
        );
        
        // Sort search results by usage frequency
        const categoryStats = itemUsageStats['Lab'] || {};
        suggestedTests = searchResults
            .map(test => ({
                ...test,
                usageCount: categoryStats[test.name] || 0
            }))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 3);
    } else {
        // Show most frequently used items based on usage stats
        const categoryStats = itemUsageStats['Lab'] || {};
        const sortedByUsage = window.currentLabTests
            .map(test => ({
                ...test,
                usageCount: categoryStats[test.name] || 0
            }))
            .sort((a, b) => {
                // Primary sort: usage count (descending)
                if (a.usageCount !== b.usageCount) {
                    return b.usageCount - a.usageCount;
                }
                // Secondary sort: alphabetical for tests with same usage
                return a.name.localeCompare(b.name);
            })
            .slice(0, 6); // Get top 6 to have more options

        // If we have usage data, show the most used tests
        if (sortedByUsage.some(item => item.usageCount > 0)) {
            suggestedTests = sortedByUsage.slice(0, 3);
        } else {
            // Fallback to common tests, but still prioritize by any existing usage
            const popularTestKeywords = ['CBC', 'Complete Blood Count', 'Blood Sugar', 'Glucose', 'Urine', 'Liver Function', 'Kidney Function', 'Cholesterol', 'Hemoglobin'];
            const foundTests = new Map();
            
            for (const keyword of popularTestKeywords) {
                const matches = window.currentLabTests.filter(test =>
                    test.name.toLowerCase().includes(keyword.toLowerCase()) &&
                    !foundTests.has(test.id)
                );
                
                matches.forEach(test => {
                    foundTests.set(test.id, {
                        ...test,
                        usageCount: categoryStats[test.name] || 0
                    });
                });
                
                if (foundTests.size >= 3) break;
            }
            
            // Convert map to array and sort by usage
            suggestedTests = Array.from(foundTests.values())
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 3);
                
            // If still no suggestions, just take first 3 tests
            if (suggestedTests.length === 0) {
                suggestedTests = window.currentLabTests.slice(0, 3).map(test => ({
                    ...test,
                    usageCount: 0
                }));
            }
        }
    }

    // Show/hide the container based on available suggestions
    if (suggestedTests.length > 0) {
        quickSuggestionsContainer.style.display = 'block';
        
        // Update the three quick suggestion buttons with usage indicators
        for (let i = 1; i <= 3; i++) {
            const button = document.getElementById(`labSuggestion${i}`);
            if (button) {
                if (suggestedTests[i-1]) {
                    const test = suggestedTests[i-1];
                    button.setAttribute('data-test-id', test.id);
                    
                    // Create display name with usage indicator
                    let displayName = test.name.length > 12 ? 
                        test.name.substring(0, 12) + '...' : test.name;
                    
                    // Add usage indicator for frequently used tests
                    const usageIndicator = test.usageCount > 0 ? ` (${test.usageCount})` : '';
                    
                    button.querySelector('span').textContent = displayName;
                    button.title = `${test.name}${test.usageCount > 0 ? ` - Used ${test.usageCount} times` : ' - New test'}`; // Enhanced hover info
                    
                    // Add visual indicator for frequently used tests
                    if (test.usageCount > 2) {
                        button.style.border = '1px solid rgba(40, 167, 69, 0.5)';
                        button.style.background = 'rgba(40, 167, 69, 0.1)';
                    } else if (test.usageCount > 0) {
                        button.style.border = '1px solid rgba(255, 193, 7, 0.5)';
                        button.style.background = 'rgba(255, 193, 7, 0.1)';
                    } else {
                        button.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                        button.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                    
                    button.style.display = 'flex';
                } else {
                    button.style.display = 'none';
                }
            }
        }
    } else {
        quickSuggestionsContainer.style.display = 'none';
    }
}

function handleLabSearchKeydown(event) {
    const dropdown = document.getElementById('labDropdown');
    const items = dropdown.querySelectorAll('.dropdown-item:not(.dropdown-item-empty)');

    if (items.length === 0) return;

    let currentSelected = dropdown.querySelector('.dropdown-item.selected');
    let currentIndex = currentSelected ? Array.from(items).indexOf(currentSelected) : -1;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add('selected');
            break;

        case 'ArrowUp':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[currentIndex].classList.add('selected');
            break;

        case 'Enter':
            event.preventDefault();
            if (currentSelected) {
                currentSelected.click();
            } else if (items.length > 0) {
                items[0].click();
            }
            break;

        case 'Escape':
            if (dropdown) {
                dropdown.style.display = 'none';
            }
            const searchInput = document.getElementById('labSearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            break;
    }
}

function selectLabFromQuickButton(buttonElement) {
    const testId = buttonElement.getAttribute('data-test-id');
    if (!testId) return;

    const test = window.currentLabTests.find(t => t.id == testId);
    if (!test) return;

    const billItem = {
        id: nextItemId++,
        category: 'Lab',
        name: test.name,
        type: test.type || '',
        strength: '',
        quantity: 1,
        unitPrice: test.price,
        totalPrice: test.price,
        description: ''
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage('Lab', test.name);
        
        showToast(`✓ ${test.name} added! Continue searching...`, 'success');
        updateSelectedTestsDisplay();
        
        // Immediately update quick suggestions to show the most current usage stats
        setTimeout(() => {
            updateQuickLabSuggestions('');
        }, 50);
    }

    const searchInput = document.getElementById('labSearch');
    if (searchInput) {
        searchInput.focus();
    }
}

function selectLabFromDropdown(testId) {
    if (!testId) return;

    const test = window.currentLabTests.find(t => t.id == testId);
    if (!test) return;

    const labSelect = document.getElementById('labSelect');
    if (labSelect) {
        labSelect.value = '';
    }

    const dropdown = document.getElementById('labDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }

    const billItem = {
        id: nextItemId++,
        category: 'Lab',
        name: test.name,
        type: test.type || '',
        strength: '',
        quantity: 1,
        unitPrice: test.price,
        totalPrice: test.price,
        description: ''
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage('Lab', test.name);
        
        showToast(`✓ ${test.name} added! Continue searching...`, 'success');
        updateSelectedTestsDisplay();
        
        // Immediately update quick suggestions to reflect new usage with slight delay for better UX
        setTimeout(() => {
            updateQuickLabSuggestions('');
        }, 100);
    }

    const searchInput = document.getElementById('labSearch');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        searchInput.placeholder = "Type test name...";
    }

    document.getElementById('selectedLabInfo').style.display = 'none';
    window.selectedLabTest = null;
}

function toggleManualTestButton() {
    const testNameInput = document.getElementById('manualTestName');
    const addTestBtn = document.getElementById('addManualTestBtn');

    if (testNameInput && addTestBtn) {
        const hasText = testNameInput.value.trim().length > 0;
        addTestBtn.style.display = hasText ? 'block' : 'none';
    }
}

function toggleLabManualEntry() {
    const checkbox = document.getElementById('labManualEntryCheckbox');
    const searchInput = document.getElementById('labSearch');
    const browseSelect = document.getElementById('labSelect');
    const selectedInfo = document.getElementById('selectedLabInfo');
    const selectedName = document.getElementById('selectedLabName');
    const selectedDetails = document.getElementById('selectedLabDetails');
    const manualEntryRow = document.getElementById('labManualEntryRow');
    const addLabManualBtn = document.getElementById('addLabManualBtn');
    const addManualTestBtn = document.getElementById('addManualTestBtn');

    if (checkbox.checked) {
        // Manual entry selected
        if (searchInput) searchInput.value = 'Manual Entry';
        if (browseSelect) browseSelect.value = '';

        if (selectedInfo && selectedName && selectedDetails) {
            selectedName.textContent = 'Manual Entry';
            selectedDetails.innerHTML = 'Custom lab test with manual pricing';
            selectedInfo.style.display = 'block';
        }

        if (manualEntryRow) manualEntryRow.style.display = 'flex';
        if (addLabManualBtn) addLabManualBtn.style.display = 'block';
        if (addManualTestBtn) addManualTestBtn.style.display = 'none';

        showToast('Manual entry enabled - enter custom lab test details', 'success');
    } else {
        // Manual entry unchecked
        if (searchInput) searchInput.value = '';
        if (selectedInfo) selectedInfo.style.display = 'none';
        if (manualEntryRow) manualEntryRow.style.display = 'none';
        if (addLabManualBtn) addLabManualBtn.style.display = 'none';
        if (addManualTestBtn) addManualTestBtn.style.display = 'none';

        showToast('Manual entry disabled', 'info');
    }
}

function addLabManualEntry() {
    const labManualName = document.getElementById('labManualName');
    const labManualAmount = document.getElementById('labManualAmount');

    if (!labManualName || !labManualAmount || !labManualName.value || !labManualAmount.value) {
        showToast('Please enter lab test name and amount for manual entry', 'warning');
        return;
    }

    const testName = labManualName.value.trim();
    const testAmount = parseFloat(labManualAmount.value) || 0;

    if (testAmount <= 0) {
        showToast('Invalid lab test amount', 'warning');
        return;
    }

    const billItem = {
        id: nextItemId++,
        category: 'Lab',
        name: testName,
        type: 'Manual Entry',
        strength: '',
        quantity: 1,
        unitPrice: testAmount,
        totalPrice: testAmount,
        description: 'Custom lab test (manually entered)'
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage('Lab', testName);
        
        showToast(`Lab test added: ${testName}`, 'success');
        updateSelectedTestsDisplay();
        
        // Clear manual entry fields
        labManualName.value = '';
        labManualAmount.value = '';
        
        // Reset checkbox and hide manual entry
        const manualCheckbox = document.getElementById('labManualEntryCheckbox');
        if (manualCheckbox) {
            manualCheckbox.checked = false;
            toggleLabManualEntry();
        }
        
        // Update quick suggestions
        setTimeout(() => {
            updateQuickLabSuggestions('');
        }, 100);
    }
}

function addManualLabTest() {
    const testName = document.getElementById('manualTestName').value.trim();
    const testPrice = parseFloat(document.getElementById('manualTestPrice').value) || 0;

    if (!testName) {
        showToast('Please enter a test name', 'warning');
        return;
    }

    if (testPrice <= 0) {
        showToast('Please enter a valid price', 'warning');
        return;
    }

    const billItem = {
        id: nextItemId++,
        category: 'Lab',
        name: testName,
        type: 'Manual Entry',
        strength: '',
        quantity: 1,
        unitPrice: testPrice,
        totalPrice: testPrice,
        description: 'Manually entered test'
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage('Lab', testName);
        
        showToast(`✓ ${testName} added successfully!`, 'success');
        updateSelectedTestsDisplay();
        
        // Update quick suggestions to reflect new usage with slight delay
        setTimeout(() => {
            updateQuickLabSuggestions('');
        }, 100);
    }

    document.getElementById('manualTestName').value = '';
    document.getElementById('manualTestPrice').value = '';
    toggleManualTestButton();
    document.getElementById('manualTestName').focus();
}

// Special function for Limb and Brace - manual entry only with memory
async function showLimbAndBraceInput() {
    const dynamicInputs = document.getElementById('dynamicInputs');

    try {
        // Load previous entries from safe storage
        let previousEntries = [];
        try {
            const stored = storage.getItem('limbBrace_previousEntries');
            previousEntries = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('Failed to load previous entries:', e.message);
            previousEntries = [];
        }
        
        let previousEntriesHTML = '';
        if (previousEntries.length > 0) {
            previousEntriesHTML = `
                <div class="mb-4 p-3" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px;">
                    <h6 style="color: #ffc107; margin-bottom: 15px;">
                        <i class="fas fa-history me-2"></i>Previous Entries (Quick Select)
                    </h6>
                    <div class="row g-2">
                        ${previousEntries.map((entry, index) => `
                            <div class="col-md-6">
                                <button class="btn btn-outline-warning btn-sm w-100 text-start" 
                                        onclick="selectPreviousEntry('${entry.name.replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', ${entry.price})"
                                        style="font-size: 11px; padding: 8px 12px;">
                                    <div><strong>${entry.name}</strong></div>
                                    <div style="color: #ffc107;">৳${entry.price.toFixed(2)}</div>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="mt-2 text-center">
                        <button class="btn btn-outline-secondary btn-sm" onclick="clearPreviousEntries()">
                            <i class="fas fa-trash me-1"></i>Clear History
                        </button>
                    </div>
                </div>
            `;
        }

        dynamicInputs.innerHTML = `
            <div class="limb-brace-container">
                ${previousEntriesHTML}

                <div class="limb-brace-form">
                    <div class="row g-3 mb-3">
                        <div class="col-md-8">
                            <label class="form-label">
                                <i class="fas fa-hand-paper me-2" style="color: #ff9776;"></i>
                                Item Name <span style="color: var(--accent);">*</span>
                            </label>
                            <input type="text" class="form-control" id="limbBraceName" 
                                   placeholder="e.g., Arm Cast, Leg Brace, Walker, Crutches..." 
                                   oninput="validateLimbBraceInput()" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Price (৳) <span style="color: var(--accent);">*</span></label>
                            <input type="number" class="form-control" id="limbBracePrice" 
                                   placeholder="0.00" min="0" step="0.01" 
                                   oninput="validateLimbBraceInput()" required>
                        </div>
                    </div>

                    <div class="limb-brace-actions">
                        <button class="btn btn-primary" onclick="addLimbBraceItem()" id="addLimbBraceBtn" disabled>
                            <i class="fas fa-plus-circle me-1"></i> Add Item
                        </button>
                        <button class="btn btn-outline-secondary ms-2" onclick="clearLimbBraceForm()">
                            <i class="fas fa-eraser me-1"></i> Clear
                        </button>
                    </div>
                </div>

                
            </div>
        `;

        window.currentCategory = 'Limb and Brace';
        console.log('Limb and Brace manual entry interface loaded');

    } catch (error) {
        console.error('Error loading Limb and Brace input:', error);
        showToast('Error loading Limb and Brace interface', 'danger');
        dynamicInputs.innerHTML = `<div class="alert alert-warning">Error loading Limb and Brace interface. Please try again.</div>`;
    }
}

// Validation function for Limb and Brace input
function validateLimbBraceInput() {
    const nameInput = document.getElementById('limbBraceName');
    const priceInput = document.getElementById('limbBracePrice');
    const addBtn = document.getElementById('addLimbBraceBtn');

    if (!nameInput || !priceInput || !addBtn) return;

    const hasName = nameInput.value.trim().length > 0;
    const hasValidPrice = parseFloat(priceInput.value) > 0;

    addBtn.disabled = !(hasName && hasValidPrice);
}

// Add Limb and Brace item to bill
function addLimbBraceItem() {
    const nameInput = document.getElementById('limbBraceName');
    const priceInput = document.getElementById('limbBracePrice');

    if (!nameInput || !priceInput) return;

    const itemName = nameInput.value.trim();
    const unitPrice = parseFloat(priceInput.value) || 0;

    if (!itemName) {
        showToast('Please enter the item name', 'warning');
        nameInput.focus();
        return;
    }

    if (unitPrice <= 0) {
        showToast('Please enter a valid price', 'warning');
        priceInput.focus();
        return;
    }

    const billItem = {
        id: nextItemId++,
        category: 'Limb and Brace',
        name: itemName,
        type: 'Manual Entry',
        strength: '',
        quantity: 1,
        unitPrice: unitPrice,
        totalPrice: unitPrice,
        description: 'Orthopedic item/service'
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage('Limb and Brace', itemName);
        
        // Save to previous entries
        saveToPreviousEntries(itemName, unitPrice);
        
        showToast(`✓ ${itemName} added to bill!`, 'success');
        
        // Clear form and focus on name input for next entry
        clearLimbBraceForm();
        nameInput.focus();
    }
}

// Clear Limb and Brace form
function clearLimbBraceForm() {
    const nameInput = document.getElementById('limbBraceName');
    const priceInput = document.getElementById('limbBracePrice');
    
    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '';

    // Re-validate to disable the add button
    validateLimbBraceInput();
}

// Save entry to memory
function saveToPreviousEntries(name, price) {
    try {
        const storageKey = 'limbBrace_previousEntries';
        let previousEntries = [];
        
        const stored = storage.getItem(storageKey);
        if (stored) {
            previousEntries = JSON.parse(stored);
        }
        
        // Check if entry already exists
        const existingIndex = previousEntries.findIndex(entry => 
            entry.name.toLowerCase() === name.toLowerCase()
        );
        
        const newEntry = { name, price, timestamp: Date.now() };
        
        if (existingIndex >= 0) {
            // Update existing entry
            previousEntries[existingIndex] = newEntry;
        } else {
            // Add new entry
            previousEntries.unshift(newEntry);
            
            // Keep only last 8 entries
            if (previousEntries.length > 8) {
                previousEntries = previousEntries.slice(0, 8);
            }
        }
        
        storage.setItem(storageKey, JSON.stringify(previousEntries));
    } catch (e) {
        console.warn('Failed to save previous entries:', e.message);
    }
}

// Select from previous entries
function selectPreviousEntry(name, price) {
    const nameInput = document.getElementById('limbBraceName');
    const priceInput = document.getElementById('limbBracePrice');
    
    if (nameInput) nameInput.value = name;
    if (priceInput) priceInput.value = price;
    
    validateLimbBraceInput();
    showToast(`Selected: ${name}`, 'success');
}

// Track item usage for smart suggestions
function trackItemUsage(category, itemName) {
    try {
        if (!itemUsageStats[category]) {
            itemUsageStats[category] = {};
        }
        
        if (!itemUsageStats[category][itemName]) {
            itemUsageStats[category][itemName] = 0;
        }
        
        itemUsageStats[category][itemName]++;
        
        // Save to safe storage
        storage.setItem('hospitalBilling_itemUsage', JSON.stringify(itemUsageStats));
    } catch (e) {
        console.warn('Failed to track item usage:', e.message);
    }
}

// Clear previous entries memory
function clearPreviousEntries() {
    if (confirm('Clear all previous entries from memory?')) {
        try {
            storage.removeItem('limbBrace_previousEntries');
            showLimbAndBraceInput(); // Refresh the interface
            showToast('Previous entries cleared', 'info');
        } catch (e) {
            console.warn('Failed to clear previous entries:', e.message);
            showToast('Failed to clear previous entries', 'warning');
        }
    }
}

function selectGenericItem(item) {
    // Auto-fill form fields when an item is selected
    const itemSelect = document.getElementById('itemSelect');
    const priceInput = document.getElementById('priceInput');
    const quantityInput = document.getElementById('quantityInput');
    
    if (itemSelect) {
        // Create and select the option if it doesn't exist
        let option = Array.from(itemSelect.options).find(opt => opt.value === item.name);
        if (!option) {
            option = new Option(item.name, item.name);
            itemSelect.appendChild(option);
        }
        itemSelect.value = item.name;
    }
    
    if (priceInput) {
        priceInput.value = item.price || 0;
    }
    
    if (quantityInput && !quantityInput.value) {
        quantityInput.value = 1;
    }
    
    // Store selected item data
    window.selectedGenericItem = item;
    
    // Auto-calculate if quantity is present
    if (quantityInput && quantityInput.value && priceInput) {
        calculateGenericTotal();
    }
}

function calculateGenericTotal() {
    const priceInput = document.getElementById('priceInput');
    const quantityInput = document.getElementById('quantityInput');
    const totalDisplay = document.querySelector('.calculation-display');
    
    if (priceInput && quantityInput && totalDisplay) {
        const price = parseFloat(priceInput.value) || 0;
        const quantity = parseFloat(quantityInput.value) || 0;
        const total = price * quantity;
        
        totalDisplay.innerHTML = `
            <div class="calculation-row">
                <span>Unit Price:</span>
                <span>৳${price.toFixed(2)}</span>
            </div>
            <div class="calculation-row">
                <span>Quantity:</span>
                <span>${quantity}</span>
            </div>
            <div class="calculation-row total-row">
                <span>Total:</span>
                <span>৳${total.toFixed(2)}</span>
            </div>
        `;
    }
}

function handleGenericItemSearch() {
    const searchInput = document.getElementById('genericItemSearch');
    const dropdown = document.getElementById('genericItemDropdown');
    const searchTerm = searchInput.value.toLowerCase().trim();

    const itemSelect = document.getElementById('itemSelect');
    if (itemSelect && searchTerm.length > 0) {
        itemSelect.value = '';
    }

    if (searchTerm.length < 2) {
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        return;
    }

    if (!window.currentCategoryItems || window.currentCategoryItems.length === 0) {
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        return;
    }

    const filteredItems = window.currentCategoryItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        (item.type && item.type.toLowerCase().includes(searchTerm)) ||
        (item.strength && item.strength.toLowerCase().includes(searchTerm))
    );

    if (dropdown) {
        dropdown.innerHTML = '';
        
        if (filteredItems.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item-empty">No items found matching your search</div>';
            dropdown.style.display = 'block';
            return;
        }

        filteredItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dropdown-item';
            itemDiv.innerHTML = `
                <div class="medicine-name">${item.name}</div>
                <div class="medicine-details">${item.type || 'Generic'} - ৳${item.price}</div>
            `;
            
            itemDiv.addEventListener('click', () => {
                selectGenericItem(item);
                dropdown.style.display = 'none';
                searchInput.value = item.name;
            });
            
            dropdown.appendChild(itemDiv);
        });
        
        dropdown.style.display = 'block';
    }

    if (filteredItems.length === 0) {
        if (dropdown) {
            dropdown.innerHTML = '<div class="dropdown-item-empty">No items found</div>';
            dropdown.style.display = 'block';
        }
        return;
    }

    let dropdownHTML = '';
    filteredItems.slice(0, 8).forEach((item, index) => {
        dropdownHTML += `
            <div class="dropdown-item" 
                 onclick="selectGenericItemFromDropdown(${item.id})" 
                 data-index="${index}">
                <div class="medicine-name">${item.name}</div>
                <div class="medicine-details">
                    ${item.type || window.currentCategory || 'Item'} • ৳${item.price}
                </div>
            </div>
        `;
    });

    if (dropdown) {
        dropdown.innerHTML = dropdownHTML;
        dropdown.style.display = 'block';
    }
}

function handleGenericSearchKeydown(event) {
    const dropdown = document.getElementById('genericItemDropdown');
    const items = dropdown.querySelectorAll('.dropdown-item:not(.dropdown-item-empty)');

    if (items.length === 0) return;

    let currentSelected = dropdown.querySelector('.dropdown-item.selected');
    let currentIndex = currentSelected ? Array.from(items).indexOf(currentSelected) : -1;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add('selected');
            break;

        case 'ArrowUp':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[currentIndex].classList.add('selected');
            break;

        case 'Enter':
            event.preventDefault();
            if (currentSelected) {
                currentSelected.click();
            } else if (items.length > 0) {
                items[0].click();
            }
            break;

        case 'Escape':
            if (dropdown) {
                dropdown.style.display = 'none';
            }
            const searchInput = document.getElementById('genericItemSearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            break;
    }
}

function selectGenericItemFromDropdown(itemId) {
    if (!itemId) return;

    const item = window.currentCategoryItems.find(item => item.id == itemId);
    if (!item) return;

    const searchInput = document.getElementById('genericItemSearch');
    if (searchInput) {
        searchInput.value = item.name;
    }

    const itemSelect = document.getElementById('itemSelect');
    if (itemSelect) {
        itemSelect.value = itemId;
    }

    const dropdown = document.getElementById('genericItemDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }

    const selectedInfo = document.getElementById('selectedGenericInfo');
    const selectedName = document.getElementById('selectedGenericName');
    const selectedDetails = document.getElementById('selectedGenericDetails');

    if (selectedInfo && selectedName && selectedDetails) {
        selectedName.textContent = item.name;
        selectedDetails.innerHTML = `
            Type: ${item.type || window.currentCategory || 'Item'} • Price: ৳${item.price}
        `;
        selectedInfo.style.display = 'block';
    }

    updateItemPrice();
    showToast(`Selected: ${item.name}`, 'success');
}

function updateItemPrice() {
    const select = document.getElementById('itemSelect');
    const priceInput = document.getElementById('itemPrice');
    const totalInput = document.getElementById('itemTotal');
    const addBtn = document.getElementById('addGenericItemBtn');

    if (!select.value) {
        priceInput.value = '';
        totalInput.value = '';
        if (addBtn) addBtn.style.display = 'none';
        return;
    }

    const selectedItem = window.currentCategoryItems.find(item => item.id == select.value);
    if (selectedItem) {
        priceInput.value = selectedItem.price;
        updateItemTotal();
        if (addBtn) addBtn.style.display = 'block';
    }
}

function updateItemTotal() {
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
    const price = parseFloat(document.getElementById('itemPrice').value) || 0;
    const total = quantity * price;

    document.getElementById('itemTotal').value = total.toFixed(2);
}

function addMedicineToCart() {
    if (!window.currentCalculation) {
        showToast('Please calculate medicine dosage first', 'warning');
        return;
    }

    const calc = window.currentCalculation;
    const billItem = {
        id: nextItemId++,
        category: 'Medicine',
        name: calc.medicine.name,
        type: calc.medicine.type || '',
        strength: calc.medicine.strength || '',
        quantity: calc.totalQuantity,
        unitPrice: calc.medicine.price,
        totalPrice: calc.totalCost,
        description: `${calc.doseAmount} ${calc.doseUnit}, ${calc.frequency}x daily for ${calc.days} days`
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        showToast('Medicine added to bill', 'success');
    }

    const medicineSearch = document.getElementById('medicineSearch');
    const medicineSelect = document.getElementById('medicineSelect');
    const selectedMedicineInfo = document.getElementById('selectedMedicineInfo');
    const calculationDetails = document.getElementById('calculationDetails');
    const medDoseAmount = document.getElementById('medDoseAmount');
    const medDays = document.getElementById('medDays');
    const daysUnitSelect = document.getElementById('daysUnitSelect');
    const medDoseUnit = document.getElementById('medDoseUnit');
    const medFreq = document.getElementById('medFreq');

    if (medicineSearch) {
        medicineSearch.value = '';
        medicineSearch.placeholder = 'Type medicine name...';
    }
    if (medicineSelect) medicineSelect.value = '';
    if (selectedMedicineInfo) selectedMedicineInfo.style.display = 'none';
    if (calculationDetails) calculationDetails.style.display = 'none';
    if (medDoseAmount) medDoseAmount.value = '';
    if (medDays) medDays.value = '1';
    if (daysUnitSelect) {
        daysUnitSelect.value = 'days';
        currentDaysUnit = 'days';
    }
    if (medDoseUnit) medDoseUnit.value = 'qty';
    if (medFreq) medFreq.value = '1';

    const dropdown = document.getElementById('medicineDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }

    const addMedicineBtn = document.getElementById('addMedicineBtn');
    if (addMedicineBtn) {
        addMedicineBtn.disabled = true;
    }

    window.selectedMedicine = null;
    window.currentCalculation = null;

    if (medicineSearch) {
        setTimeout(() => {
            medicineSearch.focus();
        }, 100);
    }
}

function toggleGenericManualEntry(category) {
    const checkbox = document.getElementById('genericManualEntryCheckbox');
    const searchInput = document.getElementById('genericItemSearch');
    const browseSelect = document.getElementById('itemSelect');
    const selectedInfo = document.getElementById('selectedGenericInfo');
    const selectedName = document.getElementById('selectedGenericName');
    const selectedDetails = document.getElementById('selectedGenericDetails');
    const manualEntryRow = document.getElementById('genericManualEntryRow');
    const addGenericManualBtn = document.getElementById('addGenericManualBtn');
    const addGenericItemBtn = document.getElementById('addGenericItemBtn');

    if (checkbox.checked) {
        // Manual entry selected
        if (searchInput) searchInput.value = 'Manual Entry';
        if (browseSelect) browseSelect.value = '';

        if (selectedInfo && selectedName && selectedDetails) {
            selectedName.textContent = 'Manual Entry';
            selectedDetails.innerHTML = `Custom ${category} with manual pricing`;
            selectedInfo.style.display = 'block';
        }

        if (manualEntryRow) manualEntryRow.style.display = 'flex';
        if (addGenericManualBtn) addGenericManualBtn.style.display = 'block';
        if (addGenericItemBtn) addGenericItemBtn.style.display = 'none';

        showToast(`Manual entry enabled - enter custom ${category} details`, 'success');
    } else {
        // Manual entry unchecked
        if (searchInput) searchInput.value = '';
        if (selectedInfo) selectedInfo.style.display = 'none';
        if (manualEntryRow) manualEntryRow.style.display = 'none';
        if (addGenericManualBtn) addGenericManualBtn.style.display = 'none';
        if (addGenericItemBtn) addGenericItemBtn.style.display = 'none';

        showToast('Manual entry disabled', 'info');
    }
}

function addGenericManualEntry(category) {
    const genericManualName = document.getElementById('genericManualName');
    const genericManualAmount = document.getElementById('genericManualAmount');

    if (!genericManualName || !genericManualAmount || !genericManualName.value || !genericManualAmount.value) {
        showToast(`Please enter ${category} name and amount for manual entry`, 'warning');
        return;
    }

    const itemName = genericManualName.value.trim();
    const itemAmount = parseFloat(genericManualAmount.value) || 0;

    if (itemAmount <= 0) {
        showToast(`Invalid ${category} amount`, 'warning');
        return;
    }

    const billItem = {
        id: nextItemId++,
        category: category,
        name: itemName,
        type: 'Manual Entry',
        strength: '',
        quantity: 1,
        unitPrice: itemAmount,
        totalPrice: itemAmount,
        description: `Custom ${category} (manually entered)`
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage(category, itemName);
        
        showToast(`${category} added: ${itemName}`, 'success');
        
        // Clear manual entry fields
        genericManualName.value = '';
        genericManualAmount.value = '';
        
        // Reset checkbox and hide manual entry
        const manualCheckbox = document.getElementById('genericManualEntryCheckbox');
        if (manualCheckbox) {
            manualCheckbox.checked = false;
            toggleGenericManualEntry(category);
        }
    }
}

function addGenericItem() {
    const select = document.getElementById('itemSelect');
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
    const price = parseFloat(document.getElementById('itemPrice').value) || 0;
    const total = parseFloat(document.getElementById('itemTotal').value) || 0;

    if (!select.value) {
        showToast('Please select an item', 'warning');
        return;
    }

    const selectedItem = window.currentCategoryItems.find(item => item.id == select.value);
    if (!selectedItem) {
        showToast('Selected item not found', 'danger');
        return;
    }

    const billItem = {
        id: nextItemId++,
        category: selectedItem.category,
        name: selectedItem.name,
        type: selectedItem.type || '',
        strength: selectedItem.strength || '',
        quantity: quantity,
        unitPrice: price,
        totalPrice: total,
        description: ''
    };

     if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        showToast('Item added to bill', 'success');
    }

    select.value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemTotal').value = '';

    const addBtn = document.getElementById('addGenericItemBtn');
    if (addBtn) addBtn.style.display = 'none';

    const searchInput = document.getElementById('genericItemSearch');
    if (searchInput) searchInput.value = '';

    const selectedInfo = document.getElementById('selectedGenericInfo');
    if (selectedInfo) selectedInfo.style.display = 'none';
}

function updateBillPreview() {
    const container = document.getElementById('categorizedBillItems');
    const patientInfoCard = document.getElementById('patientInfoCard');
    const emptyBillState = document.getElementById('emptyBillState');
    
    // Trigger smart navigation update if available
    if (typeof smartMenuBehavior === 'function') {
        smartMenuBehavior();
    }

    const groupedItems = {};
    billItems.forEach(item => {
        if (!groupedItems[item.category]) {
            groupedItems[item.category] = [];
        }
        groupedItems[item.category].push(item);
    });

    if (billItems.length > 0) {
        patientInfoCard.style.display = 'block';
        if (emptyBillState) emptyBillState.style.display = 'none';
        updatePatientInfo();
    } else {
        patientInfoCard.style.display = 'none';
        if (emptyBillState) emptyBillState.style.display = 'block';
    }

    if (billItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state" id="emptyBillState">
                <i class="fas fa-clipboard-list fa-2x mb-2"></i>
                <h6>No items added yet</h6>
                <p class="mb-0 small">Start adding services and medicines to generate the bill</p>
            </div>
        `;
        updateStats();
        return;
    }

    let html = '';
    Object.keys(groupedItems).forEach(category => {
        const categoryItems = groupedItems[category];
        const categoryTotal = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);

        html += `
            <div class="category-section">
                <div class="category-header">
                    <h6 class="category-title">
                        <i class="fas fa-${getCategoryIcon(category)}"></i>
                        ${category}
                    </h6>
                    <div class="category-total">৳${categoryTotal.toFixed(2)}</div>
                </div>
                <div class="category-items">
        `;

        categoryItems.forEach(item => {
            let itemDetailsText = '';
            if (item.category === 'Medicine') {
                itemDetailsText = `${item.strength || 'N/A'} • ${item.quantity} ${item.type || 'units'}`;
            } else {
                itemDetailsText = `Qty: ${item.quantity}`;
            }

            html += `
                <div class="bill-item-card">
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-details-inline">
                            <span class="item-strength">${itemDetailsText}</span>
                        </div>
                    </div>
                    <div class="item-details">
                        <div class="price">৳${item.totalPrice.toFixed(2)}</div>
                        <button class="btn btn-sm btn-outline-danger remove-btn" onclick="removeBillItem(${item.id})" title="Remove item">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updatePatientInfo();
    updateStats();
}

function updateStats() {
    const topGrandTotal = document.getElementById('topGrandTotal');

    let total = 0;
    billItems.forEach(item => {
        total += item.totalPrice;
    });

    if (topGrandTotal) {
        topGrandTotal.textContent = `৳${total.toFixed(2)}`;
    }
}


// X-ray utility functions
function updateXraySelection() {
    // This function is no longer needed since we removed the dropdown
    // The view type options are now always enabled
    calculateXrayTotal();
}

function enableXrayOptionsForManual() {
    console.log('Enabling X-ray options for manual entry...');
    
    // Hide view type checkboxes for manual entry
    const viewTypesSection = document.querySelector('.xray-views-section');
    if (viewTypesSection) {
        viewTypesSection.style.display = 'none';
    }
    
    // Enable portable option
    const portableOption = document.getElementById('portableOption');
    const portableLabel = document.querySelector('label[for="portableOption"]');
    if (portableOption) {
        portableOption.disabled = false;
        console.log('Portable option enabled');
    }
    if (portableLabel) {
        portableLabel.style.color = 'white';
    }
    
    // Hide helper text
    const helpText = document.getElementById('xrayHelpText');
    if (helpText) {
        helpText.style.display = 'none';
        console.log('X-ray helper text hidden');
    }

    // Hide overlay by adding xray-selected class
    const xrayConfigSection = document.getElementById('xrayConfigurationSection');
    if (xrayConfigSection) {
        const configDiv = xrayConfigSection.querySelector('.xray-config-section') || 
                         xrayConfigSection.querySelector('.col-md-12');
        if (configDiv) {
            configDiv.classList.add('xray-selected');
            console.log('X-ray selection overlay hidden for manual entry');
        }
    }

    // Show manual entry row immediately
    const manualEntryRow = document.getElementById('manualEntryRow');
    if (manualEntryRow) {
        manualEntryRow.style.display = 'flex';
        console.log('Manual entry row shown');
    }
}

function handleViewTypeChange(viewType) {
    const checkbox = document.getElementById(`view${viewType}`);
    
    if (viewType === 'BOTH') {
        if (checkbox.checked) {
            // If BOTH is selected, uncheck all others
            ['AP', 'LAT', 'OBLIQUE'].forEach(type => {
                const otherCheckbox = document.getElementById(`view${type}`);
                if (otherCheckbox) {
                    otherCheckbox.checked = false;
                }
            });
        }
    } else {
        // If AP, LAT, or OBLIQUE is selected, uncheck BOTH
        if (checkbox.checked) {
            const bothCheckbox = document.getElementById('viewBOTH');
            if (bothCheckbox) {
                bothCheckbox.checked = false;
            }
        }
    }
    
    calculateXrayTotal();
}

function calculateXrayTotal() {
    const xrayUnitPrice = document.getElementById('xrayUnitPrice');
    const xrayTotal = document.getElementById('xrayTotal');
    const xrayCalculation = document.getElementById('xrayCalculation');
    const xrayCalculationDetails = document.getElementById('xrayCalculationDetails');
    const addXrayBtn = document.getElementById('addXrayBtn');
    const manualEntryRow = document.getElementById('manualEntryRow');
    const xrayManualName = document.getElementById('xrayManualName');
    const xrayManualAmount = document.getElementById('xrayManualAmount');
    
    // Get selected view types from checkboxes
    const selectedViews = [];
    ['AP', 'LAT', 'OBLIQUE', 'BOTH', 'MANUAL'].forEach(type => {
        const checkbox = document.getElementById(`view${type}`);
        if (checkbox && checkbox.checked) {
            selectedViews.push(type);
        }
    });
    
    // Handle manual entry (when selectedXrayName is 'Manual Entry')
    if (window.selectedXrayName === 'Manual Entry') {
        if (manualEntryRow) {
            manualEntryRow.style.display = 'flex';
        }
        
        if (xrayManualName && xrayManualAmount && xrayManualName.value && xrayManualAmount.value) {
            const manualAmount = parseFloat(xrayManualAmount.value) || 0;
            
            // Check for portable charge for manual entry
            const portableOption = document.getElementById('portableOption');
            const isPortable = portableOption && portableOption.checked;
            const portableCharge = isPortable ? 70 : 0; // Fixed 70 Taka for portable
            
            const totalAmount = manualAmount + portableCharge;
            
            if (xrayTotal) xrayTotal.value = totalAmount;
            
            if (xrayCalculation && xrayCalculationDetails) {
                let calculationHTML = `
                    <div class="calculation-row">
                        <span>X-ray:</span>
                        <span>${xrayManualName.value}</span>
                    </div>
                    <div class="calculation-row">
                        <span>Base Amount:</span>
                        <span>৳${manualAmount.toFixed(2)}</span>
                    </div>
                `;
                
                if (isPortable && portableCharge > 0) {
                    calculationHTML += `
                        <div class="calculation-row">
                            <span>Portable Service:</span>
                            <span>৳${portableCharge.toFixed(2)}</span>
                        </div>
                    `;
                }
                
                calculationHTML += `
                    <div class="calculation-row total-row">
                        <span><strong>Total:</strong></span>
                        <span><strong>৳${totalAmount.toFixed(2)}</strong></span>
                    </div>
                `;
                
                xrayCalculationDetails.innerHTML = calculationHTML;
                xrayCalculation.style.display = 'block';
            }
            
            if (addXrayBtn) addXrayBtn.style.display = 'block';
        } else {
            if (addXrayBtn) addXrayBtn.style.display = 'none';
            if (xrayCalculation) xrayCalculation.style.display = 'none';
        }
        return;
    }
    
    if (selectedViews.length === 0) {
        if (addXrayBtn) addXrayBtn.style.display = 'none';
        if (xrayCalculation) xrayCalculation.style.display = 'none';
        return;
    }
    
    if (!window.selectedXrayName || !window.currentXrayItems) {
        if (addXrayBtn) addXrayBtn.style.display = 'none';
        if (xrayCalculation) xrayCalculation.style.display = 'none';
        return;
    }
    
    // Find the selected X-ray item in the database
    const selectedXrayItem = window.currentXrayItems.find(item => 
        item.name === window.selectedXrayName || item.xrayBaseName === window.selectedXrayName
    );
    
    if (!selectedXrayItem) {
        if (addXrayBtn) addXrayBtn.style.display = 'none';
        if (xrayCalculation) xrayCalculation.style.display = 'none';
        return;
    }
    
    // Calculate total based on database pricing
    let total = 0;
    let calculationBreakdown = [];
    const baseName = window.selectedXrayName;
    
    // Check for portable charge
    const portableOption = document.getElementById('portableOption');
    const isPortable = portableOption && portableOption.checked;
    const portableCharge = isPortable ? 70 : 0;
    
    if (selectedViews.includes('BOTH')) {
        // Use the BOTH pricing from database xrayPricing object
        if (selectedXrayItem.xrayPricing && selectedXrayItem.xrayPricing.both) {
            // Check if BOTH price is less than ৳700
            if (selectedXrayItem.xrayPricing.both < 700) {
                // Use flexible pricing: treat as individual views
                total = selectedXrayItem.price; // Base price for BOTH when less than ৳700
                calculationBreakdown.push(`${baseName} - BOTH (flexible): ৳${total.toFixed(2)}`);
            } else {
                // Use fixed BOTH pricing
                total = selectedXrayItem.xrayPricing.both;
                calculationBreakdown.push(`${baseName} - BOTH: ৳${total.toFixed(2)}`);
            }
        } else {
            // Fallback: use AP + LAT prices if available
            if (selectedXrayItem.xrayPricing && selectedXrayItem.xrayPricing.ap && selectedXrayItem.xrayPricing.lat) {
                total = selectedXrayItem.xrayPricing.ap + selectedXrayItem.xrayPricing.lat;
                calculationBreakdown.push(`${baseName} - AP: ৳${selectedXrayItem.xrayPricing.ap.toFixed(2)}`);
                calculationBreakdown.push(`${baseName} - LAT: ৳${selectedXrayItem.xrayPricing.lat.toFixed(2)}`);
            } else {
                // Final fallback: use base price * 2
                total = selectedXrayItem.price * 2;
                calculationBreakdown.push(`${baseName} - BOTH (2x base): ৳${total.toFixed(2)}`);
            }
        }
    } else {
        // Calculate individual view types using new flexible pricing logic
        const selectedViewTypes = selectedViews.filter(view => ['AP', 'LAT', 'OBLIQUE'].includes(view));
        const viewCount = selectedViewTypes.length;
        
        // Check if we have flexible pricing (BOTH < ৳700)
        const bothPrice = selectedXrayItem.xrayPricing?.both || 700;
        const useFlexiblePricing = bothPrice < 700;
        
        if (useFlexiblePricing && viewCount >= 2) {
            if (viewCount === 2) {
                // Any 2 views selected = base price
                total = selectedXrayItem.price;
                calculationBreakdown.push(`${baseName} - ${selectedViewTypes.join('+')} (2 views): ৳${total.toFixed(2)}`);
            } else if (viewCount === 3) {
                // All 3 views selected = base price × 2
                total = selectedXrayItem.price * 2;
                calculationBreakdown.push(`${baseName} - ${selectedViewTypes.join('+')} (3 views): ৳${total.toFixed(2)}`);
            } else {
                // Single view - use individual pricing
                selectedViewTypes.forEach(viewType => {
                    let viewPrice = 0;
                    
                    if (selectedXrayItem.xrayPricing) {
                        switch(viewType) {
                            case 'AP':
                                viewPrice = selectedXrayItem.xrayPricing.ap || selectedXrayItem.price;
                                break;
                            case 'LAT':
                                viewPrice = selectedXrayItem.xrayPricing.lat || selectedXrayItem.price;
                                break;
                            case 'OBLIQUE':
                                viewPrice = selectedXrayItem.xrayPricing.oblique || selectedXrayItem.price;
                                break;
                            default:
                                viewPrice = selectedXrayItem.price;
                        }
                    } else {
                        viewPrice = selectedXrayItem.price;
                    }
                    
                    total += viewPrice;
                    calculationBreakdown.push(`${baseName} - ${viewType}: ৳${viewPrice.toFixed(2)}`);
                });
            }
        } else {
            // Use standard individual pricing
            selectedViewTypes.forEach(viewType => {
                let viewPrice = 0;
                
                if (selectedXrayItem.xrayPricing) {
                    switch(viewType) {
                        case 'AP':
                            viewPrice = selectedXrayItem.xrayPricing.ap || selectedXrayItem.price;
                            break;
                        case 'LAT':
                            viewPrice = selectedXrayItem.xrayPricing.lat || selectedXrayItem.price;
                            break;
                        case 'OBLIQUE':
                            viewPrice = selectedXrayItem.xrayPricing.oblique || selectedXrayItem.price;
                            break;
                        default:
                            viewPrice = selectedXrayItem.price;
                    }
                } else {
                    viewPrice = selectedXrayItem.price;
                }
                
                total += viewPrice;
                calculationBreakdown.push(`${baseName} - ${viewType}: ৳${viewPrice.toFixed(2)}`);
            });
        }
    }
    
    const finalTotal = total + portableCharge;
    
    // Update fields
    if (xrayUnitPrice) xrayUnitPrice.value = total;
    if (xrayTotal) xrayTotal.value = finalTotal;
    
    // Update calculation display
    if (xrayCalculation && xrayCalculationDetails) {
        let calculationHTML = `
            <div class="calculation-row">
                <span>X-ray:</span>
                <span>${baseName}</span>
            </div>
        `;
        
        calculationBreakdown.forEach(breakdown => {
            calculationHTML += `
                <div class="calculation-row">
                    <span>Service:</span>
                    <span>${breakdown}</span>
                </div>
            `;
        });
        
        if (calculationBreakdown.length > 1) {
            calculationHTML += `
                <div class="calculation-row">
                    <span>Subtotal:</span>
                    <span>৳${total.toFixed(2)}</span>
                </div>
            `;
        }
        
        if (isPortable && portableCharge > 0) {
            calculationHTML += `
                <div class="calculation-row">
                    <span>Portable Service:</span>
                    <span>৳${portableCharge.toFixed(2)}</span>
                </div>
            `;
        }
        
        calculationHTML += `
            <div class="calculation-row total-row">
                <span><strong>Total:</strong></span>
                <span><strong>৳${finalTotal.toFixed(2)}</strong></span>
            </div>
        `;
        
        xrayCalculationDetails.innerHTML = calculationHTML;
        xrayCalculation.style.display = 'block';
    }
    
    // Show add button
    if (addXrayBtn) addXrayBtn.style.display = 'block';
}

function togglePortableCharge() {
    calculateXrayTotal();
}

function addXrayToCart() {
    const xrayTotal = document.getElementById('xrayTotal');
    const xrayManualName = document.getElementById('xrayManualName');
    const xrayManualAmount = document.getElementById('xrayManualAmount');
    
    let xrayName, xrayAmount, description = '';
    
    // Get selected view types from checkboxes
    const selectedViews = [];
    ['AP', 'LAT', 'OBLIQUE', 'BOTH', 'MANUAL'].forEach(type => {
        const checkbox = document.getElementById(`view${type}`);
        if (checkbox && checkbox.checked) {
            selectedViews.push(type);
        }
    });
    
    if (selectedViews.length === 0) {
        showToast('Please select a view type', 'warning');
        return;
    }
    
    // Handle manual entry
    if (window.selectedXrayName === 'Manual Entry') {
        if (!xrayManualName || !xrayManualAmount || !xrayManualName.value || !xrayManualAmount.value) {
            showToast('Please enter X-ray name and amount for manual entry', 'warning');
            return;
        }
        xrayName = xrayManualName.value.trim();
        xrayAmount = parseFloat(xrayTotal.value) || 0; // Use calculated total including portable
        description = 'Manual Entry';
    } else {
        // Handle standard X-ray selection
        if (!xrayTotal) {
            showToast('X-ray calculation not found', 'warning');
            return;
        }
        
        // Use the first available X-ray name or default
        xrayName = 'Standard X-ray';
        if (window.currentXrayItems && window.currentXrayItems.length > 0) {
            xrayName = window.currentXrayItems[0].name;
        }
        
        xrayAmount = parseFloat(xrayTotal.value) || 0;
        
        const portableOption = document.getElementById('portableOption');
        const isPortable = portableOption && portableOption.checked;
        
        // Create description based on selected views
        let viewDescription = '';
        if (selectedViews.includes('BOTH')) {
            viewDescription = 'BOTH (AP + LAT)';
        } else {
            const individualViews = selectedViews.filter(view => ['AP', 'LAT', 'OBLIQUE'].includes(view));
            viewDescription = individualViews.join(' + ');
        }
        
        description = `${viewDescription}${isPortable ? ' (Portable)' : ''}`;
    }
    
    if (xrayAmount <= 0) {
        showToast('Invalid X-ray amount', 'warning');
        return;
    }
    
    // Create bill item
    const billItem = {
        id: nextItemId++,
        category: 'X-ray',
        name: xrayName,
        type: 'X-ray',
        strength: '',
        quantity: 1,
        unitPrice: xrayAmount,
        totalPrice: xrayAmount,
        description: description
    };
    
    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage('X-ray', xrayName);
        
        showToast(`X-ray added: ${xrayName}`, 'success');
        
        // Clear checkboxes
        ['AP', 'LAT', 'OBLIQUE', 'BOTH', 'MANUAL'].forEach(type => {
            const checkbox = document.getElementById(`view${type}`);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
        
        if (xrayManualName) xrayManualName.value = '';
        if (xrayManualAmount) xrayManualAmount.value = '';
        
        const addXrayBtn = document.getElementById('addXrayBtn');
        if (addXrayBtn) addXrayBtn.style.display = 'none';
        
        const xrayCalculation = document.getElementById('xrayCalculation');
        if (xrayCalculation) xrayCalculation.style.display = 'none';
        
        const manualEntryRow = document.getElementById('manualEntryRow');
        if (manualEntryRow) manualEntryRow.style.display = 'none';
        
        // Reset portable option
        const portableOption = document.getElementById('portableOption');
        if (portableOption) {
            portableOption.checked = false;
        }
        
        // Clear X-ray selection and disable options
        const xraySearch = document.getElementById('xraySearch');
        const xrayBrowseSelect = document.getElementById('xrayBrowseSelect');
        const selectedXrayInfo = document.getElementById('selectedXrayInfo');
        
        if (xraySearch) xraySearch.value = '';
        if (xrayBrowseSelect) xrayBrowseSelect.value = '';
        if (selectedXrayInfo) selectedXrayInfo.style.display = 'none';
        
        disableXrayOptions();
        window.selectedXrayName = null;
        
        // Refresh suggestions after clearing
        setTimeout(() => {
            updateQuickXraySuggestions('');
        }, 100);
    }
}

// Functions to enable/disable X-ray options
function enableXrayOptions() {
    console.log('Enabling X-ray options...');
    
    // Enable view type checkboxes
    ['AP', 'LAT', 'OBLIQUE', 'BOTH', 'MANUAL'].forEach(type => {
        const checkbox = document.getElementById(`view${type}`);
        const label = document.querySelector(`label[for="view${type}"]`);
        if (checkbox) {
            checkbox.disabled = false;
            console.log(`X-ray ${type} option enabled`);
        }
        if (label) {
            label.style.color = 'white';
        }
    });
    
    // Enable portable option
    const portableOption = document.getElementById('portableOption');
    const portableLabel = document.querySelector('label[for="portableOption"]');
    if (portableOption) {
        portableOption.disabled = false;
        console.log('Portable option enabled');
    }
    if (portableLabel) {
        portableLabel.style.color = 'white';
    }
    
    // Hide helper text
    const helpText = document.getElementById('xrayHelpText');
    if (helpText) {
        helpText.style.display = 'none';
        console.log('X-ray helper text hidden');
    }

    // Hide overlay by adding xray-selected class
    const xrayConfigSection = document.getElementById('xrayConfigurationSection');
    if (xrayConfigSection) {
        const configDiv = xrayConfigSection.querySelector('.xray-config-section') || 
                         xrayConfigSection.querySelector('.col-md-12');
        if (configDiv) {
            configDiv.classList.add('xray-selected');
            console.log('X-ray selection overlay hidden');
        }
    }
}

function disableXrayOptions() {
    // Show view types section again
    const viewTypesSection = document.querySelector('.xray-views-section');
    if (viewTypesSection) {
        viewTypesSection.style.display = 'block';
    }
    
    // Disable and uncheck view type checkboxes
    ['AP', 'LAT', 'OBLIQUE', 'BOTH'].forEach(type => {
        const checkbox = document.getElementById(`view${type}`);
        const label = document.querySelector(`label[for="view${type}"]`);
        if (checkbox) {
            checkbox.disabled = true;
            checkbox.checked = false;
        }
        if (label) {
            label.style.color = 'rgba(255, 255, 255, 0.5)';
        }
    });
    
    // Disable and uncheck portable option
    const portableOption = document.getElementById('portableOption');
    const portableLabel = document.querySelector('label[for="portableOption"]');
    if (portableOption) {
        portableOption.disabled = true;
        portableOption.checked = false;
    }
    if (portableLabel) {
        portableLabel.style.color = 'rgba(255, 255, 255, 0.5)';
    }
    
    // Show helper text
    const helpText = document.getElementById('xrayHelpText');
    if (helpText) helpText.style.display = 'block';

    // Hide calculation and add button
    const xrayCalculation = document.getElementById('xrayCalculation');
    const addXrayBtn = document.getElementById('addXrayBtn');
    if (xrayCalculation) xrayCalculation.style.display = 'none';
    if (addXrayBtn) addXrayBtn.style.display = 'none';

    // Show overlay by removing xray-selected class
    const xrayConfigSection = document.getElementById('xrayConfigurationSection');
    if (xrayConfigSection) {
        const configDiv = xrayConfigSection.querySelector('.xray-config-section') || 
                         xrayConfigSection.querySelector('.col-md-12');
        if (configDiv) {
            configDiv.classList.remove('xray-selected');
            console.log('X-ray selection overlay shown');
        }
    }
}

function updateQuickXraySuggestions(searchTerm) {
    if (!window.currentXrayItems || window.currentXrayItems.length === 0) return;

    let suggestedXrays = [];
    const quickSuggestionsContainer = document.getElementById('quickXraySuggestions');

    if (searchTerm && searchTerm.length > 0) {
        // Show search-related suggestions prioritized by usage
        const searchResults = window.currentXrayItems.filter(item =>
            item.name.toLowerCase().includes(searchTerm)
        );
        
        // Sort search results by usage frequency
        const categoryStats = itemUsageStats['X-ray'] || {};
        suggestedXrays = searchResults
            .map(item => ({
                ...item,
                usageCount: categoryStats[item.name] || 0
            }))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 3);
    } else {
        // Show most frequently used items based on usage stats
        const categoryStats = itemUsageStats['X-ray'] || {};
        const sortedByUsage = window.currentXrayItems
            .map(item => ({
                ...item,
                usageCount: categoryStats[item.name] || 0
            }))
            .sort((a, b) => {
                // Primary sort: usage count (descending)
                if (a.usageCount !== b.usageCount) {
                    return b.usageCount - a.usageCount;
                }
                // Secondary sort: alphabetical for items with same usage
                return a.name.localeCompare(b.name);
            })
            .slice(0, 6); // Get top 6 to have more options

        // If we have usage data, show the most used X-rays
        if (sortedByUsage.some(item => item.usageCount > 0)) {
            suggestedXrays = sortedByUsage.slice(0, 3);
        } else {
            // Fallback to common X-rays, but still prioritize by any existing usage
            const popularXrayKeywords = ['Chest', 'Abdominal', 'Bone', 'Skull', 'Spine', 'Joint'];
            const foundXrays = new Map();
            
            for (const keyword of popularXrayKeywords) {
                const matches = window.currentXrayItems.filter(item =>
                    item.name.toLowerCase().includes(keyword.toLowerCase()) &&
                    !foundXrays.has(item.id)
                );
                
                matches.forEach(item => {
                    foundXrays.set(item.id, {
                        ...item,
                        usageCount: categoryStats[item.name] || 0
                    });
                });
                
                if (foundXrays.size >= 3) break;
            }
            
            // Convert map to array and sort by usage
            suggestedXrays = Array.from(foundXrays.values())
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 3);
                
            // If still no suggestions, just take first 3 X-rays
            if (suggestedXrays.length === 0) {
                suggestedXrays = window.currentXrayItems.slice(0, 3).map(item => ({
                    ...item,
                    usageCount: 0
                }));
            }
        }
    }

    // Show/hide the container based on available suggestions
    if (suggestedXrays.length > 0) {
        quickSuggestionsContainer.style.display = 'block';
        
        // Update the three quick suggestion buttons with usage indicators
        for (let i = 1; i <= 3; i++) {
            const button = document.getElementById(`xraySuggestion${i}`);
            if (button) {
                if (suggestedXrays[i-1]) {
                    const item = suggestedXrays[i-1];
                    button.setAttribute('data-xray-name', item.name);
                    
                    // Create display name with usage indicator
                    let displayName = item.name.length > 12 ? 
                        item.name.substring(0, 12) + '...' : item.name;
                    
                    button.querySelector('span').textContent = displayName;
                    button.title = `${item.name}${item.usageCount > 0 ? ` - Used ${item.usageCount} times` : ' - New X-ray'}`; // Enhanced hover info
                    
                    // Add visual indicator for frequently used X-rays
                    if (item.usageCount > 2) {
                        button.style.border = '1px solid rgba(40, 167, 69, 0.5)';
                        button.style.background = 'rgba(40, 167, 69, 0.1)';
                    } else if (item.usageCount > 0) {
                        button.style.border = '1px solid rgba(255, 193, 7, 0.5)';
                        button.style.background = 'rgba(255, 193, 7, 0.1)';
                    } else {
                        button.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                        button.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                    
                    button.style.display = 'flex';
                } else {
                    button.style.display = 'none';
                }
            }
        }
    } else {
        quickSuggestionsContainer.style.display = 'none';
    }
}

function toggleManualEntry() {
    const checkbox = document.getElementById('manualEntryCheckbox');
    const searchInput = document.getElementById('xraySearch');
    const browseSelect = document.getElementById('xrayBrowseSelect');
    const selectedInfo = document.getElementById('selectedXrayInfo');
    const selectedName = document.getElementById('selectedXrayName');
    const selectedDetails = document.getElementById('selectedXrayDetails');
    const manualEntryRow = document.getElementById('manualEntryRow');

    if (checkbox && checkbox.checked) {
        // Manual entry selected
        if (searchInput) searchInput.value = 'Manual Entry';
        if (browseSelect) browseSelect.value = '';

        if (selectedInfo && selectedName && selectedDetails) {
            selectedName.textContent = 'Manual Entry';
            selectedDetails.innerHTML = 'Custom X-ray service with manual pricing';
            selectedInfo.style.display = 'block';
        }

        if (manualEntryRow) manualEntryRow.style.display = 'flex';

        window.selectedXrayName = 'Manual Entry';
        enableXrayOptionsForManual();
        showToast('Manual entry enabled - enter custom X-ray details', 'success');
    } else {
        // Manual entry unchecked
        if (searchInput) searchInput.value = '';
        if (selectedInfo) selectedInfo.style.display = 'none';
        if (manualEntryRow) manualEntryRow.style.display = 'none';
        
        window.selectedXrayName = null;
        disableXrayOptions();
        
        showToast('Manual entry disabled', 'info');
    }
}

function selectManualXrayEntry() {
    const checkbox = document.getElementById('manualEntryCheckbox');
    if (checkbox) {
        checkbox.checked = true;
        toggleManualEntry();
    }
}

function selectManualXrayEntry() {
    const checkbox = document.getElementById('manualEntryCheckbox');
    if (checkbox) {
        checkbox.checked = true;
        toggleManualEntry();
    }
}

function selectXrayFromQuickButton(buttonElement) {
    const xrayName = buttonElement.getAttribute('data-xray-name');
    if (!xrayName) return;

    // Track usage for smart suggestions
    trackItemUsage('X-ray', xrayName);

    // Select the X-ray
    selectXrayFromDropdown(xrayName);
    
    showToast(`✓ ${xrayName} selected! Configure view types...`, 'success');
    
    // Immediately update quick suggestions to show the most current usage stats
    setTimeout(() => {
        updateQuickXraySuggestions('');
    }, 50);

    const searchInput = document.getElementById('xraySearch');
    if (searchInput) {
        searchInput.focus();
    }
}

// Placeholder functions for X-ray batch operations
function saveAllXrays() {
    showToast('Batch X-ray operations coming soon', 'info');
}

function cancelXraySelection() {
    // Clear all X-ray form fields
    const xrayManualName = document.getElementById('xrayManualName');
    const xrayManualAmount = document.getElementById('xrayManualAmount');
    const addXrayBtn = document.getElementById('addXrayBtn');
    const xrayCalculation = document.getElementById('xrayCalculation');
    const manualEntryRow = document.getElementById('manualEntryRow');
    const xraySearch = document.getElementById('xraySearch');
    const xrayBrowseSelect = document.getElementById('xrayBrowseSelect');
    const selectedXrayInfo = document.getElementById('selectedXrayInfo');
    
    // Clear search and browse selections
    if (xraySearch) xraySearch.value = '';
    if (xrayBrowseSelect) xrayBrowseSelect.value = '';
    if (selectedXrayInfo) selectedXrayInfo.style.display = 'none';
    
    // Clear checkboxes
    ['AP', 'LAT', 'OBLIQUE', 'BOTH', 'MANUAL'].forEach(type => {
        const checkbox = document.getElementById(`view${type}`);
        if (checkbox) {
            checkbox.checked = false;
        }
    });
    
    if (xrayManualName) xrayManualName.value = '';
    if (xrayManualAmount) xrayManualAmount.value = '';
    if (addXrayBtn) addXrayBtn.style.display = 'none';
    if (xrayCalculation) xrayCalculation.style.display = 'none';
    if (manualEntryRow) manualEntryRow.style.display = 'none';
    
    // Reset portable option
    const portableOption = document.getElementById('portableOption');
    if (portableOption) {
        portableOption.checked = false;
    }
    
    // Disable options and clear selection
    disableXrayOptions();
    window.selectedXrayName = null;
    
    showToast('X-ray selection cleared', 'info');
}


function getCategoryIcon(category) {
    const icons = {
        'Registration': 'user-plus',
        'Lab': 'flask',
        'OR': 'procedures',
        'Medicine': 'pills',
        'Procedure': 'stethoscope',
        'X-ray': 'x-ray',
        'Seat & Ad. Fee': 'chair',
        '(O2, Halo, NO2 Etc.)': 'lungs',
        'Limb and Brace': 'hand-paper'
    };
    return icons[category] || 'tag';
}

function setCurrentDate() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const dateInput = document.getElementById('billDate');
    if (dateInput) {
        dateInput.value = dateString;
    }
}

function generateBillNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');

    const billNumber = `BILL-${year}${month}${day}-${time}`;
    const billNumberInput = document.getElementById('billNumber');
    if (billNumberInput) {
        billNumberInput.value = billNumber;
    }
}

function checkForDuplicates(newItem) {
    const duplicate = billItems.find(item => 
        item.category === newItem.category && 
        item.name === newItem.name && 
        item.description === newItem.description
    );

    if (duplicate) {
        showDuplicateModal(newItem, duplicate);
        return false;
    }
    return true;
}

function showDuplicateModal(newItem, existingItem) {
    const modalHTML = `
        <div class="modal fade" id="duplicateModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Duplicate Item Found</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>This item already exists in the bill:</p>
                        <p><strong>${existingItem.name}</strong> - ৳${existingItem.totalPrice.toFixed(2)}</p>
                        <p>What would you like to do?</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="addDuplicateItem(${JSON.stringify(newItem).replace(/"/g, '&quot;')})" data-bs-dismiss="modal">Add Anyway</button>
                        <button type="button" class="btn btn-warning" onclick="replaceDuplicateItem(${JSON.stringify(newItem).replace(/"/g, '&quot;')}, ${JSON.stringify(existingItem).replace(/"/g, '&quot;')})" data-bs-dismiss="modal">Replace Existing</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('duplicateModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('duplicateModal'));
    modal.show();
}

function addDuplicateItem(newItem) {
    billItems.push(newItem);
    updateBillPreview();
    showToast('Item added to bill', 'success');
}

function replaceDuplicateItem(newItem, existingItem) {
    const index = billItems.findIndex(item => 
        item.category === existingItem.category && 
        item.name === existingItem.name && 
        item.description === existingItem.description
    );

    if (index !== -1) {
        billItems[index] = newItem;
        updateBillPreview();
        showToast('Item replaced in bill', 'success');
    }
}

function removeBillItem(id) {
    const index = billItems.findIndex(item => item.id === id);
    if (index !== -1) {
        const removedItem = billItems[index];
        billItems.splice(index, 1);
        updateBillPreview();

        if (removedItem.category === 'Lab') {
            updateSelectedTestsDisplay();
        }

        showToast(`${removedItem.name} removed from bill`, 'info');
    } else {
        console.error('Item not found for removal:', id);
        showToast('Error removing item from bill', 'danger');
    }
}

function filterBillItems() {
    const searchTerm = document.getElementById('billSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#billTableBody tr.bill-item');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function updatePatientInfo() {
    const patientName = document.getElementById('patientName');
    const opdNumber = document.getElementById('opdNumber');
    const previewPatient = document.getElementById('previewPatient');
    const previewOPD = document.getElementById('previewOPD');
    const patientInfoCard = document.getElementById('patientInfoCard');

    // Check if elements exist before trying to use them
    if (!patientName || !opdNumber) {
        console.warn('Patient info elements not found');
        return;
    }

    function updatePatientCard() {
        const hasPatient = patientName && patientName.value ? patientName.value.trim() : '';
        const hasOPD = opdNumber && opdNumber.value ? opdNumber.value.trim() : '';

        if (previewPatient && previewOPD && patientInfoCard) {
            if (hasPatient || hasOPD) {
                previewPatient.textContent = hasPatient || 'Not specified';
                previewOPD.textContent = hasOPD || 'Not specified';
                patientInfoCard.style.display = 'block';
            } else {
                patientInfoCard.style.display = 'none';
            }
        }
    }

    // Only add event listeners if elements exist
    if (patientName) {
        patientName.addEventListener('input', updatePatientCard);
    }
    if (opdNumber) {
        opdNumber.addEventListener('input', updatePatientCard);
    }

    updatePatientCard();
}

function clearBill() {
    if (billItems.length === 0) {
        showToast('Bill is already empty', 'info');
        return;
    }

    if (confirm('Are you sure you want to clear all items?')) {
        billItems = [];
        updateBillPreview();
        showToast('Bill cleared', 'success');
    }
}

function printBill() {
    if (billItems.length === 0) {
        showToast('No items to print', 'warning');
        return;
    }

    window.print();
}

function exportPDF() {
    if (billItems.length === 0) {
        showToast('No items to export', 'warning');
        return;
    }

    const element = document.querySelector('.preview-section');
    const opt = {
        margin: 1,
        filename: 'hospital-bill.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
    showToast('PDF exported successfully', 'success');
}

function exportExcel() {
    if (billItems.length === 0) {
        showToast('No items to export', 'warning');
        return;
    }

    const data = billItems.map(item => ({
        Category: item.category,
        Item: item.name,
        Type: item.type || '',
        Strength: item.strength || '',
        Description: item.description || '',
        Quantity: item.quantity,
        'Unit Price': item.unitPrice,
        'Total Price': item.totalPrice
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hospital Bill');

    XLSX.writeFile(wb, 'hospital-bill.xlsx');
    showToast('Excel file exported successfully', 'success');
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();

    const toastHTML = `
        <div class="toast align-items-center text-bg-${type} border-0" role="alert" id="${toastId}">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${getToastIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { 
        delay: 3000,
        autohide: true
    });
    toast.show();

    setTimeout(() => {
        if (toastElement && toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
        }
    }, 4000);
}

function getToastIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'danger': 'fa-exclamation-triangle',
        'warning': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function updateSelectedTestsDisplay() {
    const selectedTestsDisplay = document.getElementById('selectedTestsDisplay');
    const selectedTestsContainer = document.getElementById('selectedTestsContainer');

    if (!selectedTestsDisplay) {
        return;
    }

    const categorySelect = document.getElementById('categorySelect');
    const isLabCategory = categorySelect && categorySelect.value === 'Lab';

    if (!isLabCategory || !selectedTestsContainer) {
        if (selectedTestsContainer) {
            selectedTestsContainer.style.display = 'none';
        }
        return;
    }

    selectedTestsContainer.style.display = 'block';

    if (billItems.length === 0) {
        selectedTestsDisplay.textContent = 'No tests selected';
        return;
    }

    const labTests = billItems.filter(item => item.category === 'Lab');

    if (labTests.length === 0) {
        selectedTestsDisplay.textContent = 'No tests selected';
        return;
    }

    const testNames = labTests.map(test => test.name);
    selectedTestsDisplay.textContent = testNames.join(', ');
}

document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('medicineDropdown');
    const searchInput = document.getElementById('medicineSearch');
    const genericDropdown = document.getElementById('genericItemDropdown');
    const genericInput = document.getElementById('genericItemSearch');
    const labDropdown = document.getElementById('labDropdown');
    const labInput = document.getElementById('labSearch');
    const xrayDropdown = document.getElementById('xrayDropdown');
    const xrayInput = document.getElementById('xraySearch');

    if (dropdown && searchInput && !searchInput.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }

    if (genericDropdown && genericInput && !genericInput.contains(event.target) && !genericDropdown.contains(event.target)) {
        genericDropdown.style.display = 'none';
    }

    if (labDropdown && labInput && !labInput.contains(event.target) && !labDropdown.contains(event.target)) {
        labDropdown.style.display = 'none';
    }

    if (xrayDropdown && xrayInput && !xrayInput.contains(event.target) && !xrayDropdown.contains(event.target)) {
        xrayDropdown.style.display = 'none';
    }
});

// Enhanced Modal functions for futuristic price editing
let modalCurrentItems = [];
let modalPendingChanges = [];
let selectedCategory = '';
let currentView = 'table';

function openPriceEditModal() {
    const modal = new bootstrap.Modal(document.getElementById('priceEditModal'));
    modal.show();

    // Reset modal state
    resetModalState();
    updateTotalRecords();

    // Add click handlers for category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.dataset.category;
            selectCategory(category);
        });
    });
}

// Function to add item to bill from global search
function addItemToBill(item) {
    const billItem = {
        id: nextItemId++,
        category: item.category,
        name: item.name,
        type: item.type || '',
        strength: item.strength || '',
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        description: ''
    };

    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage(item.category, item.name);
        
        showToast(`✓ ${item.name} added to bill!`, 'success');
    }
}

function resetModalState() {
    selectedCategory = '';
    modalCurrentItems = [];
    modalPendingChanges = [];
    document.getElementById('databaseControls').style.display = 'none';
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    updatePendingChangesDisplay();
}

async function selectCategory(category) {
    // Update UI
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    selectedCategory = category;
    document.getElementById('selectedCategory').textContent = category;
    document.getElementById('databaseControls').style.display = 'block';

    // Load category items
    await loadModalCategoryItems(category);
}

async function loadModalCategoryItems(category) {
    try {
        showLoading(true);
        modalCurrentItems = await getItemsByCategory(category);
        displayModalItems(modalCurrentItems);
        updateModalItemCount();
    } catch (error) {
        console.error('Error loading modal items:', error);
        showToast('Error loading items for ' + category, 'danger');
    } finally {
        showLoading(false);
    }
}

async function updateTotalRecords() {
try {
        const allItems = await window.dbAPI.getAllItems();
        document.getElementById('totalRecords').textContent = allItems.length;
    } catch (error) {
        document.getElementById('totalRecords').textContent = '0';
    }
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    if (view === 'table') {
        document.getElementById('tableView').classList.add('active');
        document.getElementById('gridView').classList.remove('active');
    } else {
        document.getElementById('tableView').classList.remove('active');
        document.getElementById('gridView').classList.add('active');
        displayModalItemsGrid(modalCurrentItems);
    }
}

function filterModalItems() {
    const searchTerm = document.getElementById('modalSearchBox').value.toLowerCase();

    if (currentView === 'table') {
        const rows = document.querySelectorAll('#modalItemsTable tr[data-item-id]');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    } else {
        const items = document.querySelectorAll('#modalItemsGrid .grid-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    }
}

function displayModalItems(items) {
    const tbody = document.getElementById('modalItemsTable');

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="6">
                    <div class="no-data-message">
                        <i class="fas fa-inbox fa-2x"></i>
                        <p>No items in this category</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    items.forEach(item => {
        const isPending = modalPendingChanges.some(change => change.id === item.id);
        const pendingChange = modalPendingChanges.find(change => change.id === item.id);
        const currentPrice = pendingChange ? pendingChange.price : item.price;

        html += `
            <tr data-item-id="${item.id}" class="${isPending ? 'pending-change' : ''}">
                <td>
                    <div class="item-name">
                        <i class="fas fa-tag me-2"></i>
                        ${item.name}
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">${item.type || 'N/A'}</span>
                </td>
                <td>
                    <span class="strength-display">${item.strength || 'N/A'}</span>
                </td>
                <td>
                    <div class="price-display">
                        <span class="currency">৳</span>
                        <span class="amount">${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                </td>
                <td>
                    <input type="number" class="price-input" 
                           value="${currentPrice}" step="0.01" min="0"
                           onchange="updateModalItemPrice(${item.id}, this.value)"
                           placeholder="New price">
                </td>
                <td>
                    <button class="action-btn" onclick="quickDeleteItem(${item.id})" title="Delete Item">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="action-btn" onclick="duplicateItem(${item.id})" title="Duplicate Item">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="action-btn" onclick="viewItemHistory(${item.id})" title="View History">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function displayModalItemsGrid(items) {
    const grid = document.getElementById('modalItemsGrid');

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-inbox fa-3x"></i>
                <p>No items in this category</p>
            </div>
        `;
        return;
    }

    let html = '';
    items.forEach(item => {
        const isPending = modalPendingChanges.some(change => change.id === item.id);
        const pendingChange = modalPendingChanges.find(change => change.id === item.id);
        const currentPrice = pendingChange ? pendingChange.price : item.price;

        html += `
            <div class="grid-item ${isPending ? 'pending-change' : ''}" data-item-id="${item.id}">
                <div class="grid-item-header">
                    <h6>${item.name}</h6>
                    <div class="grid-actions">
                        <button class="action-btn" onclick="quickDeleteItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="grid-item-body">
                    <div class="item-detail">
                        <label>Type:</label>
                        <span>${item.type || 'N/A'}</span>
                    </div>
                    <div class="item-detail">
                        <label>Strength:</label>
                        <span>${item.strength || 'N/A'}</span>
                    </div>
                    <div class="item-detail">
                        <label>Current Price:</label>
                        <span>৳${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                    <div class="price-update">
                        <label>New Price:</label>
                        <input type="number" class="price-input" 
                               value="${currentPrice}" step="0.01" min="0"
                               onchange="updateModalItemPrice(${item.id}, this.value)">
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function updateModalItemPrice(itemId, newPrice) {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;

    const item = modalCurrentItems.find(item => item.id === itemId);
    if (!item) return;

    // Update or add to pending changes
    const existingChangeIndex = modalPendingChanges.findIndex(change => change.id === itemId);
    if (existingChangeIndex >= 0) {
        if (price === item.price) {
            // Remove from pending changes if back to original price
            modalPendingChanges.splice(existingChangeIndex, 1);
        } else {
            modalPendingChanges[existingChangeIndex].price = price;
        }
    } else if (price !== item.price) {
        modalPendingChanges.push({
            id: itemId,
            price: price,
            name: item.name,
            type: item.type,
            strength: item.strength,
            category: item.category
        });
    }

    // Update visual indicators
    updateItemChangeIndicators(itemId, price !== item.price);
    updatePendingChangesDisplay();
    updateSaveButtonState();
}

function updateItemChangeIndicators(itemId, hasChanges) {
    const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
    const gridItem = document.querySelector(`.grid-item[data-item-id="${itemId}"]`);

    if (row) {
        if (hasChanges) {
            row.classList.add('pending-change');
        } else {
            row.classList.remove('pending-change');
        }
    }

    if (gridItem) {
        if (hasChanges) {
            gridItem.classList.add('pending-change');
        } else {
            gridItem.classList.remove('pending-change');
        }
    }
}

function updatePendingChangesDisplay() {
    document.getElementById('pendingChanges').textContent = `${modalPendingChanges.length} Pending Changes`;
}

function updateSaveButtonState() {
    const saveBtn = document.getElementById('saveChangesBtn');
    saveBtn.disabled = modalPendingChanges.length === 0;
}

function updateModalItemCount() {
    const count = modalCurrentItems.length;
    document.getElementById('modalItemCount').textContent = `${count} Records`;
}

async function saveModalChanges() {
    if (modalPendingChanges.length === 0) {
        showToast('No changes to save', 'info');
        return;
    }

    const confirmSave = confirm(`Save ${modalPendingChanges.length} price changes?`);
    if (!confirmSave) return;

    try {
        showLoading(true);
        let successCount = 0;
        let errorCount = 0;

                for (const change of modalPendingChanges) {
            try {
                const originalItem = modalCurrentItems.find(item => item.id === change.id);
                if (originalItem) {
                    await window.dbAPI.updateItem({
                        id: change.id,
                        name: originalItem.name,
                        type: originalItem.type || '',
                        strength: originalItem.strength || '',
                        category: originalItem.category,
                        quantity: originalItem.quantity || '',
                        price: change.price
                    });
                    successCount++;
                }
            } catch (error) {
                console.error('Error updating item:', change, error);
                errorCount++;
            }
        }

        // Clear pending changes and refresh
        modalPendingChanges = [];
        updatePendingChangesDisplay();
        updateSaveButtonState();

        // Refresh the current category data
        if (selectedCategory) {
            await loadModalCategoryItems(selectedCategory);
        }

        if (errorCount === 0) {
            showToast(`Successfully saved ${successCount} price changes`, 'success');
        } else {
            showToast(`Saved ${successCount} changes, ${errorCount} failed`, 'warning');
        }

    } catch (error) {
        console.error('Error saving changes:', error);
        showToast('Error saving changes: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Enhanced bulk operations
async function bulkPriceUpdate() {
    if (!selectedCategory || modalCurrentItems.length === 0) {
        showToast('Please select a category with items first', 'warning');
        return;
    }

    const percentage = prompt('Enter percentage change (+10 for 10% increase, -15 for 15% decrease):');
    if (!percentage) return;

    const change = parseFloat(percentage);
    if (isNaN(change)) {
        showToast('Invalid percentage value', 'danger');
        return;
    }

    modalCurrentItems.forEach(item => {
        const newPrice = item.price * (1 + change / 100);
        if (newPrice > 0) {
            updateModalItemPrice(item.id, newPrice.toFixed(2));
        }
    });

    if (currentView === 'table') {
        displayModalItems(modalCurrentItems);
    } else {
        displayModalItemsGrid(modalCurrentItems);
    }

    showToast(`Applied ${change}% price change to all items`, 'success');
}

async function exportCategory() {
    if (!selectedCategory || modalCurrentItems.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    try {
        showLoading(true);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

        // Export as JSON
        const dataStr = JSON.stringify(modalCurrentItems, null, 2);
        const jsonBlob = new Blob([dataStr], { type: 'application/json' });

        const jsonLink = document.createElement('a');
        jsonLink.href = URL.createObjectURL(jsonBlob);
        jsonLink.download = `${selectedCategory}_${dateStr}_${timeStr}.json`;
        jsonLink.click();

        showToast(`${selectedCategory} category exported successfully`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

async function clearCategoryModal() {
    if (!selectedCategory || modalCurrentItems.length === 0) {
        showToast('No items to clear', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to delete all ${modalCurrentItems.length} items in ${selectedCategory} category? This action cannot be undone.`)) {
        return;
    }

    try {
        showLoading(true);
        await window.dbAPI.clearCategory(selectedCategory);
        await loadModalCategoryItems(selectedCategory);
        modalPendingChanges = [];
        updatePendingChangesDisplay();
        updateSaveButtonState();
        showToast(`${selectedCategory} category cleared successfully`, 'success');
    } catch (error) {
        console.error('Error clearing category:', error);
        showToast('Error clearing category', 'danger');
    } finally {
        showLoading(false);
    }
}

async function refreshModalData() {
    if (!selectedCategory) {
        showToast('Please select a category first', 'warning');
        return;
    }

    await loadModalCategoryItems(selectedCategory);
    modalPendingChanges = [];
    updatePendingChangesDisplay();
    updateSaveButtonState();
    showToast('Data refreshed successfully', 'success');
}

async function quickDeleteItem(itemId) {
    const item = modalCurrentItems.find(item => item.id === itemId);
    if (!item) return;

    if (!confirm(`Delete "${item.name}"?`)) return;

    try {
        showLoading(true);
        await window.dbAPI.deleteItem(itemId);
        await loadModalCategoryItems(selectedCategory);

        // Remove from pending changes if exists
        const changeIndex = modalPendingChanges.findIndex(change => change.id === itemId);
        if (changeIndex >= 0) {
            modalPendingChanges.splice(changeIndex, 1);
            updatePendingChangesDisplay();
            updateSaveButtonState();
        }

        showToast('Item deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Error deleting item', 'danger');
    } finally {
        showLoading(false);
    }
}

// Quick Action Button Functions
async function handleRegistration() {
    console.log('Registration button clicked');
    await showQuickActionData('Registration');
}

async function handleDrFee() {
    console.log('Dr. Fee button clicked');
    await showQuickActionData('Dr. Fee');
}

async function handleMedicFee() {
    console.log('Medic Fee button clicked');
    await showQuickActionData('Medic Fee');
}

async function handleVisitation() {
    console.log('Visitation button clicked');
    await showQuickActionData('Visitation');
}

async function showQuickActionData(category) {
    try {
        showLoading(true);
        
        // Clear any existing quick action data
        const existingContainer = document.getElementById('quickActionDataContainer');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Get items for the category
        const items = await getItemsByCategory(category);
        window.currentCategoryItems = items;
        
        if (!items || items.length === 0) {
            showToast(`No items found in ${category} category`, 'warning');
            return;
        }
        
        // Create container for quick action data
        const container = document.createElement('div');
        container.id = 'quickActionDataContainer';
        container.className = 'quick-items-container mt-3';
        container.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 15px;
            margin-top: 15px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        let html = `
            <div class="mb-3">
                <h6 style="color: var(--secondary); margin-bottom: 15px; font-size: 0.95rem;">
                    <i class="fas fa-list me-2"></i>
                    ${category} Items - Quick Select
                </h6>
                <div class="quick-items-list">
        `;
        
        items.forEach(item => {
            // Check if item is already in the bill
            const isInBill = billItems.some(billItem => 
                billItem.category === category && 
                billItem.name === item.name
            );
            
            const itemStyle = isInBill ? 
                "display: flex; align-items: center; margin-bottom: 8px; padding: 6px 8px; background: rgba(255, 255, 255, 0.15); border-radius: 6px; border: 1px solid rgba(40, 167, 69, 0.5);" :
                "display: flex; align-items: center; margin-bottom: 8px; padding: 6px 8px; background: rgba(255, 255, 255, 0.08); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1);";
            
            const labelStyle = isInBill ?
                "color: #28a745; font-size: 12px; cursor: pointer; flex: 1; margin: 0; font-weight: 500;" :
                "color: white; font-size: 12px; cursor: pointer; flex: 1; margin: 0; font-weight: 400;";
            
            const statusIndicator = isInBill ? ' <span style="color: #28a745; font-size: 10px;">✓ Added</span>' : '';
            
            html += `
                <div class="quick-item-row" style="${itemStyle}">
                    <input type="checkbox" 
                           class="form-check-input me-3" 
                           id="quick_${item.id}" 
                           ${isInBill ? 'checked disabled' : ''}
                           onchange="handleQuickItemSelect(${item.id}, '${category}', this.checked)"
                           style="margin: 0; transform: scale(0.9);">
                    <label for="quick_${item.id}" 
                           style="${labelStyle}">
                        ${item.name} - ৳${parseFloat(item.price).toFixed(2)}${statusIndicator}
                    </label>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="mt-3" style="text-align: center;">
                    <button class="btn btn-outline-secondary btn-sm" onclick="clearQuickSelection()" style="font-size: 11px; padding: 4px 12px;">
                        <i class="fas fa-times me-1"></i>Close
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Insert after quick actions container
        const quickActionsContainer = document.querySelector('.quick-actions-container');
        if (quickActionsContainer && quickActionsContainer.parentNode) {
            quickActionsContainer.parentNode.insertBefore(container, quickActionsContainer.nextSibling);
        } else {
            // Fallback: insert after patient info section
            const patientInfoSection = document.querySelector('.patient-info-section');
            if (patientInfoSection) {
                patientInfoSection.parentNode.insertBefore(container, patientInfoSection.nextSibling);
            } else {
                console.error('Could not find suitable container for quick action data');
                return;
            }
        }
        
        showToast(`${category} items loaded - ${items.length} items available`, 'success');
        
    } catch (error) {
        console.error('Error loading quick action data:', error);
        showToast(`Error loading ${category} items: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
}

// Initialize global search functionality
async function initializeGlobalSearch() {
    try {
        const allItems = await window.dbAPI.getAllItems();
        const categories = [...new Set(allItems.map(item => item.category))];
        
        console.log(`Global search loaded ${allItems.length} items from ${categories.length} categories`);
        
        // Store globally for search functionality
        window.globalSearchItems = allItems;
        
        showToast('Global search ready', 'info');
        console.log('Global search initialized successfully');
    } catch (error) {
        console.error('Error initializing global search:', error);
        showToast('Global search initialization failed', 'warning');
    }
}

// Global array to store selected quick items
window.selectedQuickItems = [];

// Usage tracking function
function trackItemUsage(category, itemName) {
    if (!itemUsageStats[category]) {
        itemUsageStats[category] = {};
    }
    
    if (!itemUsageStats[category][itemName]) {
        itemUsageStats[category][itemName] = 0;
    }
    
    itemUsageStats[category][itemName]++;
    
    // Save to localStorage
    localStorage.setItem('hospitalBilling_itemUsage', JSON.stringify(itemUsageStats));
}

function handleQuickItemSelect(itemId, category, isChecked) {
    if (isChecked) {
        // Find the item data
        window.currentCategoryItems = window.currentCategoryItems || [];
        const item = window.currentCategoryItems.find(i => i.id === itemId);
        if (item) {
            // Check for existing item BEFORE creating the bill item
            const existingItem = billItems.find(existing => 
                existing.category === category && 
                existing.name === item.name
            );
            
            if (existingItem) {
                // Item already exists - show warning and uncheck
                showToast(`⚠️ ${item.name} is already in the bill`, 'warning');
                const checkbox = document.getElementById(`quick_${itemId}`);
                if (checkbox) {
                    checkbox.checked = false;
                }
                return;
            }
            
            // Create bill item only if no duplicate exists
            const billItem = {
                id: nextItemId++,
                category: category,
                name: item.name,
                type: item.type || '',
                strength: item.strength || '',
                quantity: 1,
                unitPrice: item.price,
                totalPrice: item.price,
                description: ''
            };
            
            billItems.push(billItem);
            updateBillPreview();
            
            // Track usage for smart suggestions
            trackItemUsage(category, item.name);
            
            showToast(`✓ ${item.name} added to bill`, 'success');
        }
    } else {
        // Remove from bill when unchecked
        const item = window.currentCategoryItems.find(i => i.id === itemId);
        if (item) {
            const billItemIndex = billItems.findIndex(billItem => 
                billItem.category === category && 
                billItem.name === item.name
            );
            
            if (billItemIndex !== -1) {
                const removedItem = billItems[billItemIndex];
                billItems.splice(billItemIndex, 1);
                updateBillPreview();
                showToast(`${item.name} removed from bill`, 'info');
            }
        }
    }
}



function clearQuickSelection() {
    // Get all checkboxes and handle their unchecking properly
    const checkboxes = document.querySelectorAll('[id^="quick_"]');
    checkboxes.forEach(cb => {
        if (cb.checked && !cb.disabled) {
            // Only uncheck if not disabled (disabled means already in bill)
            const itemId = cb.id.replace('quick_', '');
            const category = cb.closest('.quick-items-container').querySelector('h6').textContent.split(' Items')[0];
            handleQuickItemSelect(parseInt(itemId), category, false);
        }
        if (!cb.disabled) {
            cb.checked = false;
        }
    });
    
    // Remove container
    const container = document.getElementById('quickActionDataContainer');
    if (container) {
        container.remove();
    }
}

// Placeholder functions for future enhancements
function duplicateItem(itemId) {
    showToast('Duplicate feature coming soon', 'info');
}

function viewItemHistory(itemId) {
    showToast('History tracking feature coming soon', 'info');
}

// Category selection function for button grid
function selectCategory(category) {
    // Update hidden select element
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = category;
    }
    
    // Update button states
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedBtn = document.querySelector(`[data-category="${category}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Call the existing showItemInput function
    showItemInput();
    
    // Show toast for user feedback
    showToast(`Selected category: ${category}`, 'success');
}

// Export database function for billing page
async function exportDatabase() {
    try {
        showLoading(true);
        const allItems = await window.dbAPI.exportDatabase();

        if (allItems.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }

        // Generate filename with current date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

        // Export as JSON
        const dataStr = JSON.stringify(allItems, null, 2);
        const jsonBlob = new Blob([dataStr], { type: 'application/json' });

        const jsonLink = document.createElement('a');
        jsonLink.href = URL.createObjectURL(jsonBlob);
        jsonLink.download = `hospital_database_${dateStr}_${timeStr}.json`;
        jsonLink.click();

        // Small delay between downloads
        setTimeout(() => {
            // Export as Excel
            const wb = XLSX.utils.book_new();

            // Group items by category
            const categories = [...new Set(allItems.map(item => item.category))];

            categories.forEach(category => {
                const categoryItems = allItems.filter(item => item.category === category);
                const ws = XLSX.utils.json_to_sheet(categoryItems);
                XLSX.utils.book_append_sheet(wb, ws, category);
            });

            // Also create a complete sheet with all items
            const allItemsSheet = XLSX.utils.json_to_sheet(allItems);
            XLSX.utils.book_append_sheet(wb, allItemsSheet, 'All Items');

            // Save Excel file
            XLSX.writeFile(wb, `hospital_database_${dateStr}_${timeStr}.xlsx`);

            showToast('Database exported as JSON and Excel files', 'success');
        }, 500);

    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Print and PDF functions
function generateBillPrint() {
    if (billItems.length === 0) {
        showToast('No items to print', 'warning');
        return;
    }

    // Create printable bill content
    const printContent = generatePrintableBill();

    // Open new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

function exportBillPDF() {
    if (billItems.length === 0) {
        showToast('No items to export', 'warning');
        return;
    }

    const element = generatePrintableBillElement();
    const opt = {
        margin: 0.5,
        filename: `hospital-bill-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
    showToast('PDF exported successfully', 'success');
}

function generatePrintableBill() {
    const patientName = document.getElementById('patientName').value || 'Not specified';
    const opdNumber = document.getElementById('opdNumber').value || 'Not specified';
    const billDate = document.getElementById('billDate').value || new Date().toISOString().split('T')[0];
    const billNumber = document.getElementById('billNumber').value || 'HB-2025-001';

    let total = 0;
    billItems.forEach(item => {
        total += item.totalPrice;
    });

    // Group items by category
    const groupedItems = {};
    billItems.forEach(item => {
        if (!groupedItems[item.category]) {
            groupedItems[item.category] = [];
        }
        groupedItems[item.category].push(item);
    });

    let itemsHTML = '';
    Object.keys(groupedItems).forEach(category => {
        const categoryItems = groupedItems[category];
        const categoryTotal = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);

        itemsHTML += `
            <tr class="category-header">
                <td colspan="4" style="font-weight: bold; padding: 8px 10px; text-transform: uppercase; letter-spacing: 0.5px;">${category}</td>
            </tr>
        `;

        categoryItems.forEach(item => {
            const itemDescription = item.strength ? `${item.name} (${item.strength})` : item.name;
            itemsHTML += `
                <tr>
                <td style="padding: 5px 10px; border: 1px solid #ddd; vertical-align: top;">
                    <strong>${itemDescription}</strong>
                    ${item.type ? `<br><small style="color: #666;">${item.type}</small>` : ''}
                </td>
                <td style="padding: 5px 10px; border: 1px solid #ddd; font-size: 11px; color: #666;">${item.category}</td>
                <td style="padding: 5px 10px; border: 1px solid #ddd; text-align: center; font-weight: 500;">${item.quantity}</td>
                <td class="amount-cell" style="padding: 5px 10px; border: 1px solid #ddd; text-align: right; font-weight: 600;">৳${item.totalPrice.toFixed(2)}</td>
                </tr>
            `;
        });
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hospital Bill</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .bill-info { margin-bottom: 20px; }
                .bill-info div { margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .total-row { font-weight: bold; background-color: #e9ecef; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Hospital Billing System</h1>
                <h2>Medical Bill</h2>
            </div>
            <div class="bill-info">
                <div><strong>Patient Name:</strong> ${patientName}</div>
                <div><strong>OPD Number:</strong> ${opdNumber}</div>
                <div><strong>Bill Date:</strong> ${billDate}</div>
                <div><strong>Bill Number:</strong> ${billNumber}</div>
            </div>
            <table>
                <thead>
                    <th style="width: 40%;">Item/Service</th>
                        <th style="width: 20%;">Category</th>
                        <th style="width: 15%; text-align: center;">Qty</th>
                        <th style="width: 25%; text-align: right;">Total Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                    <tr class="total-row">
                        <td colspan="3" style="text-align: right; font-weight: bold; padding: 10px;">TOTAL AMOUNT:</td>
                        <td class="amount-cell" style="text-align: right; font-weight: bold; padding: 10px; font-size: 16px;">৳${total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="footer">
                <p><strong>Thank you for choosing our hospital services!</strong></p>
                <p>Generated on ${new Date().toLocaleString()} | This is a computer generated bill</p>
            </div>
        </body>
        </html>
    `;
}

function generatePrintableBillElement() {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generatePrintableBill();
    return tempDiv;
}

function removeBillItem(id) {
    const index = billItems.findIndex(item => item.id === id);
    if (index !== -1) {
        const removedItem = billItems[index];
        billItems.splice(index, 1);
        updateBillPreview();

        if (removedItem.category === 'Lab') {
            updateSelectedTestsDisplay();
        }

        showToast(`${removedItem.name} removed from bill`, 'info');
    } else {
        console.error('Item not found for removal:', id);
        showToast('Error removing item from bill', 'danger');
    }
}

// Function to update the display of selected lab tests

// Global Search Implementation
let globalSearchCache = null;
let globalSearchStats = {
    totalItems: 0,
    categories: 0,
    lastUpdated: null
};

// Initialize global search on app load
async function initializeGlobalSearch() {
    try {
        console.log('Initializing global search...');
        await loadGlobalSearchData();
        updateGlobalSearchStats();
        console.log('Global search initialized successfully');
    } catch (error) {
        console.error('Error initializing global search:', error);
    }
}

// Load all items for global search
async function loadGlobalSearchData() {
    try {
        // Check if database API is available
        if (!window.dbAPI) {
            console.warn('Database API not available for global search');
            globalSearchCache = [];
            return;
        }
        
        const allItems = await window.dbAPI.getAllItems();
        globalSearchCache = Array.isArray(allItems) ? allItems : [];
        
        // Update stats
        globalSearchStats.totalItems = globalSearchCache.length;
        globalSearchStats.categories = [...new Set(globalSearchCache.map(item => item.category))].length;
        globalSearchStats.lastUpdated = new Date();
        
        console.log(`Global search loaded ${globalSearchStats.totalItems} items from ${globalSearchStats.categories} categories`);
    } catch (error) {
        console.error('Error loading global search data:', error);
        globalSearchCache = [];
        globalSearchStats.totalItems = 0;
        globalSearchStats.categories = 0;
    }
}

// Update global search statistics display
function updateGlobalSearchStats() {
    const statsElement = document.getElementById('globalSearchStats');
    if (statsElement && globalSearchStats.totalItems > 0) {
        statsElement.textContent = `Search across ${globalSearchStats.totalItems} items in ${globalSearchStats.categories} categories`;
    }
}

// Handle global search input
async function handleGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    const dropdown = document.getElementById('globalSearchDropdown');
    
    if (!searchInput || !dropdown) {
        console.error('Global search elements not found');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm.length < 2) {
        dropdown.style.display = 'none';
        return;
    }
    
    // Ensure we have search data
    if (!globalSearchCache || globalSearchCache.length === 0) {
        await loadGlobalSearchData();
    }
    
    if (globalSearchCache.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item-empty">No data available for search</div>';
        dropdown.style.display = 'block';
        return;
    }
    
    // Search across all items
    const filteredItems = globalSearchCache.filter(item => {
        const nameMatch = item.name && item.name.toLowerCase().includes(searchTerm);
        const typeMatch = item.type && item.type.toLowerCase().includes(searchTerm);
        const categoryMatch = item.category && item.category.toLowerCase().includes(searchTerm);
        const strengthMatch = item.strength && item.strength.toLowerCase().includes(searchTerm);
        
        return nameMatch || typeMatch || categoryMatch || strengthMatch;
    });
    
    if (filteredItems.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item-empty">No items found</div>';
        dropdown.style.display = 'block';
        return;
    }
    
    // Sort results by relevance (exact name matches first, then others)
    const sortedResults = filteredItems.sort((a, b) => {
        const aNameExact = a.name && a.name.toLowerCase().startsWith(searchTerm);
        const bNameExact = b.name && b.name.toLowerCase().startsWith(searchTerm);
        
        if (aNameExact && !bNameExact) return -1;
        if (!aNameExact && bNameExact) return 1;
        
        // Secondary sort by usage stats if available
        const categoryStats = itemUsageStats[a.category] || {};
        const aUsage = categoryStats[a.name] || 0;
        const bUsage = categoryStats[b.name] || 0;
        
        if (aUsage !== bUsage) return bUsage - aUsage;
        
        // Tertiary sort alphabetically
        return a.name.localeCompare(b.name);
    });
    
    // Create dropdown items (limit to 12 for performance)
    let dropdownHTML = '';
    sortedResults.slice(0, 12).forEach((item, index) => {
        const categoryIcon = getCategoryIcon(item.category);
        const usageCount = itemUsageStats[item.category] && itemUsageStats[item.category][item.name] || 0;
        const usageIndicator = usageCount > 0 ? ` (${usageCount})` : '';
        
        dropdownHTML += `
            <div class="dropdown-item" 
                 onclick="selectFromGlobalSearch(${item.id}, '${item.category.replace(/'/g, '&#39;')}')" 
                 data-index="${index}">
                <div class="global-search-item">
                    <div class="item-main">
                        <i class="fas fa-${categoryIcon} me-2" style="color: var(--secondary);"></i>
                        <span class="medicine-name">${item.name}${usageIndicator}</span>
                    </div>
                    <div class="item-details">
                        <span class="category-badge">${item.category}</span>
                        ${item.type ? `<span class="type-info">${item.type}</span>` : ''}
                        ${item.strength ? `<span class="strength-info">${item.strength}</span>` : ''}
                        <span class="price-info">৳${parseFloat(item.price || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (sortedResults.length > 12) {
        dropdownHTML += `
            <div class="dropdown-item-info">
                <i class="fas fa-info-circle me-2"></i>
                Showing 12 of ${sortedResults.length} results. Continue typing to refine search.
            </div>
        `;
    }
    
    dropdown.innerHTML = dropdownHTML;
    dropdown.style.display = 'block';
}

// Handle global search keyboard navigation
function handleGlobalSearchKeydown(event) {
    const dropdown = document.getElementById('globalSearchDropdown');
    const items = dropdown.querySelectorAll('.dropdown-item:not(.dropdown-item-empty):not(.dropdown-item-info)');

    if (items.length === 0) return;

    let currentSelected = dropdown.querySelector('.dropdown-item.selected');
    let currentIndex = currentSelected ? Array.from(items).indexOf(currentSelected) : -1;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add('selected');
            break;

        case 'ArrowUp':
            event.preventDefault();
            if (currentSelected) currentSelected.classList.remove('selected');
            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[currentIndex].classList.add('selected');
            break;

        case 'Enter':
            event.preventDefault();
            if (currentSelected) {
                currentSelected.click();
            } else if (items.length > 0) {
                items[0].click();
            }
            break;

        case 'Escape':
            dropdown.style.display = 'none';
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            break;
    }
}

// Select item from global search
function selectFromGlobalSearch(itemId, category) {
    const item = globalSearchCache.find(item => item.id === itemId);
    if (!item) {
        showToast('Item not found', 'danger');
        return;
    }
    
    // Create bill item
    const billItem = {
        id: nextItemId++,
        category: category,
        name: item.name,
        type: item.type || '',
        strength: item.strength || '',
        quantity: 1,
        unitPrice: item.price || 0,
        totalPrice: item.price || 0,
        description: ''
    };
    
    // Check for duplicates
    if (checkForDuplicates(billItem)) {
        billItems.push(billItem);
        updateBillPreview();
        
        // Track usage for smart suggestions
        trackItemUsage(category, item.name);
        
        showToast(`✓ ${item.name} added to bill!`, 'success');
        
        // Clear search
        const searchInput = document.getElementById('globalSearch');
        const dropdown = document.getElementById('globalSearchDropdown');
        if (searchInput) searchInput.value = '';
        if (dropdown) dropdown.style.display = 'none';
        
        // Update any category-specific quick suggestions
        setTimeout(() => {
            if (category === 'Lab') updateQuickLabSuggestions('');
            if (category === 'X-ray') updateQuickXraySuggestions('');
        }, 100);
    }
}

// Refresh global search data (call when database is updated)
async function refreshGlobalSearchData() {
    await loadGlobalSearchData();
    updateGlobalSearchStats();
    console.log('Global search data refreshed');
}

// Hide dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('medicineDropdown');
    const searchInput = document.getElementById('medicineSearch');
    const genericDropdown = document.getElementById('genericItemDropdown');
    const genericInput = document.getElementById('genericItemSearch');
    const labDropdown = document.getElementById('labDropdown');
    const labInput = document.getElementById('labSearch');
    const xrayDropdown = document.getElementById('xrayDropdown');
    const xrayInput = document.getElementById('xraySearch');
    const globalDropdown = document.getElementById('globalSearchDropdown');
    const globalInput = document.getElementById('globalSearch');

    if (dropdown && searchInput && !searchInput.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }

    if (genericDropdown && genericInput && !genericInput.contains(event.target) && !genericDropdown.contains(event.target)) {
        genericDropdown.style.display = 'none';
    }

    if (labDropdown && labInput && !labInput.contains(event.target) && !labDropdown.contains(event.target)) {
        labDropdown.style.display = 'none';
    }

    if (xrayDropdown && xrayInput && !xrayInput.contains(event.target) && !xrayDropdown.contains(event.target)) {
        xrayDropdown.style.display = 'none';
    }

    if (globalDropdown && globalInput && !globalInput.contains(event.target) && !globalDropdown.contains(event.target)) {
        globalDropdown.style.display = 'none';
    }
});