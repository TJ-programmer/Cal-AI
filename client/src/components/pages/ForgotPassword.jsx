import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from'../styles/ForgotPassword.module.css';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);
    axios.post('http://localhost:5000/api/forgot-password', { email })
    .then(res=>{
        if(res.data.status === "success"){
            setIsLoading(false);
            setIsSubmitted(true);
        }else{
            setError(res.data.message);
            setIsLoading(false);
        }
    })
    .catch(err=>{
        setError(err.response.data.message);
        setIsLoading(false);
    })
    
  };

  const handleBackToLogin = () => {
    setIsSubmitted(false);
    setEmail('');
    setError('');
  };

  if (isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successMessage}>
            Success: Password reset link sent.
          </div>
          <h1 className={styles.title}>Check Your Email</h1>
          <p className={styles.subtitle}>
            We've sent a password reset link to <strong>{email}</strong>. 
            Please check your inbox and follow the instructions to reset your password.
          </p>
          <p className={`${styles.subtitle} ${styles.successSubtitle}`}>
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <button
            onClick={handleBackToLogin}
            className={styles.button}
          >
            Try Again
          </button>
          <Link to="/login" className={styles.backLink}>
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28" style={{marginRight:'0.5em',verticalAlign:'middle'}}><g><ellipse cx="16" cy="16" rx="15" ry="15" fill="#F9731622"/><path d="M16 6c-3.866 0-7 3.134-7 7 0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4 0-3.866-3.134-7-7-7zm0 2c2.757 0 5 2.243 5 5 0 1.104-.896 2-2 2h-6c-1.104 0-2-.896-2-2 0-2.757 2.243-5 5-5zm-7 13c-2.21 0-4 1.79-4 4v1c0 1.104.896 2 2 2h18c1.104 0 2-.896 2-2v-1c0-2.21-1.79-4-4-4H9zm0 2h14c1.104 0 2 .896 2 2v1H7v-1c0-1.104.896-2 2-2z" fill="#F97316"/></g></svg>
          Recover Access to Your Cal AI Account
        </h1>
        <p className={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your email address"
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              disabled={isLoading}
            />
            {error && <div className={styles.errorMessage}>{error}</div>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>

        <Link to="/login" className={styles.backLink}>
          &larr; Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
