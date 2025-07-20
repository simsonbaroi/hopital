// Inpatient Billing Application - Complete implementation
// This file handles inpatient-specific billing logic with room charges and admission calculations

// Global Variables for Inpatient System
let inpatientBillItems = [];
let inpatientNextItemId = 1;
let inpatientCurrentCategory = '';
let privateRooms = []; // Add missing privateRooms variable
let inpatientPatientInfo = {
    name: '',
    opdNumber: '',
    hospitalNumber: '',
    billNumber: '',
    admissionDate: '',
    dischargeDate: '',
    totalDays: 0
};

// Room charges configuration
const roomCharges = {
    general: { admission: 200, bed: 100, visitation: 50 },
    private: { admission: 500, bed: 300, visitation: 100 },
    // Default pricing - will be overridden by database values
    generalBed: 100,
    private1: 300,
    private2: 400,
    private3: 500
};

// Initialize Inpatient App
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inpatient app initializing...');

    // Wait for database to be available
    let retries = 0;
    const maxRetries = 10;

    function checkDatabaseAPI() {
        if (window.dbAPI) {
            initInpatientApp();
        } else if (retries < maxRetries) {
            retries++;
            setTimeout(checkDatabaseAPI, 500);
        } else {
            console.error('Database API not available for inpatient system');
            showInpatientToast('Database connection failed. Some features may not work.', 'warning');
            initInpatientAppWithoutDatabase();
        }
    }

    checkDatabaseAPI();
});

function initInpatientApp() {
    try {
        updateInpatientDisplay();
        updateInpatientPatientInfo();
        generateBillNumber();
        setCurrentDate();
        initializeDateDisplays();
        loadPrivateRooms(); // Load private rooms from database

        console.log('Inpatient system initialized successfully');
        showInpatientToast('Inpatient Billing System loaded successfully', 'success');
    } catch (error) {
        console.error('Error initializing inpatient app:', error);
        showInpatientToast('Error initializing inpatient system: ' + error.message, 'danger');
    }
}

function initializeDateDisplays() {
    // Set current date as default for discharge if empty
    const dischargeDateInput = document.getElementById('dischargeDate');
    const dischargeDateDisplay = document.getElementById('dischargeDateDisplay');

    if (dischargeDateInput && dischargeDateDisplay) {
        const today = new Date().toISOString().split('T')[0];
        dischargeDateInput.value = today;
        dischargeDateDisplay.value = formatDateToDisplay(today);
        dischargeDateDisplay.placeholder = 'DD-MM-YYYY or leave empty for today';
    }
}

function initInpatientAppWithoutDatabase() {
    updateInpatientDisplay();
    updateInpatientPatientInfo();
    generateBillNumber();
    setCurrentDate();
    showInpatientToast('Inpatient system loaded in offline mode', 'info');
}

// Generate unique bill number
function generateBillNumber() {
    const billNumber = 'IP-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
    const billNumberInput = document.getElementById('billNumber');
    if (billNumberInput) {
        billNumberInput.value = billNumber;
    }
    inpatientPatientInfo.billNumber = billNumber;
}

// Set current date
function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    const previewDate = document.getElementById('previewBillDate');
    if (previewDate) {
        previewDate.textContent = today;
    }
    // Also set any other date fields that might exist
    const billDateInput = document.getElementById('billDate');
    if (billDateInput) {
        billDateInput.value = today;
    }
}

// Update patient information display
function updateInpatientPatientInfo() {
    try {
        // Get values from form inputs with null checks
        const patientNameInput = document.getElementById('patientName');
        const opdNumberInput = document.getElementById('opdNumber');
        const hospitalNumberInput = document.getElementById('hospitalNumber');
        const billNumberInput = document.getElementById('billNumber');
        const admissionDateInput = document.getElementById('admissionDate');
        const dischargeDateInput = document.getElementById('dischargeDate');

        // Update global patient info only if elements exist
        if (patientNameInput) inpatientPatientInfo.name = patientNameInput.value || '';
        if (opdNumberInput) inpatientPatientInfo.opdNumber = opdNumberInput.value || '';
        if (hospitalNumberInput) inpatientPatientInfo.hospitalNumber = hospitalNumberInput.value || '';
        if (billNumberInput) inpatientPatientInfo.billNumber = billNumberInput.value || '';
        if (admissionDateInput) inpatientPatientInfo.admissionDate = admissionDateInput.value || '';
        if (dischargeDateInput) inpatientPatientInfo.dischargeDate = dischargeDateInput.value || '';

        // Update preview display with comprehensive null checks
        const previewPatientName = document.getElementById('previewPatientName');
        const previewOPDNo = document.getElementById('previewOPDNo');
        const previewAdmissionDate = document.getElementById('previewAdmissionDate');
        const previewDischargeDate = document.getElementById('previewDischargeDate');

        if (previewPatientName) {
            previewPatientName.textContent = inpatientPatientInfo.name || '_____________________';
        }
        if (previewOPDNo) {
            previewOPDNo.textContent = inpatientPatientInfo.opdNumber || '_____________________';
        }
        if (previewAdmissionDate) {
            const formattedAdmission = inpatientPatientInfo.admissionDate ? formatDateToDisplay(inpatientPatientInfo.admissionDate) : '_____________________';
            previewAdmissionDate.textContent = formattedAdmission;
        }
        if (previewDischargeDate) {
            const formattedDischarge = inpatientPatientInfo.dischargeDate ? formatDateToDisplay(inpatientPatientInfo.dischargeDate) : '_____________________';
            previewDischargeDate.textContent = formattedDischarge;
        }
    } catch (error) {
        console.error('Error updating patient info:', error);
        showInpatientToast('Error updating patient information', 'warning');
    }
}

