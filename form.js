(function() {
  // DOM Elements
  const form = document.getElementById('complaintForm');
  const description = document.getElementById('description');
  const charCount = document.getElementById('charCount');
  const micBtn = document.getElementById('micSpeechBtn');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseFilesBtn');
  const previewContainer = document.getElementById('previewContainer');
  const resetBtn = document.getElementById('resetFormBtn');
  const successModal = document.getElementById('successModal');
  const complaintIdDisplay = document.getElementById('complaintIdDisplay');
  const closeModalBtn = document.getElementById('closeSuccessModal');

  let selectedFiles = [];

  // Character Counter
  function updateCharCount() {
    if (charCount && description) {
      charCount.innerText = description.value.length;
    }
  }
  
  if (description) {
    description.addEventListener('input', updateCharCount);
    updateCharCount();
  }

  // Speech Recognition
  if (micBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    
    micBtn.addEventListener('click', () => {
      try {
        recognition.start();
        micBtn.innerHTML = '<i class="fas fa-microphone-alt"></i> Listening...';
        micBtn.style.background = '#347a5b';
      } catch(e) {
        showToast("Microphone error, please try again.");
      }
    });
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (description) {
        description.value += (description.value ? ' ' : '') + transcript;
        updateCharCount();
      }
      micBtn.innerHTML = '<i class="fas fa-microphone"></i> Can\'t type? Click & speak';
      micBtn.style.background = '#1f6046';
    };
    
    recognition.onerror = () => {
      micBtn.innerHTML = '<i class="fas fa-microphone"></i> Can\'t type? Click & speak';
      micBtn.style.background = '#1f6046';
      showToast("Mic access denied. Please type your complaint.");
    };
    
    recognition.onend = () => {
      micBtn.innerHTML = '<i class="fas fa-microphone"></i> Can\'t type? Click & speak';
      micBtn.style.background = '#1f6046';
    };
  } else if (micBtn) {
    micBtn.disabled = true;
    micBtn.style.opacity = 0.5;
    micBtn.title = "Speech not supported in this browser";
  }

  // Preview Images
  function renderPreviews() {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    
    selectedFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';
        
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'preview-img';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-preview';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
          selectedFiles.splice(idx, 1);
          renderPreviews();
          // Update file input
          updateFileInput();
        };
        
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        previewContainer.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    });
  }

  // Update file input with selected files
  function updateFileInput() {
    if (fileInput) {
      const dt = new DataTransfer();
      selectedFiles.forEach(file => dt.items.add(file));
      fileInput.files = dt.files;
    }
  }

  function addFiles(files) {
    for (let file of files) {
      if (file.type.startsWith('image/') && (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png')) {
        if (selectedFiles.length < 6) {
          selectedFiles.push(file);
        } else {
          showToast("Maximum 6 images allowed");
          break;
        }
      } else {
        showToast("Only JPG, JPEG, PNG images are allowed");
      }
    }
    renderPreviews();
    updateFileInput();
  }

  // File Upload Handlers
  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput?.click());
    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput?.click();
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        addFiles(Array.from(e.target.files));
        // Reset file input so same file can be selected again
        e.target.value = '';
      });
    }
    
    // Drag and drop
    ['dragenter', 'dragover'].forEach(ev => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });
    
    ['dragleave', 'drop'].forEach(ev => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files) {
        addFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  // Toast Notification
  function showToast(message, duration = 3000) {
    let toast = document.querySelector('.toast-msg');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-msg';
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        padding: 12px 24px;
        border-radius: 10px;
        font-size: 14px;
        z-index: 9999;
        display: none;
        max-width: 90%;
        text-align: center;
        border: 1px solid rgba(125, 255, 106, 0.2);
      `;
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }

  // Form Submit - WITH FILE UPLOAD
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form values
      const fullName = document.getElementById('fullName')?.value.trim();
      const mobile = document.getElementById('mobile')?.value.trim();
      const village = document.querySelector('select[name="village_id"]')?.value;
      const ward = document.getElementById('ward')?.value.trim();
      const category = document.getElementById('category')?.value;
      const title = document.getElementById('title')?.value.trim();
      const desc = description?.value.trim();
      const confirmCheck = document.getElementById('confirmCheck')?.checked;
      
      // Validate
      if (!fullName || !mobile || !village || !category || !title || !desc) {
        showToast("Please fill all required fields");
        return;
      }
      
      if (!/^\d{10}$/.test(mobile)) {
        showToast("Please enter a valid 10-digit mobile number");
        return;
      }
      
      if (!confirmCheck) {
        showToast("Please confirm that the information is accurate");
        return;
      }

      // Create FormData for file upload
      const formData = new FormData(form);
      
      // Add files to FormData
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file, index) => {
          formData.append('images[]', file);
        });
      }

      // Show loading state
      const submitBtn = form.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      submitBtn.disabled = true;

      try {
        // Send to server
        const response = await fetch('action/submit_complaint.php', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.status === 'success') {
          // Show success
          if (complaintIdDisplay) {
            complaintIdDisplay.innerText = result.complaint_id;
          }
          if (successModal) {
            successModal.style.display = 'flex';
          }
          
          // Reset form
          setTimeout(() => {
            form.reset();
            selectedFiles = [];
            renderPreviews();
            updateFileInput();
            if (description) description.value = '';
            updateCharCount();
            if (document.getElementById('confirmCheck')) {
              document.getElementById('confirmCheck').checked = false;
            }
          }, 500);
          
          showToast("Complaint registered successfully!");
        } else {
          showToast(result.message || "Failed to submit complaint");
        }
      } catch (error) {
        showToast("Error submitting complaint. Please try again.");
        console.error('Error:', error);
      } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Reset Button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (form) form.reset();
      selectedFiles = [];
      renderPreviews();
      updateFileInput();
      if (description) description.value = '';
      updateCharCount();
      showToast("Form has been reset", 1800);
    });
  }

  // Close Success Modal
  if (closeModalBtn && successModal) {
    closeModalBtn.addEventListener('click', () => {
      successModal.style.display = 'none';
      showToast("Thank you for raising your voice!", 2000);
    });
    
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.style.display = 'none';
      }
    });
  }
})();