import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'animate.css';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Rodape from './components/Rodape';
import Home from './pages/Home';
import AnimeDetails from './pages/AnimeDetails';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Chat from './pages/Chat';

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/anime/:id" element={<AnimeDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:chatId" element={<Chat />} />
          </Routes>
        </main>
        <Rodape />
        
      </div>
    </Router>
  );
}

export default App;