// Date formatting functions
function formatDateToDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function parseDateFromDisplay(displayString) {
    if (!displayString) return '';
    const parts = displayString.split('-');
    if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        if (day.length === 2 && month.length === 2 && year.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    return '';
}

function formatDateDisplay(type) {
    const dateInput = document.getElementById(type + 'Date');
    const displayInput = document.getElementById(type + 'DateDisplay');

    if (dateInput && displayInput && dateInput.value) {
        displayInput.value = formatDateToDisplay(dateInput.value);
    }
}

function handleManualDateEntry(type) {
    const displayInput = document.getElementById(type + 'DateDisplay');
    const dateInput = document.getElementById(type + 'Date');

    if (displayInput && dateInput) {
        const displayValue = displayInput.value.trim();

        if (displayValue === '') {
            // Handle empty discharge date - use current date
            if (type === 'discharge') {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
                displayInput.value = formatDateToDisplay(today);
                showInpatientToast('Discharge date set to today (billing date)', 'info');
            } else {
                dateInput.value = '';
            }
        } else {
            const parsedDate = parseDateFromDisplay(displayValue);
            if (parsedDate) {
                dateInput.value = parsedDate;
            } else {
                showInpatientToast('Invalid date format. Please use DD-MM-YYYY', 'warning');
                displayInput.focus();
                return;
            }
        }

        calculateTotalDays();
        updateBillPreview();
    }
}

function toggleDatePicker(type) {
    const dateInput = document.getElementById(type + 'Date');
    const displayInput = document.getElementById(type + 'DateDisplay');

    if (dateInput && displayInput) {
        // Temporarily show the date picker
        dateInput.style.display = 'block';
        dateInput.style.position = 'absolute';
        dateInput.style.opacity = '0';
        dateInput.style.pointerEvents = 'all';
        dateInput.style.width = displayInput.offsetWidth + 'px';
        dateInput.style.height = displayInput.offsetHeight + 'px';
        dateInput.style.top = '0';
        dateInput.style.left = '0';

        dateInput.focus();
        dateInput.click();

        // Hide it again after selection
        setTimeout(() => {
            dateInput.style.display = 'none';
        }, 100);
    }
}

// Calculate total days between admission and discharge
function calculateTotalDays() {
    const admissionDate = document.getElementById('admissionDate')?.value;
    let dischargeDate = document.getElementById('dischargeDate')?.value;
    const dischargeDateDisplay = document.getElementById('dischargeDateDisplay')?.value;
    const counter = document.getElementById('totalDaysCounter');

    // If discharge date display is empty, use current date
    if (!dischargeDate && (!dischargeDateDisplay || dischargeDateDisplay.trim() === '')) {
        const today = new Date().toISOString().split('T')[0];
        dischargeDate = today;
        const dischargeDateInput = document.getElementById('dischargeDate');
        const dischargeDateDisplayInput = document.getElementById('dischargeDateDisplay');
        if (dischargeDateInput) dischargeDateInput.value = today;
        if (dischargeDateDisplayInput) dischargeDateDisplayInput.value = formatDateToDisplay(today);
    }

    if (admissionDate && dischargeDate) {
        const admission = new Date(admissionDate);
        const discharge = new Date(dischargeDate);
        const timeDiff = discharge.getTime() - admission.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff > 0) {
            if (counter) {
                counter.textContent = daysDiff + ' days';
                counter.setAttribute('data-days', daysDiff);
            }
            inpatientPatientInfo.totalDays = daysDiff;
        } else {
            if (counter) {
                counter.textContent = '0 days';
                counter.setAttribute('data-days', 0);
            }
            inpatientPatientInfo.totalDays = 0;
        }
    } else {
        if (counter) {
            counter.textContent = '0 days';
            counter.setAttribute('data-days', 0);
        }
        inpatientPatientInfo.totalDays = 0;
    }

    updateInpatientPatientInfo();
    updateBillPreview();
}

