import styles from '../styles/signup.module.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import {Link,useNavigate} from 'react-router-dom';

function Signup() {
  const[data,setData]=useState({
    firstName:"",
    lastName:"",
    email:"",
    password:""
  });
  const Navigate=useNavigate();

  const handleChange=({currentTarget:input}) =>{
    setData({...data,[input.name]:input.value});
  };

  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32"><g><ellipse cx="16" cy="16" rx="15" ry="15" fill="#bfa76a22"/><path d="M16 6c-3.866 0-7 3.134-7 7 0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4 0-3.866-3.134-7-7-7zm0 2c2.757 0 5 2.243 5 5 0 1.104-.896 2-2 2h-6c-1.104 0-2-.896-2-2 0-2.757 2.243-5 5-5zm-7 13c-2.21 0-4 1.79-4 4v1c0 1.104.896 2 2 2h18c1.104 0 2-.896 2-2v-1c0-2.21-1.79-4-4-4H9zm0 2h14c1.104 0 2 .896 2 2v1H7v-1c0-1.104.896-2 2-2z" fill="#bfa76a"/></g></svg>
          Register for Legal Assistance
        </>
      ),
      subtitle: "Create your judiciary account and access legal resources"
    },
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32"><g><ellipse cx="16" cy="16" rx="15" ry="15" fill="#bfa76a22"/><path d="M8 24v-2c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v2H8zm8-18c-3.866 0-7 3.134-7 7 0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4 0-3.866-3.134-7-7-7z" fill="#bfa76a"/></g></svg>
          Trusted Legal Community
        </>
      ),
      subtitle: "Join thousands who trust us for their legal needs"
    },
    {
      title: (
        <>
          <svg aria-hidden="true" viewBox="0 0 32 32" width="32" height="32"><g><ellipse cx="16" cy="16" rx="15" ry="15" fill="#bfa76a22"/><path d="M16 4c-6.627 0-12 5.373-12 12 0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S6 21.523 6 16 10.477 6 16 6zm-1 5v6l5 3 .75-1.23-4.25-2.52V11h-1z" fill="#bfa76a"/></g></svg>
          Your Legal Journey Begins
        </>
      ),
      subtitle: "Access powerful tools and features for your legal success"
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

  const[error,setError]=useState("");
  const handleSubmit = async(e) => {
    e.preventDefault();
    
    try{
      const url="http://localhost:5000/api/users";
      const {data:res} =await axios.post(url,data);
      Navigate("/login");
      console.log(res.message);
    } catch(error){
      if(error.response && 
        error.response.status >=400 &&
        error.response.status <=500
      ){
        setError(error.response.data.message);
      }
    }
    console.log('Signup submitted');
  };

  return (
    <div className={styles.container}>
        {error && (
          <div className={styles.alertContainer}>
            <div className={styles.alert}>
              <span>{error}</span>
              <button className={styles.alertClose} onClick={() => setError(null)}>
                ×
              </button>
            </div>
          </div>
        )}


      <div className={styles.formContainer}>
        <div className={styles.slideContainer}>
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
              />
            ))}
          </div>
        </div>

        <div className={styles.form}>
          <h3 className={styles.formTitle}>
            <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28" style={{marginRight:'0.5em',verticalAlign:'middle'}}><g><ellipse cx="16" cy="16" rx="15" ry="15" fill="#bfa76a22"/><path d="M16 6c-3.866 0-7 3.134-7 7 0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4 0-3.866-3.134-7-7-7zm0 2c2.757 0 5 2.243 5 5 0 1.104-.896 2-2 2h-6c-1.104 0-2-.896-2-2 0-2.757 2.243-5 5-5zm-7 13c-2.21 0-4 1.79-4 4v1c0 1.104.896 2 2 2h18c1.104 0 2-.896 2-2v-1c0-2.21-1.79-4-4-4H9zm0 2h14c1.104 0 2 .896 2 2v1H7v-1c0-1.104.896-2 2-2z" fill="#bfa76a"/></g></svg>
            Register for Legal Assistance
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                className={styles.input}
                name="firstName"
                value={data.firstName}
                onChange={handleChange}
                placeholder="First Name"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                className={styles.input}
                name="lastName"
                value={data.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
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
                <input type="checkbox" required />
                <span>I agree to the Terms & Conditions</span>
              </label>
            </div>
            
            <button type="submit" className={styles.submitButton}>
              Create Account
            </button>
          </form>

          <div className={styles.divider}>
            or continue with
          </div>

          <div className={styles.socialLogin}>
            <button type="button" className={styles.socialBtn}>
              <div className={`${styles.socialIcon} ${styles.googleIcon}`}></div>
              Continue with Google
            </button>
          </div>
          <p className={styles.signupPrompt}>
            Already have an account?{' '}
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