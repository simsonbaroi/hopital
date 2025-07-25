
/**
 * Professional Flask Database API Client
 * Hospital Billing System - MySQL Edition
 */

class FlaskDatabaseAPI {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Make HTTP request with error handling
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Initialize the API connection
     */
    async init() {
        try {
            const response = await this.makeRequest('/api/status');
            console.log('✅ Professional Flask-SQLite API initialized:', response.message);
            console.log('📊 Database:', response.database || 'SQLite');
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Flask API:', error);
            return this.initFallback();
        }
    }

    /**
     * Fallback to IndexedDB if Flask API is not available
     */
    async initFallback() {
        console.log('🔄 Falling back to IndexedDB...');
        if (typeof LocalDatabase !== 'undefined') {
            this.localDB = new LocalDatabase();
            await this.localDB.init();
            this.initialized = true;
            console.log('✅ Fallback to IndexedDB successful');
            return true;
        }
        console.error('❌ No fallback database available');
        return false;
    }

    /**
     * Get all items
     */
    async getAllItems() {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        if (this.localDB) {
            return await this.localDB.getAllItems();
        }

        try {
            const response = await this.makeRequest('/api/items');
            return response.items || [];
        } catch (error) {
            console.error('Error getting all items:', error);
            throw error;
        }
    }

    /**
     * Get items by category
     */
    async getItemsByCategory(category) {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        if (this.localDB) {
            return await this.localDB.getItemsByCategory(category);
        }

        try {
            const response = await this.makeRequest(`/api/items/category/${encodeURIComponent(category)}`);
            return response.items || [];
        } catch (error) {
            console.error(`Error getting items for category ${category}:`, error);
            throw error;
        }
    }

    /**
     * Add new item
     */
    async addItem(itemData) {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        if (this.localDB) {
            return await this.localDB.addItem(itemData);
        }

        try {
            const response = await this.makeRequest('/api/items', {
                method: 'POST',
                body: JSON.stringify(itemData)
            });
            return response.item_id;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }

    /**
     * Update existing item
     */
    async updateItem(itemId, itemData) {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        if (this.localDB) {
            return await this.localDB.updateItem(itemId, itemData);
        }

        try {
            const response = await this.makeRequest(`/api/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(itemData)
            });
            return response.success;
        } catch (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    }

    /**
     * Delete item
     */
    async deleteItem(itemId) {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        if (this.localDB) {
            return await this.localDB.deleteItem(itemId);
        }

        try {
            const response = await this.makeRequest(`/api/items/${itemId}`, {
                method: 'DELETE'
            });
            return response.success;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }

    /**
     * Save bill
     */
    async saveBill(billData) {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        if (this.localDB) {
            return await this.localDB.saveBill(billData);
        }

        try {
            const response = await this.makeRequest('/api/bills', {
                method: 'POST',
                body: JSON.stringify(billData)
            });
            return response.bill_id;
        } catch (error) {
            console.error('Error saving bill:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    async getStatistics() {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        if (this.localDB) {
            return await this.localDB.getStatistics();
        }

        try {
            const response = await this.makeRequest('/api/statistics');
            return response.statistics || {};
        } catch (error) {
            console.error('Error getting statistics:', error);
            throw error;
        }
    }

    /**
     * Get database info
     */
    async getDatabaseInfo() {
        if (!this.initialized) {
            throw new Error('API not initialized');
        }

        try {
            const response = await this.makeRequest('/api/database/info');
            return response.database_info || {};
        } catch (error) {
            console.error('Error getting database info:', error);
            return { connected: false, database_type: 'Unknown' };
        }
    }n false;
    }

    /**
     * Make HTTP request with error handling and retries
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const requestOptions = { ...defaultOptions, ...options };

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
                }

                const data = await response.json();
                this.retryCount = 0; // Reset retry count on success
                return data;

            } catch (error) {
                if (attempt === this.maxRetries) {
                    console.error(`❌ Request failed after ${this.maxRetries + 1} attempts:`, error);
                    throw error;
                }
                console.warn(`⚠️ Request attempt ${attempt + 1} failed, retrying...`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
            }
        }
    }

    /**
     * Get all items from database
     */
    async getAllItems() {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            const response = await this.makeRequest('/api/items');
            return response.items || [];
        } catch (error) {
            console.error('Error getting all items:', error);
            if (this.localDB) {
                return await this.localDB.getAllItems();
            }
            throw error;
        }
    }

    /**
     * Get items by category
     */
    async getItemsByCategory(category) {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            const response = await this.makeRequest(`/api/items/category/${encodeURIComponent(category)}`);
            return response.items || [];
        } catch (error) {
            console.error(`Error getting items for category ${category}:`, error);
            if (this.localDB) {
                return await this.localDB.getItemsByCategory(category);
            }
            throw error;
        }
    }

    /**
     * Add new item
     */
    async addItem(item) {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            // Validate required fields
            if (!item.category || !item.name || item.price === undefined) {
                throw new Error('Missing required fields: category, name, and price');
            }

            const response = await this.makeRequest('/api/items', {
                method: 'POST',
                body: JSON.stringify(item)
            });

            console.log('✅ Item added successfully:', response.message);
            return response.item_id;
        } catch (error) {
            console.error('Error adding item:', error);
            if (this.localDB) {
                return await this.localDB.addItem(item);
            }
            throw error;
        }
    }

    /**
     * Update existing item
     */
    async updateItem(itemId, item) {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            const response = await this.makeRequest(`/api/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(item)
            });

            console.log('✅ Item updated successfully:', response.message);
            return true;
        } catch (error) {
            console.error(`Error updating item ${itemId}:`, error);
            if (this.localDB) {
                return await this.localDB.updateItem(itemId, item);
            }
            throw error;
        }
    }