// Handle room type selection
function handleRoomTypeChange(type) {
    const generalCheckbox = document.getElementById('generalRoom');
    const privateCheckbox = document.getElementById('privateRoom');
    const privateOptions = document.getElementById('privateRoomOptions');

    if (type === 'general') {
        if (generalCheckbox?.checked) {
            if (privateCheckbox) privateCheckbox.checked = false;
            if (privateOptions) privateOptions.style.display = 'none';
            // Clear private room selections
            document.querySelectorAll('#privateRoomGrid input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
        }
    } else if (type === 'private') {
        if (privateCheckbox?.checked) {
            if (generalCheckbox) generalCheckbox.checked = false;
            if (privateOptions) privateOptions.style.display = 'block';
        } else {
            if (privateOptions) privateOptions.style.display = 'none';
        }
    }

    updateBillPreview();
}

// Handle private room selection
function handlePrivateRoomChange() {
    updateBillPreview();
}

// Update bill preview with seat & admission fee calculation
function updateBillPreview() {
    updateInpatientPatientInfo();

    // Calculate Seat & Ad. Fee
    const totalDays = inpatientPatientInfo.totalDays || 0;
    const visitations = parseInt(document.getElementById('totalVisitations')?.value) || 0;
    const generalRoom = document.getElementById('generalRoom')?.checked;
    const privateRoom = document.getElementById('privateRoom')?.checked;

    let seatAdFee = 0;

    // Only calculate if we have room type selected and total days > 0
    if (totalDays > 0) {
        if (generalRoom) {
            // General bed calculation: Admission Fee + (Days × General Bed Fee) + (Visitations × Visitation Fee)
            const admissionFee = roomCharges.general.admission;
            const bedCharge = roomCharges.generalBed * totalDays;
            const visitationFee = roomCharges.general.visitation * visitations;
            seatAdFee = admissionFee + bedCharge + visitationFee;

            console.log(`General Bed Calculation:
                Admission Fee: ${admissionFee}
                Bed Charge: ${totalDays} days × ${roomCharges.generalBed} = ${bedCharge}
                Visitation Fee: ${visitations} visits × ${roomCharges.general.visitation} = ${visitationFee}
                Total Seat & Ad. Fee: ${seatAdFee}`);
        } else if (privateRoom) {
            // Private room calculation - use pricing from database
            const selectedRooms = document.querySelectorAll('#privateRoomGrid input[type="checkbox"]:checked');
            if (selectedRooms.length > 0) {
                const roomId = selectedRooms[0].value;
                const selectedRoom = privateRooms.find(r => r.id == roomId);
                if (selectedRoom) {
                    const admissionFee = roomCharges.private.admission;
                    const bedCharge = selectedRoom.price * totalDays;
                    const visitationFee = roomCharges.private.visitation * visitations;
                    
                    seatAdFee = admissionFee + bedCharge + visitationFee;

                    console.log(`Private Room Calculation:
                        Room: ${selectedRoom.name}
                        Admission Fee: ${admissionFee}
                        Bed Charge: ${totalDays} days × ${selectedRoom.price} = ${bedCharge}
                        Visitation Fee: ${visitations} visits × ${roomCharges.private.visitation} = ${visitationFee}
                        Total Seat & Ad. Fee: ${seatAdFee}`);
                }
            } else {
                // Use default private room rate if no specific room selected
                const admissionFee = roomCharges.private.admission;
                const bedCharge = roomCharges.private.bed * totalDays;
                const visitationFee = roomCharges.private.visitation * visitations;
                seatAdFee = admissionFee + bedCharge + visitationFee;

                console.log(`Default Private Room Calculation:
                    Admission Fee: ${admissionFee}
                    Bed Charge: ${totalDays} days × ${roomCharges.private.bed} = ${bedCharge}
                    Visitation Fee: ${visitations} visits × ${roomCharges.private.visitation} = ${visitationFee}
                    Total Seat & Ad. Fee: ${seatAdFee}`);
            }
        }
    }

    // Update the Seat & Ad. Fee in the table
    const seatAdFeeAmount = document.getElementById('seatAdFeeAmount');
    if (seatAdFeeAmount) {
        seatAdFeeAmount.textContent = seatAdFee.toFixed(2);
    }

    // Update subtotal and total
    const subTotalAmount = document.getElementById('subTotalAmount');
    const totalBillAmount = document.getElementById('totalBillAmount');

    if (subTotalAmount) {
        subTotalAmount.textContent = seatAdFee.toFixed(2);
    }
    if (totalBillAmount) {
        totalBillAmount.textContent = seatAdFee.toFixed(2);
    }
}

// Add item to inpatient bill
function addInpatientItemToBill(item) {
    if (!item) {
        showInpatientToast('Invalid item data', 'warning');
        return;
    }

    // Assign unique ID if not present
    if (!item.id) {
        item.id = Date.now() + Math.random();
    }

    // Add timestamp if not present
    if (!item.date) {
        item.date = new Date().toISOString().split('T')[0];
    }

    inpatientBillItems.push(item);
    updateInpatientDisplay();

    console.log('Added item to inpatient bill:', item);
}

function updateInpatientDisplay() {
    updateInpatientBillDisplay();
    updateInpatientGrandTotal();
}

function updateInpatientBillDisplay() {
    // Inpatient system uses the main bill preview table
    // Additional items would be added to the existing table structure
    console.log('Inpatient bill display updated with', inpatientBillItems.length, 'items');
}

function updateInpatientGrandTotal() {
    // Calculate total from bill items plus room charges
    const itemsTotal = inpatientBillItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    // Add room charges calculation here if needed
    const totalBillAmount = document.getElementById('totalBillAmount');
    if (totalBillAmount) {
        const currentAmount = parseFloat(totalBillAmount.textContent) || 0;
        const newTotal = currentAmount + itemsTotal;
        totalBillAmount.textContent = newTotal.toFixed(2);
    }
}

function removeInpatientItem(itemId) {
    const index = inpatientBillItems.findIndex(item => item.id == itemId);
    if (index > -1) {
        const removedItem = inpatientBillItems.splice(index, 1)[0];
        updateInpatientDisplay();
        showInpatientToast(`${removedItem.name} removed from inpatient bill`, 'info');
    }
}

// Export functions
function exportBillPDF() {
    const element = document.querySelector('.preview-section');
    const opt = {
        margin: 1,
        filename: 'inpatient-bill.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
        showInpatientToast('PDF exported successfully', 'success');
    } else {
        showInpatientToast('PDF export library not available', 'warning');
    }
}

function exportExcel() {
    showInpatientToast('Excel export feature coming soon', 'info');
}

function printBill() {
    window.print();
}

function clearBill() {
    if (confirm('Are you sure you want to clear all data?')) {
        // Clear form inputs
        const inputs = ['patientName', 'opdNumber', 'hospitalNumber', 'admissionDate', 'dischargeDate', 'totalVisitations'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        // Clear date display inputs
        const dateDisplays = ['admissionDateDisplay', 'dischargeDateDisplay'];
        dateDisplays.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        // Clear checkboxes
        const checkboxes = ['generalRoom', 'privateRoom'];
        checkboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.checked = false;
        });

        // Hide private room options
        const privateOptions = document.getElementById('privateRoomOptions');
        if (privateOptions) privateOptions.style.display = 'none';

        // Clear private room selections
        document.querySelectorAll('#privateRoomGrid input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        // Reset bill items
        inpatientBillItems = [];

        // Reset patient info
        inpatientPatientInfo = {
            name: '',
            opdNumber: '',
            hospitalNumber: '',
            billNumber: '',
            admissionDate: '',
            dischargeDate: '',
            totalDays: 0
        };

        calculateTotalDays();
        updateBillPreview();
        generateBillNumber();

        showInpatientToast('Bill cleared successfully', 'success');
    }
}

// Load private rooms from database
async function loadPrivateRooms() {
    try {
        if (window.dbAPI) {
            console.log('Loading bed/cabin charges from database...');
            const bedCabinItems = await window.dbAPI.getItemsByCategory('Bed/Cabin Charges');

            // Separate general bed and private rooms
            const generalBeds = bedCabinItems.filter(item => {
                const roomType = item.roomType?.toLowerCase() || '';
                const name = item.name?.toLowerCase() || '';
                return roomType === 'general bed' || name.includes('general bed');
            });

            privateRooms = bedCabinItems
                .filter(item => {
                    const roomType = item.roomType?.toLowerCase() || '';
                    const name = item.name?.toLowerCase() || '';
                    return roomType === 'private' || name.includes('private');
                })
                .map(item => ({
                    id: item.id,
                    name: item.privateType || item.name || 'Private Room',
                    price: parseFloat(item.dailyRate) || parseFloat(item.price) || 0,
                    roomType: item.roomType,
                    privateType: item.privateType,
                    originalItem: item
                }));

            // Update room charges from database
            if (generalBeds.length > 0) {
                roomCharges.generalBed = parseFloat(generalBeds[0].dailyRate) || parseFloat(generalBeds[0].price) || 100;
            }

            // Update private room charges
            privateRooms.forEach(room => {
                if (room.privateType === 'Private 1') {
                    roomCharges.private1 = room.price;
                } else if (room.privateType === 'Private 2') {
                    roomCharges.private2 = room.price;
                } else if (room.privateType === 'Private 3') {
                    roomCharges.private3 = room.price;
                }
            });

            console.log(`Loaded ${privateRooms.length} private rooms and ${generalBeds.length} general beds from database`);
            console.log('Updated room charges:', roomCharges);

            populatePrivateRooms();
        } else {
            // Default rooms if no database
            console.log('Database API not available, using default pricing');
            privateRooms = [
                { id: 'p1', name: 'Private 1', price: roomCharges.private1, privateType: 'Private 1' },
                { id: 'p2', name: 'Private 2', price: roomCharges.private2, privateType: 'Private 2' },
                { id: 'p3', name: 'Private 3', price: roomCharges.private3, privateType: 'Private 3' }
            ];
            populatePrivateRooms();
        }
    } catch (error) {
        console.error('Error loading room data:', error);
        showInpatientToast('Error loading room data from database', 'warning');
    }
}

// Populate private rooms checkboxes
function populatePrivateRooms() {
    const grid = document.getElementById('privateRoomGrid');
    if (!grid) {
        console.warn('Private room grid not found');
        return;
    }

    grid.innerHTML = '';

    if (privateRooms.length === 0) {
        grid.innerHTML = `
            <div class="room-option" style="text-align: center; color: #888; font-style: italic;">
                No private rooms available. Add them in the Database section under "Bed/Cabin Charges".
            </div>
        `;
        return;
    }

    privateRooms.forEach(room => {
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-option';

        const price = room.price > 0 ? `৳${room.price}/day` : 'Price not set';
        const roomName = room.name || 'Unnamed Room';

        roomDiv.innerHTML = `
            <input type="checkbox" id="room_${room.id}" value="${room.id}" onchange="handlePrivateRoomChange()">
            <label for="room_${room.id}">${roomName} - ${price}</label>
        `;
        grid.appendChild(roomDiv);
    });

    console.log(`Populated ${privateRooms.length} private room options`);
}

// Utility functions
function showInpatientToast(message, type = 'info') {
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
            console.log(`Inpatient Toast ${type}: ${message}`);
        }
    } catch (error) {
        console.error('Error showing inpatient toast:', error);
        console.log(`Inpatient Toast ${type}: ${message}`);
    }
}

