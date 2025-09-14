const axios = require('axios');
const fs = require('fs');
const path = require('path');

class RAGService {
    constructor() {
        this.ragServerUrl = 'http://localhost:3001';
        this.soaData = this.loadSOAData();
        console.log('🚀 RAG Service initialized with fallback data');
    }

    loadSOAData() {
        try {
            const dataPath = path.join(__dirname, '../../data/soa-departments.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            console.log(`📚 Loaded ${data.departments?.length || 0} departments for fallback RAG`);
            return data;
        } catch (error) {
            console.error('❌ Error loading SOA data for RAG:', error.message);
            return { departments: [] };
        }
    }

    async processQuery(userQuery, language = 'en') {
        console.log(`🚀 RAG Service - Processing query: "${userQuery}" with language: ${language}`);
        
        // Skip HTTP call to avoid infinite loop - use fallback directly
        console.log(`🧠 Using local fallback RAG for: "${userQuery}"`);
        return this.processWithFallbackRAG(userQuery, language);
    }

    processWithFallbackRAG(userQuery, language) {
        const query = userQuery.toLowerCase();
        const isArabic = language === 'ar';
        
        // College/University general info
        if (query.includes('college') || query.includes('university') || query.includes('soa') || 
            query.includes('كلية') || query.includes('جامعة')) {
            return isArabic ? 
                `🎓 مرحباً بك في كلية سلطان للفنون!

نحن كلية جامعية متميزة تضم ${this.soaData.departments?.length || 16} قسماً أكاديمياً مختلفاً.

أقسامنا الرئيسية تشمل:
• الطب وطب الأسنان والصيدلة
• الهندسة بفروعها المختلفة  
• إدارة الأعمال والمحاسبة
• تقنية المعلومات والحاسوب
• التمريض والعلوم الطبية

📅 العام الدراسي: 2025-2026
🕐 الدوامات: صباحي ومسائي
💰 رسوم دراسية متنوعة حسب القسم

كيف يمكنني مساعدتك أكثر؟` :
                `🎓 Welcome to SOA University College!

We are a distinguished university college with ${this.soaData.departments?.length || 16} different academic departments.

Our main departments include:
• Medicine, Dentistry, and Pharmacy
• Various Engineering fields
• Business Administration and Accounting  
• Information Technology and Computer Science
• Nursing and Medical Sciences

📅 Academic Year: 2025-2026
🕐 Shifts: Morning and Evening
💰 Tuition fees vary by department

How can I help you further?`;
        }

        // Department-specific queries
        if (query.includes('department') || query.includes('قسم')) {
            const depts = this.soaData.departments || [];
            const deptList = depts.map(d => `• ${isArabic ? d.name_ar : d.name_en}`).join('\n');
            
            return isArabic ?
                `📚 أقسامنا الأكاديمية (${depts.length} قسم):

${deptList}

لمعرفة تفاصيل أي قسم، اسأل عن "متطلبات [اسم القسم]" أو "رسوم [اسم القسم]"` :
                `📚 Our Academic Departments (${depts.length} departments):

${deptList}

For details about any department, ask about "[Department name] requirements" or "[Department name] fees"`;
        }

        // Fees query
        if (query.includes('fee') || query.includes('cost') || query.includes('رسوم') || query.includes('تكلفة')) {
            return isArabic ?
                `💰 الرسوم الدراسية تختلف حسب القسم:

• الطب: 6,500,000 - 7,000,000 دينار
• طب الأسنان: 5,500,000 - 6,000,000 دينار  
• الهندسة: 3,500,000 - 4,500,000 دينار
• الصيدلة: 4,000,000 - 4,500,000 دينار
• إدارة الأعمال: 2,500,000 - 3,000,000 دينار

📝 الرسوم قد تختلف حسب الدوام (صباحي/مسائي)
💳 إمكانية الدفع على أقساط متاحة

أي قسم تود معرفة رسومه تحديداً؟` :
                `💰 Tuition fees vary by department:

• Medicine: 6,500,000 - 7,000,000 IQD
• Dentistry: 5,500,000 - 6,000,000 IQD
• Engineering: 3,500,000 - 4,500,000 IQD  
• Pharmacy: 4,000,000 - 4,500,000 IQD
• Business: 2,500,000 - 3,000,000 IQD

📝 Fees may vary by shift (Morning/Evening)
💳 Installment payment options available

Which department's fees would you like to know specifically?`;
        }

        // Admission requirements
        if (query.includes('admission') || query.includes('requirement') || 
            query.includes('قبول') || query.includes('متطلبات')) {
            return isArabic ?
                `📋 متطلبات القبول العامة:

🎓 شهادة الثانوية العامة (البكلوريا)
📊 المعدلات المطلوبة:
• الطب: 95%+ (علمي)
• طب الأسنان: 90%+ (علمي)  
• الهندسة: 80%+ (علمي)
• الصيدلة: 85%+ (علمي)
• إدارة الأعمال: 70%+ (أدبي/علمي)

📄 الوثائق المطلوبة:
• شهادة الثانوية (مصدقة)
• هوية الأحوال المدنية
• 6 صور شخصية
• استمارة طلب القبول

📅 فترات التسجيل: صيف وخريف كل عام

أي قسم تفكر بالتقديم عليه؟` :
                `📋 General Admission Requirements:

🎓 High School Diploma (Baccalaureate)
📊 Required Grades:
• Medicine: 95%+ (Scientific)
• Dentistry: 90%+ (Scientific)
• Engineering: 80%+ (Scientific)  
• Pharmacy: 85%+ (Scientific)
• Business: 70%+ (Literary/Scientific)

📄 Required Documents:
• High School Certificate (certified)
• Civil Status ID
• 6 personal photos
• Admission application form

📅 Registration periods: Summer and Fall each year

Which department are you considering applying to?`;
        }

        // Default helpful response
        return isArabic ?
            `مرحباً! أنا مساعد كلية سلطان للفنون الذكي 🎓

يمكنني مساعدتك في:
• معلومات عن الأقسام الأكاديمية
• متطلبات القبول والتسجيل
• الرسوم الدراسية والتكاليف
• الدوامات المتاحة (صباحي/مسائي)
• مقارنة الأقسام المختلفة

اسأل مثل: "ما متطلبات الطب؟" أو "كم رسوم الهندسة؟"` :
            `Hello! I'm the SOA University College AI assistant 🎓

I can help you with:
• Information about academic departments  
• Admission requirements and registration
• Tuition fees and costs
• Available shifts (Morning/Evening)
• Department comparisons

Ask like: "What are medicine requirements?" or "How much are engineering fees?"`;
    }

    getFallbackResponse(language) {
        return language === 'ar' 
            ? 'مرحباً! أنا مساعد كلية سلطان للفنون. كيف يمكنني مساعدتك اليوم؟'
            : 'Hello! I\'m the SOA University College assistant. How can I help you today?';
    }

}

module.exports = new RAGService();