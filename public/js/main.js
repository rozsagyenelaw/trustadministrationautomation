let scrollPosition = 0;

function updateDateTime() {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
}
setInterval(updateDateTime, 1000);
updateDateTime();

async function loadCases() {
    try {
        const cases = JSON.parse(localStorage.getItem('trust_cases') || '[]');
        const tbody = document.getElementById('cases-table');
        
        if (cases.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: #6c757d;">
                        No active cases. Click "New Trust Administration Case" to get started.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = cases.map(c => {
            const deadlineDays = calculateDaysRemaining(c.deadlines.sixty_day_notice);
            const deadlineClass = deadlineDays < 7 ? 'deadline-warning' : deadlineDays < 30 ? 'deadline-soon' : '';
            const statusClass = deadlineDays < 7 ? 'status-urgent' : 'status-active';
            const statusText = deadlineDays < 7 ? 'Notice Due' : 'In Progress';
            
            return `
                <tr>
                    <td>${c.case_number}</td>
                    <td>${c.decedent_name}</td>
                    <td>${c.trustee_name}</td>
                    <td>${formatDate(c.death_date)}</td>
                    <td class="${deadlineClass}">${formatDate(c.deadlines.sixty_day_notice)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button onclick="viewCase('${c.case_number}')">View</button>
                        <button onclick="generateDocs('${c.case_number}')">Generate Docs</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('active-cases').textContent = cases.length;
        document.getElementById('pending-notices').textContent = cases.filter(c => 
            calculateDaysRemaining(c.deadlines.sixty_day_notice) > 0
        ).length;
        
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

async function loadDeadlines() {
    try {
        const cases = JSON.parse(localStorage.getItem('trust_cases') || '[]');
        const tbody = document.getElementById('deadlines-table');
        
        if (cases.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #6c757d;">
                        No upcoming deadlines.
                    </td>
                </tr>
            `;
            return;
        }
        
        const allDeadlines = [];
        
        cases.forEach(c => {
            if (c.deadlines) {
                Object.entries(c.deadlines).forEach(([type, date]) => {
                    if (date && calculateDaysRemaining(date) > 0) {
                        allDeadlines.push({
                            case_name: c.trust_name || c.decedent_name,
                            case_number: c.case_number,
                            type: formatDeadlineType(type),
                            date: date,
                            days: calculateDaysRemaining(date)
                        });
                    }
                });
            }
        });
        
        allDeadlines.sort((a, b) => new Date(a.date) - new Date(b.date));
        const upcomingDeadlines = allDeadlines.slice(0, 10);
        
        if (upcomingDeadlines.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #6c757d;">
                        No upcoming deadlines.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = upcomingDeadlines.map(d => {
            const deadlineClass = d.days < 7 ? 'deadline-warning' : d.days < 30 ? 'deadline-soon' : '';
            return `
                <tr>
                    <td>${d.case_name}</td>
                    <td>${d.type}</td>
                    <td class="${deadlineClass}">${formatDate(d.date)}</td>
                    <td class="${deadlineClass}">${d.days} days</td>
                    <td><button onclick="handleDeadline('${d.case_number}', '${d.type}')">Take Action</button></td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('upcoming-deadlines').textContent = upcomingDeadlines.length;
        
    } catch (error) {
        console.error('Error loading deadlines:', error);
    }
}

async function loadRecentDocuments() {
    try {
        const docs = JSON.parse(localStorage.getItem('recent_documents') || '[]');
        const tbody = document.getElementById('recent-docs');
        
        if (docs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; padding: 20px; color: #6c757d;">
                        No recent documents.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = docs.slice(0, 5).map(doc => `
            <tr>
                <td>${doc.name}</td>
                <td><span class="status-badge ${doc.status === 'complete' ? 'status-active' : 'status-pending'}">${doc.status}</span></td>
            </tr>
        `).join('');
        
        const thisMonth = new Date().getMonth();
        const thisMonthDocs = docs.filter(d => new Date(d.created).getMonth() === thisMonth);
        document.getElementById('docs-generated').textContent = thisMonthDocs.length;
        
    } catch (error) {
        console.error('Error loading recent documents:', error);
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function calculateDaysRemaining(dateString) {
    if (!dateString) return 0;
    const deadline = new Date(dateString);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function formatDeadlineType(type) {
    const types = {
        'sixty_day_notice': '60-Day Notice',
        'contest_deadline': 'Contest Period Ends',
        'creditor_claims': 'Creditor Claims Deadline',
        'estate_tax_706': 'Estate Tax Return (706)',
        'final_income_tax': 'Final Income Tax (1041)'
    };
    return types[type] || type;
}

function handleDeadline(caseNumber, deadlineType) {
    if (deadlineType.includes('60-Day')) {
        generate60DayNotice(caseNumber);
    } else if (deadlineType.includes('Tax')) {
        alert(`Preparing tax documents for case ${caseNumber}`);
    } else {
        alert(`Handling deadline: ${deadlineType} for case ${caseNumber}`);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadCases();
    loadDeadlines();
    loadRecentDocuments();
    
    setInterval(() => {
        loadCases();
        loadDeadlines();
        loadRecentDocuments();
    }, 60000);
});

function openNewCaseModal() {
    const modal = document.getElementById('newCaseModal');
    scrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;
    modal.classList.add('show');
    modal.style.display = 'block';
}

function closeNewCaseModal() {
    const modal = document.getElementById('newCaseModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
    document.getElementById('quickIntakeForm').reset();
    document.getElementById('success-msg').style.display = 'none';
    document.getElementById('error-msg').style.display = 'none';
}

document.getElementById('quickIntakeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('success-msg').style.display = 'none';
    document.getElementById('error-msg').style.display = 'none';
    
    const formData = {
        decedent_first_name: document.getElementById('decedent-first').value,
        decedent_last_name: document.getElementById('decedent-last').value,
        death_date: document.getElementById('death-date').value,
        ssn_last4: document.getElementById('ssn-last4').value,
        marital_status: document.getElementById('marital-status').value,
        trustee_name: document.getElementById('trustee-name').value,
        trustee_phone: document.getElementById('trustee-phone').value,
        trust_name: document.getElementById('trust-name').value,
        trust_type: document.getElementById('trust-type').value,
        estate_value: document.getElementById('estate-value').value,
        initial_notes: document.getElementById('initial-notes').value,
        generate_initial_docs: true
    };
    
    try {
        const response = await fetch('/.netlify/functions/create-trust-case', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            const cases = JSON.parse(localStorage.getItem('trust_cases') || '[]');
            cases.push({
                case_number: result.case_number,
                decedent_name: `${formData.decedent_first_name} ${formData.decedent_last_name}`,
                death_date: formData.death_date,
                trustee_name: formData.trustee_name,
                trust_name: formData.trust_name,
                deadlines: result.case_data.deadlines,
                created: new Date().toISOString()
            });
            localStorage.setItem('trust_cases', JSON.stringify(cases));
            
            document.getElementById('success-msg').textContent = `Case ${result.case_number} created successfully!`;
            document.getElementById('success-msg').style.display = 'block';
            
            loadCases();
            loadDeadlines();
            
            setTimeout(() => {
                closeNewCaseModal();
            }, 3000);
        } else {
            throw new Error(result.error || 'Failed to create case');
        }
    } catch (error) {
        document.getElementById('error-msg').textContent = `Error: ${error.message}`;
        document.getElementById('error-msg').style.display = 'block';
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

async function generateGovernmentNotices() {
    const caseNumber = prompt('Enter Case Number (e.g., TA-2024-001):');
    if (!caseNumber) return;
    
    try {
        const response = await fetch('/.netlify/functions/generate-government-notices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ case_number: caseNumber })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Government notices generated successfully!');
            downloadDocuments(result.documents, caseNumber);
        }
    } catch (error) {
        alert('Error generating notices: ' + error.message);
    }
}

function generateABTrustDocs() {
    const caseNumber = prompt('Enter Case Number for A/B Trust Split:');
    if (!caseNumber) return;
    alert('A/B Trust split documents will be generated for case ' + caseNumber);
}

function generatePropertyDocs() {
    const caseNumber = prompt('Enter Case Number for Property Documents:');
    if (!caseNumber) return;
    alert('Property documents will be generated for case ' + caseNumber);
}

function generateAccountingReport() {
    const caseNumber = prompt('Enter Case Number for Trust Accounting:');
    if (!caseNumber) return;
    alert('Trust accounting report will be generated for case ' + caseNumber);
}

function downloadDocuments(documents, caseNumber) {
    Object.entries(documents).forEach(([name, base64]) => {
        const link = document.createElement('a');
        link.href = 'data:application/pdf;base64,' + base64;
        link.download = `${caseNumber}_${name}.pdf`;
        link.click();
    });
}

function viewCase(caseNumber) {
    window.location.href = `/case-details.html?case=${caseNumber}`;
}

function generateDocs(caseNumber) {
    const docType = prompt('Which documents to generate?\n1. 60-Day Notice\n2. Government Notices\n3. Property Docs\n4. All Documents');
    
    switch(docType) {
        case '1':
            generateNotices();
            break;
        case '2':
            generateGovernmentNotices();
            break;
        case '3':
            generatePropertyDocs();
            break;
        case '4':
            alert('Generating all documents for case ' + caseNumber);
            break;
    }
}

function generateNotice(caseName) {
    alert(`Generating 60-day notice for ${caseName} trust`);
}

function prepareTaxDocs(caseName) {
    alert(`Preparing tax documents for ${caseName} estate`);
}

function generateNotices() {
    const caseNumber = prompt('Enter Case Number for 60-Day Notices:');
    if (!caseNumber) return;
    alert('60-Day notices will be generated for case ' + caseNumber);
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeNewCaseModal();
    }
}
