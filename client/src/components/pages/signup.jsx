import styles from '../styles/signup.module.css';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

function Signup() {
  const [data, setData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleChange = ({ currentTarget: input }) => {
    setData({ ...data, [input.name]: input.value });
  };

  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState('');

  const slides = [
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32">
            <g>
              <circle cx="16" cy="16" r="15" fill="#bfa14a22" />
              <path d="M16 7c-2.2 0-4 1.8-4 4v1h8v-1c0-2.2-1.8-4-4-4zm-6 7v11h2v-5h8v5h2V14H10zm4 2h4v2h-4v-2z" fill="#bfa14a" />
            </g>
          </svg>
          Create Your Cal AI Account
        </>
      ),
      subtitle: 'Start your personalized calorie and diet tracking plan in less than a minute.'
    },
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32">
            <g>
              <circle cx="16" cy="16" r="15" fill="#4f46e522" />
              <path d="M16 5l8 4v6c0 5.2-3.4 10-8 12-4.6-2-8-6.8-8-12V9l8-4zm0 3.2L10 11v4c0 4.1 2.5 7.7 6 9.4 3.5-1.7 6-5.3 6-9.4v-4l-6-2.8z" fill="#4f46e5" />
            </g>
          </svg>
          Adaptive AI Guidance
        </>
      ),
      subtitle: 'Receive goal-based meal and calorie targets that evolve with your progress.'
    },
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32">
            <g>
              <circle cx="16" cy="16" r="15" fill="#bfa14a22" />
              <path d="M7 18h18v2H7v-2zm3-5h12v2H10v-2zm-2 10h16v2H8v-2zm8-17c3.9 0 7 3.1 7 7h-2c0-2.8-2.2-5-5-5s-5 2.2-5 5H9c0-3.9 3.1-7 7-7z" fill="#bfa14a" />
            </g>
          </svg>
          Consistency Starts Here
        </>
      ),
      subtitle: 'Track meals, monitor macros, and build healthier habits one day at a time.'
    }
  ];

  const slen = slides.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slen);
    }, 4000);

    return () => clearInterval(interval);
  }, [slen]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data: res } = await api.post('/users', data);
      navigate('/login');
      console.log(res.message);
    } catch (apiError) {
      if (apiError.response) {
        setError(apiError.response.data.message);
      } else {
        setError('Unable to connect to server');
      }
    }
  };

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.alertContainer}>
          <div className={styles.alert}>
            <span>{error}</span>
            <button className={styles.alertClose} onClick={() => setError('')} type="button">
              x
            </button>
          </div>
        </div>
      )}

      <div className={styles.formContainer}>
        <div className={styles.slideContainer}>
          <div className={styles.brandPill}>Cal AI</div>
          <div className={styles.slideWrapper}>
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`${styles.slide} ${
                  index === currentSlide
                    ? styles.slideActive
                    : index < currentSlide
                    ? styles.slidePrev
                    : styles.slideNext
                }`}
              >
                <h2 className={styles.slideTitle}>{slide.title}</h2>
                <p className={styles.slideSubtitle}>{slide.subtitle}</p>
              </div>
            ))}
          </div>

          <div className={styles.dotsContainer}>
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`${styles.dot} ${index === currentSlide ? styles.dotActive : ''}`}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className={styles.form}>
          <h3 className={styles.formTitle}>
            <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28">
              <g>
                <circle cx="16" cy="16" r="15" fill="#bfa14a22" />
                <path d="M16 7c-2.2 0-4 1.8-4 4v1h8v-1c0-2.2-1.8-4-4-4zm-6 7v11h2v-5h8v5h2V14H10zm4 2h4v2h-4v-2z" fill="#bfa14a" />
              </g>
            </svg>
            Create your account
          </h3>

          <p className={styles.formIntro}>
            Build your profile to unlock your AI-based nutrition plan.
          </p>

          <form onSubmit={handleSubmit}>
            <div className={styles.nameRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>First name</label>
                <input
                  type="text"
                  className={styles.input}
                  name="firstName"
                  value={data.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Last name</label>
                <input
                  type="text"
                  className={styles.input}
                  name="lastName"
                  value={data.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email address</label>
              <input
                type="email"
                className={styles.input}
                name="email"
                value={data.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                name="password"
                value={data.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
              />
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkbox}>
                <input type="checkbox" required />
                <span>I agree to the Terms & Conditions</span>
              </label>
            </div>

            <button type="submit" className={styles.submitButton}>
              Create Account
            </button>
          </form>

          <div className={styles.divider}>or continue with</div>

          <div className={styles.socialLogin}>
            <button type="button" className={styles.socialBtn}>
              <div className={`${styles.socialIcon} ${styles.googleIcon}`}></div>
              Continue with Google
            </button>
          </div>

          <p className={styles.signupPrompt}>
            Already have an account?
            <Link to="/login" className={styles.signupLink}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
