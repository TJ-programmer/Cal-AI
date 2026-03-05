import { useRef, useState, useEffect } from 'react';
import api from '../api';
import styles from '../styles/home.module.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GOALS = {
  calories: 2200,
  protein: 140,
  carbs: 220,
  fat: 70
};

const buildDates = (centerDate) =>
  Array.from({ length: 15 }, (_, idx) => {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() - 7 + idx);
    return d;
  });

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const clampPercent = (value, max) => {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function HomePage() {
  const today = new Date();
  const [centerDate, setCenterDate] = useState(today);
  const [selected, setSelected] = useState(today);
  const [entries, setEntries] = useState([]);
  const [pendingReview, setPendingReview] = useState(null);
  const [busyMode, setBusyMode] = useState(null);
  const [error, setError] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  const mealInputRef = useRef(null);
  const workoutInputRef = useRef(null);
  const dates = buildDates(centerDate);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/logs');
      setEntries(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchCoachNotes = async (logs) => {
    if (logs.length === 0) {
      setCoachNotes('No logs for this date. Upload a photo or log a workout to get started.');
      return;
    }
    setLoadingNotes(true);
    setCoachNotes('Analyzing daily intake...');
    try {
      const response = await api.post('/vision/coach-notes', { logs });
      setCoachNotes(response.data.notes || 'Keep up the good work!');
    } catch (err) {
      console.error('Failed to get coach notes:', err);
      setCoachNotes('Could not load coach notes right now. Make sure you have Groq API configured.');
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (entries.length > 0) {
      const dayLogs = entries.filter((entry) => isSameDay(new Date(entry.createdAt), selected));
      fetchCoachNotes(dayLogs);
    }
  }, [entries, selected]);

  const goBack = () => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() - 15);
    setCenterDate(d);
    setSelected(d);
  };

  const goForward = () => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + 15);
    setCenterDate(d);
    setSelected(d);
  };

  const selectedDayEntries = entries.filter((entry) => isSameDay(new Date(entry.createdAt), selected));
  const mealEntries = selectedDayEntries.filter((entry) => entry.type === 'meal');
  const workoutEntries = selectedDayEntries.filter((entry) => entry.type === 'workout');

  const dayTotals = selectedDayEntries.reduce(
    (acc, entry) => {
      if (entry.type === 'meal') {
        acc.consumedCalories += entry.calories;
        acc.protein += entry.macronutrients ? entry.macronutrients.protein : (entry.micronutrients?.protein || 0);
        acc.carbs += entry.macronutrients ? entry.macronutrients.carbs : (entry.micronutrients?.carbs || 0);
        acc.fat += entry.macronutrients ? entry.macronutrients.fat : (entry.micronutrients?.fat || 0);
        acc.fiber += entry.micronutrients?.fiber || 0;
      } else {
        acc.burnedCalories += entry.calories;
      }
      return acc;
    },
    { consumedCalories: 0, burnedCalories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const netCalories = Math.max(0, dayTotals.consumedCalories - dayTotals.burnedCalories);

  const weeklySeries = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selected);
    date.setDate(selected.getDate() - (6 - index));
    const totalsForDay = entries
      .filter((entry) => isSameDay(new Date(entry.createdAt), date))
      .reduce(
        (acc, entry) => {
          if (entry.type === 'meal') {
            acc.netCalories += entry.calories;
            acc.protein += entry.macronutrients ? entry.macronutrients.protein : (entry.micronutrients?.protein || 0);
          } else {
            acc.netCalories -= entry.calories;
          }
          return acc;
        },
        { netCalories: 0, protein: 0 }
      );

    return {
      label: DAY_NAMES[date.getDay()],
      caloriesPct: clampPercent(Math.max(0, totalsForDay.netCalories), GOALS.calories),
      proteinPct: clampPercent(totalsForDay.protein, GOALS.protein)
    };
  });

  const triggerPicker = (type) => {
    setError('');
    const targetRef = type === 'meal' ? mealInputRef : workoutInputRef;
    targetRef.current?.click();
  };

  const handleFileSelect = async (mode, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Please choose a file under 10MB.');
      return;
    }

    try {
      setBusyMode(mode);
      setError('');
      const imageDataUrl = await fileToDataUrl(file);
      const { data } = await api.post('/vision/analyze', {
        mode,
        imageDataUrl
      });

      const normalized = {
        type: mode,
        itemName: data.itemName || (mode === 'meal' ? 'Meal' : 'Workout'),
        quantity: data.quantity || (mode === 'meal' ? '1 serving' : '30 min'),
        calories: toNumber(data.calories),
        macronutrients: {
          protein: toNumber(data.macronutrients?.protein),
          carbs: toNumber(data.macronutrients?.carbs),
          fat: toNumber(data.macronutrients?.fat)
        },
        micronutrients: {
          fiber: toNumber(data.micronutrients?.fiber)
        },
        notes: data.notes || '',
        confidence: toNumber(data.confidence),
        imagePreview: imageDataUrl
      };

      setPendingReview(normalized);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Could not analyze this image right now.');
    } finally {
      setBusyMode(null);
    }
  };

  const updatePendingField = (field, value) => {
    setPendingReview((prev) => ({ ...prev, [field]: value }));
  };

  const updatePendingMacro = (macro, value) => {
    setPendingReview((prev) => ({
      ...prev,
      macronutrients: {
        ...prev.macronutrients,
        [macro]: value
      }
    }));
  };

  const updatePendingMicro = (micro, value) => {
    setPendingReview((prev) => ({
      ...prev,
      micronutrients: {
        ...prev.micronutrients,
        [micro]: value
      }
    }));
  };

  const confirmEntry = async () => {
    if (!pendingReview) return;
    const loggedAt = new Date(selected);
    const now = new Date();
    loggedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const sanitized = {
      type: pendingReview.type,
      itemName: pendingReview.itemName.trim() || (pendingReview.type === 'meal' ? 'Meal' : 'Workout'),
      quantity: pendingReview.quantity.trim() || (pendingReview.type === 'meal' ? '1 serving' : '30 min'),
      calories: Math.max(0, toNumber(pendingReview.calories)),
      macronutrients: {
        protein: Math.max(0, toNumber(pendingReview.macronutrients.protein)),
        carbs: Math.max(0, toNumber(pendingReview.macronutrients.carbs)),
        fat: Math.max(0, toNumber(pendingReview.macronutrients.fat))
      },
      micronutrients: {
        fiber: Math.max(0, toNumber(pendingReview.micronutrients.fiber))
      },
      notes: pendingReview.notes.trim(),
      imagePreview: pendingReview.imagePreview || '',
      createdAt: loggedAt.toISOString()
    };

    try {
      const { data } = await api.post('/logs', sanitized);
      setEntries((prev) => [data, ...prev]);
    } catch (err) {
      console.error('Failed to save log to database', err);
      setError('Could not save the entry to database.');
    } finally {
      setPendingReview(null);
    }
  };

  const deleteLog = async (id) => {
    try {
      await api.delete(`/logs/${id}`);
      setEntries((prev) => prev.filter((entry) => (entry._id || entry.id) !== id));
    } catch (err) {
      console.error('Failed to delete log:', err);
      setError('Could not delete the log entry.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoWrap}>
            <span className={styles.logoIcon}>AI</span>
          </div>
          <div>
            <div className={styles.logoText}>Cal AI</div>
            <div className={styles.tagline}>Verified Calorie Tracking</div>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
          >
            Logout
          </button>
        </div>

        <div className={styles.dateControls}>
          <button type="button" className={styles.navBtn} onClick={goBack} aria-label="Previous 15 days">
            {'<'}
          </button>
          <div className={styles.dateStrip}>
            {dates.map((date) => {
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selected);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={`${styles.chip} ${isToday ? styles.chipToday : ''} ${isSelected ? styles.chipSelected : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <span className={styles.chipDow}>{DAY_NAMES[date.getDay()]}</span>
                  <span className={styles.chipNum}>{date.getDate()}</span>
                  {isToday && <span className={styles.chipDot} />}
                </button>
              );
            })}
          </div>
          <button type="button" className={styles.navBtn} onClick={goForward} aria-label="Next 15 days">
            {'>'}
          </button>
        </div>
      </header>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <main className={styles.layout}>
        <section className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Meal Photo Analysis</h2>
              <span className={`${styles.badge} ${styles.badgeOrange}`}>Vision</span>
            </div>
            <p className={styles.cardText}>
              Upload a food photo. Cal AI estimates calories and micronutrients, then you verify before adding.
            </p>
            <div className={styles.uploadBox}>
              <div className={styles.uploadIcon}>+</div>
              <div>
                <p className={styles.uploadTitle}>Food image</p>
                <p className={styles.uploadSub}>PNG/JPG up to 10MB</p>
              </div>
              <button className={styles.uploadBtn} type="button" onClick={() => triggerPicker('meal')} disabled={busyMode === 'meal'}>
                {busyMode === 'meal' ? 'Analyzing...' : 'Choose File'}
              </button>
            </div>
            <input
              ref={mealInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={(event) => handleFileSelect('meal', event)}
            />
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Workout Photo Analysis</h2>
              <span className={`${styles.badge} ${styles.badgeGray}`}>Vision</span>
            </div>
            <p className={styles.cardText}>
              Upload workout photos (gym, run, machine display). Calories burned are estimated and verified before logging.
            </p>
            <div className={styles.uploadBox}>
              <div className={styles.uploadIcon}>+</div>
              <div>
                <p className={styles.uploadTitle}>Workout image</p>
                <p className={styles.uploadSub}>PNG/JPG up to 10MB</p>
              </div>
              <button
                className={styles.uploadBtn}
                type="button"
                onClick={() => triggerPicker('workout')}
                disabled={busyMode === 'workout'}
              >
                {busyMode === 'workout' ? 'Analyzing...' : 'Choose File'}
              </button>
            </div>
            <input
              ref={workoutInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={(event) => handleFileSelect('workout', event)}
            />
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Coach Notes</h2>
              <span className={`${styles.badge} ${styles.badgeGray}`}>{selectedDayEntries.length} logs</span>
            </div>
            <ul className={styles.noteList}>
              <li>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--orange)' }}>AI Coach</strong>
                  {loadingNotes && <span className={styles.loadingSpinner}>...</span>}
                </div>
                {coachNotes || "Select a date to see your coach's insights."}
              </li>
            </ul>
          </div>
        </section>

        <section className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Daily Progress</h2>
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.dot} style={{ background: 'var(--orange)' }} />
                  Net Calories
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.dot} style={{ background: 'var(--amber)' }} />
                  Protein
                </span>
              </div>
            </div>
            <div className={styles.chartWrap}>
              <div className={styles.chartGrid}>
                {weeklySeries.map((bar) => (
                  <div key={`${bar.label}-${bar.caloriesPct}-${bar.proteinPct}`} className={styles.barGroup}>
                    <div className={styles.chartBar} style={{ height: `${bar.caloriesPct}%`, background: 'linear-gradient(180deg,#FF6B00,#FFAD6B)' }} />
                    <div className={styles.chartBar} style={{ height: `${bar.proteinPct}%`, background: 'linear-gradient(180deg,#FFB347,#FFD8A8)' }} />
                  </div>
                ))}
              </div>
              <div className={styles.chartFooter}>
                {weeklySeries.map((bar, idx) => (
                  <span key={`${bar.label}-${idx}`}>{bar.label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Verified Intake</h2>
              <span className={`${styles.badge} ${styles.badgeOrange}`}>Live</span>
            </div>
            <div className={styles.targets}>
              {[
                { label: 'Net Calories', value: `${Math.round(netCalories)} kcal`, pct: clampPercent(netCalories, GOALS.calories), color: 'var(--orange)' },
                { label: 'Protein', value: `${Math.round(dayTotals.protein)} g`, pct: clampPercent(dayTotals.protein, GOALS.protein), color: 'var(--amber)' },
                { label: 'Carbs', value: `${Math.round(dayTotals.carbs)} g`, pct: clampPercent(dayTotals.carbs, GOALS.carbs), color: '#ff8f40' },
                { label: 'Fat', value: `${Math.round(dayTotals.fat)} g`, pct: clampPercent(dayTotals.fat, GOALS.fat), color: '#f6b87a' }
              ].map(({ label, value, pct, color }) => (
                <div key={label} className={styles.targetItem}>
                  <div className={styles.targetMeta}>
                    <span className={styles.targetLabel}>{label}</span>
                    <span className={styles.targetVal}>{value}</span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className={styles.barPct}>{pct}% of goal</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Today&apos;s Verified Logs</h2>
              <span className={`${styles.badge} ${styles.badgeGray}`}>{selectedDayEntries.length} entries</span>
            </div>
            <div className={styles.logsList}>
              {selectedDayEntries.length === 0 && <p className={styles.emptyLogs}>Nothing added yet.</p>}
              {selectedDayEntries.map((entry) => (
                <div key={entry._id || entry.id} className={styles.logItem}>
                  {entry.imagePreview && (
                    <img src={entry.imagePreview} alt={entry.itemName} className={styles.logThumbnail} />
                  )}
                  <div className={styles.logMeta}>
                    <p className={styles.logTitle}>
                      {entry.itemName} <span className={styles.logType}>({entry.type})</span>
                    </p>
                    <p className={styles.logSub}>{entry.quantity}</p>
                  </div>
                  <div className={styles.logNumbers}>
                    <p>{Math.round(entry.calories)} kcal</p>
                    {entry.type === 'meal' ? (
                      <p>
                        P {Math.round(entry.macronutrients ? entry.macronutrients.protein : (entry.micronutrients?.protein || 0))}g | C {Math.round(entry.macronutrients ? entry.macronutrients.carbs : (entry.micronutrients?.carbs || 0))}g | F {Math.round(entry.macronutrients ? entry.macronutrients.fat : (entry.micronutrients?.fat || 0))}g
                      </p>
                    ) : (
                      <p>Calories burned</p>
                    )}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteLog(entry._id || entry.id)}
                    aria-label="Delete entry"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {pendingReview && (
        <div className={styles.reviewOverlay}>
          <div className={styles.reviewCard}>
            <h3 className={styles.reviewTitle}>Verify before adding</h3>
            <p className={styles.reviewText}>
              Review calories, quantity, and micronutrients for this {pendingReview.type} entry.
            </p>

            <div className={styles.reviewBody}>
              <img src={pendingReview.imagePreview} alt="To be analyzed" className={styles.reviewImage} />
              <div className={styles.reviewFields}>
                <label className={styles.field}>
                  Name
                  <input value={pendingReview.itemName} onChange={(e) => updatePendingField('itemName', e.target.value)} />
                </label>
                <label className={styles.field}>
                  Quantity
                  <input value={pendingReview.quantity} onChange={(e) => updatePendingField('quantity', e.target.value)} />
                </label>
                <label className={styles.field}>
                  Calories
                  <input
                    type="number"
                    min="0"
                    value={pendingReview.calories}
                    onChange={(e) => updatePendingField('calories', e.target.value)}
                  />
                </label>
                <div className={styles.macroGrid}>
                  <label className={styles.field}>
                    Protein (g)
                    <input
                      type="number"
                      min="0"
                      value={pendingReview.macronutrients.protein}
                      onChange={(e) => updatePendingMacro('protein', e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    Carbs (g)
                    <input
                      type="number"
                      min="0"
                      value={pendingReview.macronutrients.carbs}
                      onChange={(e) => updatePendingMacro('carbs', e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    Fat (g)
                    <input
                      type="number"
                      min="0"
                      value={pendingReview.macronutrients.fat}
                      onChange={(e) => updatePendingMacro('fat', e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    Fiber (g)
                    <input
                      type="number"
                      min="0"
                      value={pendingReview.micronutrients.fiber}
                      onChange={(e) => updatePendingMicro('fiber', e.target.value)}
                    />
                  </label>
                </div>
                {pendingReview.notes && <p className={styles.aiNote}>AI note: {pendingReview.notes}</p>}
              </div>
            </div>

            <div className={styles.reviewActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setPendingReview(null)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} onClick={confirmEntry}>
                Confirm and Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
