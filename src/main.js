// --- 1. Global Cursor & Lighting Tracking ---
const root = document.documentElement;

document.addEventListener('mousemove', (e) => {
  // Update CSS variables for the glow effect
  root.style.setProperty('--mouse-x', `${e.clientX}px`);
  root.style.setProperty('--mouse-y', `${e.clientY}px`);
});

// --- 2. Intersection Observer for Scroll Reveals ---
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // Only animate once
    }
  });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});

// --- 3. Magnetic Button Physics ---
const magneticElements = document.querySelectorAll('.magnetic');

magneticElements.forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Magnetic pull strength
    const strength = 0.3;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = `translate(0px, 0px)`;
  });
});

// --- 4. 3D Tilt Effect on Cards ---
const tiltCards = document.querySelectorAll('.tilt-card');

tiltCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation amount
    const rotateX = ((y - centerY) / centerY) * -5; // Max rotation 5deg
    const rotateY = ((x - centerX) / centerX) * 5;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.transition = 'none'; // remove transition for smooth tracking
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.transition = 'transform 0.5s ease-out'; // re-add transition for smooth reset
  });
});

// --- 5. Typing Animation ---
let words = [
  'Loading...'
];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function type() {
  const typingTextElement = document.querySelector('.typing-text');
  if (!typingTextElement || words.length === 0) {
      setTimeout(type, 100);
      return;
  }
  
  const currentWord = words[wordIndex];
  
  if (isDeleting) {
    typingTextElement.textContent = currentWord.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typingTextElement.textContent = currentWord.substring(0, charIndex + 1);
    charIndex++;
  }
  
  let typeSpeed = isDeleting ? 50 : 100;
  
  if (!isDeleting && charIndex === currentWord.length) {
    typeSpeed = 2000; // Pause at end of word
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    wordIndex = (wordIndex + 1) % words.length;
    typeSpeed = 500; // Pause before new word
  }
  
  setTimeout(type, typeSpeed);
}

// Start typing animation slightly after load
setTimeout(type, 1000);

// --- 6. Background Canvas Particles ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

function initCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  
  particles = [];
  const numParticles = Math.floor((width * height) / 15000); // Responsive particle count
  
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  
  particles.forEach(p => {
    // Update position
    p.x += p.vx;
    p.y += p.vy;
    
    // Wrap around edges
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
    
    // Draw particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw connections
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
  
  requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', initCanvas);
initCanvas();
drawParticles();

// --- 7. Modal Logic & Data Fetching ---
const modalOverlay = document.getElementById('modal-overlay');

// API Base URL for separated frontend/backend
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://localhost:3000' 
    : 'https://ayush4604-digital-resume.hf.space'; // Automatically configured to your new Space!

// Store vault config dynamically from data.json
let vaultConfig = { view_pin: '1234', download_pin: '0000' };

async function loadData() {
  try {
    const response = await fetch(`${API_BASE_URL}/data.json`);
    if (!response.ok) throw new Error('Failed to load data.json');
    const data = await response.json();
    
    // 1. Profile
    document.getElementById('dynamic-name').innerHTML = data.profile.name;
    document.getElementById('dynamic-subtitle').innerHTML = `${data.profile.subtitle}&nbsp;<span class="typing-text"></span><span class="cursor">|</span>`;
    document.getElementById('dynamic-bio').innerHTML = data.profile.bio;
    document.getElementById('dynamic-email').href = `mailto:${data.profile.email}`;
    document.getElementById('dynamic-profile-pic').src = data.profile.profile_pic;
    
    // Socials
    const socialsContainer = document.getElementById('dynamic-socials');
    if (socialsContainer) {
      socialsContainer.innerHTML = `
        <a href="${data.profile.linkedin}" target="_blank" class="social-btn magnetic">LinkedIn</a>
        <a href="${data.profile.github}" target="_blank" class="social-btn magnetic">GitHub</a>
      `;
    }

    // 2. Journey
    const journeyContainer = document.getElementById('dynamic-journey');
    if (journeyContainer) {
      journeyContainer.innerHTML = data.journey.map(j => `
        <div class="timeline-item">
          <div class="timeline-dot ${j.color}"></div>
          <div class="timeline-content">
            <span class="timeline-date">${j.date}</span>
            <h4>${j.title}</h4>
            <h5>${j.subtitle}</h5>
            <p>${j.description}</p>
          </div>
        </div>
      `).join('');
    }

    // 3. Skills
    if (data.skills && data.skills.length > 0) {
        words = data.skills; // Update typing animation words
    }
    const skillsContainer = document.getElementById('dynamic-skills');
    if (skillsContainer) {
      skillsContainer.innerHTML = data.skills.map(skill => `<span class="skill-pill">${skill}</span>`).join('');
    }

    // 4. Achievements
    const achievementsContainer = document.getElementById('dynamic-achievements');
    if (achievementsContainer) {
      achievementsContainer.innerHTML = data.achievements.map(a => `<li>${a}</li>`).join('');
    }

    // 5. Certifications
    const certsContainer = document.getElementById('dynamic-certifications');
    if (certsContainer) {
      certsContainer.innerHTML = data.certifications.map(c => {
        if (c.is_link) {
          return `<li><strong>Certification:</strong> <a href="${c.link}" target="_blank" style="color: var(--accent-1); text-decoration: none; border-bottom: 1px dashed var(--accent-1); transition: all 0.3s;" onmouseover="this.style.color='var(--text-primary)'; this.style.borderBottomColor='var(--text-primary)'" onmouseout="this.style.color='var(--accent-1)'; this.style.borderBottomColor='var(--accent-1)'">${c.title} &nearr;</a></li>`;
        }
        return `<li>${c.title}</li>`;
      }).join('');
    }

    // 6. Projects
    renderProjects(data.projects);

    // 7. Store vault PINs and render Vault from data.json
    if (data.vault) {
      vaultConfig.view_pin = data.vault.view_pin || '1234';
      vaultConfig.download_pin = data.vault.download_pin || '0000';
      renderVault(data.vault);
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function renderProjects(projects) {
  const container = document.getElementById('dynamic-projects-container');
  const modalsContainer = document.getElementById('dynamic-modals-container');
  if (!container || !modalsContainer) return;

  container.innerHTML = '';
  modalsContainer.innerHTML = '';

  projects.forEach(p => {
    // Create Card
    const card = document.createElement('div');
    card.className = 'project-card magnetic-inner';
    card.dataset.project = p.id;
    card.innerHTML = `
      <div class="project-image" style="background-image: url('${p.image}'); background-size: cover; background-position: center;"></div>
      <div class="project-info">
        <h4>${p.short_title}</h4>
        <p>${p.short_description} <br><span style="color: var(--accent-1); font-size: 0.8rem; margin-top: 8px; display: inline-block;">Click to view details &rarr;</span></p>
      </div>
    `;
    container.appendChild(card);

    // Create Modal
    const modal = document.createElement('div');
    modal.className = 'modal glass-panel';
    modal.id = `modal-${p.id}`;
    
    let linkHTML = '';
    if (p.link) {
      linkHTML = `
        <a href="${p.link}" target="_blank" class="social-btn magnetic" style="display: inline-flex; align-items: center; margin-bottom: 24px; text-decoration: none; font-size: 0.95rem; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Visit Site
        </a>
      `;
    }

    const archList = p.architecture.map(item => `<li>${item}</li>`).join('');
    const featureList = p.features.map(item => `<li>${item}</li>`).join('');

    modal.innerHTML = `
      <button class="modal-close magnetic">&times;</button>
      <div class="modal-content">
        <h2 class="title">${p.title}</h2>
        <h3 class="subtitle gradient-text">${p.subtitle}</h3>
        ${linkHTML}
        <p>${p.long_description}</p>
        <h4>Technical Architecture</h4>
        <ul>${archList}</ul>
        <h4>Key Features</h4>
        <ul>${featureList}</ul>
      </div>
    `;
    modalsContainer.appendChild(modal);
  });

  bindModalEvents();
}

function bindModalEvents() {
  const projectCards = document.querySelectorAll('.project-card');
  const closeButtons = document.querySelectorAll('.modal-close');

  projectCards.forEach(card => {
    card.addEventListener('click', () => {
      const projectId = card.getAttribute('data-project');
      const modal = document.getElementById(`modal-${projectId}`);
      if (modal) {
        modalOverlay.classList.add('active');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
}

function renderVault(vaultData) {
  const fileList = document.getElementById('vault-file-list');
  const certList = document.getElementById('vault-cert-list');
  const btechList = document.getElementById('vault-btech-list');
  if (!fileList || !certList || !btechList) return;

  // Clear existing (except the back button for submenus)
  fileList.innerHTML = '';
  const backBtnHTML = `
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; cursor: pointer; transition: color 0.2s;" class="back-to-vault-main" onmouseover="this.style.color='var(--accent-1)'" onmouseout="this.style.color='var(--text-primary)'">
      <span style="font-size: 1.5rem;">⬅️</span> <h3 style="margin: 0; font-size: 1.2rem;">Back to Vault</h3>
    </div>
  `;
  certList.innerHTML = backBtnHTML;
  btechList.innerHTML = backBtnHTML;

  // Helper to generate vault item HTML
  const createItemHTML = (item, icon) => `
    <div class="vault-item">
      <div class="vault-item-info">
        <span class="vault-icon">${icon}</span> <span>${item.name}</span>
      </div>
      <div class="vault-actions">
        <button class="vault-action-btn" data-action="view" data-file="${item.url}">👁️ View</button>
        <button class="vault-action-btn" data-action="download" data-file="${item.url}">⬇️ Download</button>
      </div>
    </div>
  `;

  // 1. Marksheets
  if (vaultData.marksheets) {
    vaultData.marksheets.forEach(m => {
      fileList.innerHTML += createItemHTML(m, '🎓');
    });
  }

  // 1.5 B.Tech Marksheets (Folder Button in main list, items in btech list)
  if (vaultData.btech && vaultData.btech.length > 0) {
    fileList.innerHTML += `
      <div class="vault-item">
        <div class="vault-item-info">
          <span class="vault-icon">🎓</span> <span>B.Tech Marksheets</span>
        </div>
        <div class="vault-actions">
          <button class="vault-action-btn" id="open-btech-folder" style="border-color: var(--accent-1); color: var(--accent-1);">📁 Open Folder</button>
        </div>
      </div>
    `;
    vaultData.btech.forEach(m => {
      btechList.innerHTML += createItemHTML(m, '🎓');
    });
  }

  // 2. Certificates (Folder Button in main list, items in cert list)
  if (vaultData.certificates && vaultData.certificates.length > 0) {
    fileList.innerHTML += `
      <div class="vault-item">
        <div class="vault-item-info">
          <span class="vault-icon">📜</span> <span>Certificates</span>
        </div>
        <div class="vault-actions">
          <button class="vault-action-btn" id="open-cert-folder" style="border-color: var(--accent-1); color: var(--accent-1);">📁 Open Folder</button>
        </div>
      </div>
    `;
    vaultData.certificates.forEach(c => {
      certList.innerHTML += createItemHTML(c, '📜');
    });
  }

  // 3. Documents
  if (vaultData.documents) {
    vaultData.documents.forEach(d => {
      let icon = '📄';
      if (d.name.toLowerCase().includes('aadhar')) icon = '🆔';
      if (d.name.toLowerCase().includes('pan')) icon = '💳';
      if (d.name.toLowerCase().includes('pic')) icon = '🖼️';
      fileList.innerHTML += createItemHTML(d, icon);
    });
  }

  // Bind Open Folders dynamically
  const openCertFolderBtn = document.getElementById('open-cert-folder');
  if (openCertFolderBtn) {
    openCertFolderBtn.addEventListener('click', () => {
      fileList.style.display = 'none';
      certList.style.display = 'flex';
      currentMenuContext = 'cert';
    });
  }
  
  const openBtechFolderBtn = document.getElementById('open-btech-folder');
  if (openBtechFolderBtn) {
    openBtechFolderBtn.addEventListener('click', () => {
      fileList.style.display = 'none';
      btechList.style.display = 'flex';
      currentMenuContext = 'btech';
    });
  }

  // Re-bind back buttons (Done at the end so innerHTML += doesn't destroy the listeners)
  document.querySelectorAll('.back-to-vault-main').forEach(btn => {
    btn.addEventListener('click', () => {
      certList.style.display = 'none';
      btechList.style.display = 'none';
      fileList.style.display = 'flex';
      currentMenuContext = 'main';
    });
  });
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const isClickInside = e.target.closest('.modal') || e.target.closest('.project-card') || e.target.id === 'open-vault-btn' || e.target.closest('.vault-item');
  if (!isClickInside && modalOverlay.classList.contains('active')) {
    closeModal();
  }
});

document.addEventListener('DOMContentLoaded', loadData);

// --- 8. Secure Vault Logic ---
const openVaultBtn = document.getElementById('open-vault-btn');
const vaultModal = document.getElementById('modal-vault');
const vaultFileList = document.getElementById('vault-file-list');
const vaultPinView = document.getElementById('vault-pin-view');
const vaultPinInput = document.getElementById('vault-pin');
const vaultSubmitBtn = document.getElementById('vault-submit');
const vaultStatus = document.getElementById('vault-status');
const vaultBackBtn = document.getElementById('vault-back-btn');
const vaultPinTitle = document.getElementById('vault-pin-title');
const vaultPinDesc = document.getElementById('vault-pin-desc');
const vaultCertList = document.getElementById('vault-cert-list');
const openCertFolderBtn = document.getElementById('open-cert-folder');
const backToVaultMain = document.getElementById('back-to-vault-main');

let currentFile = null;
let currentAction = null;
let currentMenuContext = 'main'; // 'main' or 'cert'

if (openVaultBtn) {
  openVaultBtn.addEventListener('click', () => {
    vaultModal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Reset view to file list
    vaultFileList.style.display = 'flex';
    vaultPinView.style.display = 'none';
    if (vaultCertList) vaultCertList.style.display = 'none';
    const btechList = document.getElementById('vault-btech-list');
    if (btechList) btechList.style.display = 'none';
    currentMenuContext = 'main';
  });
}

if (openCertFolderBtn) {
  openCertFolderBtn.addEventListener('click', () => {
    vaultFileList.style.display = 'none';
    vaultCertList.style.display = 'flex';
    currentMenuContext = 'cert';
  });
}

if (backToVaultMain) {
  backToVaultMain.addEventListener('click', () => {
    vaultCertList.style.display = 'none';
    vaultFileList.style.display = 'flex';
    currentMenuContext = 'main';
  });
}

// Handle action button clicks (View/Download) via Event Delegation
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('vault-action-btn') && e.target.hasAttribute('data-action')) {
    currentAction = e.target.dataset.action; // 'view' or 'download'
    currentFile = e.target.dataset.file;
    
    const docName = e.target.closest('.vault-item').querySelector('.vault-item-info span:nth-child(2)').textContent;
    
    vaultFileList.style.display = 'none';
    if (vaultCertList) vaultCertList.style.display = 'none';
    const vaultBtechList = document.getElementById('vault-btech-list');
    if (vaultBtechList) vaultBtechList.style.display = 'none';
    vaultPinView.style.display = 'block';
    
    if (currentAction === 'view') {
      vaultPinTitle.textContent = `Unlock ${docName}`;
      vaultPinDesc.textContent = 'Enter your PIN to view this document.';
    } else {
      vaultPinTitle.textContent = `Download ${docName}`;
      vaultPinDesc.textContent = 'Enter the special Download PIN.';
    }
    
    vaultPinInput.value = '';
    vaultStatus.textContent = '';
    vaultPinInput.classList.remove('shake');
    setTimeout(() => vaultPinInput.focus(), 100);
  }
});

if (vaultBackBtn) {
  vaultBackBtn.addEventListener('click', () => {
    vaultPinView.style.display = 'none';
    if (currentMenuContext === 'cert') {
      vaultCertList.style.display = 'flex';
    } else if (currentMenuContext === 'btech') {
      const vaultBtechList = document.getElementById('vault-btech-list');
      if (vaultBtechList) vaultBtechList.style.display = 'flex';
    } else {
      vaultFileList.style.display = 'flex';
    }
  });
}

if (vaultSubmitBtn) {
  vaultSubmitBtn.addEventListener('click', handleVaultUnlock);
  vaultPinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleVaultUnlock();
  });
}

async function handleVaultUnlock() {
  let pin = vaultPinInput.value;
  if (!pin) return;
  
  // Use dynamic PINs from data.json
  const REAL_DECRYPT_PIN = vaultConfig.view_pin;
  const SPECIAL_DOWNLOAD_PIN = vaultConfig.download_pin;
  
  if (currentAction === 'download') {
    if (pin === SPECIAL_DOWNLOAD_PIN) {
      pin = REAL_DECRYPT_PIN; // Map to the real mathematical key
    } else {
      showPinError('Access Denied: Incorrect Download PIN');
      return;
    }
  } else {
    // Action is view
    if (pin !== REAL_DECRYPT_PIN) {
        // Let the crypto API fail naturally or fail early
        showPinError('Access Denied: Incorrect PIN');
        return;
    }
  }

  vaultStatus.style.color = 'var(--text-primary)';
  vaultStatus.textContent = 'Decrypting...';
  vaultPinInput.classList.remove('shake');
  
  try {
    let fetchUrl = currentFile.startsWith('http') ? currentFile : `${API_BASE_URL}${currentFile.startsWith('/') ? '' : '/'}${currentFile}`;
    let response = await fetch(fetchUrl);
    
    if (!response.ok) {
       console.warn(`File ${currentFile} not found, falling back to dummy certificate for demo.`);
       fetchUrl = `${API_BASE_URL}/vault/certificate_design_thinking.pdf.enc`;
       response = await fetch(fetchUrl);
       if (!response.ok) throw new Error('Encrypted file not found.');
    }
    
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Format: [Salt (16)] + [IV (12)] + [Auth Tag (16)] + [Ciphertext]
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const authTag = data.slice(28, 44);
    const ciphertext = data.slice(44);
    
    const encryptedContent = new Uint8Array(ciphertext.length + authTag.length);
    encryptedContent.set(ciphertext, 0);
    encryptedContent.set(authTag, ciphertext.length);

    // Derive Key
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(pin), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
    );
    
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedContent
    );

    // Success
    vaultStatus.style.color = 'var(--accent-1)';
    
    const isImage = currentFile.endsWith('.png.enc') || currentFile.includes('pic');
    const mimeType = isImage ? 'image/png' : 'application/pdf';
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    if (currentAction === 'download') {
      vaultStatus.textContent = 'Decryption successful! Downloading...';
      const a = document.createElement('a');
      a.href = url;
      a.download = isImage ? `${currentFile}.png` : `${currentFile}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      vaultStatus.textContent = 'Decryption successful! Opening...';
      window.open(url, '_blank');
    }
    
    setTimeout(() => {
      vaultPinView.style.display = 'none';
      if (currentMenuContext === 'cert') {
        vaultCertList.style.display = 'flex';
      } else if (currentMenuContext === 'btech') {
        const vaultBtechList = document.getElementById('vault-btech-list');
        if (vaultBtechList) vaultBtechList.style.display = 'flex';
      } else {
        vaultFileList.style.display = 'flex';
      }
      vaultPinInput.value = '';
      vaultStatus.textContent = '';
      // We do NOT close the modal anymore so the user stays in the vault
    }, 1500);
    
  } catch (error) {
    console.error("Decryption failed:", error);
    showPinError('Decryption mathematical failure.');
  }
}

function showPinError(msg) {
    vaultStatus.style.color = 'var(--accent-3)';
    vaultStatus.textContent = msg;
    vaultPinInput.classList.add('shake');
    setTimeout(() => vaultPinInput.classList.remove('shake'), 500);
}
closeButtons.forEach(btn => {
  btn.addEventListener('click', closeModal);
});

modalOverlay.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
