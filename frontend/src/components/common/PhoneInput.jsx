import React, { useState, useEffect } from 'react';

/**
 * Indian Phone Input — +91 only
 * Accepts 10-digit Indian mobile numbers.
 * Outputs: "+91XXXXXXXXXX" (E.164 canonical)
 * Displays: "+91 XXXXX XXXXX" (formatted)
 */
export const PhoneInput = ({
  value = '',
  onChange,
  required = false,
  disabled = false,
  id,
  autoFocus = false,
  label,
  error: externalError,
}) => {
  const [digits, setDigits] = useState('');
  const [touched, setTouched] = useState(false);

  // Sync from external value (e.g. "+919876543210" → "9876543210")
  useEffect(() => {
    if (value) {
      const raw = String(value).replace(/\D/g, '');
      // Strip country code prefix "91" if 12 digits
      const national = raw.startsWith('91') && raw.length === 12 ? raw.slice(2) : raw.slice(-10);
      setDigits(national.slice(0, 10));
    } else {
      setDigits('');
    }
  }, [value]);

  const handleChange = (e) => {
    // Only allow digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setDigits(cleaned);
    // Emit E.164 canonical if complete, else empty
    if (onChange) {
      onChange(cleaned.length === 10 ? `+91${cleaned}` : '');
    }
  };

  // Format for display: 98765 43210
  const formatted = digits
    ? `${digits.slice(0, 5)}${digits.length > 5 ? ' ' + digits.slice(5) : ''}`
    : '';

  // Validation
  const isValid = digits.length === 10 && /^[6-9]/.test(digits);
  const showError = touched && digits.length > 0 && !isValid;
  const validationMsg =
    digits.length > 0 && !/^[6-9]/.test(digits)
      ? 'Must start with 6, 7, 8, or 9'
      : digits.length > 0 && digits.length < 10
      ? `${10 - digits.length} more digit${10 - digits.length > 1 ? 's' : ''} needed`
      : '';

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`flex items-stretch rounded-xl border transition-all overflow-hidden ${
          showError || externalError
            ? 'border-rose-400 ring-2 ring-rose-400/20'
            : digits.length === 10 && isValid
            ? 'border-emerald-400 ring-2 ring-emerald-400/20'
            : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
        }`}
      >
        {/* Country Badge */}
        <div className="flex items-center gap-1.5 px-3 bg-slate-50 border-r border-slate-200 select-none shrink-0">
          <span className="text-base leading-none">🇮🇳</span>
          <span className="text-xs font-bold text-slate-600 font-mono">+91</span>
        </div>

        {/* Number Input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          autoFocus={autoFocus}
          required={required}
          disabled={disabled}
          value={digits}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder="98765 43210"
          className="flex-1 text-sm pl-3 pr-4 py-2.5 outline-none bg-white font-mono tracking-widest text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal disabled:bg-slate-50 disabled:text-slate-400"
        />

        {/* Status icon */}
        {digits.length === 10 && (
          <div className="flex items-center pr-3">
            {isValid ? (
              <span className="text-emerald-500 text-base">✓</span>
            ) : (
              <span className="text-rose-400 text-base">✕</span>
            )}
          </div>
        )}
      </div>

      {/* Helper / error line */}
      {(showError || externalError) && (validationMsg || externalError) ? (
        <p className="text-[10px] text-rose-500 mt-1 ml-0.5 font-medium">
          {externalError || validationMsg}
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 mt-1 ml-0.5">
          {digits.length > 0
            ? `+91 ${formatted}`
            : 'Indian mobile number — 10 digits starting with 6–9'}
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
