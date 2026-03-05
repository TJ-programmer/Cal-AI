import styles from '../styles/login.module.css';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function Login() {
  const [data, setData] = useState({
    email: '',
    password: ''
  });

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
              <circle cx="16" cy="16" r="15" fill="#F9731622" />
              <path d="M16 7c-2.2 0-4 1.8-4 4v1h8v-1c0-2.2-1.8-4-4-4zm-6 7v11h2v-5h8v5h2V14H10zm4 2h4v2h-4v-2z" fill="#F97316" />
            </g>
          </svg>
          Welcome Back to Cal AI
        </>
      ),
      subtitle: 'Track your calories, meals, and body goals in one focused AI dashboard.'
    },
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32">
            <g>
              <circle cx="16" cy="16" r="15" fill="#6366F122" />
              <path d="M16 5l8 4v6c0 5.2-3.4 10-8 12-4.6-2-8-6.8-8-12V9l8-4zm0 3.2L10 11v4c0 4.1 2.5 7.7 6 9.4 3.5-1.7 6-5.3 6-9.4v-4l-6-2.8z" fill="#6366F1" />
            </g>
          </svg>
          AI Plans Tailored to You
        </>
      ),
      subtitle: 'Get dynamic calorie and diet recommendations that adapt as your progress changes.'
    },
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32">
            <g>
              <circle cx="16" cy="16" r="15" fill="#F9731622" />
              <path d="M7 18h18v2H7v-2zm3-5h12v2H10v-2zm-2 10h16v2H8v-2zm8-17c3.9 0 7 3.1 7 7h-2c0-2.8-2.2-5-5-5s-5 2.2-5 5H9c0-3.9 3.1-7 7-7z" fill="#F97316" />
            </g>
          </svg>
          Build Consistency Daily
        </>
      ),
      subtitle: 'Log food quickly, monitor macro balance, and keep your routine on track every day.'
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
      const { data: res } = await api.post('/auth', data);
      localStorage.setItem('token', res.data);
      window.location = '/';
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
                <circle cx="16" cy="16" r="15" fill="#F9731622" />
                <path d="M16 7c-2.2 0-4 1.8-4 4v1h8v-1c0-2.2-1.8-4-4-4zm-6 7v11h2v-5h8v5h2V14H10zm4 2h4v2h-4v-2z" fill="#F97316" />
              </g>
            </svg>
            Sign in to Cal AI
          </h3>

          <p className={styles.formIntro}>
            Continue to your personalized calorie and diet plan.
          </p>

          <form onSubmit={handleSubmit}>
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
                placeholder="Enter your password"
                required
              />
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className={styles.forgotPassword}>
                Forgot password?
              </Link>
            </div>

            <button className={styles.submitButton}>Continue</button>
          </form>

          <div className={styles.divider}>or continue with</div>

          <div className={styles.socialLogin}>
            <button type="button" className={styles.socialBtn}>
              <div className={`${styles.socialIcon} ${styles.googleIcon}`}></div>
              Continue with Google
            </button>
          </div>

          <p className={styles.signupPrompt}>
            Don&apos;t have an account?
            <Link to="/signup" className={styles.signupLink}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

