// Local IndexedDB Database for Hospital Billing System
// Replaces server-side SQLite with client-side storage

(function() {
    if (window.LocalDatabase) {
        console.log('LocalDatabase already exists, skipping redeclaration');
        return;
    }

    function LocalDatabase(dbName = 'HospitalBillingDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    LocalDatabase.prototype.init = async function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create items store
                if (!db.objectStoreNames.contains('items')) {
                    const itemsStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
                    itemsStore.createIndex('category', 'category', { unique: false });
                    itemsStore.createIndex('name', 'name', { unique: false });
                }

                // Create bills store
                if (!db.objectStoreNames.contains('bills')) {
                    const billsStore = db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
                    billsStore.createIndex('billNumber', 'billNumber', { unique: true });
                    billsStore.createIndex('patientName', 'patientName', { unique: false });
                    billsStore.createIndex('date', 'date', { unique: false });
                }

                // Create patients store
                if (!db.objectStoreNames.contains('patients')) {
                    const patientsStore = db.createObjectStore('patients', { keyPath: 'id', autoIncrement: true });
                    patientsStore.createIndex('name', 'name', { unique: false });
                }
            };
        });
    };

    LocalDatabase.prototype.getAllItems = async function(category) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');

            let request;
            if (category) {
                const index = store.index('category');
                request = index.getAll(category);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                const items = request.result || [];
                // Parse X-ray pricing data if it's stored as JSON string
                const processedItems = items.map(item => {
                    if (item.xrayPricing && typeof item.xrayPricing === 'string') {
                        try {
                            item.xrayPricing = JSON.parse(item.xrayPricing);
                        } catch (e) {
                            console.warn('Failed to parse X-ray pricing for item:', item.name, e);
                            item.xrayPricing = null;
                        }
                    }
                    return item;
                });
                resolve(processedItems);
            };

            request.onerror = () => {
                reject(new Error('Failed to get items'));
            };
        });
    };

    LocalDatabase.prototype.getItemsByCategory = async function(category) {
        try {
            console.log(`LocalDatabase: Requesting items for category: ${category}`);
            const result = await this.getAllItems(category);
            console.log(`LocalDatabase: Received result for ${category}:`, result);

            if (!Array.isArray(result)) {
                console.warn(`LocalDatabase: Non-array result for category ${category}:`, result);
                return [];
            }

            return result;
        } catch (error) {
            console.error(`LocalDatabase: Error fetching items for category ${category}:`, error);
            throw error;
        }
    };

    LocalDatabase.prototype.getItemById = async function(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error('Failed to get item'));
            };
        });
    };

    LocalDatabase.prototype.addItem = async function(item) {
        if (!this.db) await this.init();

        // For system data, allow duplicates to be merged
        if (!item.isSystemData) {
            const duplicateCheck = await this.checkForDuplicateItem(item);
            if (duplicateCheck.isDuplicate) {
                throw new Error(`Duplicate item found: "${item.name}" already exists in category "${item.category}"`);
            }
        }

        // Prepare item for storage - ensure X-ray pricing is properly formatted
        const itemToStore = { ...item };
        if (itemToStore.xrayPricing && typeof itemToStore.xrayPricing === 'string') {
            try {
                itemToStore.xrayPricing = JSON.parse(itemToStore.xrayPricing);
            } catch (e) {
                console.warn('Invalid X-ray pricing JSON, setting to null:', itemToStore.xrayPricing);
                itemToStore.xrayPricing = null;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.add(itemToStore);

            request.onsuccess = () => {
                resolve({ id: request.result, success: true });
            };

            request.onerror = () => {
                reject(new Error('Failed to add item'));
            };
        });
    };

    LocalDatabase.prototype.getSystemItems = async function() {
        const allItems = await this.getAllItems();
        return allItems.filter(item => item.isSystemData === true);
    };

    LocalDatabase.prototype.getUserItems = async function() {
        const allItems = await this.getAllItems();
        return allItems.filter(item => !item.isSystemData);
    };

    LocalDatabase.prototype.updateSystemItem = async function(item) {
        if (!this.db) await this.init();

        const updatedItem = {
            ...item,
            isSystemData: true,
            lastUpdated: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.put(updatedItem);

            request.onsuccess = () => {
                resolve({ success: true, message: 'System item updated successfully' });
            };

            request.onerror = () => {
                reject(new Error('Failed to update system item'));
            };
        });
    };

    LocalDatabase.prototype.importAsSystemData = async function(items, replaceExisting = false) {
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };

        for (const item of items) {
            try {
                const systemItem = {
                    ...item,
                    isSystemData: true,
                    systemVersion: '1.0',
                    lastUpdated: new Date().toISOString()
                };

                if (replaceExisting) {
                    // Check if item already exists
                    const existing = await this.findItemByNameAndCategory(item.name, item.category);
                    if (existing) {
                        systemItem.id = existing.id;
                        await this.updateItem(systemItem);
                        results.updated++;
                    } else {
                        await this.addItem(systemItem);
                        results.imported++;
                    }
                } else {
                    await this.addItem(systemItem);
                    results.imported++;
                }
            } catch (error) {
                results.errors.push(`Failed to import ${item.name}: ${error.message}`);
                results.skipped++;
            }
        }

        return results;
    };

    LocalDatabase.prototype.findItemByNameAndCategory = async function(name, category) {
        const allItems = await this.getAllItems();
        return allItems.find(item => 
            item.name.toLowerCase().trim() === name.toLowerCase().trim() &&
            item.category.toLowerCase().trim() === category.toLowerCase().trim()
        );
    };

    LocalDatabase.prototype.updateItem = async function(item) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.put(item);

            request.onsuccess = () => {
                resolve({ success: true });
            };

            request.onerror = () => {
                reject(new Error('Failed to update item'));
            };
        });
    };

    LocalDatabase.prototype.deleteItem = async function(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve({ success: true });
            };

            request.onerror = () => {
                reject(new Error('Failed to delete item'));
            };
        });
    };

    LocalDatabase.prototype.clearCategory = async function(category) {
        try {
            console.log('LocalDatabase: Clearing category:', category);

            // Get all items for the category
            const items = await this.getItemsByCategory(category);

            // Delete each item
            for (const item of items) {
                await this.deleteItem(item.id);
            }

            console.log(`LocalDatabase: Cleared ${items.length} items from ${category}`);
            return true;
        } catch (error) {
            console.error('LocalDatabase: Error clearing category:', error);
            throw error;
        }
    }

    LocalDatabase.prototype.clearAllData = async function() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.clear();

            request.onsuccess = () => {
                console.log('LocalDatabase: All data cleared successfully');
                resolve(true);
            };

            request.onerror = () => {
                console.error('LocalDatabase: Error clearing all data');
                reject(new Error('Failed to clear all data'));
            };
        });
    };

    LocalDatabase.prototype.exportDatabase = async function() {
        return this.getAllItems();
    };

    LocalDatabase.prototype.checkForDuplicateItem = async function(item) {
        const allItems = await this.getAllItems();

        // Check for exact duplicates (same name and category)
        const exactMatches = allItems.filter(existing => 
            existing.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
            existing.category.toLowerCase().trim() === item.category.toLowerCase().trim()
        );

        // Check for similar duplicates (same name, different category)
        const similarMatches = allItems.filter(existing => 
            existing.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
            existing.category.toLowerCase().trim() !== item.category.toLowerCase().trim()
        );

        return {
            isDuplicate: exactMatches.length > 0,
            exactMatches: exactMatches,
            similarMatches: similarMatches,
            hasSimilar: similarMatches.length > 0
        };
    };

    LocalDatabase.prototype.checkDuplicates = async function(items) {
        const allItems = await this.getAllItems();
        const duplicates = [];

        items.forEach((newItem, index) => {
            const exactMatches = allItems.filter(existing => 
                existing.name.toLowerCase().trim() === newItem.name.toLowerCase().trim() &&
                existing.category.toLowerCase().trim() === newItem.category.toLowerCase().trim()
            );

            const similarMatches = allItems.filter(existing => 
                existing.name.toLowerCase().trim() === newItem.name.toLowerCase().trim() &&
                existing.category.toLowerCase().trim() !== newItem.category.toLowerCase().trim()
            );

            if (exactMatches.length > 0 || similarMatches.length > 0) {
                duplicates.push({
                    new_item: newItem,
                    exact_matches: exactMatches,
                    similar_matches: similarMatches,
                    index: index
                });
            }
        });

        return { duplicates };
    };

    LocalDatabase.prototype.addItemWithDuplicateHandling = async function(item, allowDuplicates = false) {
        if (!this.db) await this.init();

        if (!allowDuplicates) {
            const duplicateCheck = await this.checkForDuplicateItem(item);
            if (duplicateCheck.isDuplicate) {
                // Auto-merge with existing item instead of rejecting
                const existingItem = duplicateCheck.exactMatches[0];
                const mergedItem = await this.mergeItems(existingItem, item);

                return {
                    success: true,
                    merged: true,
                    id: existingItem.id,
                    message: `Item "${item.name}" merged with existing entry`,
                    mergedItem: mergedItem
                };
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.add(item);

            request.onsuccess = () => {
                resolve({ 
                    success: true, 
                    id: request.result,
                    message: `Item "${item.name}" added successfully`
                });
            };

            request.onerror = () => {
                reject(new Error('Failed to add item'));
            };
        });
    };

    LocalDatabase.prototype.mergeItems = async function(existingItem, newItem) {
        // Merge logic: prefer non-empty values from new item, keep existing if new is empty
        const mergedItem = {
            ...existingItem,
            // Update fields only if new item has better data
            type: newItem.type && newItem.type.trim() ? newItem.type : existingItem.type,
            quantity: newItem.quantity && newItem.quantity.trim() ? newItem.quantity : existingItem.quantity,
            strength: newItem.strength && newItem.strength.trim() ? newItem.strength : existingItem.strength,
            // For price, use the higher value if both exist, or the non-zero value
            price: this.chooseBetterPrice(existingItem.price, newItem.price),
            // For X-ray pricing, merge the pricing objects
            xrayPricing: this.mergeXrayPricing(existingItem.xrayPricing, newItem.xrayPricing)
        };

        // Update the item in database
        await this.updateItem(mergedItem);
        return mergedItem;
    };

    LocalDatabase.prototype.chooseBetterPrice = function(existingPrice, newPrice) {
        const existing = parseFloat(existingPrice) || 0;
        const incoming = parseFloat(newPrice) || 0;

        // If both prices exist, use the higher one (assume it's more current)
        if (existing > 0 && incoming > 0) {
            return Math.max(existing, incoming);
        }

        // Otherwise use whichever is non-zero
        return incoming > 0 ? incoming : existing;
    };

    LocalDatabase.prototype.mergeXrayPricing = function(existingPricing, newPricing) {
        if (!existingPricing && !newPricing) return null;
        if (!existingPricing) return newPricing;
        if (!newPricing) return existingPricing;

        // Merge X-ray pricing, preferring higher values
        return {
            ap: Math.max(existingPricing.ap || 0, newPricing.ap || 0),
            lat: Math.max(existingPricing.lat || 0, newPricing.lat || 0),
            oblique: Math.max(existingPricing.oblique || 0, newPricing.oblique || 0),
            both: Math.max(existingPricing.both || 0, newPricing.both || 0)
        };
    };

    LocalDatabase.prototype.cleanupDuplicates = async function() {
        const allItems = await this.getAllItems();
        const duplicatesMap = new Map();
        const itemsToDelete = [];

        // Group items by name and category
        allItems.forEach(item => {
            const key = `${item.name.toLowerCase().trim()}-${item.category.toLowerCase().trim()}`;
            if (!duplicatesMap.has(key)) {
                duplicatesMap.set(key, []);
            }
            duplicatesMap.get(key).push(item);
        });

        let mergedCount = 0;

        // Process groups with duplicates
        for (const [key, items] of duplicatesMap) {
            if (items.length > 1) {
                // Sort by ID to keep the oldest one as base
                items.sort((a, b) => a.id - b.id);
                const baseItem = items[0];
                const duplicates = items.slice(1);

                // Merge all duplicates into the base item
                let mergedItem = baseItem;
                for (const duplicate of duplicates) {
                    mergedItem = await this.mergeItemsInMemory(mergedItem, duplicate);
                    itemsToDelete.push(duplicate.id);
                }

                // Update the base item with merged data
                await this.updateItem(mergedItem);
                mergedCount += duplicates.length;
            }
        }

        // Delete the duplicate items
        for (const itemId of itemsToDelete) {
            await this.deleteItem(itemId);
        }

        return {
            duplicatesRemoved: itemsToDelete.length,
            itemsMerged: mergedCount,
            message: `Removed ${itemsToDelete.length} duplicate entries and merged ${mergedCount} items`
        };
    };

    LocalDatabase.prototype.mergeItemsInMemory = function(baseItem, duplicateItem) {
        return {
            ...baseItem,
            type: duplicateItem.type && duplicateItem.type.trim() ? duplicateItem.type : baseItem.type,
            quantity: duplicateItem.quantity && duplicateItem.quantity.trim() ? duplicateItem.quantity : baseItem.quantity,
            strength: duplicateItem.strength && duplicateItem.strength.trim() ? duplicateItem.strength : baseItem.strength,
            price: this.chooseBetterPrice(baseItem.price, duplicateItem.price),
            xrayPricing: this.mergeXrayPricing(baseItem.xrayPricing, duplicateItem.xrayPricing)
        };
    };

    LocalDatabase.prototype.bulkImport = async function(items, resolutions) {
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };

        for (let i = 0; i < items.length; i++) {
            try {
                const item = items[i];
                const resolution = resolutions[i.toString()] || 'skip';

                if (resolution === 'skip') {
                    results.skipped++;
                    continue;
                } else if (resolution === 'import') {
                    await this.addItem(item);
                    results.imported++;
                } else if (resolution.startsWith('update_')) {
                    const existingId = parseInt(resolution.split('_')[1]);
                    item.id = existingId;
                    await this.updateItem(item);
                    results.updated++;
                } else if (resolution.startsWith('delete_')) {
                    const existingId = parseInt(resolution.split('_')[1]);
                    await this.deleteItem(existingId);
                    await this.addItem(item);
                    results.imported++;
                } else if (resolution.startsWith('merge_')) {
                    const existingId = parseInt(resolution.split('_')[1]);
                    const existing = await this.getItemById(existingId);
                    if (existing) {
                        const merged = {
                            ...existing,
                            category: item.category || existing.category,
                            name: item.name || existing.name,
                            type: item.type || existing.type,
                            quantity: item.quantity || existing.quantity,
                            strength: item.strength || existing.strength,
                            price: item.price > 0 ? item.price : existing.price
                        };
                        await this.updateItem(merged);
                        results.updated++;
                    }
                }
            } catch (error) {
                results.errors.push(`Item ${i}: ${error.message}`);
                results.skipped++;
            }
        }

        return results;
    };

    LocalDatabase.prototype.importData = async function(items) {
        const results = [];
        for (const item of items) {
            try {
                const result = await this.addItem(item);
                results.push(result);
            } catch (error) {
                console.warn('Failed to import item:', item, error);
            }
        }
        return results;
    };

    LocalDatabase.prototype.resetDatabase = async function() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.clear();

            request.onsuccess = () => {
                this.loadInitialData().then(() => {
                    resolve({ success: true, message: 'Database reset and reloaded' });
                }).catch(reject);
            };

            request.onerror = () => {
                reject(new Error('Failed to reset database'));
            };
        });
    };

    LocalDatabase.prototype.loadInitialData = async function() {
        try {
            // Check existing items without auto-loading system data
            const existingItems = await this.getAllItems();
            console.log(`Database ready - ${existingItems.length} items loaded`);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    LocalDatabase.prototype.initializeSystemDatabase = async function() {
        // System database initialization disabled - users can manually import if needed
        console.log('System database initialization disabled - database will remain empty until manually populated');
    };

    LocalDatabase.prototype.addDefaultCategoryData = async function() {
        // System data is now loaded automatically via loadInitialData
        console.log('System database initialization complete');
    };

    LocalDatabase.prototype.testConnection = async function() {
        try {
            if (!this.db) await this.init();
            return true;
        } catch (error) {
            console.error('Local database connection test failed:', error);
            return false;
        }
    };

    // Bill management methods
    LocalDatabase.prototype.saveBill = async function(bill) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bills'], 'readwrite');
            const store = transaction.objectStore('bills');
            const request = store.add({
                ...bill,
                date: new Date().toISOString(),
                timestamp: Date.now()
            });

            request.onsuccess = () => {
                resolve({ id: request.result, success: true });
            };

            request.onerror = () => {
                reject(new Error('Failed to save bill'));
            };
        });
    };

    LocalDatabase.prototype.getBills = async function() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bills'], 'readonly');
            const store = transaction.objectStore('bills');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(new Error('Failed to get bills'));
            };
        });
    };

    // Add item to database
    LocalDatabase.prototype.addItem = async function(itemData) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.add(itemData);

            request.onsuccess = () => {
                resolve({ id: request.result, success: true });
            };

            request.onerror = () => {
                reject(new Error('Failed to add item'));
            };
        });
    };

    // Update item in database
    LocalDatabase.prototype.updateItem = async function(itemData) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.put(itemData);

            request.onsuccess = () => {
                resolve({ success: true });
            };

            request.onerror = () => {
                reject(new Error('Failed to update item'));
            };
        });
    };

    // Delete item from database
    LocalDatabase.prototype.deleteItem = async function(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve({ success: true });
            };

            request.onerror = () => {
                reject(new Error('Failed to delete item'));
            };
        });
    };

    window.LocalDatabase = LocalDatabase;

    // Initialize the local database
    if (!window.localDB) {
        window.localDB = new LocalDatabase();
        window.localDB.init().then(async () => {
            console.log('Local database initialized successfully');
            
            // Load existing data without auto-initialization
            await window.localDB.loadInitialData();
            
            const existingItems = await window.localDB.getAllItems();
            const systemItems = await window.localDB.getSystemItems();
            const userItems = await window.localDB.getUserItems();
            
            console.log(`Database contains ${existingItems.length} total items`);
            console.log(`System items: ${systemItems.length}, User items: ${userItems.length}`);
            
            if (existingItems.length === 0) {
                console.log('Database is empty and ready for your data');
            } else {
                console.log('✅ System database operational with persistent data');
            }
        }).catch(error => {
            console.error('Failed to initialize local database:', error);
            // Try to reinitialize after a delay
            setTimeout(() => {
                console.log('Retrying database initialization...');
                window.localDB = new LocalDatabase();
                window.localDB.init().catch(retryError => {
                    console.error('Database initialization retry failed:', retryError);
                });
            }, 1000);
        });
    }
})();