// Navigation functions
function toggleSideNav() {
    const panel = document.getElementById('sideNavPanel');
    const overlay = document.getElementById('sideNavOverlay');
    const toggle = document.getElementById('sideNavToggle');

    if (panel && overlay && toggle) {
        panel.classList.toggle('active');
        overlay.classList.toggle('active');
        toggle.classList.toggle('active');
    }
}

function closeSideNav() {
    const panel = document.getElementById('sideNavPanel');
    const overlay = document.getElementById('sideNavOverlay');
    const toggle = document.getElementById('sideNavToggle');

    if (panel && overlay && toggle) {
        panel.classList.remove('active');
        overlay.classList.remove('active');
        toggle.classList.remove('active');
    }
}

function showSystemInfo() {
    showInpatientToast('System info feature available in main application', 'info');
}

function exportAllData() {
    showInpatientToast('Export feature available in main application', 'info');
}

function clearAllData() {
    showInpatientToast('Database management available in main application', 'info');
}

// Make functions globally available
window.calculateTotalDays = calculateTotalDays;
window.handleRoomTypeChange = handleRoomTypeChange;
window.handlePrivateRoomChange = handlePrivateRoomChange;
window.updateBillPreview = updateBillPreview;
window.formatDateDisplay = formatDateDisplay;
window.handleManualDateEntry = handleManualDateEntry;
window.toggleDatePicker = toggleDatePicker;
window.exportBillPDF = exportBillPDF;
window.exportExcel = exportExcel;
window.printBill = printBill;
window.clearBill = clearBill;
window.toggleSideNav = toggleSideNav;
window.closeSideNav = closeSideNav;
window.showSystemInfo = showSystemInfo;
window.exportAllData = exportAllData;
window.clearAllData = clearAllData;

console.log('Inpatient app loaded successfully with complete implementation');