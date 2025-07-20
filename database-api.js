// Database API module for Hospital Billing System
// Uses LocalDatabase (IndexedDB) only

(function() {
    if (window.DatabaseAPI) {
        console.log('DatabaseAPI already exists, skipping redeclaration');
        return;
    }

    function DatabaseAPI() {
        this.localDB = null;
        this.initialized = false;
    }

    DatabaseAPI.prototype.init = async function() {
        if (!this.initialized) {
            try {
                console.log('DatabaseAPI: Initializing with LocalDatabase (IndexedDB)');

                if (!window.LocalDatabase) {
                    throw new Error('LocalDatabase not available');
                }

                this.localDB = window.localDB || new LocalDatabase();
                await this.localDB.init();

                this.initialized = true;
                console.log('DatabaseAPI: Successfully initialized with LocalDatabase');
            } catch (error) {
                console.error('DatabaseAPI: Initialization failed:', error);
                throw new Error(`Database initialization failed: ${error.message}`);
            }
        }
        return true;
    };

    DatabaseAPI.prototype.getAllItems = async function(category) {
        await this.init();
        try {
            const items = await this.localDB.getAllItems(category);
            return items || [];
        } catch (error) {
            console.error('Error fetching all items:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.getItemsByCategory = async function(category) {
        try {
            console.log(`DatabaseAPI: Requesting items for category: ${category}`);
            await this.init();

            const items = await this.localDB.getItemsByCategory(category);
            console.log(`DatabaseAPI: Received ${items.length} items for ${category}`);
            return items;
        } catch (error) {
            console.error(`DatabaseAPI: Error fetching items for category ${category}:`, error);
            throw error;
        }
    };

    DatabaseAPI.prototype.getItemById = async function(id) {
        await this.init();
        try {
            const item = await this.localDB.getItemById(id);
            return item;
        } catch (error) {
            console.error('Error fetching item by ID:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.addItem = async function(item) {
        try {
            console.log('DatabaseAPI: Adding item:', item);
            await this.init();

            const result = await this.localDB.addItem(item);
            return result;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.updateItem = async function(item) {
        try {
            console.log('DatabaseAPI: Updating item:', item);
            await this.init();

            const result = await this.localDB.updateItem(item);
            return result;
        } catch (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.deleteItem = async function(id) {
        await this.init();
        try {
            const result = await this.localDB.deleteItem(id);
            return result;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.clearCategory = async function(category) {
        try {
            console.log('DatabaseAPI: Clearing category:', category);
            await this.init();

            const result = await this.localDB.clearCategory(category);
            console.log(`DatabaseAPI: Cleared category ${category}`);
            return result;
        } catch (error) {
            console.error('DatabaseAPI: Error clearing category:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.clearAllData = async function() {
        try {
            console.log('DatabaseAPI: Clearing all database data');
            await this.init();

            const result = await this.localDB.clearAllData();
            console.log('DatabaseAPI: Cleared all data');
            return result;
        } catch (error) {
            console.error('DatabaseAPI: Error clearing all data:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.exportDatabase = async function() {
        await this.init();
        return this.localDB.exportDatabase();
    };

    DatabaseAPI.prototype.importData = async function(items) {
        await this.init();
        return this.localDB.importData(items);
    };

    DatabaseAPI.prototype.testConnection = async function() {
        try {
            await this.init();
            return this.localDB.testConnection();
        } catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    };

    // Bill management methods
    DatabaseAPI.prototype.saveBill = async function(bill) {
        await this.init();
        try {
            const result = await this.localDB.saveBill(bill);
            return result;
        } catch (error) {
            console.error('Error saving bill:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.getBills = async function() {
        await this.init();
        try {
            const bills = await this.localDB.getBills();
            return bills || [];
        } catch (error) {
            console.error('Error fetching bills:', error);
            throw error;
        }
    };

    // Smart duplicate management methods
    DatabaseAPI.prototype.checkForDuplicateItem = async function(item) {
        await this.init();
        try {
            const result = await this.localDB.checkForDuplicateItem(item);
            return result;
        } catch (error) {
            console.error('Error checking for duplicate:', error);
            return { isDuplicate: false, exactMatches: [], similarMatches: [], fuzzyMatches: [], hasSimilar: false, hasFuzzy: false };
        }
    };

    DatabaseAPI.prototype.addItemWithDuplicateHandling = async function(item, allowDuplicates = false) {
        await this.init();
        try {
            const result = await this.localDB.addItemWithDuplicateHandling(item, allowDuplicates);
            return result;
        } catch (error) {
            console.error('Error adding item with duplicate handling:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.checkDuplicates = async function(items) {
        await this.init();
        try {
            const result = await this.localDB.checkDuplicates(items);
            return result;
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return { duplicates: [] };
        }
    };

    DatabaseAPI.prototype.bulkImport = async function(items, resolutions) {
        await this.init();
        try {
            const result = await this.localDB.bulkImport(items, resolutions);
            return result;
        } catch (error) {
            console.error('Error bulk importing:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.resetDatabase = async function() {
        await this.init();
        return this.localDB.resetDatabase();
    };

    DatabaseAPI.prototype.cleanupDuplicates = async function() {
        await this.init();
        try {
            const result = await this.localDB.cleanupDuplicates();
            return result;
        } catch (error) {
            console.error('Error cleaning up duplicates:', error);
            return { duplicatesRemoved: 0, itemsMerged: 0, message: 'Error cleaning duplicates: ' + error.message };
        }
    };

    DatabaseAPI.prototype.mergeItems = async function(existingItem, newItem) {
        await this.init();
        try {
            const result = await this.localDB.mergeItems(existingItem, newItem);
            return result;
        } catch (error) {
            console.error('Error merging items:', error);
            throw error;
        }
    };

    // System Database Methods
    DatabaseAPI.prototype.getSystemItems = async function() {
        await this.init();
        try {
            const result = await this.localDB.getSystemItems();
            return result || [];
        } catch (error) {
            console.error('Error fetching system items:', error);
            return [];
        }
    };

    DatabaseAPI.prototype.getUserItems = async function() {
        await this.init();
        try {
            const result = await this.localDB.getUserItems();
            return result || [];
        } catch (error) {
            console.error('Error fetching user items:', error);
            return [];
        }
    };

    DatabaseAPI.prototype.updateSystemItem = async function(item) {
        await this.init();
        try {
            const result = await this.localDB.updateSystemItem(item);
            return result;
        } catch (error) {
            console.error('Error updating system item:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.importAsSystemData = async function(items, replaceExisting = false) {
        await this.init();
        try {
            const result = await this.localDB.importAsSystemData(items, replaceExisting);
            return result;
        } catch (error) {
            console.error('Error importing as system data:', error);
            throw error;
        }
    };

    DatabaseAPI.prototype.reinitializeSystemDatabase = async function() {
        await this.init();
        try {
            // System database reinitialization disabled
            return { success: false, message: 'System database auto-initialization is disabled. Please import data manually if needed.' };
        } catch (error) {
            console.error('Error reinitializing system database:', error);
            throw error;
        }
    };

    window.DatabaseAPI = DatabaseAPI;

    if (!window.dbAPI) {
        window.dbAPI = new DatabaseAPI();
    }
})();