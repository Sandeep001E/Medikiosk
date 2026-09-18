import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation } from '../utils/translations';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('medikiosk_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.fullName !== 'Rajesh Sharma' && parsed.id !== 'pat-101') {
          return parsed;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [role, setRole] = useState(() => {
    return localStorage.getItem('medikiosk_role') || 'patient';
  });

  const [sarvamApiKey, setSarvamApiKey] = useState(() => {
    return localStorage.getItem('medikiosk_sarvam_key') || '';
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('medikiosk_gemini_key') || '';
  });

  // Dual Language State: UI display language vs Voice speech recognition language
  const [uiLanguage, setUiLanguageState] = useState(() => {
    return localStorage.getItem('medikiosk_ui_lang') || 'hi-IN';
  });

  const [voiceLanguage, setVoiceLanguageState] = useState(() => {
    return localStorage.getItem('medikiosk_voice_lang') || 'hi-IN';
  });

  const setUiLanguage = (lang) => {
    setUiLanguageState(lang);
    localStorage.setItem('medikiosk_ui_lang', lang);
  };

  const setVoiceLanguage = (lang) => {
    setVoiceLanguageState(lang);
    localStorage.setItem('medikiosk_voice_lang', lang);
  };

  // Translation helper function bound to active uiLanguage
  const t = (key, fallback = '') => getTranslation(uiLanguage, key, fallback);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('medikiosk_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('medikiosk_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('medikiosk_role', role);
  }, [role]);

  useEffect(() => {
    if (sarvamApiKey) {
      localStorage.setItem('medikiosk_sarvam_key', sarvamApiKey);
    } else {
      localStorage.removeItem('medikiosk_sarvam_key');
    }
  }, [sarvamApiKey]);

  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem('medikiosk_gemini_key', geminiApiKey);
    } else {
      localStorage.removeItem('medikiosk_gemini_key');
    }
  }, [geminiApiKey]);

  // ----------------------------------------------------
  // ACTIVE REPORTED PROBLEM STATE (3-Day Expiry & Manual Removal)
  // ----------------------------------------------------
  const [activeReportedProblem, setActiveReportedProblem] = useState(() => {
    const saved = localStorage.getItem('medikiosk_active_problem');
    if (!saved) {
      return null;
    }
    try {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.id === 'prob-401' || parsed.title?.includes('Fever & Severe Body Ache'))) {
        localStorage.removeItem('medikiosk_active_problem');
        return null;
      }
      if (parsed && parsed.timestamp) {
        const ageMs = Date.now() - new Date(parsed.timestamp).getTime();
        if (ageMs > 3 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem('medikiosk_active_problem');
          return null;
        }
      }
      return parsed;
    } catch (e) {
      return null;
    }
  });

  const updateActiveReportedProblem = (problem) => {
    if (!problem) {
      setActiveReportedProblem(null);
      localStorage.removeItem('medikiosk_active_problem');
      window.dispatchEvent(new CustomEvent('active-problem-updated', { detail: null }));
      return;
    }
    const updated = {
      ...problem,
      timestamp: problem.timestamp || new Date().toISOString()
    };
    setActiveReportedProblem(updated);
    localStorage.setItem('medikiosk_active_problem', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('active-problem-updated', { detail: updated }));
  };

  const removeActiveReportedProblem = () => {
    setActiveReportedProblem(null);
    localStorage.removeItem('medikiosk_active_problem');
    window.dispatchEvent(new CustomEvent('active-problem-updated', { detail: null }));
  };

  useEffect(() => {
    const checkExpiry = () => {
      const saved = localStorage.getItem('medikiosk_active_problem');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.timestamp) {
            const ageMs = Date.now() - new Date(parsed.timestamp).getTime();
            if (ageMs > 3 * 24 * 60 * 60 * 1000) {
              setActiveReportedProblem(null);
              localStorage.removeItem('medikiosk_active_problem');
            }
          }
        } catch (e) {}
      }
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, []);

  const loginPatient = (user) => {
    setCurrentUser(user);
    setRole('patient');
  };

  const loginDoctor = (doc) => {
    setCurrentUser(doc);
    setRole('doctor');
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveReportedProblem(null);
    localStorage.removeItem('medikiosk_user');
    localStorage.removeItem('medikiosk_active_problem');
  };

  const updatePatientProfile = (updatedData) => {
    setCurrentUser(prev => ({ ...prev, ...updatedData }));
  };

  const saveSarvamApiKey = (key) => {
    setSarvamApiKey(key);
  };

  const saveGeminiApiKey = (key) => {
    setGeminiApiKey(key);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      role,
      sarvamApiKey,
      geminiApiKey,
      uiLanguage,
      setUiLanguage,
      voiceLanguage,
      setVoiceLanguage,
      t,
      selectedLanguage: voiceLanguage, // Backwards-compatible alias
      setSelectedLanguage: (lang) => {
        setVoiceLanguage(lang);
      },
      activeReportedProblem,
      updateActiveReportedProblem,
      removeActiveReportedProblem,
      loginPatient,
      loginDoctor,
      logout,
      updatePatientProfile,
      saveSarvamApiKey,
      saveGeminiApiKey,
      setRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
