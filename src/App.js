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
import MangasHome from './pages/MangaHome';
import MangaDetails from './pages/MangaDetails';
import ChapterReader from './pages/ChapterReader';

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
            <Route path="/mangas" element={<MangasHome />} />
            <Route path="/manga/:id" element={<MangaDetails />} />
            <Route path="/manga/:id/chapter/:chapterId" element={<ChapterReader />} />
          </Routes>
        </main>
        <Rodape />
        
      </div>
    </Router>
  );
}

export default App;