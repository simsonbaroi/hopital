
// Flask Database API - Client-side interface for Flask backend
class FlaskDatabaseAPI {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.initialized = false;
    }

    async init() {
        try {
            const response = await fetch(`${this.baseUrl}/api/status`);
            const data = await response.json();
            console.log('✅ Flask Database API initialized:', data.message);
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Flask Database API:', error);
            // Fallback to IndexedDB if Flask API is not available
            return this.initFallback();
        }
    }

    async initFallback() {
        console.log('🔄 Falling back to IndexedDB...');
        // Load the existing IndexedDB implementation
        if (typeof LocalDatabase !== 'undefined') {
            this.localDB = new LocalDatabase();
            await this.localDB.init();
            this.initialized = true;
            return true;
        }
        return false;
    }

    async getAllItems() {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/items`);
            const data = await response.json();
            
            if (data.success) {
                return data.items;
            } else {
                throw new Error(data.error || 'Failed to fetch items');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB) {
                return await this.localDB.getAllItems();
            }
            throw error;
        }
    }

    async getItemsByCategory(category) {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/items/category/${encodeURIComponent(category)}`);
            const data = await response.json();
            
            if (data.success) {
                return data.items;
            } else {
                throw new Error(data.error || 'Failed to fetch items by category');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB) {
                return await this.localDB.getItemsByCategory(category);
            }
            throw error;
        }
    }

    async addItem(item) {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(item)
            });
            
            const data = await response.json();
            
            if (data.success) {
                return { id: data.item_id, ...item };
            } else {
                throw new Error(data.error || 'Failed to add item');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB) {
                return await this.localDB.addItem(item);
            }
            throw error;
        }
    }

    async updateItem(item) {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/items/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(item)
            });
            
            const data = await response.json();
            
            if (data.success) {
                return item;
            } else {
                throw new Error(data.error || 'Failed to update item');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB) {
                return await this.localDB.updateItem(item);
            }
            throw error;
        }
    }

    async deleteItem(itemId) {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/items/${itemId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                return true;
            } else {
                throw new Error(data.error || 'Failed to delete item');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB) {
                return await this.localDB.deleteItem(itemId);
            }
            throw error;
        }
    }

    async saveBill(bill) {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/bills`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bill)
            });
            
            const data = await response.json();
            
            if (data.success) {
                return bill;
            } else {
                throw new Error(data.error || 'Failed to save bill');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB) {
                return await this.localDB.saveBill(bill);
            }
            throw error;
        }
    }

    async getBills(limit = 50) {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/bills?limit=${limit}`);
            const data = await response.json();
            
            if (data.success) {
                return data.bills;
            } else {
                throw new Error(data.error || 'Failed to fetch bills');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB) {
                return await this.localDB.getBills(limit);
            }
            throw error;
        }
    }

    async getStatistics() {
        if (!this.initialized) await this.init();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/statistics`);
            const data = await response.json();
            
            if (data.success) {
                return data.statistics;
            } else {
                throw new Error(data.error || 'Failed to fetch statistics');
            }
        } catch (error) {
            console.warn('Flask API failed, trying fallback:', error);
            if (this.localDB && this.localDB.getStatistics) {
                return await this.localDB.getStatistics();
            }
            return {
                total_items: 0,
                items_by_category: {},
                total_bills: 0,
                total_revenue: 0
            };
        }
    }

    // Legacy compatibility methods
    async getSystemItems() {
        return this.getAllItems();
    }

    async getUserItems() {
        return []; // Flask system doesn't distinguish between system and user items
    }

    async clearCategory(category) {
        const items = await this.getItemsByCategory(category);
        const deletePromises = items.map(item => this.deleteItem(item.id));
        await Promise.all(deletePromises);
        return true;
    }

    async resetDatabase() {
        // This would require a special endpoint on the Flask side
        try {
            const response = await fetch(`${this.baseUrl}/api/reset`, {
                method: 'POST'
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.warn('Reset not available via Flask API');
            if (this.localDB && this.localDB.resetDatabase) {
                return await this.localDB.resetDatabase();
            }
            throw new Error('Reset database not supported');
        }
    }
}

// Initialize the Flask Database API
window.flaskDbAPI = new FlaskDatabaseAPI();

// For backward compatibility, create dbAPI reference
window.dbAPI = window.flaskDbAPI;

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.flaskDbAPI.init();
        console.log('🏥 Flask Database API ready');
    } catch (error) {
        console.error('❌ Failed to initialize Flask Database API:', error);
    }
});
