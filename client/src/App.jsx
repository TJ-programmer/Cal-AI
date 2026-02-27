import './App.css';
import { useEffect, useState } from 'react';
import {Route,Routes,Navigate} from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Login from './components/pages/login.jsx';
import Signup from './components/pages/signup.jsx';
import ForgotPassword from './components/pages/ForgotPassword.jsx';
import ResetPassword from './components/pages/ResetPassword.jsx';
import HomePage from './components/pages/HomePage.jsx';

function App() {
  const user = localStorage.getItem("token");
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('page-fade-in');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('page-fade-out');
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === 'page-fade-out') {
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('page-fade-in');
      }, 180);

      return () => clearTimeout(timeout);
    }
  }, [transitionStage, location]);

  return (
    <div className={`route-shell ${transitionStage}`}>
      <Routes location={displayLocation}>
        <Route path="/" element={user ? <HomePage /> : <Navigate replace to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:id/:token" element={<ResetPassword />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </div>
  )
}

export default App
