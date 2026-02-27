import React, { useState } from 'react';
import styles from '../styles/ResetPassword.module.css';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPasswordPage = () => {

  const navigate = useNavigate();
  const { id, token } = useParams();
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    axios.post(`http://localhost:5000/api/resetpassword/${id}/${token}`, { password: formData.newPassword})
    .then(res => {
      if (res.data.status === "success") {
        setIsLoading(false);
        setIsSuccess(true);
      } else {
        setError(res.data.message);
        setIsLoading(false);
      }
    })
    .catch(err => {
      setError(err.response?.data?.message || 'An error occurred');
      setIsLoading(false);
    });
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="16" cy="16" rx="15" ry="15" fill="#bfa76a22"/>
              <path d="M24 10l-8.5 8.5L8 14" stroke="#bfa76a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>Password Reset Successful!</h1>
          <p className={styles.subtitle}>
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <Link to="/login"
            className={styles.primaryButton}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28" style={{marginRight:'0.5em',verticalAlign:'middle'}}><g><ellipse cx="16" cy="16" rx="15" ry="15" fill="#bfa76a22"/><path d="M16 6c-3.866 0-7 3.134-7 7 0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4 0-3.866-3.134-7-7-7zm0 2c2.757 0 5 2.243 5 5 0 1.104-.896 2-2 2h-6c-1.104 0-2-.896-2-2 0-2.757 2.243-5 5-5zm-7 13c-2.21 0-4 1.79-4 4v1c0 1.104.896 2 2 2h18c1.104 0 2-.896 2-2v-1c0-2.21-1.79-4-4-4H9zm0 2h14c1.104 0 2 .896 2 2v1H7v-1c0-1.104.896-2 2-2z" fill="#bfa76a"/></g></svg>
          Set a New Secure Password
        </h1>
        <p className={styles.subtitle}>
          Enter your new password below to complete the reset process.
        </p>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="newPassword" className={styles.label}>
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.newPassword ? styles.inputError : ''}`}
              placeholder="Enter your new password"
            />
            {errors.newPassword && (
              <span className={styles.errorMessage}>{errors.newPassword}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              placeholder="Confirm your new password"
            />
            {errors.confirmPassword && (
              <span className={styles.errorMessage}>{errors.confirmPassword}</span>
            )}
          </div>

          <button 
            type="submit" 
            className={styles.primaryButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className={styles.loadingSpinner}></div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <button 
          className={styles.backLink}
          onClick={handleBackToLogin}
        >
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordPage;