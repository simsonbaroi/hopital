// Advanced Edit App JavaScript - Hierarchical Category Management and Dynamic Pricing

// Global variables for advanced edit mode
let currentEditCategory = '';
let currentEditItems = [];
let categoryHierarchy = {};
let categoryMetadata = {};
let editMode = {
    selectedCategory: null,
    items: [],
    mode: 'category' // category, item, pricing
};

// System-level permanent categories - completely unremovable and internal to the system
const defaultCategories = {
    // Admission & Registration Group
    'Registration': {
        icon: 'fas fa-clipboard-list',
        color: '#845ef7',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'admission'
    },
    'Admission Fee': {
        icon: 'fas fa-hospital-user',
        color: '#ff6b6b',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'admission'
    },
    'Admission Fee Private': {
        icon: 'fas fa-door-closed',
        color: '#e83e8c',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'admission'
    },

    // Medical Services Group
    'Dr. Fee': {
        icon: 'fas fa-user-md',
        color: '#20c997',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'medical'
    },
    'Medic Fee': {
        icon: 'fas fa-user-nurse',
        color: '#fd7e14',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'medical'
    },
    'Off-Charge/OB': {
        icon: 'fas fa-baby',
        color: '#ff8cc8',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'medical'
    },
    'Visitation General': {
        icon: 'fas fa-user-friends',
        color: '#339af0',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'medical'
    },
    'Visitation Private': {
        icon: 'fas fa-user-md',
        color: '#6f42c1',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'medical'
    },

    // Diagnostics & Procedures Group
    'Lab': {
        icon: 'fas fa-flask',
        color: '#74c0fc',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'diagnostics'
    },
    'X-ray': {
        icon: 'fas fa-x-ray',
        color: '#51cf66',
        type: 'xray',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'diagnostics'
    },
    'Procedure': {
        icon: 'fas fa-stethoscope',
        color: '#ff8cc8',
        type: 'procedure',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'diagnostics'
    },
    'OR': {
        icon: 'fas fa-procedures',
        color: '#69db7c',
        type: 'procedure',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'diagnostics'
    },

    // Accommodation & Supplies Group
    'Bed Fee General': {
        icon: 'fas fa-bed',
        color: '#17a2b8',
        type: 'room',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'accommodation'
    },
    'Private Room Charges': {
        icon: 'fas fa-door-open',
        color: '#dc3545',
        type: 'room',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'accommodation'
    },
    'Baby Bed Fee(General)': {
        icon: 'fas fa-baby',
        color: '#82ca9d',
        type: 'room',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'accommodation'
    },
    'Baby Bed Fee(Private)': {
        icon: 'fas fa-baby',
        color: '#ff7c7c',
        type: 'room',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'accommodation'
    },
    'Medicine': {
        icon: 'fas fa-pills',
        color: '#ffd43b',
        type: 'medicine',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'accommodation'
    },
    'O2, ISO': {
        icon: 'fas fa-lungs',
        color: '#4287f5',
        type: 'o2iso',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'medical'
    },
    'Limb and Brace': {
        icon: 'fas fa-hand-paper',
        color: '#ff9776',
        type: 'standard',
        subcategories: {},
        system: true,
        readonly: true,
        group: 'medical'
    }
};

// Category groups definition
const categoryGroups = {
    'admission': {
        title: 'Admission & Registration',
        icon: 'fas fa-door-open',
        color: '#845ef7',
        description: 'Registration and admission related fees'
    },
    'medical': {
        title: 'Medical Services',
        icon: 'fas fa-user-md',
        color: '#20c997',
        description: 'Doctor visits and medical consultations'
    },
    'diagnostics': {
        title: 'Diagnostics & Procedures',
        icon: 'fas fa-microscope',
        color: '#74c0fc',
        description: 'Laboratory tests, X-rays and procedures'
    },
    'accommodation': {
        title: 'Accommodation & Supplies',
        icon: 'fas fa-home',
        color: '#ffd43b',
        description: 'Room charges and medical supplies'
    }
};

// Initialize edit app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Advanced Edit app initializing...');

    // Wait for dependencies to load
    let retryCount = 0;
    const maxRetries = 10;

    while (retryCount < maxRetries) {
        try {
            if (!window.LocalDatabase) {
                console.log('Waiting for LocalDatabase to load...');
                await new Promise(resolve => setTimeout(resolve, 100));
                retryCount++;
                continue;
            }

            if (!window.DatabaseAPI) {
                console.log('Waiting for DatabaseAPI to load...');
                await new Promise(resolve => setTimeout(resolve, 100));
                retryCount++;
                continue;
            }

            if (!window.dbAPI) {
                window.dbAPI = new DatabaseAPI();
            }
            await window.dbAPI.init();
            console.log('Database API initialized successfully');
            break;

        } catch (error) {
            console.error(`Database initialization attempt ${retryCount + 1} failed:`, error);
            retryCount++;

            if (retryCount >= maxRetries) {
                console.error('Failed to initialize database API after maximum retries');
                showToast('Database initialization failed. Please refresh the page.', 'danger');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    setupAdvancedEditApp();
});

function setupAdvancedEditApp() {
    // Initialize category structure
    initializeCategoryStructure();

    // Load existing categories from database
    loadExistingCategories();

    // Setup UI components
    renderCategoryTree();
    populateCategorySelects();

    // Initialize file input handler
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileImport);
    }

    // Auto-cleanup disabled - manual management only
    console.log('Auto-cleanup disabled - database will be managed manually');
}

// Category Management Functions

function initializeCategoryStructure() {
    // Remove any stored category structure - categories are now system-only
    localStorage.removeItem('hospital_category_structure');
    localStorage.removeItem('hospital_category_metadata');

    // Categories are now purely system-based, no localStorage persistence
    categoryHierarchy = { ...defaultCategories };
    categoryMetadata = {};

    console.log('System-only category structure initialized with groups:', Object.keys(categoryGroups));
    console.log('All categories are now system-based and cannot be modified:', Object.keys(defaultCategories));
}

async function loadExistingCategories() {
    try {
        const allItems = await window.dbAPI.getAllItems();
        const systemItems = await window.dbAPI.getSystemItems();
        const userItems = await window.dbAPI.getUserItems();

        console.log(`Loaded ${allItems.length} existing items from database`);
        console.log(`🔧 System Database: ${systemItems.length} items | 👤 User Data: ${userItems.length} items`);

        // Check and setup default O2/ISO pricing if no entries found
        await checkAndSetupDefaultO2ISO(allItems);

        // Add system database status to UI
        addSystemDatabaseStatus(systemItems.length, userItems.length);

    } catch (error) {
        console.error('Error loading existing categories:', error);
    }
}

async function checkAndSetupDefaultO2ISO(allItems) {
    try {
        // Check if O2, ISO category has any items
        const o2ISOItems = allItems.filter(item => item.category === 'O2, ISO');

        if (o2ISOItems.length === 0) {
            console.log('No O2, ISO entries found. Setting up default pricing...');

            // Create default O2 item: 2L/hour at ৳130
            const defaultO2Item = {
                category: 'O2, ISO',
                name: 'O2 (Default)',
                type: 'Oxygen Service',
                price: 130,
                description: 'Default O2 service - 2L per hour at ৳130',
                oxygenPricing: {
                    unit: '1hour',
                    price: 130,
                    litersPerHour: 2,
                    baseRate: 65 // ৳65 per liter (130/2)
                }
            };

            // Create default ISO item: ৳30 per minute
            const defaultISOItem = {
                category: 'O2, ISO',
                name: 'ISO (Default)',
                type: 'ISO Service', 
                price: 30,
                description: 'Default ISO service - ৳30 per minute',
                isoPricing: {
                    unit: '1minute',
                    price: 30,
                    baseRate: 30 // ৳30 per minute
                }
            };

            // Add both items to database
            await window.dbAPI.addItem(defaultO2Item);
            await window.dbAPI.addItem(defaultISOItem);

            console.log('✅ Default O2/ISO pricing setup completed');
            showToast('Default O2/ISO pricing configured: O2 2L/hr (৳130), ISO ৳30/min', 'success');
        } else {
            console.log(`Found ${o2ISOItems.length} existing O2, ISO items`);
        }
    } catch (error) {
        console.error('Error setting up default O2/ISO pricing:', error);
        showToast('Error setting up default O2/ISO pricing: ' + error.message, 'warning');
    }
}

function addSystemDatabaseStatus(systemCount, userCount) {
    const statusHTML = `
        <div class="alert alert-info mt-3" id="systemDatabaseStatus">
            <h6><i class="fas fa-database me-2"></i>System Database Status</h6>
            <div class="row">
                <div class="col-md-6">
                    <strong>🔧 System Items:</strong> ${systemCount}
                    <small class="d-block text-muted">Core hospital services & medicines</small>
                </div>
                <div class="col-md-6">
                    <strong>👤 User Items:</strong> ${userCount}
                    <small class="d-block text-muted">Custom additions & modifications</small>
                </div>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-primary me-2" onclick="showSystemDatabaseManager()">
                    <i class="fas fa-cogs me-1"></i>Manage System Database
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="reinitializeSystemDatabase()">
                    <i class="fas fa-sync me-1"></i>Reinitialize from medicines.json
                </button>
            </div>
        </div>
    `;

    const container = document.querySelector('.container');
    if (container) {
        const existingStatus = document.getElementById('systemDatabaseStatus');
        if (existingStatus) {
            existingStatus.remove();
        }
        container.insertAdjacentHTML('afterbegin', statusHTML);
    }
}

function showSystemDatabaseManager() {
    showToast('System Database Manager - Coming in next update! You can currently update items through the price editor.', 'info');
}

async function reinitializeSystemDatabase() {
    if (!confirm('This will reload system data from medicines.json. Any custom system modifications will be preserved. Continue?')) {
        return;
    }

    try {
        showLoading(true);
        const result = await window.dbAPI.reinitializeSystemDatabase();

        // Refresh the status
        await loadExistingCategories();

        showToast('✅ System database reinitialized successfully', 'success');
    } catch (error) {
        console.error('Error reinitializing system database:', error);
        showToast('❌ Failed to reinitialize system database: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function saveCategoryStructure() {
    // Categories are now system-only - no saving to localStorage
    console.log('Categories are system-based and cannot be saved or modified');
}

function renderCategoryTree() {
    const treeContainer = document.getElementById('categoryTree');
    if (!treeContainer) return;

    let treeHTML = '<div class="category-tree-list">';

    // Group categories by their group property
    const groupedCategories = {};
    Object.entries(categoryHierarchy).forEach(([categoryName, categoryData]) => {
        const group = categoryData.group || 'other';
        if (!groupedCategories[group]) {
            groupedCategories[group] = [];
        }
        groupedCategories[group].push([categoryName, categoryData]);
    });

    // Render each group
    Object.entries(categoryGroups).forEach(([groupKey, groupInfo]) => {
        if (groupedCategories[groupKey] && groupedCategories[groupKey].length > 0) {
            const categoriesInGroup = groupedCategories[groupKey];

            treeHTML += `
                <div class="category-group-section">
                    <div class="category-group-header">
                        <div class="group-info">
                            <i class="${groupInfo.icon}" style="color: ${groupInfo.color};"></i>
                            <span class="group-title">${groupInfo.title}</span>
                            <span class="group-count">${categoriesInGroup.length} categories</span>
                        </div>
                        <div class="group-description">${groupInfo.description}</div>
                    </div>
                    <div class="group-categories">
            `;

            categoriesInGroup.forEach(([categoryName, categoryData]) => {
                treeHTML += `
                    <div class="category-tree-item" data-category="${categoryName}">
                        <div class="category-header" onclick="toggleCategoryExpansion('${categoryName}')">
                            <div class="category-info">
                                <i class="${categoryData.icon}" style="color: ${categoryData.color};"></i>
                                <span class="category-name">${categoryData.displayName || categoryName}</span>
                                <span class="category-type">${categoryData.type}</span>
                            </div>
                            <div class="category-actions">
                                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); editCategory('${categoryName}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" disabled title="System Category - Cannot Modify">
                                    <i class="fas fa-lock"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-info" disabled title="System Category - Read Only">
                                    <i class="fas fa-shield-alt"></i>
                                </button>
                                <i class="fas fa-chevron-down expand-icon"></i>
                            </div>
                        </div>
                        <div class="subcategory-list" style="display: none;">
                `;

                if (categoryData.subcategories && Object.keys(categoryData.subcategories).length > 0) {
                    Object.entries(categoryData.subcategories).forEach(([subName, subData]) => {
                        treeHTML += `
                            <div class="subcategory-item" data-subcategory="${subName}">
                                <div class="subcategory-header">
                                    <i class="fas fa-chevron-right me-2"></i>
                                    <span class="subcategory-name">${subName}</span>
                                    <div class="subcategory-actions">
                                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); editSubcategory('${categoryName}', '${subName}')" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteSubcategory('${categoryName}', '${subName}')" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

                treeHTML += `
                        </div>
                    </div>
                `;
            });

            treeHTML += `
                    </div>
                </div>
            `;
        }
    });

    // Render any ungrouped categories
    if (groupedCategories['other'] && groupedCategories['other'].length > 0) {
        treeHTML += `
            <div class="category-group-section">
                <div class="category-group-header">
                    <div class="group-info">
                        <i class="fas fa-folder" style="color: #6c757d;"></i>
                        <span class="group-title">Other Categories</span>
                        <span class="group-count">${groupedCategories['other'].length} categories</span>
                    </div>
                    <div class="group-description">Uncategorized items</div>
                </div>
                <div class="group-categories">
        `;

        groupedCategories['other'].forEach(([categoryName, categoryData]) => {
            treeHTML += `
                <div class="category-tree-item" data-category="${categoryName}">
                    <div class="category-header" onclick="toggleCategoryExpansion('${categoryName}')">
                        <div class="category-info">
                            <i class="${categoryData.icon}" style="color: ${categoryData.color};"></i>
                            <span class="category-name">${categoryName}</span>
                            <span class="category-type">${categoryData.type}</span>
                        </div>
                        <div class="category-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); editCategory('${categoryName}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="event.stopPropagation(); addSubcategoryDirect('${categoryName}')" title="Add Subcategory">
                                <i class="fas fa-plus"></i>
                            </button>
                            ${categoryData.system ? 
                                '<button class="btn btn-sm btn-outline-info" disabled title="System Internal Category"><i class="fas fa-cog"></i></button>' : 
                                '<button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteCategory(\'' + categoryName + '\')" title="Delete"><i class="fas fa-trash"></i></button>'
                            }
                            <i class="fas fa-chevron-down expand-icon"></i>
                        </div>
                    </div>
                    <div class="subcategory-list" style="display: none;">
            `;

            if (categoryData.subcategories && Object.keys(categoryData.subcategories).length > 0) {
                Object.entries(categoryData.subcategories).forEach(([subName, subData]) => {
                    treeHTML += `
                        <div class="subcategory-item" data-subcategory="${subName}">
                            <div class="subcategory-header">
                                <i class="fas fa-chevron-right me-2"></i>
                                <span class="subcategory-name">${subName}</span>
                                <div class="subcategory-actions">
                                    <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); editSubcategory('${categoryName}', '${subName}')" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteSubcategory('${categoryName}', '${subName}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            treeHTML += `
                    </div>
                </div>
            `;
        });

        treeHTML += `
                </div>
            </div>
        `;
    }

    treeHTML += '</div>';
    treeContainer.innerHTML = treeHTML;
}

function toggleCategoryExpansion(categoryName) {
    const categoryItem = document.querySelector(`[data-category="${categoryName}"]`);
    if (!categoryItem) return;

    const subcategoryList = categoryItem.querySelector('.subcategory-list');
    const expandIcon = categoryItem.querySelector('.expand-icon');

    if (subcategoryList.style.display === 'none') {
        subcategoryList.style.display = 'block';
        expandIcon.classList.remove('fa-chevron-down');
        expandIcon.classList.add('fa-chevron-up');
    } else {
        subcategoryList.style.display = 'none';
        expandIcon.classList.remove('fa-chevron-up');
        expandIcon.classList.add('fa-chevron-down');
    }
}

function populateCategorySelects() {
    const selects = [
        'renameCategorySelect',
        'parentCategorySelect', 
        'pricingCategorySelect',
        'sourceCategorySelect',
        'targetCategorySelect'
    ];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options except first
        select.innerHTML = '<option value="">' + select.options[0].text + '</option>';

        // Add categories and subcategories
        Object.entries(categoryHierarchy).forEach(([categoryName, categoryData]) => {
            const systemLabel = categoryData.system ? ' [SYSTEM INTERNAL]' : '';
            const optionClass = categoryData.system ? 'system-category' : '';
            select.innerHTML += `<option value="${categoryName}" class="${optionClass}">${categoryName}${systemLabel}</option>`;

            if (categoryData.subcategories) {
                Object.keys(categoryData.subcategories).forEach(subName => {
                    select.innerHTML += `<option value="${categoryName} > ${subName}">  ↳ ${subName}</option>`;
                });
            }
        });
    });

    // Populate category grid for item management
    populateItemCategoryGrid();
}

// Populate item category selection grid
function populateItemCategoryGrid() {
    const gridContainer = document.getElementById('itemCategoryGrid');
    if (!gridContainer) return;

    let gridHTML = '';

    // Define the exact order of categories as shown in the original image
    const categoryOrder = [
        'Registration', 'Admission Fee', 'Admission Fee Private', 'Dr. Fee', 'Medic Fee', 'Off-Charge/OB',
        'Visitation General', 'Visitation Private', 'Lab', 'X-ray', 'Procedure', 'OR',
        'Bed Fee General', 'Private Room Charges', 'Baby Bed Fee(General)', 'Baby Bed Fee(Private)', 'Medicine', 'O2, ISO'
    ];

    // Render categories in the specified order
    categoryOrder.forEach(categoryName => {
        const categoryData = categoryHierarchy[categoryName];
        if (categoryData) {
            const isActive = currentEditCategory === categoryName ? 'active' : '';

            gridHTML += `
                <div class="export-button category-btn ${isActive}" onclick="selectItemCategory('${categoryName}')" data-category="${categoryName}">
                    <i class="${categoryData.icon}" style="color: ${categoryData.color};"></i>
                    <span>${categoryName}</span>
                </div>
            `;
        }
    });

    gridContainer.innerHTML = gridHTML;
}

function selectItemCategory(categoryPath) {
    // Remove active class from all buttons
    const categoryButtons = document.querySelectorAll('#itemCategoryGrid .category-btn');
    categoryButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to selected button
    const selectedButton = document.querySelector(`#itemCategoryGrid .category-btn[data-category="${categoryPath}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // Set current category and load items
    currentEditCategory = categoryPath;

    if (categoryPath) {
        showItemForm(categoryPath);
        loadCategoryItems(categoryPath);
    } else {
        hideItemForm();
    }
}

// Add new main category - DISABLED (Categories are system-only)
function addNewCategory() {
    showToast('Categories are system-based and cannot be added. All required categories are already available.', 'info');
}

function saveCategoryModal() {
    showToast('Categories are system-based and cannot be modified. Use the existing categories to organize your items.', 'info');

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
    if (modal) modal.hide();
}

// Rename category - DISABLED (Categories are system-only)
function renameCategory() {
    showToast('Categories are system-based and cannot be renamed. All categories are permanently configured for the hospital billing system.', 'info');
}

// Add subcategory - DISABLED (Categories are system-only)
function addSubcategory() {
    showToast('Categories are system-based and cannot be modified. Use the existing categories to organize your items.', 'info');
}

function addSubcategoryDirect(parentName) {
    showToast('Categories are system-based and cannot be modified. Use the existing categories to organize your items.', 'info');
}

// Delete category or subcategory
function deleteCategory(categoryName) {
    // Check if category is system internal (completely unremovable)
    if (categoryHierarchy[categoryName] && categoryHierarchy[categoryName].system) {
        showToast(`Cannot delete system internal category "${categoryName}". This category is part of the core system and cannot be removed.`, 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete the category "${categoryName}" and all its items?`)) {
        return;
    }

    // Delete from hierarchy
    delete categoryHierarchy[categoryName];

    // Delete items from database
    clearCategoryFromDatabase(categoryName);

    saveCategoryStructure();
    renderCategoryTree();
    populateCategorySelects();

    showToast(`Category "${categoryName}" deleted successfully`, 'success');
}

function deleteSubcategory(categoryName, subcategoryName) {
    if (!confirm(`Are you sure you want to delete the subcategory "${subcategoryName}"?`)) {
        return;
    }

    delete categoryHierarchy[categoryName].subcategories[subcategoryName];

    saveCategoryStructure();
    renderCategoryTree();
    populateCategorySelects();

    showToast(`Subcategory "${subcategoryName}" deleted successfully`, 'success');
}

// Item Management Functions

// Legacy function kept for compatibility
function loadItemsForCategory() {
    // This function is now handled by selectItemCategory
    console.log('loadItemsForCategory called - using new grid system');
}

function showItemForm(categoryPath) {
    const itemForm = document.getElementById('itemForm');
    const addItemTitle = document.getElementById('addItemTitle');
    const itemsDisplaySection = document.getElementById('itemsDisplaySection');

    if (itemForm) itemForm.style.display = 'block';
    if (itemsDisplaySection) itemsDisplaySection.style.display = 'block';

    if (addItemTitle) {
        addItemTitle.innerHTML = `<i class="fas fa-plus-circle me-2"></i>Add New Item to ${categoryPath}`;
    }

    // Generate dynamic form fields based on category type
    generateDynamicItemFields(categoryPath);
}

function hideItemForm() {
    const itemForm = document.getElementById('itemForm');
    const itemsDisplaySection = document.getElementById('itemsDisplaySection');

    if (itemForm) itemForm.style.display = 'none';
    if (itemsDisplaySection) itemsDisplaySection.style.display = 'none';
}

function generateDynamicItemFields(categoryPath) {
    const container = document.getElementById('dynamicItemFields');
    if (!container) return;

    // Determine category type
    const [mainCategory, subCategory] = categoryPath.includes(' > ') ? 
        categoryPath.split(' > ') : [categoryPath, null];

    const categoryData = categoryHierarchy[mainCategory];

    // Handle both manual and automatic category type detection
    let categoryType = 'standard';
    if (categoryData && categoryData.type) {
        categoryType = categoryData.type;
    } else if (mainCategory.toLowerCase().includes('xray') || mainCategory.toLowerCase().includes('x-ray')) {
        categoryType = 'xray';
    } else if (mainCategory.toLowerCase().includes('medicine') || mainCategory.toLowerCase().includes('drug')) {
        categoryType = 'medicine';
    }
    let fieldsHTML = '';

    // Basic fields for all types
    fieldsHTML += `
        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <label for="itemName" class="form-label">
                    Item Name <span style="color: var(--accent);">*</span>
                </label>
                <input type="text" class="form-control" id="itemName" 
                       placeholder="Enter item name" required>
            </div>
            <div class="col-md-6">
                <label for="itemPrice" class="form-label">
                    Price (৳) <span style="color: var(--accent);">*</span>
                </label>
                <input type="number" class="form-control" id="itemPrice" 
                       placeholder="0.00" step="0.01" min="0" required>
            </div>
        </div>
    `;

    // Category-specific fields
    if (categoryType === 'medicine') {
        fieldsHTML += `
            <div class="row g-3 mb-3">
                <div class="col-md-4">
                    <label for="itemType" class="form-label">Type</label>
                    <select class="form-select" id="itemType">
                        <option value="">Select type...</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Injection">Injection</option>
                        <option value="Ointment">Ointment</option>
                        <option value="Inhaler">Inhaler</option>
                        <option value="Formula">Formula</option>
                        <option value="Solution">Solution</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label for="itemQuantity" class="form-label">Quantity</label>
                    <input type="text" class="form-control" id="itemQuantity" 
                           placeholder="e.g., 10 pcs, 100ml">
                </div>
                <div class="col-md-4">
                    <label for="itemStrength" class="form-label">Strength</label>
                    <input type="text" class="form-control" id="itemStrength" 
                           placeholder="e.g., 500mg, 10ml">
                </div>
            </div>
        `;
    } else if (mainCategory === 'Baby Bed Fee(General)' || mainCategory === 'Baby Bed Fee(Private)') {
        // Baby Bed Fee categories only need Item Name and Price - no additional fields
    } else if (mainCategory === 'O2, ISO') {
            fieldsHTML += `
                <div class="oxygen-pricing-section mb-3">
                    <h6 style="color: var(--secondary); margin-bottom: 15px;">
                        <i class="fas fa-lungs me-2"></i>Oxygen & ISO Pricing
                    </h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="oxygenUnit" class="form-label">
                                O2 Unit <span style="color: var(--accent);">*</span>
                            </label>
                            <select class="form-select" id="oxygenUnit" required>
                                <option value="">Select O2 unit...</option>
                                <option value="45min">45 minutes (1 hour equivalent)</option>
                                <option value="liter">Per Liter</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="oxygenPrice" class="form-label">
                            O2 Unit Price (৳) <span style="color: var(--accent);">*</span>
                        </label>
                        <input type="number" class="form-control" id="oxygenPrice" 
                               placeholder="Enter O2 unit price" step="0.01" min="0" required>
                    </div>
                </div>
                <div class="row g-3 mt-2">
                    <div class="col-md-6">
                        <label for="isoUnit" class="form-label">
                            ISO Unit <span style="color: var(--accent);">*</span>
                        </label>
                        <select class="form-select" id="isoUnit" required>
                            <option value="">Select ISO unit...</option>
                            <option value="60min">60 minutes (1 hour)</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="isoPrice" class="form-label">
                            ISO Unit Price (৳) <span style="color: var(--accent);">*</span>
                        </label>
                        <input type="number" class="form-control" id="isoPrice" 
                               placeholder="Enter ISO unit price" step="0.01" min="0" required>
                    </div>
                </div>
                <div class="mt-2">
                    <small style="color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-info-circle me-1"></i>
                        O2: First hour = 45 minutes, subsequent hours = 60 minutes each. ISO: 60 minutes per hour.
                    </small>
                </div>
            </div>
        `;
    } else if (categoryType === 'xray') {
        fieldsHTML += `
            <div class="xray-pricing-section mb-3">
                <h6 style="color: var(--secondary); margin-bottom: 15px;">
                    <i class="fas fa-x-ray me-2"></i>X-ray View Pricing
                </h6>
                <div class="row g-3">
                    <div class="col-md-3">
                        <label for="apPrice" class="form-label">
                            AP View (৳) <span style="color: var(--accent);">*</span>
                        </label>
                        <input type="number" class="form-control" id="apPrice" 
                               placeholder="0.00" step="0.01" min="0" required>
                    </div>
                    <div class="col-md-3">
                        <label for="latPrice" class="form-label">
                            LAT View (৳) <span style="color: var(--accent);">*</span>
                        </label>
                        <input type="number" class="form-control" id="latPrice" 
                               placeholder="0.00" step="0.01" min="0" required>
                    </div>
                    <div class="col-md-3">
                        <label for="obliquePrice" class="form-label">
                            OBLIQUE View (৳) <span style="color: var(--accent);">*</span>
                        </label>
                        <input type="number" class="form-control" id="obliquePrice" 
                               placeholder="0.00" step="0.01" min="0" required>
                    </div>
                    <div class="col-md-3">
                        <label for="bothPrice" class="form-label">
                            BOTH Views (৳) <span style="color: var(--accent);">*</span>
                        </label>
                        <input type="number" class="form-control" id="bothPrice" 
                               placeholder="0.00" step="0.01" min="0" required>
                    </div>
                </div>
                <div class="mt-2">
                    <small style="color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-info-circle me-1"></i>
                        Enter pricing for each X-ray view type. All fields are required.
                    </small>
                </div>
            </div>
        `;
    } else if (categoryType === 'room') {
            fieldsHTML += `
                <div class="room-type-section mb-4">
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label for="roomType" class="form-label">
                                Room Type <span style="color: var(--accent);">*</span>
                            </label>
                            <select class="form-select" id="roomType" onchange="updateRoomTypeFields()" required>
                                <option value="">Select room type...</option>
                                <option value="General Bed">General Bed</option>
                                <option value="Private">Private</option>
                            </select>
                        </div>
                        <div class="col-md-6" id="generalPriceSection" style="display: none;">
                            <label for="generalPrice" class="form-label">General Bed Price (৳)</label>
                            <input type="number" class="form-control" id="generalPrice" 
                                   placeholder="Enter general bed price" step="0.01" min="0">
                        </div>
                    </div>

                    <div class="row g-3 mb-3" id="privateOptionsSection" style="display: none;">
                        <div class="col-md-12">
                            <label class="form-label">Private Room Type <span style="color: var(--accent);">*accent);">*</span></label>
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="privateType" id="private1" value="Private 1">
                                        <label class="form-check-label" for="private1">Private 1</label>
                                    </div>
                                    <input type="number" class="form-control mt-2" id="private1Price" 
                                           placeholder="Private 1 price" step="0.01" min="0">
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="privateType" id="private2" value="Private 2">
                                        <label class="form-check-label" for="private2">Private 2</label>
                                    </div>
                                    <input type="number" class="form-control mt-2" id="private2Price" 
                                           placeholder="Private 2 price" step="0.01" min="0">
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="privateType" id="private3" value="Private 3">
                                        <label class="form-check-label" for="private3">Private 3</label>
                                    </div>
                                    <input type="number" class="form-control mt-2" id="private3Price" 
                                           placeholder="Private 3 price" step="0.01" min="0">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

    // Additional metadata fields
    fieldsHTML += `
        <div class="row g-3 mb-3">
            <div class="col-md-12">
                <label for="itemDescription" class="form-label">Description (Optional)</label>
                <textarea class="form-control" id="itemDescription" rows="2" 
                          placeholder="Additional notes or description"></textarea>
            </div>
        </div>
    `;

    container.innerHTML = fieldsHTML;

    // Hide quick setup button - manual entry only
    const quickSetupBtn = document.getElementById('quickSetupBtn');
    if (quickSetupBtn) {
        quickSetupBtn.style.display = 'none';
    }
}

async function loadCategoryItems(categoryPath) {
    try {
        console.log('Loading items for category:', categoryPath);

        if (!window.dbAPI) {
            throw new Error('Database API not available');
        }

        // Handle subcategory path
        const [mainCategory, subCategory] = categoryPath.includes(' > ') ? 
            categoryPath.split(' > ') : [categoryPath, null];

        const items = await window.dbAPI.getItemsByCategory(mainCategory);

        // Filter by subcategory if specified
        if (subCategory) {
            currentEditItems = items.filter(item => 
                item.subcategory === subCategory || 
                (item.name && item.name.toLowerCase().includes(subCategory.toLowerCase()))
            );
        } else {
            currentEditItems = items || [];
        }

        console.log(`Loaded ${currentEditItems.length} items for ${categoryPath}`);

        updateItemsDisplay();
        updateItemCount();

    } catch (error) {
        console.error('Error loading category items:', error);
        currentEditItems = [];
        showToast('Error loading items: ' + error.message, 'danger');
    }
}

function updateItemsDisplay() {
    const itemsTableContainer = document.getElementById('itemsTableContainer');
    const noItemsInCategory = document.getElementById('noItemsInCategory');
    const tableHeaders = document.getElementById('tableHeaders');
    const itemTable = document.getElementById('itemTable');

    if (currentEditItems.length === 0) {
        if (itemsTableContainer) itemsTableContainer.style.display = 'none';
        if (noItemsInCategory) noItemsInCategory.style.display = 'block';
        return;
    }

    if (itemsTableContainer) itemsTableContainer.style.display = 'block';
    if (noItemsInCategory) noItemsInCategory.style.display = 'none';

    if (!tableHeaders || !itemTable) return;

    // Determine category type for headers
    const [mainCategory] = currentEditCategory.includes(' > ') ? 
        currentEditCategory.split(' > ') : [currentEditCategory, null];

    const categoryData = categoryHierarchy[mainCategory];
    const categoryType = categoryData ? categoryData.type : 'standard';

    // Generate headers based on category type
    let headersHTML = '<th>Name</th>';

    if (categoryType === 'medicine') {
        headersHTML += '<th>Type</th><th>Quantity</th><th>Strength</th>';
    } else if (mainCategory === 'Baby Bed Fee(General)' || mainCategory === 'Baby Bed Fee(Private)') {
        headersHTML += '<th>Bed Type</th>';
    } else if (categoryType === 'xray') {
        headersHTML += '<th>AP Price</th><th>LAT Price</th><th>OBLIQUE Price</th><th>BOTH Price</th>';
    } else if (categoryType === 'room') {
        headersHTML += '<th>Room Type</th><th>Room Details</th><th>Price</th>';
    }

    headersHTML += '<th>Base Price</th><th class="text-center">Actions</th>';
    tableHeaders.innerHTML = headersHTML;

    // Generate table rows
    let tableHTML = '';
    currentEditItems.forEach(editItem => {
        tableHTML += '<tr>';
        tableHTML += `<td>${editItem.name || 'N/A'}</td>`;

        if (categoryType === 'medicine') {
            tableHTML += `<td>${editItem.type || 'N/A'}</td>`;
            tableHTML += `<td>${editItem.quantity || 'N/A'}</td>`;
            tableHTML += `<td>${editItem.strength || 'N/A'}</td>`;
        } else if (mainCategory === 'Baby Bed Fee(General)' || mainCategory === 'Baby Bed Fee(Private)') {
            tableHTML += `<td>${editItem.bedType ? (editItem.bedType === 'private' ? 'Private Baby Bed' : 'General Baby Bed') : (editItem.type || 'N/A')}</td>`;
        } else if (categoryType === 'xray') {
            if (editItem.xrayPricing) {
                tableHTML += `<td>৳${parseFloat(editItem.xrayPricing.ap || 0).toFixed(2)}</td>`;
                tableHTML += `<td>৳${parseFloat(editItem.xrayPricing.lat || 0).toFixed(2)}</td>`;
                tableHTML += `<td>৳${parseFloat(editItem.xrayPricing.oblique || 0).toFixed(2)}</td>`;
                tableHTML += `<td>৳${parseFloat(editItem.xrayPricing.both || 0).toFixed(2)}</td>`;
            } else {
                tableHTML += '<td>৳0.00</td><td>৳0.00</td><td>৳0.00</td><td>৳0.00</td>';
            }
        } else if (categoryType === 'room') {
            tableHTML += `<td>${editItem.roomType || 'N/A'}</td>`;
            if (editItem.roomType === 'Private' && editItem.privateType) {
                let roomDetails = editItem.privateType;
                if (editItem.babySeat && editItem.babySeat.enabled) {
                    roomDetails += ` + Baby Seat (৳${editItem.babySeat.price})`;
                }
                tableHTML += `<td>${roomDetails}</td>`;
            } else {
                let roomDetails = editItem.roomDescription || 'N/A';
                if (editItem.babySeat && editItem.babySeat.enabled) {
                    roomDetails += ` + Baby Seat (৳${editItem.price})`;
                }
                tableHTML += `<td>${roomDetails}</td>`;
            }
            tableHTML += `<td>৳${editItem.dailyRate || 0}</td>`;
        }

        tableHTML += `<td>৳${editItem.price || 0}</td>`;
        tableHTML += `
            <td class="text-center">
                <button class="action-btn edit" onclick="editItem(${editItem.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteItem(${editItem.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableHTML += '</tr>';
    });

    itemTable.innerHTML = tableHTML;
}

function updateItemCount() {
    const itemCount = document.getElementById('itemCount');
    if (itemCount) {
        const count = currentEditItems.length;
        itemCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }
}

// Add new item with dynamic fields
async function addItem() {
    try {
        const itemName = document.getElementById('itemName')?.value?.trim();
        const itemPrice = parseFloat(document.getElementById('itemPrice')?.value) || 0;

        if (!itemName || itemPrice <= 0) {
            showToast('Please enter item name and valid price', 'warning');
            return;
        }

        if (!currentEditCategory) {
            showToast('Please select a category first', 'warning');
            return;
        }

        // Determine category type and build item object
        const [mainCategory, subCategory] = currentEditCategory.includes(' > ') ? 
            currentEditCategory.split(' > ') : [currentEditCategory, null];

        const categoryData = categoryHierarchy[mainCategory];
        const categoryType = categoryData ? categoryData.type : 'standard';

        const newItem = {
            category: mainCategory,
            subcategory: subCategory || '',
            name: itemName,
            price: itemPrice,
            description: document.getElementById('itemDescription')?.value?.trim() || ''
        };

        // Add category-specific fields
        if (categoryType === 'medicine') {
            newItem.type = document.getElementById('itemType')?.value || '';
            newItem.quantity = document.getElementById('itemQuantity')?.value || '';
            newItem.strength = document.getElementById('itemStrength')?.value || '';
        } else if (mainCategory === 'Baby Bed Fee(General)' || mainCategory === 'Baby Bed Fee(Private)') {
            // Baby Bed Fee categories - only basic fields needed
            newItem.type = mainCategory.includes('Private') ? 'Private Baby Bed' : 'General Baby Bed';
            newItem.bedType = mainCategory.includes('Private') ? 'private' : 'general';
        } else if (mainCategory === 'O2, ISO') {
            const oxygenUnit = document.getElementById('oxygenUnit')?.value || '';
            const oxygenPrice = parseFloat(document.getElementById('oxygenPrice')?.value) || 0;
            const isoUnit = document.getElementById('isoUnit')?.value || '';
            const isoPrice = parseFloat(document.getElementById('isoPrice')?.value) || 0;

            if (!oxygenUnit || oxygenPrice <= 0 || !isoUnit || isoPrice <= 0) {
                showToast('Please fill in all O2 and ISO unit pricing fields', 'warning');
                return;
            }

            newItem.oxygenPricing = {
                unit: oxygenUnit,
                price: oxygenPrice
            };
            newItem.isoPricing = {
                unit: isoUnit,
                price: isoPrice
            };
            newItem.type = 'O2, ISO Service';
        } else if (categoryType === 'xray') {
            const apPrice = parseFloat(document.getElementById('apPrice')?.value) || 0;
            const latPrice = parseFloat(document.getElementById('latPrice')?.value) || 0;
            const obliquePrice = parseFloat(document.getElementById('obliquePrice')?.value) || 0;
            const bothPrice = parseFloat(document.getElementById('bothPrice')?.value) || 0;

            if (apPrice <= 0 || latPrice <= 0 || obliquePrice <= 0 || bothPrice <= 0) {
                showToast('Please enter valid prices for ALL X-ray view types (AP, LAT, OBLIQUE, BOTH)', 'warning');
                return;
            }

            newItem.xrayPricing = {
                ap: apPrice,
                lat: latPrice,
                oblique: obliquePrice,
                both: bothPrice
            };

            // Set base price to minimum non-zero value for X-ray items
            const prices = [apPrice, latPrice, obliquePrice, bothPrice].filter(p => p > 0);
            newItem.price = prices.length > 0 ? Math.min(...prices) : itemPrice;
        } else if (categoryType === 'room') {
            const roomType = document.getElementById('roomType')?.value || '';

            if (!roomType) {
                showToast('Please select a room type first', 'warning');
                return;
            }

            newItem.roomType = roomType;

            let roomPrice = 0;
            let roomDescription = '';

            if (roomType === 'General Bed') {
                roomPrice = parseFloat(document.getElementById('generalPrice')?.value) || 0;
                if (roomPrice <= 0) {
                    showToast('Please enter a valid price for General Bed', 'warning');
                    return;
                }
                roomDescription = 'General Bed';
            } else if (roomType === 'Private') {
                let privateType = '';
				let private1Price = parseFloat(document.getElementById('private1Price')?.value) || 0;
				let private2Price = parseFloat(document.getElementById('private2Price')?.value) || 0;
				let private3Price = parseFloat(document.getElementById('private3Price')?.value) || 0;

				if (document.getElementById('private1')?.checked) {
					privateType = 'Private 1';
					roomPrice = private1Price;
				} else if (document.getElementById('private2')?.checked) {
					privateType = 'Private 2';
					roomPrice = private2Price;
				} else if (document.getElementById('private3')?.checked) {
					privateType = 'Private 3';
					roomPrice = private3Price
				}

                if (!privateType) {
                    showToast('Please select a private room type', 'warning');
                    return;
                }

                if (roomPrice <= 0) {
                    showToast('Please enter a valid price for private room', 'warning');
                    return;
                }

                roomDescription = privateType;
                newItem.privateType = privateType;
            }

            // Capture checkbox values
            const bedChargeOptions = {
                other: document.getElementById('otherCharge')?.checked || false,
                ob: document.getElementById('obCharge')?.checked || false
            };

            // Capture baby seat data (only available when OB is selected)
            const babySeatPrice = parseFloat(document.getElementById('babySeatPrice')?.value) || 0;
            const obSelected = bedChargeOptions.ob;

            newItem.price = roomPrice;
            newItem.dailyRate = roomPrice;
            newItem.roomDescription = roomDescription;
            newItem.bedChargeOptions = bedChargeOptions;

            // Add baby seat data if OB is selected and price is entered
            if (obSelected && babySeatPrice > 0) {
                newItem.babySeat = {
                    enabled: true,
                    price: babySeatPrice
                };
            }

            // Update item name to include selected options
            const selectedOptions = [];
            if (bedChargeOptions.other) selectedOptions.push('Other');
            if (bedChargeOptions.ob) selectedOptions.push('OB');

            let finalName = newItem.name;
            if (!finalName.toLowerCase().includes(roomDescription.toLowerCase())) {
                finalName = `${roomDescription} - ${finalName}`;
            }

            if (selectedOptions.length > 0) {
                finalName += ` (${selectedOptions.join(', ')})`;
            }

            // Add baby seat to name if OB is selected and price is entered
            if (obSelected && babySeatPrice > 0) {
                finalName += ` + Baby Seat`;
            }

            newItem.name = finalName;

            // Set room metadata
            newItem.roomCategory = roomType;
        }

        console.log('Adding new item:', newItem);

        if (!window.dbAPI) {
            throw new Error('Database API not available');
        }

        await window.dbAPI.addItem(newItem);
        showToast(`${itemName} added successfully`, 'success');

        // Reload items and reset form
        await loadCategoryItems(currentEditCategory);
        resetForm();

    } catch (error) {
        console.error('Error adding item:', error);
        showToast('Error adding item: ' + error.message, 'danger');
    }
}

// Reset form
function resetForm(){
    const container = document.getElementById('dynamicItemFields');
    if (container) {
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }

    // Specifically reset bed charge checkboxes
    const bedChargeCheckboxes = ['otherCharge', 'obCharge'];
    bedChargeCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
}

// Edit and delete functions (similar to previous implementation but adapted for new structure)
async function editItem(itemId) {
    const item = currentEditItems.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'danger');
        return;
    }

    // Populate form fields based on item data
    const itemNameInput = document.getElementById('itemName');
    const itemPriceInput = document.getElementById('itemPrice');

    if (itemNameInput) itemNameInput.value = item.name || '';
    if (itemPriceInput) itemPriceInput.value = item.price || '';

    // Category-specific field population
    const [mainCategory] = currentEditCategory.includes(' > ') ? 
        currentEditCategory.split(' > ') : [currentEditCategory, null];

    const categoryData = categoryHierarchy[mainCategory];
    const categoryType = categoryData ? categoryData.type : 'standard';

    if (categoryType === 'medicine') {
        const typeInput = document.getElementById('itemType');
        const quantityInput = document.getElementById('itemQuantity');
        const strengthInput = document.getElementById('itemStrength');

        if (typeInput) typeInput.value = item.type || '';
        if (quantityInput) quantityInput.value = item.quantity || '';
        if (strengthInput) strengthInput.value = item.strength || '';
    } else if (categoryType === 'xray') {
        const apPriceInput = document.getElementById('apPrice');
        const latPriceInput = document.getElementById('latPrice');
        const obliquePriceInput = document.getElementById('obliquePrice');
        const bothPriceInput = document.getElementById('bothPrice');

        if (item.xrayPricing) {
            if (apPriceInput) apPriceInput.value = item.xrayPricing.ap || '';
            if (latPriceInput) latPriceInput.value = item.xrayPricing.lat || '';
            if (obliquePriceInput) obliquePriceInput.value = item.xrayPricing.oblique || '';
            if (bothPriceInput) bothPriceInput.value = item.xrayPricing.both || '';
        } else {
            // Clear fields if no pricing data
            if (apPriceInput) apPriceInput.value = '';
            if (latPriceInput) latPriceInput.value = '';
            if (obliquePriceInput) obliquePriceInput.value = '';
            if (bothPriceInput) bothPriceInput.value = '';
        }
    } else if (categoryType === 'room') {
        const roomTypeInput = document.getElementById('roomType');

        if (roomTypeInput) {
            roomTypeInput.value = item.roomType || '';
            // Trigger the room type fields update
            updateRoomTypeFields();

            // Set the appropriate price field based on room type
            if (item.roomType === 'General Bed') {
                setTimeout(() => {
                    const generalPriceInput = document.getElementById('generalPrice');
                    if (generalPriceInput) generalPriceInput.value = item.dailyRate || '';
                }, 100);
            } else if (item.roomType === 'Private') {
				setTimeout(() => {
					if (item.privateType === 'Private 1') {
						document.getElementById('private1').checked = true;
						document.getElementById('private1Price').value = item.dailyRate || '';
					} else if (item.privateType === 'Private 2') {
						document.getElementById('private2').checked = true;
						document.getElementById('private2Price').value = item.dailyRate || '';
					} else if (item.privateType === 'Private 3') {
						document.getElementById('private3').checked = true;
						document.getElementById('private3Price').value = item.dailyRate || '';
					}
				}, 100);
            }
        }
    } else if (mainCategory === 'O2, ISO') {
        const oxygenUnitInput = document.getElementById('oxygenUnit');
        const oxygenPriceInput = document.getElementById('oxygenPrice');
        const isoUnitInput = document.getElementById('isoUnit');
        const isoPriceInput = document.getElementById('isoPrice');

        if (item.oxygenPricing) {
            if (oxygenUnitInput) oxygenUnitInput.value = item.oxygenPricing.unit || '';
            if (oxygenPriceInput) oxygenPriceInput.value = item.oxygenPricing.price || '';
        }

        if (item.isoPricing) {
            if (isoUnitInput) isoUnitInput.value = item.isoPricing.unit || '';
            if (isoPriceInput) isoPriceInput.value = item.isoPricing.price || '';
        }
    }

    // Change form to update mode
    const addButton = document.querySelector('#dynamicItemFields + .form-actions .btn-glow');
    if (addButton) {
        addButton.innerHTML = '<i class="fas fa-save"></i><span>Update Item</span>';
        addButton.onclick = () => updateItem(itemId);
    }

    showToast(`Editing: ${item.name}`, 'info');
}

async function updateItem(itemId) {
    try {
        const itemName = document.getElementById('itemName')?.value?.trim();
        const itemPrice = parseFloat(document.getElementById('itemPrice')?.value) || 0;

        if (!itemName || itemPrice <= 0) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        const [mainCategory, subCategory] = currentEditCategory.includes(' > ') ? 
            currentEditCategory.split(' > ') : [currentEditCategory, null];

        const categoryData = categoryHierarchy[mainCategory];
        const categoryType = categoryData ? categoryData.type : 'standard';

        const updatedItem = {
            id: itemId,
            category: mainCategory,
            subcategory: subCategory || '',
            name: itemName,
            price: itemPrice,
            description: document.getElementById('itemDescription')?.value?.trim() || ''
        };

        // Add category-specific fields
        if (categoryType === 'medicine') {
            updatedItem.type = document.getElementById('itemType')?.value || '';
            updatedItem.quantity = document.getElementById('itemQuantity')?.value || '';
            updatedItem.strength = document.getElementById('itemStrength')?.value || '';
        } else if (mainCategory === 'Baby Bed Fee(General)' || mainCategory === 'Baby Bed Fee(Private)') {
            // Baby Bed Fee categories - only basic fields needed
            updatedItem.type = mainCategory.includes('Private') ? 'Private Baby Bed' : 'General Baby Bed';
            updatedItem.bedType = mainCategory.includes('Private') ? 'private' : 'general';
        } else if (mainCategory === 'O2, ISO') {
            const oxygenUnit = document.getElementById('oxygenUnit')?.value || '';
            const oxygenPrice = parseFloat(document.getElementById('oxygenPrice')?.value) || 0;
            const isoUnit = document.getElementById('isoUnit')?.value || '';
            const isoPrice = parseFloat(document.getElementById('isoPrice')?.value) || 0;

            if (!oxygenUnit || oxygenPrice <= 0 || !isoUnit || isoPrice <= 0) {
                showToast('Please fill in all O2 and ISO unit pricing fields', 'warning');
                return;
            }

            updatedItem.oxygenPricing = {
                unit: oxygenUnit,
                price: oxygenPrice
            };
            updatedItem.isoPricing = {
                unit: isoUnit,
                price: isoPrice
            };
            updatedItem.type = 'O2, ISO Service';
        } else if (categoryType === 'xray') {
            const apPrice = parseFloat(document.getElementById('apPrice')?.value) || 0;
            const latPrice = parseFloat(document.getElementById('latPrice')?.value) || 0;
            const obliquePrice = parseFloat(document.getElementById('obliquePrice')?.value) || 0;
            const bothPrice = parseFloat(document.getElementById('bothPrice')?.value) || 0;

            updatedItem.xrayPricing = {
                ap: apPrice,
                lat: latPrice,
                oblique: obliquePrice,
                both: bothPrice
            };
        } else if (categoryType === 'room') {
            const roomType = document.getElementById('roomType')?.value || '';

            if (!roomType) {
                showToast('Please select a room type', 'warning');
                return;
            }

            updatedItem.roomType = roomType;

            let roomPrice = 0;
            let roomDescription = '';

            if (roomType === 'General Bed') {
                roomPrice = parseFloat(document.getElementById('generalPrice')?.value) || 0;
                roomDescription = 'General Bed';
            } else if (roomType === 'Private') {
                let privateType = '';
				let private1Price = parseFloat(document.getElementById('private1Price')?.value) || 0;
				let private2Price = parseFloat(document.getElementById('private2Price')?.value) || 0;
				let private3Price = parseFloat(document.getElementById('private3Price')?.value) || 0;

				if (document.getElementById('private1')?.checked) {
					privateType = 'Private 1';
					roomPrice = private1Price;
				} else if (document.getElementById('private2')?.checked) {
					privateType = 'Private 2';
					roomPrice = private2Price;
				} else if (document.getElementById('private3')?.checked) {
					privateType = 'Private 3';
					roomPrice = private3Price
				}

                roomDescription = privateType;
                updatedItem.privateType = privateType;
            }

            // Capture checkbox values
            const bedChargeOptions = {
                other: document.getElementById('otherCharge')?.checked || false,
                ob: document.getElementById('obCharge')?.checked || false
            };

            // Capture baby seat data (only available when OB is selected)
            const babySeatPrice = parseFloat(document.getElementById('babySeatPrice')?.value) || 0;
            const obSelected = bedChargeOptions.ob;

            updatedItem.dailyRate = roomPrice;
            updatedItem.roomCategory = roomType;
            updatedItem.roomDescription = roomDescription;
            updatedItem.bedChargeOptions = bedChargeOptions;

            // Add baby seat data if OB is selected and price is entered
            if (obSelected && babySeatPrice > 0) {
                updatedItem.babySeat = {
                    enabled: true,
                    price: babySeatPrice
                };
            } else {
                // Remove baby seat data if OB is not selected or no price entered
                delete updatedItem.babySeat;
            }

            // Update item name to include selected options
            const selectedOptions = [];
            if (bedChargeOptions.other) selectedOptions.push('Other');
            if (bedChargeOptions.ob) selectedOptions.push('OB');

            let finalName = updatedItem.name;
            // Remove existing option suffixes and baby seat references
            finalName = finalName.replace(/\s*\([^)]*\)\s*$/, '');
            finalName = finalName.replace(/\s*\+\s*Baby Seat\s*$/, '');

            if (selectedOptions.length > 0) {
                finalName += ` (${selectedOptions.join(', ')})`;
            }

            // Add baby seat to name if OB is selected and price is entered
            if (obSelected && babySeatPrice > 0) {
                finalName += ` + Baby Seat`;
            }

            updatedItem.name = finalName;
        }

        await window.dbAPI.updateItem(updatedItem);
        showToast(`${itemName} updated successfully`, 'success');

        // Reload items and reset form
        await loadCategoryItems(currentEditCategory);
        resetFormToAddMode();

    } catch (error) {
        console.error('Error updating item:', error);
        showToast('Error updating item: ' + error.message, 'danger');
    }
}

function resetFormToAddMode() {
    resetForm();

    const addButton = document.querySelector('#dynamicItemFields + .form-actions .btn-glow');
    if (addButton) {
        addButton.innerHTML = '<i class="fas fa-plus"></i><span>Add Item</span>';
        addButton.onclick = addItem;
    }
}

async function deleteItem(itemId) {
    const item = currentEditItems.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'danger');
        return;
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
        return;
    }

    try {
        await window.dbAPI.deleteItem(itemId);
        showToast(`${item.name} deleted successfully`, 'success');

        // Reload items
        await loadCategoryItems(currentEditCategory);

    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Error deleting item: ' + error.message, 'danger');
    }
}

// Pricing Management Functions

async function adjustCategoryPricing() {
    const categorySelect = document.getElementById('pricingCategorySelect');
    const adjustmentInput = document.getElementById('priceAdjustment');

    if (!categorySelect.value || !adjustmentInput.value) {
        showToast('Please select category and enter adjustment percentage', 'warning');
        return;
    }

    const category = categorySelect.value;
    const adjustment = parseFloat(adjustmentInput.value);

    try {
        const items = await window.dbAPI.getItemsByCategory(category);

        for (const item of items) {
            const newPrice = item.price * (1 + adjustment / 100);
            item.price = Math.round(newPrice * 100) / 100; // Round to 2 decimal places
            await window.dbAPI.updateItem(item);
        }

        showToast(`Adjusted pricing for ${items.length} items in ${category} by ${adjustment}%`, 'success');

        // Reload if current category
        if (currentEditCategory === category) {
            await loadCategoryItems(currentEditCategory);
        }

    } catch (error) {
        console.error('Error adjusting pricing:', error);
        showToast('Error adjusting pricing: ' + error.message, 'danger');
    }
}

async function copyPricingStructure() {
    const sourceSelect = document.getElementById('sourceCategorySelect');
    const targetSelect = document.getElementById('targetCategorySelect');

    if (!sourceSelect.value || !targetSelect.value) {
        showToast('Please select both source and target categories', 'warning');
        return;
    }

    const sourceCategory = sourceSelect.value;
    const targetCategory = targetSelect.value;

    try {
        const sourceItems = await window.dbAPI.getItemsByCategory(sourceCategory);
        const targetItems = await window.dbAPI.getItemsByCategory(targetCategory);

        let copiedCount = 0;

        for (const sourceItem of sourceItems) {
            const matchingTarget = targetItems.find(item => 
                item.name.toLowerCase() === sourceItem.name.toLowerCase()
            );

            if (matchingTarget) {
                matchingTarget.price = sourceItem.price;
                if (sourceItem.xrayPricing) {
                    matchingTarget.xrayPricing = { ...sourceItem.xrayPricing };
                }
                await window.dbAPI.updateItem(matchingTarget);
                copiedCount++;
            }
        }

        showToast(`Copied pricing for ${copiedCount} matching items from ${sourceCategory} to ${targetCategory}`, 'success');

        // Reload if current category is target
        if (currentEditCategory === targetCategory) {
            await loadCategoryItems(currentEditCategory);
        }

    } catch (error) {
        console.error('Error copying pricing structure:', error);
        showToast('Error copying pricing: ' + error.message, 'danger');
    }
}

function applyPricingTemplate(templateType) {
    // Implementation for pricing templates
    showToast(`Applying ${templateType} pricing template...`, 'info');
    // TODO: Implement pricing template logic
}

// Database utility functions
async function updateItemsCategory(oldName, newName) {
    try {
        const items = await window.dbAPI.getItemsByCategory(oldName);
        for (const item of items) {
            item.category = newName;
            await window.dbAPI.updateItem(item);
        }
    } catch (error) {
        console.error('Error updating items category:', error);
    }
}

async function clearCategoryFromDatabase(categoryName) {
    try {
        await window.dbAPI.clearCategory(categoryName);
    } catch (error) {
        console.error('Error clearing category from database:', error);
    }
}

// Export category structure
function exportCategoryStructure() {
    const exportData = {
        categoryHierarchy: categoryHierarchy,
        categoryMetadata: categoryMetadata,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `category_structure_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    showToast('Category structure exported successfully', 'success');
}

// Export functionality (existing functions with minor updates)
async function exportDatabase() {
    try {
        showLoading(true);
        const allItems = await window.dbAPI.getAllItems();
        const bills = await window.dbAPI.getBills();

        if (allItems.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

        // Export 1: Database JSON format
        const exportData = {
            items: allItems,
            bills: bills || [],
            categoryHierarchy: categoryHierarchy,
            categoryMetadata: categoryMetadata,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const jsonBlob = new Blob([dataStr], { type: 'application/json' });

        const jsonLink = document.createElement('a');
        jsonLink.href = URL.createObjectURL(jsonBlob);
        jsonLink.download = `hospital_database_${dateStr}_${timeStr}.json`;
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);

        console.log('JSON export completed');

        // Small delay between downloads
        setTimeout(() => {
            // Export 2: Excel format
            try {
                if (typeof XLSX !== 'undefined') {
                    const workbook = XLSX.utils.book_new();

                    // Items sheet
                    const itemsData = [
                        ['Category', 'Name', 'Type', 'Strength', 'Price', 'X-ray AP', 'X-ray LAT', 'X-ray OBLIQUE', 'X-ray BOTH', 'Description']
                    ];

                    allItems.forEach(item => {
                        itemsData.push([
                            item.category || '',
                            item.name || '',
                            item.type || '',
                            item.strength || '',
                            item.price || 0,
                            item.xrayPricing?.ap || '',
                            item.xrayPricing?.lat || '',
                            item.xrayPricing?.oblique || '',
                            item.xrayPricing?.both || '',
                            item.description || ''
                        ]);
                    });

                    // Bills sheet
                    const billsData = [
                        ['Bill Number', 'Patient Name', 'OPD Number', 'Date', 'Total Amount', 'Items Count']
                    ];

                    if (bills && bills.length > 0) {
                        bills.forEach(bill => {
                            billsData.push([
                                bill.billNumber || '',
                                bill.patientName || '',
                                bill.opdNumber || '',
                                bill.date ? new Date(bill.date).toLocaleDateString() : '',
                                bill.grandTotal || 0,
                                bill.items ? bill.items.length : 0
                            ]);
                        });
                    }

                    // Create worksheets
                    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(itemsData), 'Items');
                    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(billsData), 'Bills Summary');

                    // Save Excel file
                    XLSX.writeFile(workbook, `hospital_data_${dateStr}_${timeStr}.xlsx`);

                    console.log('Excel export completed');
                    showToast('Database exported in both JSON and Excel formats', 'success');
                } else {
                    console.warn('XLSX library not available');
                    showToast('JSON export completed. Excel library not available.', 'warning');
                }
            } catch (excelError) {
                console.error('Excel export error:', excelError);
                showToast('JSON export completed. Excel export failed: ' + excelError.message, 'warning');
            }
        }, 1000);

    } catch (error) {
        console.error('Error exporting database:', error);
        showToast('Error exporting database: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function triggerImportFile() {
    document.getElementById('fileInput').click();
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Show progress immediately
        showImportProgress('Preparing import...', 0);

        // Small delay to ensure progress bar is visible
        await new Promise(resolve => setTimeout(resolve, 100));

        const fileName = file.name.toLowerCase();
        const isExcelFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        updateImportProgress('Reading file...', 5);
        await new Promise(resolve => setTimeout(resolve, 50));

        if (isExcelFile) {
            await handleExcelFileImport(file);
        } else {
            await handleJSONFileImport(file);
        }

    } catch (error) {
        console.error('Error importing file:', error);
        showToast('Error importing file: ' + error.message, 'danger');
    } finally {
        // Keep progress bar visible for a moment before hiding
        updateImportProgress('Import completed!', 100);
        setTimeout(() => {
            hideImportProgress();
        }, 1500);
        event.target.value = '';
    }
}

async function handleJSONFileImport(file) {
    try {
        const text = await file.text();

        // Add detailed JSON parsing with error location
        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonError) {
            // Extract line and column info from the error
            const match = jsonError.message.match(/position (\d+)/);
            const position = match ? parseInt(match[1]) : 0;

            // Calculate approximate line and column
            const lines = text.substring(0, position).split('\n');
            const lineNumber = lines.length;
            const columnNumber = lines[lines.length - 1].length + 1;

            // Show detailed error message
            const errorMessage = `JSON Parse Error at line ${lineNumber}, column ${columnNumber}:\n${jsonError.message}\n\nPlease check the JSON syntax around that location.`;
            showToast(errorMessage, 'danger');

            // Log the problematic area for debugging
            const start = Math.max(0, position - 100);
            const end = Math.min(text.length, position + 100);
            const context = text.substring(start, end);
            console.error('JSON Error Context:', context);
            console.error('Error position:', position);

            return;
        }

        // Import category structure if available, but preserve system permanent categories
        if (data.categoryHierarchy) {
            // Merge imported categories but protect system permanent ones
            const importedCategories = { ...data.categoryHierarchy };

            // Remove any attempts to override system categories from import
            Object.keys(defaultCategories).forEach(systemKey => {
                if (defaultCategories[systemKey].system) {
                    delete importedCategories[systemKey];
                }
            });

            categoryHierarchy = { ...categoryHierarchy, ...importedCategories };

            // Re-ensure system categories are intact
            Object.keys(defaultCategories).forEach(key => {
                if (defaultCategories[key].system) {
                    categoryHierarchy[key] = { ...defaultCategories[key] };
                }
            });

            saveCategoryStructure();
            renderCategoryTree();
            populateCategorySelects();

            showToast('Categories imported successfully. System internal categories remain locked.', 'info');
        }

        if (data.categoryMetadata) {
            categoryMetadata = { ...categoryMetadata, ...data.categoryMetadata };
            saveCategoryStructure();
        }

        // Import items
        if (data.items && Array.isArray(data.items)) {
            let importedCount = 0;
            const totalItems = data.items.length;

            updateImportProgress(`Importing ${totalItems} items...`, 10);

            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                try {
                    await window.dbAPI.addItem(item);
                    importedCount++;

                    // Update progress
                    const progress = 10 + Math.round((i + 1) / totalItems * 80);
                    updateImportProgress(`Imported ${importedCount}/${totalItems} items...`, progress);

                    // Small delay for visual feedback
                    if (i % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                } catch (error) {
                    console.warn('Error importing item:', item.name, error);
                }
            }

            updateImportProgress('Import completed!', 100);
            setTimeout(() => {
                showToast(`Imported ${importedCount} items and category structure successfully`, 'success');
            }, 500);
        } else {
            showToast('Invalid JSON format. Expected items array.', 'warning');
        }

    } catch (error) {
        console.error('Error in JSON import:', error);
        showToast(`Error importing JSON file: ${error.message}`, 'danger');
    }
}

async function handleExcelFileImport(file) {
    try {
        console.log('Starting Excel file import:', file.name);

        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded. Please refresh the page and try again.');
        }

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                console.log('Excel workbook loaded, sheets:', workbook.SheetNames);

                // Look for Items sheet first
                let itemsSheetName = workbook.SheetNames.find(name => 
                    name.toLowerCase().includes('item') || name.toLowerCase() === 'sheet1'
                );

                if (!itemsSheetName) {
                    itemsSheetName = workbook.SheetNames[0]; // Use first sheet if no items sheet found
                }

                const worksheet = workbook.Sheets[itemsSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                console.log('Excel data parsed, rows:', jsonData.length);

                if (jsonData.length < 2) {
                    throw new Error('Excel file appears to be empty or has no data rows');
                }

                // Find header row (first non-empty row)
                let headerRowIndex = 0;
                while (headerRowIndex < jsonData.length && (!jsonData[headerRowIndex] || jsonData[headerRowIndex].length === 0)) {
                    headerRowIndex++;
                }

                if (headerRowIndex >= jsonData.length) {
                    throw new Error('No valid header row found in Excel file');
                }

                const headers = jsonData[headerRowIndex].map(h => h ? h.toString().toLowerCase().trim() : '');
                console.log('Headers found:', headers);

                // Map common header variations to our standard fields
                const headerMap = {
                    category: ['category', 'cat', 'type', 'service_type'],
                    name: ['name', 'item_name', 'service_name', 'description', 'item'],
                    type: ['type', 'item_type', 'sub_type', 'subtype'],
                    strength: ['strength', 'dosage', 'concentration', 'size'],
                    price: ['price', 'cost', 'amount', 'rate', 'fee'],
                    quantity: ['quantity', 'qty', 'stock'],
                    xray_ap: ['xray_ap', 'x-ray_ap', 'ap', 'x_ray_ap'],
                    xray_lat: ['xray_lat', 'x-ray_lat', 'lat', 'x_ray_lat'],
                    xray_oblique: ['xray_oblique', 'x-ray_oblique', 'oblique', 'x_ray_oblique'],
                    xray_both: ['xray_both', 'x-ray_both', 'both', 'x_ray_both']
                };

                // Find column indices
                const columnIndices = {};
                Object.keys(headerMap).forEach(field => {
                    const possibleHeaders = headerMap[field];
                    for (let i = 0; i < headers.length; i++) {
                        if (possibleHeaders.some(h => headers[i].includes(h))) {
                            columnIndices[field] = i;
                            break;
                        }
                    }
                });

                console.log('Column mapping:', columnIndices);

                // Validate required columns
                if (!columnIndices.name) {
                    throw new Error('Required column "Name" not found. Please ensure your Excel file has a Name/Item column.');
                }

                const items = [];
                let importedCount = 0;
                let skippedCount = 0;

                // Process data rows
                for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const name = row[columnIndices.name] ? row[columnIndices.name].toString().trim() : '';
                    if (!name) {
                        skippedCount++;
                        continue;
                    }

                    // Extract basic item data
                    const item = {
                        category: row[columnIndices.category] ? row[columnIndices.category].toString().trim() : 'General',
                        name: name,
                        type: row[columnIndices.type] ? row[columnIndices.type].toString().trim() : '',
                        strength: row[columnIndices.strength] ? row[columnIndices.strength].toString().trim() : '',
                        quantity: row[columnIndices.quantity] ? row[columnIndices.quantity].toString().trim() : '',
                        price: parseFloat(row[columnIndices.price]) || 0
                    };

                    // Handle X-ray pricing if columns exist
                    if (columnIndices.xray_ap || columnIndices.xray_lat || columnIndices.xray_oblique || columnIndices.xray_both) {
                        const xrayPricing = {};

                        if (columnIndices.xray_ap && row[columnIndices.xray_ap]) {
                            xrayPricing.ap = parseFloat(row[columnIndices.xray_ap]) || 0;
                        }
                        if (columnIndices.xray_lat && row[columnIndices.xray_lat]) {
                            xrayPricing.lat = parseFloat(row[columnIndices.xray_lat]) || 0;
                        }
                        if (columnIndices.xray_oblique && row[columnIndices.xray_oblique]) {
                            xrayPricing.oblique = parseFloat(row[columnIndices.xray_oblique]) || 0;
                        }
                        if (columnIndices.xray_both && row[columnIndices.xray_both]) {
                            xrayPricing.both = parseFloat(row[columnIndices.xray_both]) || 0;
                        }

                        if (Object.keys(xrayPricing).length > 0) {
                            item.xrayPricing = xrayPricing;
                        }
                    }

                    items.push(item);
                }

                console.log(`Processed ${items.length} items from Excel file`);

                if (items.length === 0) {
                    throw new Error('No valid items found in Excel file');
                }

                // Import items to database
                updateImportProgress(`Processing ${items.length} items from Excel file...`, 20);

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    try {
                        await window.dbAPI.addItemWithDuplicateHandling(item, false);
                        importedCount++;
                    } catch (error) {
                        console.warn('Failed to import item:', item.name, error.message);
                        skippedCount++;
                    }

                    // Update progress
                    const progress = 20 + Math.round((i + 1) / items.length * 70);
                    updateImportProgress(`Importing ${i + 1}/${items.length} items...`, progress);

                    // Small delay for visual feedback every 10 items
                    if (i % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }

                // Refresh displays if we have required functions
                if (typeof loadCategories === 'function') {
                    await loadCategories();
                }
                if (typeof updateStats === 'function') {
                    updateStats();
                }

                showToast(`Excel import completed! Imported: ${importedCount}, Skipped: ${skippedCount}`, 'success');

            } catch (error) {
                console.error('Error processing Excel file:', error);
                showToast(`Error processing Excel file: ${error.message}`, 'danger');
            }
        };

        reader.onerror = function() {
            showToast('Error reading Excel file', 'danger');
        };

        reader.readAsArrayBuffer(file);

    } catch (error) {
        console.error('Error in Excel import:', error);
        showToast(`Error importing Excel file: ${error.message}`, 'danger');
    }
}

// Utility functions
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showImportProgress(message, percentage = 0) {
    hideImportProgress(); // Hide any existing progress

    const progressOverlay = document.createElement('div');
    progressOverlay.id = 'importProgressOverlay';
    progressOverlay.className = 'import-progress-overlay';

    // Set initial styles to ensure visibility
    progressOverlay.style.position = 'fixed';
    progressOverlay.style.top = '0';
    progressOverlay.style.left = '0';
    progressOverlay.style.width = '100vw';
    progressOverlay.style.height = '100vh';
    progressOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
    progressOverlay.style.backdropFilter = 'blur(10px)';
    progressOverlay.style.display = 'flex';
    progressOverlay.style.justifyContent = 'center';
    progressOverlay.style.alignItems = 'center';
    progressOverlay.style.zIndex = '9999';

    progressOverlay.innerHTML = `
        <div class="import-progress-container">
            <div class="import-progress-header">
                <div class="import-progress-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <h5>Importing Database</h5>
                <p id="importProgressMessage">${message}</p>
            </div>
            <div class="import-progress-bar-container">
                <div class="import-progress-bar" id="importProgressBar" style="width: ${percentage}%"></div>
                <div class="import-progress-percentage" id="importProgressPercentage">${percentage}%</div>
            </div>
            <div class="import-progress-status" id="importProgressStatus">Please wait...</div>
        </div>
    `;

    document.body.appendChild(progressOverlay);

    // Force reflow and add active class for animation
    setTimeout(() => {
        progressOverlay.classList.add('active');
    }, 10);
}

function updateImportProgress(message, percentage) {
    const messageEl = document.getElementById('importProgressMessage');
    const progressBar = document.getElementById('importProgressBar');
    const percentageEl = document.getElementById('importProgressPercentage');
    const statusEl = document.getElementById('importProgressStatus');

    if (messageEl) messageEl.textContent = message;
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (percentageEl) percentageEl.textContent = `${percentage}%`;
    if (statusEl) statusEl.textContent = percentage >= 100 ? 'Complete!' : 'Processing...';
}

function hideImportProgress() {
    const overlay = document.getElementById('importProgressOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function showToast(message, type = 'info') {
    try {
        const toast = document.createElement('div');
        toast.className = `toast text-bg-${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-body">
                ${message}
                <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        const container = document.querySelector('.toast-container');
        if (container) {
            container.appendChild(toast);

            if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                const bsToast = new bootstrap.Toast(toast);
                bsToast.show();

                toast.addEventListener('hidden.bs.toast', () => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                });
            } else {
                toast.style.display = 'block';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 3000);
            }
        } else {
            console.log(`Toast ${type}: ${message}`);
            if (type === 'danger' || type === 'error') {
                alert(message);
            }
        }
    } catch (error) {
        console.error('Error showing toast:', error);
        console.log(`Toast ${type}: ${message}`);
        alert(message);
    }
}

// Clear category functionality
async function clearCategory() {
    if (!currentEditCategory) {
        showToast('No category selected', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to delete ALL items in the ${currentEditCategory} category? This action cannot be undone.`)) {
        return;
    }

    try {
        const [mainCategory] = currentEditCategory.includes(' > ') ? 
            currentEditCategory.split(' > ') : [currentEditCategory, null];

        await window.dbAPI.clearCategory(mainCategory);
        showToast(`All ${currentEditCategory} items deleted`, 'success');

        await loadCategoryItems(currentEditCategory);

    } catch (error) {
        console.error('Error clearing category:', error);
        showToast('Error clearing category: ' + error.message, 'danger');
    }
}

async function clearAllDatabase() {
    if (!confirm('Are you sure you want to delete ALL items from the ENTIRE database? This will remove all categories and items permanently. This action cannot be undone.')) {
        return;
    }

    if (!confirm('This is your final warning! You are about to delete the ENTIRE database. Type YES in the next prompt to confirm.')) {
        return;
    }

    const confirmation = prompt('Type "DELETE ALL" to confirm you want to clear the entire database:');
    if (confirmation !== 'DELETE ALL') {
        showToast('Database clear cancelled', 'info');
        return;
    }

    try {
        showLoading(true);

        if (!window.dbAPI) {
            throw new Error('Database API not available');
        }

        await window.dbAPI.clearAllData();

        showToast('Entire database cleared successfully', 'success');

        // Reset current view
        currentEditItems = [];
        currentEditCategory = '';

        updateItemsDisplay();
        updateItemCount();
        hideItemForm();

    } catch (error) {
        console.error('Error clearing all database:', error);
        showToast('Error clearing database: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

async function cleanupDuplicates() {
    if (!confirm('This will merge duplicate items in the database. Items with the same name and category will be combined. Continue?')) {
        return;
    }

    try {
        showLoading(true);

        if (!window.dbAPI) {
            throw new Error('Database API not available');
        }

        const result = await window.dbAPI.cleanupDuplicates();

        showToast(result.message, 'success');

        if (currentEditCategory) {
            await loadCategoryItems(currentEditCategory);
        }

    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
        showToast('Error cleaning up duplicates: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Quick setup for X-ray items
async function setupQuickItems() {
    showToast('Quick setup disabled - please add items manually', 'info');
    // Quick setup functionality has been disabled
    // All items must be added manually by the user
}

// Make functions globally available
window.addNewCategory = addNewCategory;
window.saveCategoryModal = saveCategoryModal;
window.renameCategory = renameCategory;
window.addSubcategory = addSubcategory;
window.addSubcategoryDirect = addSubcategoryDirect;
window.deleteCategory = deleteCategory;
window.deleteSubcategory = deleteSubcategory;
window.editCategory = function(categoryName) { showToast('Category editing modal coming soon', 'info'); };
window.editSubcategory = function(cat, sub) { showToast('Subcategory editing modal coming soon', 'info'); };
window.toggleCategoryExpansion = toggleCategoryExpansion;
window.loadItemsForCategory = loadItemsForCategory;
window.addItem = addItem;
window.resetForm = resetForm;
window.editItem = editItem;
window.updateItem = updateItem;
window.deleteItem = deleteItem;
window.clearCategory = clearCategory;
window.adjustCategoryPricing = adjustCategoryPricing;
window.copyPricingStructure = copyPricingStructure;
window.applyPricingTemplate = applyPricingTemplate;
window.exportDatabase = exportDatabase;
window.exportCategoryStructure = exportCategoryStructure;
window.triggerImportFile = triggerImportFile;
window.clearAllDatabase = clearAllDatabase;
window.cleanupDuplicates = cleanupDuplicates;
window.setupQuickItems = setupQuickItems;

// Room type field updates for bed/cabin charges
function updateRoomTypeFields() {
    const roomTypeSelect = document.getElementById('roomType');
    const generalPriceSection = document.getElementById('generalPriceSection');
    const privateOptionsSection = document.getElementById('privateOptionsSection');
    const privateTypeSelect = document.getElementsByName('privateType');
    const private1PriceInput = document.getElementById('private1Price');
    const private2PriceInput = document.getElementById('private2Price');
    const private3PriceInput = document.getElementById('private3Price');

    if (!roomTypeSelect) return;

    const selectedRoomType = roomTypeSelect.value;

    // Hide all sections first
    if (generalPriceSection) generalPriceSection.style.display = 'none';
    if (privateOptionsSection) privateOptionsSection.style.display = 'none';
	if(private1PriceInput) private1PriceInput.value = '';
	if(private2PriceInput) private2PriceInput.value = '';
	if(private3PriceInput) private3PriceInput.value = '';

	privateTypeSelect.forEach(radio => {
		radio.checked = false;
	});

    if (selectedRoomType === 'General Bed') {
        if (generalPriceSection) generalPriceSection.style.display = 'block';
    } else if (selectedRoomType === 'Private') {
        if (privateOptionsSection) privateOptionsSection.style.display = 'block';
    }
}

window.updateRoomTypeFields = updateRoomTypeFields;
window.selectItemCategory = selectItemCategory;

// Add missing function for bed/cabin charges setup
function clearAndSetupBedCabinCharges() {
    // This function was referenced but not defined
    // It should clear and setup bed/cabin charge categories
    console.log('Setting up bed/cabin charges...');

    // For now, just log - the user needs to manually add bed/cabin items
    showToast('Please manually add bed/cabin charge items using the category system', 'info');
}

window.clearAndSetupBedCabinCharges = clearAndSetupBedCabinCharges;
window.showO2ISOModal = showO2ISOModal;
window.saveO2ISOEntry = saveO2ISOEntry;

// O2, ISO Modal Functions
function showO2ISOModal() {
    // Pre-populate with default values
    const o2BaseHourInput = document.getElementById('o2BaseHour');
    const o2BaseRateInput = document.getElementById('o2BaseRate');
    const isoBaseHourInput = document.getElementById('isoBaseHour');
    const isoBaseRateInput = document.getElementById('isoBaseRate');

    if (o2BaseHourInput && !o2BaseHourInput.value) o2BaseHourInput.value = '1';
    if (o2BaseRateInput && !o2BaseRateInput.value) o2BaseRateInput.value = '130';    if (isoBaseHourInput && !isoBaseHourInput.value) isoBaseHourInput.value = '0.0167'; // 1 minute in hours
    if (isoBaseRateInput && !isoBaseRateInput.value) isoBaseRateInput.value = '30';

    const modal = new bootstrap.Modal(document.getElementById('o2ISOModal'));
    modal.show();
}

async function saveO2ISOEntry() {
    try {
        const o2BaseHour = parseFloat(document.getElementById('o2BaseHour')?.value) || 0;
        const o2BaseRate = parseFloat(document.getElementById('o2BaseRate')?.value) || 0;
        const isoBaseHour = parseFloat(document.getElementById('isoBaseHour')?.value) || 0;
        const isoBaseRate = parseFloat(document.getElementById('isoBaseRate')?.value) || 0;

        if (o2BaseHour <= 0 || o2BaseRate <= 0) {
            showToast('Please enter valid O2 base hour and rate', 'warning');
            return;
        }

        if (isoBaseHour <= 0 || isoBaseRate <= 0) {
            showToast('Please enter valid ISO base hour and rate', 'warning');
            return;
        }

        if (!window.dbAPI) {
            throw new Error('Database API not available');
        }

        // Create O2 item
        const o2Item = {
            category: 'O2, ISO',
            name: 'O2',
            type: 'Oxygen Service',
            price: o2BaseRate,
            description: `O2 service - Base: ${o2BaseHour} hour(s) at ৳${o2BaseRate}`,
            oxygenPricing: {
                unit: `${o2BaseHour}hour`,
                price: o2BaseRate,
                baseHour: o2BaseHour,
                baseRate: o2BaseRate
            }
        };

        // Create ISO item
        const isoItem = {
            category: 'O2, ISO',
            name: 'ISO',
            type: 'ISO Service',
            price: isoBaseRate,
            description: `ISO service - Base: ${isoBaseHour} hour(s) at ৳${isoBaseRate}`,
            isoPricing: {
                unit: `${isoBaseHour}hour`,
                price: isoBaseRate,
                baseHour: isoBaseHour,
                baseRate: isoBaseRate
            }
        };

        // Add both items to database
        await window.dbAPI.addItem(o2Item);
        await window.dbAPI.addItem(isoItem);

        showToast('O2 and ISO entries added successfully', 'success');

        // Clear form
        document.getElementById('o2BaseHour').value = '';
        document.getElementById('o2BaseRate').value = '';
        document.getElementById('isoBaseHour').value = '';
        document.getElementById('isoBaseRate').value = '';

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('o2ISOModal'));
        if (modal) modal.hide();

        // Refresh the current category if it's selected
        if (currentEditCategory === 'O2, ISO') {
            await loadCategoryItems(currentEditCategory);
        }

    } catch (error) {
        console.error('Error saving O2, ISO entry:', error);
        showToast('Error saving O2, ISO entry: ' + error.message, 'danger');
    }
}

// Fix template string syntax error in updateItemsDisplay
// Correct potential undefined variable usage in tableHTML generation
// Add items to the predefined categories for bed/cabin charges.