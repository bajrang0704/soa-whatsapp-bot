// Departments Module
import { universityData } from '../data/university-data.js';
import { t } from './translations.js';

export class DepartmentsModule {
    constructor() {
        this.currentLanguage = 'en';
        this.currentFilter = 'all';
        this.setupEventListeners();
    }

    // Set current language
    setLanguage(language) {
        this.currentLanguage = language;
    }

    // Setup event listeners
    setupEventListeners() {
        // Department search
        const departmentSearch = document.getElementById('departmentSearch');
        if (departmentSearch) {
            departmentSearch.addEventListener('input', () => this.filterDepartments());
        }
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterDepartments();
            });
        });
    }

    // Render departments
    renderDepartments() {
        const grid = document.getElementById('departmentsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const departments = Object.entries(universityData.departments);
        
        departments.forEach(([name, data]) => {
            if (this.currentFilter === 'all' || data.category === this.currentFilter) {
                const card = this.createDepartmentCard(name, data);
                grid.appendChild(card);
            }
        });
    }

    // Create department card
    createDepartmentCard(name, data) {
        const card = document.createElement('div');
        card.className = 'department-card';
        
        // Translate shifts
        const shifts = data.shift.map(shift => 
            shift === 'Morning' ? t('morning', this.currentLanguage) : 
            shift === 'Evening' ? t('evening', this.currentLanguage) : shift
        ).join(', ');
        
        const minGrade = Object.values(data.minimum_grade).join(' - ');
        const tuition = Object.values(data.tuition_fee).join(' - ');
        
        // Translate category
        const categoryKey = data.category.toLowerCase();
        const translatedCategory = t(categoryKey, this.currentLanguage);
        
        card.innerHTML = `
            <div class="department-header">
                <div>
                    <div class="department-name">${this.currentLanguage === 'ar' ? data.name_ar : name}</div>
                    <div class="department-name-ar">${this.currentLanguage === 'ar' ? name : data.name_ar}</div>
                </div>
                <div class="department-category">${translatedCategory}</div>
            </div>
            <div class="department-details">
                <div class="detail-row">
                    <span class="detail-label">${t('minimum-grade', this.currentLanguage)}:</span>
                    <span class="detail-value">${minGrade}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('tuition-fee', this.currentLanguage)}:</span>
                    <span class="detail-value">${tuition}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('shifts', this.currentLanguage)}:</span>
                    <span class="detail-value">${shifts}</span>
                </div>
            </div>
            <div class="department-shifts">
                ${data.shift.map(shift => {
                    const translatedShift = shift === 'Morning' ? t('morning', this.currentLanguage) : 
                                          shift === 'Evening' ? t('evening', this.currentLanguage) : shift;
                    return `<span class="shift-badge">${translatedShift}</span>`;
                }).join('')}
            </div>
        `;
        
        return card;
    }

    // Filter departments
    filterDepartments() {
        const searchTerm = document.getElementById('departmentSearch')?.value.toLowerCase() || '';
        const cards = document.querySelectorAll('.department-card');
        
        cards.forEach(card => {
            const name = card.querySelector('.department-name')?.textContent.toLowerCase() || '';
            const nameAr = card.querySelector('.department-name-ar')?.textContent.toLowerCase() || '';
            const category = card.querySelector('.department-category')?.textContent.toLowerCase() || '';
            
            const matchesSearch = name.includes(searchTerm) || nameAr.includes(searchTerm);
            const matchesFilter = this.currentFilter === 'all' || category === this.currentFilter;
            
            if (matchesSearch && matchesFilter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Update department count
    updateDepartmentCount() {
        const count = Object.keys(universityData.departments).length;
        const countElement = document.getElementById('departmentCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }
}

// Export singleton instance
export const departmentsModule = new DepartmentsModule();
