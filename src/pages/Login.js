import React, { useState } from 'react';
import { auth, provider } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';


function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setLoading(true);
    setError(null);
    
    signInWithPopup(auth, provider)
      .then(async (result) => {
        const user = result.user;
        const basicUserData = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem('@userAnime', JSON.stringify(basicUserData));
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            await updateDoc(userDocRef, {
              lastLogin: new Date().toISOString()
            });
          } else {
            await setDoc(userDocRef, {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              favoriteAnimes: [],
              watchHistory: [],
              watchedAnimes: [],
              lastLogin: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Erro ao atualizar dados no Firestore:", error);
        }
        
        navigate('/profile');
      })
      .catch((error) => {
        console.error("Erro ao logar:", error);
        setError("Falha ao realizar login. Por favor, tente novamente.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body text-center">
              <h1 className="card-title mb-4">Login</h1>
              
              {error && (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              )}
              
              <p className="mb-4">Faça login para acompanhar seus animes favoritos e seu progresso de visualização.</p>
              
              <button 
                className="btn btn-primary btn-lg" 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processando...
                  </>
                ) : 'Login com Google'}
              </button>
              
              <div className="mt-3">
                <a href="/" className="btn btn-link">Voltar para a página inicial</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;