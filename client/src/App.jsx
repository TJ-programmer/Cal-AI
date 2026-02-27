import './App.css';
import {Route,Routes,Navigate} from 'react-router-dom';
import Login from './components/pages/login.jsx';
import Signup from './components/pages/signup.jsx';
import ForgotPassword from './components/pages/ForgotPassword.jsx';
import ResetPassword from './components/pages/ResetPassword.jsx';
import HomePage from './components/pages/HomePage.jsx';

function App() {
  const user = localStorage.getItem("token");

  return (
    <Routes>
      <Route path="/" element={user ? <HomePage /> : <Navigate replace to="/login" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:id/:token" element={<ResetPassword />} />
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
