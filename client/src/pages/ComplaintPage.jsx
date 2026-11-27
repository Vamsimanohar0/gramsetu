import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import ComplaintMapPicker from '../components/ComplaintMapPicker';
import { apiRequest } from '../services/api';
import '../styles/complaint.css';
import '../styles/features.css';

const CATEGORIES = [
  'Road Damage',
  'Street Light',
  'Drainage Issue',
  'Water Supply',
  'Garbage Collection',
  'Public Safety',
  'Other',
];

export default function ComplaintPage() {
  const [villages, setVillages] = useState([]);
  const [villagesLoading, setVillagesLoading] = useState(true);
  const [villagesError, setVillagesError] = useState(false);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [villageId, setVillageId] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [confirmCheck, setConfirmCheck] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [voiceNotice, setVoiceNotice] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [submittedId, setSubmittedId] = useState('');

  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    document.title = 'GRAMSETU';
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop cleanup errors
        }
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest('/api/villages')
      .then((data) => {
        if (active) {
          setVillages(Array.isArray(data.villages) ? data.villages : []);
          setVillagesError(false);
        }
      })
      .catch(() => {
        if (active) setVillagesError(true);
      })
      .finally(() => {
        if (active) setVillagesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const showToast = (message, duration = 3000) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), duration);
  };

  const addFiles = (incoming) => {
    const validToAdd = [];
    let currentCount = selectedFiles.length;

    for (const file of incoming) {
      const isValidType =
        file.type.startsWith('image/') &&
        (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png');
      if (!isValidType) {
        showToast('Only JPG, JPEG, PNG images are allowed');
        continue;
      }
      if (currentCount < 6) {
        validToAdd.push(file);
        currentCount += 1;
      } else {
        showToast('Maximum 6 images allowed');
        break;
      }
    }

    if (validToAdd.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validToAdd]);
    }
  };

  const removeFileAt = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSpeechClick = () => {
    if (!speechSupported) {
      setVoiceNotice('Voice input is not supported in this browser. Please type your description below.');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        setIsListening(false);
      }
      return;
    }

    setVoiceNotice('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = voiceLang;

    recognition.onresult = (event) => {
      let transcriptChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal && event.results[i][0]) {
          transcriptChunk += `${event.results[i][0].transcript} `;
        }
      }
      const cleaned = transcriptChunk.trim();
      if (!cleaned) return;
      setDescription((prev) => {
        const next = prev ? `${prev.trim()} ${cleaned}` : cleaned;
        return next.slice(0, 1000);
      });
    };

    // recognition.onerror = (event) => {
    //   setIsListening(false);
    //   const errCode = event?.error || '';
    //   if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
    //     const msg = 'Microphone permission was denied. Allow mic access or type manually.';
    //     setVoiceNotice(msg);
    //     showToast(msg);
    //   } else if (errCode === 'language-not-supported') {
    //     const msg = `Selected voice language (${voiceLang === 'te-IN' ? 'Telugu' : 'English'}) is not supported by this browser. Try English or type manually.`;
    //     setVoiceNotice(msg);
    //     showToast(msg);
    //   } else if (errCode === 'no-speech') {
    //     setVoiceNotice('No speech detected. Speak clearly and try again, or type manually.');
    //   } else if (errCode === 'audio-capture') {
    //     setVoiceNotice('No microphone detected on this device. Please type your complaint.');
    //   } else {
    //     setVoiceNotice('Voice recognition stopped due to an error. You can continue typing manually.');
    //   }
    // };
    recognition.onerror = (event) => {
  console.error('GRAMSETU SPEECH ERROR:', event.error);
  console.error('SPEECH ERROR DETAILS:', event);

  setIsListening(false);

  setVoiceNotice(
    `Voice recognition error: ${event.error}. Please try again or type manually.`
  );
};

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setVoiceNotice(
        `Listening in ${voiceLang === 'te-IN' ? 'తెలుగు (te-IN)' : 'English (en-IN)'}... Click Stop when finished. Review before submitting.`
      );
      } catch (error) {
  console.error('GRAMSETU SPEECH START ERROR:', error);

  recognitionRef.current = null;
  setIsListening(false);

  setVoiceNotice(
    `Could not start microphone: ${error.message}`
  );
}
    // } catch {
    //   recognitionRef.current = null;
    //   setIsListening(false);
    //   showToast('Microphone error, please try again or type manually.');
    // }
  };

  const resetFormState = () => {
    setName('');
    setMobile('');
    setVillageId('');
    setWardNo('');
    setCategory('');
    setTitle('');
    setDescription('');
    setConfirmCheck(false);
    setSelectedFiles([]);
    setLatitude(null);
    setLongitude(null);
    setLocationSource(null);
    setVoiceNotice('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName || !trimmedMobile || !villageId || !category || !trimmedTitle || !trimmedDesc) {
      showToast('Please fill all required fields');
      return;
    }

    if (!/^\d{10}$/.test(trimmedMobile)) {
      showToast('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!confirmCheck) {
      showToast('Please confirm that the information is accurate');
      return;
    }

    const formData = new FormData();
    formData.append('name', trimmedName);
    formData.append('mobile', trimmedMobile);
    formData.append('village_id', villageId);
    formData.append('ward_no', wardNo.trim());
    formData.append('category', category);
    formData.append('title', trimmedTitle);
    formData.append('description', trimmedDesc);
    if (latitude !== null && longitude !== null) {
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      if (locationSource) {
        formData.append('location_source', locationSource);
      }
    }
    selectedFiles.forEach((file) => {
      formData.append('images[]', file);
    });

    setSubmitting(true);
    try {
      const result = await apiRequest('/api/complaints', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      setSubmittedId(result.complaint_id);
      resetFormState();
      showToast('Complaint registered successfully!');
    } catch (err) {
      showToast(err.message || 'Error submitting complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-complaint">
      <Navbar />

      <section className="banner">
        <video className="banner-video" autoPlay loop muted playsInline>
          <source src="/banner.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="banner-overlay" />
        <div className="banner-content">
          <p className="banner-text">
            <br />
            <br />
          </p>
          <h1 className="raise">
            &quot;Raise Your Voice,&quot;
            <br />
            <span className="accent">Improve Your Village</span>
          </h1>
          <span className="form-badge">📢 Register a Complaint</span>
        </div>
      </section>

      <div className="form-wrapper">
        <div className="form-container">
          <br />
          <form id="complaintForm" className="complaint-form" onSubmit={handleSubmit} noValidate>
            {/* PERSONAL INFORMATION SECTION */}
            <div className="form-card">
              <div className="card-header">
                <i className="fas fa-user-circle" />
                <h3>
                  Personal Information <span className="step-badge">Step 1</span>
                </h3>
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="fullName">
                    <i className="fas fa-user" /> Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="name"
                    placeholder="e.g. Lakshmi Devi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="mobile">
                    <i className="fas fa-phone-alt" /> Mobile Number
                  </label>
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    placeholder="10-digit number"
                    pattern="[0-9]{10}"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="village_id">
                    <i className="fas fa-map-marker-alt" /> Village Name
                  </label>
                  <select
                    id="village_id"
                    name="village_id"
                    value={villageId}
                    onChange={(e) => setVillageId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select your village
                    </option>
                    {villagesLoading && (
                      <option value="" disabled>
                        Loading villages...
                      </option>
                    )}
                    {villagesError && (
                      <option value="" disabled>
                        Database connection error
                      </option>
                    )}
                    {!villagesLoading && !villagesError && villages.length === 0 && (
                      <option value="" disabled>
                        No villages available
                      </option>
                    )}
                    {villages.map((v) => {
                      const display = v.panchayath_name
                        ? `${v.village_name} (${v.panchayath_name})`
                        : v.village_name;
                      return (
                        <option key={v.id} value={v.id}>
                          {display}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="ward">
                    <i className="fas fa-hashtag" /> Ward Number{' '}
                    <span className="optional">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="ward"
                    name="ward_no"
                    placeholder="e.g. 7"
                    value={wardNo}
                    onChange={(e) => setWardNo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* COMPLAINT DETAILS SECTION */}
            <div className="form-card">
              <div className="card-header">
                <i className="fas fa-clipboard-list" />
                <h3>
                  Complaint Details <span className="step-badge">Step 2</span>
                </h3>
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="category">Complaint Category</label>
                  <select
                    id="category"
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="title">Complaint Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    placeholder="Short summary, e.g. Streetlight not working"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="input-group full-width">
                <div className="microphone-row">
                  <label htmlFor="description">
                    <i className="fas fa-edit" /> Detailed Description
                  </label>
                  <div className="voice-controls">
                    <select
                      id="voiceLanguageSelect"
                      className="voice-lang-select"
                      value={voiceLang}
                      disabled={!speechSupported || isListening}
                      onChange={(e) => setVoiceLang(e.target.value)}
                      aria-label="Voice input language"
                    >
                      <option value="en-IN">English (India)</option>
                      <option value="te-IN">తెలుగు (Telugu)</option>
                    </select>
                    <button
                      type="button"
                      id="micSpeechBtn"
                      className="mic-button"
                      disabled={!speechSupported}
                      style={{
                        opacity: speechSupported ? 1 : 0.5,
                        background: isListening ? '#c0392b' : '#1f6046',
                      }}
                      title={!speechSupported ? 'Speech not supported in this browser' : undefined}
                      onClick={handleSpeechClick}
                    >
                      <i className={isListening ? 'fas fa-stop-circle' : 'fas fa-microphone'} />{' '}
                      <span>{isListening ? 'Stop Listening' : 'Speak'}</span>
                    </button>
                  </div>
                </div>
                {!speechSupported && (
                  <p className="voice-hint warning">
                    Voice dictation is unavailable in this browser. You can type your complaint directly below.
                  </p>
                )}
                {voiceNotice && <p className="voice-hint">{voiceNotice}</p>}
                <textarea
                  id="description"
                  rows={4}
                  maxLength={1000}
                  name="description"
                  placeholder="Describe the issue, its exact location, and how long it has been a problem..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <div className="char-counter">
                  <span id="charCount">{description.length}</span> / 1000 Characters
                </div>
              </div>
            </div>

            {/* OPTIONAL MAP LOCATION SECTION */}
            <div className="form-card">
              <div className="card-header">
                <i className="fas fa-map-marked-alt" />
                <h3>
                  Pin Issue Location{' '}
                  <span className="step-badge optional-badge">Optional</span>
                </h3>
              </div>
              <ComplaintMapPicker
                latitude={latitude}
                longitude={longitude}
                locationSource={locationSource}
                onChange={({ latitude: lat, longitude: lng, locationSource: src }) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setLocationSource(src);
                }}
              />
            </div>

            {/* EVIDENCE UPLOAD SECTION */}
            <div className="form-card">
              <div className="card-header">
                <i className="fas fa-camera" />
                <h3>
                  Upload Evidence{' '}
                  <span className="step-badge optional-badge">Optional but helpful</span>
                </h3>
              </div>
              <div
                id="dropzone"
                className={`upload-area${dragOver ? ' drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer?.files) {
                    addFiles(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <div className="upload-icon">
                  <i className="fas fa-cloud-upload-alt" />
                </div>
                <div className="upload-text">Drag &amp; Drop Photos</div>
                <small className="upload-hint">Upload JPG, JPEG or PNG images</small>
                <button
                  type="button"
                  id="browseFilesBtn"
                  className="browse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="fileInput"
                  accept="image/jpeg,image/jpg,image/png"
                  multiple
                  hidden
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files || []));
                    e.target.value = '';
                  }}
                />
              </div>
              <div id="previewContainer" className="preview-list">
                {previews.map((src, idx) => (
                  <div key={src} className="preview-item">
                    <img src={src} alt={`Evidence preview ${idx + 1}`} className="preview-img" />
                    <button
                      type="button"
                      className="remove-preview"
                      onClick={() => removeFileAt(idx)}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SUBMIT SECTION */}
            <div className="form-card">
              <div className="card-header">
                <i className="fas fa-check-circle" />
                <h3>Review &amp; Submit</h3>
              </div>
              <div className="confirm-row">
                <input
                  type="checkbox"
                  id="confirmCheck"
                  checked={confirmCheck}
                  onChange={(e) => setConfirmCheck(e.target.checked)}
                  required
                />
                <label htmlFor="confirmCheck">
                  I confirm that the information provided is accurate.
                </label>
              </div>
              <div className="action-buttons">
                <button type="submit" className="btn-submit" disabled={submitting}>
                  <i className={submitting ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'} />{' '}
                  <span>{submitting ? 'Submitting...' : 'Register Complaint'}</span>
                </button>
                <button
                  type="button"
                  id="resetFormBtn"
                  className="btn-reset"
                  onClick={() => {
                    resetFormState();
                    showToast('Form has been reset', 1800);
                  }}
                >
                  <i className="fas fa-undo-alt" /> Reset Form
                </button>
              </div>
            </div>
          </form>

          {/* STATS PANEL */}
          <div className="stats-panel">
            <div className="stat-item">
              <i className="fas fa-lock" /> <span>Secure &amp; Private</span>
            </div>
            <div className="stat-item">
              <i className="fas fa-chart-line" /> <span>Real-Time Updates</span>
            </div>
            <div className="stat-item">
              <i className="fas fa-check-circle" /> <span>12,731 Issues Resolved</span>
            </div>
          </div>
        </div>

        {/* SUCCESS MODAL */}
        <div
          id="successModal"
          className="success-modal"
          style={{ display: submittedId ? 'flex' : 'none' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSubmittedId('');
            }
          }}
        >
          <div className="success-modal-content">
            <div className="success-icon">✅</div>
            <h2>Complaint Registered Successfully!</h2>
            <p>Your complaint has been submitted to the Panchayat.</p>
            <div className="complaint-id-box">
              <i className="fas fa-file-alt" />{' '}
              <span id="complaintIdDisplay">{submittedId}</span>
            </div>
            <button
              type="button"
              id="closeSuccessModal"
              className="btn-primary-modal"
              onClick={() => {
                setSubmittedId('');
                showToast('Thank you for raising your voice!', 2000);
              }}
            >
              Submit Another Complaint
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className="toast-msg"
          style={{
            display: 'block',
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '10px',
            fontSize: '14px',
            zIndex: 9999,
            maxWidth: '90%',
            textAlign: 'center',
            border: '1px solid rgba(125, 255, 106, 0.2)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

