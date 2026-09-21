document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('js-ready');

  const input = document.querySelector('[data-file-input]');
  const name = document.querySelector('[data-file-name]');
  const zone = document.querySelector('[data-upload-zone]');
  const quality = document.querySelector('input[name="quality"]');
  const label = document.querySelector('[data-quality]');
  const processingForm = document.querySelector('[data-processing-form]');
  const submitButton = document.querySelector('[data-submit-button]');
  const formatPicker = document.querySelector('[data-format-picker]');
  const formatTrigger = document.querySelector('[data-format-trigger]');
  const formatDropdown = document.querySelector('[data-format-dropdown]');
  const formatCurrent = document.querySelector('[data-format-current]');
  const formatSearch = document.querySelector('[data-format-search]');
  const formatOptions = document.querySelector('[data-format-options]');
  const formatSelect = formatPicker ? formatPicker.querySelector('select') : null;
  const homeSearch = document.querySelector('[data-home-search] input');
  const searchItems = Array.from(document.querySelectorAll('[data-search-item]'));
  const searchGroups = Array.from(document.querySelectorAll('[data-search-group]'));
  const searchEmpty = document.querySelector('[data-search-empty]');

  const renderFileNames = () => {
    if (!input || !name) return;
    name.innerHTML = '';
    if (!input.files.length) {
      return;
    }
    const files = Array.from(input.files);
    const heading = document.createElement('strong');
    heading.textContent = `${files.length} file${files.length === 1 ? '' : 's'} selected`;
    name.appendChild(heading);

    const list = document.createElement('span');
    list.className = 'selected-file-list';
    files.forEach((file) => {
      const item = document.createElement('span');
      item.className = 'selected-file';
      item.textContent = `${file.name} (${formatFileSize(file.size)})`;
      list.appendChild(item);
    });
    name.appendChild(list);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (input) input.addEventListener('change', renderFileNames);
  if (zone && input) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      zone.addEventListener(eventName, (event) => {
        event.preventDefault();
        zone.classList.add('dragging');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      zone.addEventListener(eventName, (event) => {
        event.preventDefault();
        zone.classList.remove('dragging');
      });
    });
    zone.addEventListener('drop', (event) => {
      input.files = event.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    });
  }
  if (quality && label) {
    label.textContent = `${quality.value}%`;
    quality.addEventListener('input', () => {
      label.textContent = `${quality.value}%`;
    });
  }

  if (processingForm && submitButton) {
    submitButton.addEventListener('click', (event) => {
      if (!input || input.files.length) return;
      event.preventDefault();
      alert('Please select a file before continuing.');
      input.focus();
    });

    const modal = document.getElementById('processingModal');
    const procModeTag = document.getElementById('procModeTag');
    const procTitle = document.getElementById('procTitle');
    const procSubtitle = document.getElementById('procSubtitle');
    const sceneUpload = document.getElementById('sceneUpload');
    const sceneCompress = document.getElementById('sceneCompress');
    const sceneConvert = document.getElementById('sceneConvert');
    const sceneMerge = document.getElementById('sceneMerge');
    const sceneError = document.getElementById('sceneError');
    const uploadPercent = document.getElementById('uploadPercent');
    const uploadBytes = document.getElementById('uploadBytes');
    const procProgressBar = document.getElementById('procProgressBar');
    const stepUpload = document.getElementById('stepUpload');
    const stepProcess = document.getElementById('stepProcess');
    const stepFinish = document.getElementById('stepFinish');
    const retryBtn = document.getElementById('retryBtn');

    if (retryBtn && modal) {
      retryBtn.addEventListener('click', () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        submitButton.disabled = false;
        submitButton.classList.remove('is-processing');
        submitButton.removeAttribute('aria-busy');
      });
    }

    processingForm.addEventListener('submit', (event) => {
      if (!input || !input.files.length) {
        event.preventDefault();
        alert('Please select a file before continuing.');
        input.focus();
        return;
      }
      if (!processingForm.checkValidity()) {
        event.preventDefault();
        processingForm.reportValidity();
        return;
      }

      // If modal elements don't exist, allow fallback submission
      if (!modal || !sceneUpload || !procProgressBar) {
        const labelNode = submitButton.querySelector('.button-label');
        submitButton.classList.add('is-processing');
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
        if (labelNode && submitButton.dataset.loadingText) {
          labelNode.textContent = submitButton.dataset.loadingText;
        }
        return;
      }

      event.preventDefault();

      const opInput = processingForm.querySelector('input[name="operation"]');
      const operation = opInput ? opInput.value : 'compress';
      const file = input.files[0];
      const fileNameParts = file.name.toLowerCase().split('.');
      const sourceExt = fileNameParts.length > 1 ? fileNameParts.pop() : '';
      const targetFormat = formatSelect ? formatSelect.value : '';

      // Reset modal state
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      submitButton.disabled = true;
      submitButton.classList.add('is-processing');

      if (sceneUpload) sceneUpload.hidden = false;
      if (sceneCompress) sceneCompress.hidden = true;
      if (sceneConvert) sceneConvert.hidden = true;
      if (sceneMerge) sceneMerge.hidden = true;
      if (sceneError) sceneError.hidden = true;

      if (stepUpload) stepUpload.className = 'proc-step active';
      if (stepProcess) stepProcess.className = 'proc-step';
      if (stepFinish) stepFinish.className = 'proc-step';

      if (procModeTag) procModeTag.textContent = 'UPLOADING';
      if (procTitle) procTitle.textContent = input.files.length > 1 ? `Uploading ${input.files.length} files...` : 'Uploading your file...';
      if (procSubtitle) procSubtitle.textContent = 'Securing connection and streaming bytes to the engine';
      if (uploadPercent) uploadPercent.textContent = '0%';
      if (uploadBytes) uploadBytes.textContent = `0 B / ${formatFileSize(file.size)}`;
      if (procProgressBar) procProgressBar.style.width = '0%';

      const formData = new FormData(processingForm);
      const xhr = new XMLHttpRequest();
      let processInterval = null;

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && uploadPercent && uploadBytes && procProgressBar) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          uploadPercent.textContent = `${pct}%`;
          uploadBytes.textContent = `${formatFileSize(evt.loaded)} / ${formatFileSize(evt.total)}`;
          procProgressBar.style.width = `${Math.min(40, Math.round(pct * 0.4))}%`;
        }
      };

      xhr.upload.onload = () => {
        // Upload finished -> transition to processing stage
        if (stepUpload) stepUpload.className = 'proc-step done';
        if (stepProcess) stepProcess.className = 'proc-step active';
        if (sceneUpload) sceneUpload.hidden = true;

        if (operation === 'compress') {
          if (sceneCompress) sceneCompress.hidden = false;
          if (procModeTag) procModeTag.textContent = 'COMPRESSING';
          if (procTitle) procTitle.textContent = 'Compressing your file...';
          if (procSubtitle) procSubtitle.textContent = 'Optimizing streams & compacting assets without compromise';
          const badge = document.getElementById('compressBadge');
          if (badge) badge.textContent = (sourceExt || 'FILE').toUpperCase();
        } else if (operation === 'convert') {
          if (sceneConvert) sceneConvert.hidden = false;
          if (procModeTag) procModeTag.textContent = 'CONVERTING';
          const targetName = targetFormat ? targetFormat.toUpperCase() : 'PDF';
          if (procTitle) procTitle.textContent = `Converting ${sourceExt ? sourceExt.toUpperCase() + ' ' : ''}to ${targetName}...`;
          if (procSubtitle) procSubtitle.textContent = 'Translating document layout, typography and media streams';
          const sBadge = document.getElementById('sourceBadge');
          const tBadge = document.getElementById('targetBadge');
          if (sBadge) sBadge.textContent = (sourceExt || 'FILE').toUpperCase();
          if (tBadge) tBadge.textContent = targetName;
        } else if (operation === 'merge') {
          if (sceneMerge) sceneMerge.hidden = false;
          if (procModeTag) procModeTag.textContent = 'MERGING';
          if (procTitle) procTitle.textContent = `Merging ${input.files.length} files into one PDF...`;
          if (procSubtitle) procSubtitle.textContent = 'Sequencing pages and consolidating into a unified document';
        } else {
          if (sceneCompress) sceneCompress.hidden = false;
          if (procModeTag) procModeTag.textContent = 'PROCESSING';
          if (procTitle) procTitle.textContent = 'Processing archive...';
          if (procSubtitle) procSubtitle.textContent = 'Packaging files safely';
        }

        // Animate progress smoothly through processing stage
        let currentWidth = 40;
        processInterval = setInterval(() => {
          if (currentWidth < 90) {
            currentWidth += Math.random() * 8 + 2;
            if (currentWidth > 90) currentWidth = 90;
            if (procProgressBar) procProgressBar.style.width = `${Math.round(currentWidth)}%`;
          }
        }, 300);
      };

      xhr.onload = () => {
        if (processInterval) clearInterval(processInterval);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.success && res.redirect_url) {
              if (procProgressBar) procProgressBar.style.width = '100%';
              if (stepProcess) stepProcess.className = 'proc-step done';
              if (stepFinish) stepFinish.className = 'proc-step active done';
              if (procTitle) procTitle.textContent = 'Processing complete!';
              if (procSubtitle) procSubtitle.textContent = 'Redirecting to your download...';
              setTimeout(() => {
                window.location.href = res.redirect_url;
              }, 400);
              return;
            }
          } catch (_e) {
            // Not JSON or direct redirect
            if (xhr.responseURL) {
              window.location.href = xhr.responseURL;
              return;
            }
          }
        }

        // Error handling
        let errorMessage = 'An error occurred during file processing.';
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error_message) {
            errorMessage = errRes.error_message;
          }
        } catch (_e) {
          if (xhr.statusText) errorMessage = xhr.statusText;
        }

        if (sceneUpload) sceneUpload.hidden = true;
        if (sceneCompress) sceneCompress.hidden = true;
        if (sceneConvert) sceneConvert.hidden = true;
        if (sceneMerge) sceneMerge.hidden = true;
        if (sceneError) sceneError.hidden = false;

        const errorMsgEl = document.getElementById('errorModalMsg');
        if (errorMsgEl) errorMsgEl.textContent = errorMessage;
        if (procModeTag) procModeTag.textContent = 'ERROR';
        if (procTitle) procTitle.textContent = 'Processing could not complete';
        if (procSubtitle) procSubtitle.textContent = 'Please check the details below or try another file';
        if (stepProcess) stepProcess.className = 'proc-step';
      };

      xhr.onerror = () => {
        if (processInterval) clearInterval(processInterval);
        if (sceneUpload) sceneUpload.hidden = true;
        if (sceneCompress) sceneCompress.hidden = true;
        if (sceneConvert) sceneConvert.hidden = true;
        if (sceneMerge) sceneMerge.hidden = true;
        if (sceneError) sceneError.hidden = false;

        const errorMsgEl = document.getElementById('errorModalMsg');
        if (errorMsgEl) errorMsgEl.textContent = 'Network error: could not connect to server.';
        if (procModeTag) procModeTag.textContent = 'NETWORK ERROR';
        if (procTitle) procTitle.textContent = 'Connection Failed';
      };

      xhr.open('POST', processingForm.action || window.location.href);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send(formData);
    });
  }

  if (homeSearch && searchItems.length) {
    const filterHome = () => {
      const query = homeSearch.value.trim().toLowerCase();
      let matches = 0;

      searchItems.forEach((item) => {
        const visible = !query || item.dataset.searchItem.toLowerCase().includes(query);
        item.hidden = !visible;
        if (visible) matches += 1;
      });

      searchGroups.forEach((group) => {
        group.hidden = !group.querySelector('[data-search-item]:not([hidden])');
      });
      if (searchEmpty) searchEmpty.hidden = !query || matches > 0;
    };

    homeSearch.addEventListener('input', filterHome);
  }

  if (formatPicker && formatOptions && formatSelect) {
    const compatibility = {
      pdf: ['docx', 'doc', 'txt', 'jpg', 'png', 'html'],
      jpg: ['png', 'webp', 'bmp', 'tiff', 'pdf'],
      jpeg: ['png', 'webp', 'bmp', 'tiff', 'pdf'],
      png: ['jpg', 'webp', 'bmp', 'tiff', 'pdf'],
      webp: ['jpg', 'png', 'bmp'],
      bmp: ['jpg', 'png', 'webp'],
      tif: ['jpg', 'png', 'webp'],
      tiff: ['jpg', 'png', 'webp'],
      gif: ['png', 'jpg', 'webp'],
      heic: ['jpg', 'png', 'webp'],
      heif: ['jpg', 'png', 'webp'],
      doc: ['pdf', 'docx', 'txt'],
      docx: ['pdf', 'txt', 'html', 'doc'],
      rtf: ['pdf', 'docx', 'txt'],
      odt: ['pdf', 'docx', 'txt'],
      ppt: ['pdf', 'txt'],
      pptx: ['pdf', 'txt'],
      xls: ['pdf', 'csv', 'xlsx', 'txt'],
      xlsx: ['pdf', 'csv', 'txt', 'html'],
      csv: ['xlsx', 'pdf', 'txt'],
      txt: ['pdf', 'docx', 'html'],
      html: ['pdf', 'txt', 'docx'],
      htm: ['pdf', 'txt', 'docx'],
      md: ['pdf', 'html', 'txt', 'docx'],
      markdown: ['pdf', 'html', 'txt', 'docx'],
      mp4: ['mov', 'avi', 'mkv', 'webm', 'mp3', 'wav'],
      mov: ['mp4', 'mp3', 'wav'],
      avi: ['mp4', 'mp3'],
      mkv: ['mp4', 'mp3', 'wav'],
      webm: ['mp4', 'mp3', 'wav'],
      mp3: ['wav', 'm4a', 'aac', 'flac', 'ogg'],
      wav: ['mp3', 'm4a', 'aac', 'flac', 'ogg'],
      m4a: ['mp3', 'wav'],
      aac: ['mp3', 'wav'],
      flac: ['mp3', 'wav'],
      ogg: ['mp3', 'wav'],
    };

    const smartDefaults = {
      pdf: 'docx',
      docx: 'pdf',
      doc: 'pdf',
      odt: 'pdf',
      rtf: 'pdf',
      txt: 'pdf',
      xlsx: 'csv',
      xls: 'csv',
      csv: 'xlsx',
      pptx: 'pdf',
      ppt: 'pdf',
      jpg: 'png',
      jpeg: 'png',
      png: 'jpg',
      webp: 'png',
      gif: 'png',
      bmp: 'png',
      heic: 'jpg',
      mp4: 'mp3',
      mov: 'mp3',
      mkv: 'mp3',
      webm: 'mp3',
      mp3: 'wav',
      wav: 'mp3',
    };

    const selectedExtension = () => {
      if (!input || !input.files.length) return '';
      const parts = input.files[0].name.toLowerCase().split('.');
      return parts.length > 1 ? parts.pop() : '';
    };

    const readOptions = () => Array.from(formatSelect.children).flatMap((child) => {
      if (child.tagName === 'OPTGROUP') {
        return Array.from(child.children).map((option) => ({
          group: child.label,
          label: option.textContent.trim(),
          value: option.value,
        }));
      }
      return [{
        group: 'Default',
        label: child.textContent.trim(),
        value: child.value,
      }];
    });

    const formats = readOptions();

    const updateTriggerText = () => {
      if (!formatCurrent) return;
      const currentVal = formatSelect.value;
      const selected = formats.find((f) => f.value === currentVal);
      if (selected && selected.value) {
        formatCurrent.textContent = `${selected.label} (${selected.group})`;
      } else {
        formatCurrent.textContent = 'Same as uploaded';
      }
    };

    const toggleDropdown = (openState) => {
      if (!formatDropdown) return;
      const willOpen = typeof openState === 'boolean' ? openState : formatDropdown.hidden;
      if (willOpen) {
        formatDropdown.hidden = false;
        formatPicker.classList.add('open');
        if (formatTrigger) formatTrigger.setAttribute('aria-expanded', 'true');
        if (formatSearch) {
          formatSearch.value = '';
          renderFormats();
          setTimeout(() => formatSearch.focus(), 60);
        }
      } else {
        formatDropdown.hidden = true;
        formatPicker.classList.remove('open');
        if (formatTrigger) formatTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    const renderFormats = () => {
      const query = formatSearch ? formatSearch.value.trim().toLowerCase() : '';
      const ext = selectedExtension();
      const allowed = compatibility[ext] || null;
      const visible = formats.filter((format) => {
        const content = `${format.label} ${format.value} ${format.group}`.toLowerCase();
        const compatible = !allowed || !format.value || allowed.includes(format.value);
        return compatible && (!query || content.includes(query));
      });

      formatOptions.innerHTML = '';
      visible.forEach((format) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `format-option-btn${format.value === formatSelect.value ? ' selected' : ''}`;
        button.dataset.value = format.value;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', format.value === formatSelect.value ? 'true' : 'false');
        button.innerHTML = `<span>${format.label}</span><small>${format.group}</small>`;
        formatOptions.appendChild(button);
      });

      if (!visible.length) {
        const empty = document.createElement('p');
        empty.className = 'format-empty';
        empty.textContent = ext ? `No supported target formats for .${ext}` : 'No matching formats found';
        formatOptions.appendChild(empty);
      }
    };

    updateTriggerText();
    renderFormats();

    if (formatTrigger) {
      formatTrigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleDropdown();
      });
    }

    if (formatSearch) {
      formatSearch.addEventListener('input', () => {
        renderFormats();
      });
      formatSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          toggleDropdown(false);
          if (formatTrigger) formatTrigger.focus();
        }
      });
    }

    formatOptions.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-value]');
      if (!button) return;
      formatSelect.value = button.dataset.value;
      formatSelect.dispatchEvent(new Event('change', { bubbles: true }));
      updateTriggerText();
      renderFormats();
      toggleDropdown(false);
      if (formatTrigger) formatTrigger.focus();
    });

    document.addEventListener('click', (event) => {
      if (formatPicker && !formatPicker.contains(event.target)) {
        toggleDropdown(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && formatDropdown && !formatDropdown.hidden) {
        toggleDropdown(false);
        if (formatTrigger) formatTrigger.focus();
      }
    });

    if (input) {
      input.addEventListener('change', () => {
        const ext = selectedExtension();
        if (ext) {
          const allowed = compatibility[ext];
          const defaultTarget = smartDefaults[ext];
          const exists = defaultTarget && formats.some((f) => f.value === defaultTarget);
          if (exists) {
            formatSelect.value = defaultTarget;
          } else if (allowed && formatSelect.value && !allowed.includes(formatSelect.value)) {
            formatSelect.value = allowed[0] || '';
          }
        }
        updateTriggerText();
        renderFormats();
      });
    }
  }

  // Cookie Consent Banner Controller
  const cookieBanner = document.getElementById('cookieConsentBanner');
  const btnAccept = document.getElementById('btnAcceptCookies');
  const btnEssential = document.getElementById('btnEssentialCookies');

  if (cookieBanner) {
    try {
      const consent = localStorage.getItem('thuna_cookie_consent');
      if (!consent) {
        setTimeout(() => {
          cookieBanner.hidden = false;
          requestAnimationFrame(() => {
            cookieBanner.classList.add('is-visible');
          });
        }, 400);
      }

      const dismissBanner = (preference) => {
        localStorage.setItem('thuna_cookie_consent', preference);
        cookieBanner.classList.remove('is-visible');
        setTimeout(() => {
          cookieBanner.hidden = true;
        }, 350);
      };

      if (btnAccept) {
        btnAccept.addEventListener('click', () => dismissBanner('all'));
      }
      if (btnEssential) {
        btnEssential.addEventListener('click', () => dismissBanner('essential'));
      }
    } catch (_e) {
      // LocalStorage access may be restricted in private browsing
    }
  }
});