    /**
     * Delete item
     */
    async deleteItem(itemId) {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            const response = await this.makeRequest(`/api/items/${itemId}`, {
                method: 'DELETE'
            });

            console.log('✅ Item deleted successfully:', response.message);
            return true;
        } catch (error) {
            console.error(`Error deleting item ${itemId}:`, error);
            if (this.localDB) {
                return await this.localDB.deleteItem(itemId);
            }
            throw error;
        }
    }

    /**
     * Save bill
     */
    async saveBill(billData) {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            // Validate required fields
            if (!billData.bill_number || !billData.total_amount || !billData.items) {
                throw new Error('Missing required fields: bill_number, total_amount, and items');
            }

            const response = await this.makeRequest('/api/bills', {
                method: 'POST',
                body: JSON.stringify(billData)
            });

            console.log('✅ Bill saved successfully:', response.message);
            return response.bill_id;
        } catch (error) {
            console.error('Error saving bill:', error);
            if (this.localDB) {
                return await this.localDB.saveBill(billData);
            }
            throw error;
        }
    }

    /**
     * Get recent bills
     */
    async getBills(limit = 50) {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            const response = await this.makeRequest(`/api/bills?limit=${limit}`);
            return response.bills || [];
        } catch (error) {
            console.error('Error getting bills:', error);
            if (this.localDB) {
                return await this.localDB.getBills(limit);
            }
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    async getStatistics() {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            const response = await this.makeRequest('/api/statistics');
            return response.statistics || {};
        } catch (error) {
            console.error('Error getting statistics:', error);
            if (this.localDB) {
                return await this.localDB.getStatistics();
            }
            throw error;
        }
    }

    /**
     * Get database connection information
     */
    async getDatabaseInfo() {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            const response = await this.makeRequest('/api/database/info');
            return response.database_info || {};
        } catch (error) {
            console.error('Error getting database info:', error);
            return { connected: false, error: error.message };
        }
    }

    /**
     * Reset database (DANGEROUS - development only)
     */
    async resetDatabase() {
        try {
            if (!this.initialized) {
                throw new Error('API not initialized');
            }

            console.warn('⚠️ Reset database not available via API for security reasons');
            if (this.localDB && this.localDB.resetDatabase) {
                return await this.localDB.resetDatabase();
            }
            throw new Error('Reset database not supported');
        } catch (error) {
            console.error('Error resetting database:', error);
            throw error;
        }
    }

    /**
     * Check API health
     */
    async healthCheck() {
        try {
            const response = await this.makeRequest('/health');
            return response;
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }
}

// Initialize the professional Flask Database API
window.flaskDbAPI = new FlaskDatabaseAPI();

// For backward compatibility, create dbAPI reference
window.dbAPI = window.flaskDbAPI;

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const success = await window.flaskDbAPI.init();
        if (success) {
            console.log('🏥 Professional Flask-MySQL Database API ready');
            
            // Display connection info
            try {
                const dbInfo = await window.flaskDbAPI.getDatabaseInfo();
                console.log('📊 Database Status:', dbInfo.connected ? 'Connected' : 'Disconnected');
                if (dbInfo.connected) {
                    console.log(`🔗 ${dbInfo.database} on ${dbInfo.host}:${dbInfo.port}`);
                }
            } catch (e) {
                console.log('ℹ️ Database info not available');
            }
        } else {
            console.warn('⚠️ Flask API initialization failed, using fallback');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Flask Database API:', error);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlaskDatabaseAPI;
}
