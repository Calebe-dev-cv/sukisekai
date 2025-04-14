import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { Navbar, Nav, Container, Image, Button, Dropdown } from 'react-bootstrap';
import { PersonCircle, Heart, ClockHistory, BoxArrowRight, ChatDots, Book } from 'react-bootstrap-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';


function Header() {
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userData = localStorage.getItem('@userAnime');
        let userObj = null;

        if (userData) {
          userObj = JSON.parse(userData);
        } else {
          userObj = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Usuário',
            photoURL: null
          };
        }

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {

            if (userDoc.data().photoURL) {
              userObj.photoURL = userDoc.data().photoURL;
            }


            if (userDoc.data().displayName) {
              userObj.displayName = userDoc.data().displayName;
            }
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
        }

        setUser(userObj);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleProfileClick = (tab = 'profile') => {
    navigate(`/profile?tab=${tab}`);
    localStorage.setItem('@activeTab', tab);
    setExpanded(false);
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      localStorage.removeItem('@userAnime');

      setExpanded(false);
      navigate('/');
    }).catch((error) => {
      console.error("Erro ao fazer logout:", error);
    });
  };

  const isActive = (path) => {
    return location.pathname === path;
  };


  return (
    <Navbar
      bg="dark"
      variant="dark"
      expand="lg"
      className="shadow-sm sticky-top"
      expanded={expanded}
      onToggle={setExpanded}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <span style={{ fontFamily: 'Dancing Script, cursive', fontSize: '30px', color: "#74dcff" }}>
            Suki Sekai
          </span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="navbar-nav" />

        <Navbar.Collapse id="navbar-nav">
          <Nav className="me-auto">
            <Nav.Link
              as={Link}
              to="/"
              onClick={() => setExpanded(false)}
              className={` d-flex align-items-center justify-content-center px-3 py-2 ${isActive('/') ? 'active' : ''}`}
            >
              Explorar Animes
            </Nav.Link>

            {user && (
              <>
                <Nav.Link
                  as={Button}
                  variant="link"
                  className="text-white text-decoration-none px-3 py-2"
                  onClick={() => handleProfileClick('favorites')}
                >
                  <Heart className="me-1 d-none d-md-inline" />
                  Favoritos
                </Nav.Link>

                <Nav.Link
                  as={Button}
                  variant="link"
                  className="text-white text-decoration-none px-3 py-2"
                  onClick={() => handleProfileClick('history')}
                >
                  <ClockHistory className="me-1 d-none d-md-inline" />
                  Histórico
                </Nav.Link>
              </>
            )}



          </Nav>

          <Nav>
            <Nav.Link
              as={Link}
              to="/chat"
              onClick={() => setExpanded(false)}
              className={` d-flex align-items-center justify-content-center px-3 py-2 ${isActive('/chat') ? 'active' : ''}`}
            >
              <ChatDots className=" me-1 d-none d-md-inline" />
              Chat Suki
            </Nav.Link>

            {user ? (
              <Dropdown align="end">
                <Dropdown.Toggle
                  as={Button}
                  variant="transparent"
                  className="d-flex align-items-center text-white border-0"
                  id="user-dropdown"
                >
                  {user.photoURL ? (
                    <Image
                      src={`/foto_perfil/${user.photoURL}`}
                      alt={user.displayName}
                      roundedCircle
                      width="32"
                      height="32"
                      className="me-2 border border-2 border-light"
                      style={{ objectFit: 'cover' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = '/foto_perfil/padrao.jpg' }}
                    />
                  ) : (
                    <Image
                      src="/foto_perfil/padrao.jpg"
                      alt={user.displayName}
                      roundedCircle
                      width="32"
                      height="32"
                      className="me-2 border border-2 border-light"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                  <span className="d-none d-md-inline">{user.displayName}</span>
                </Dropdown.Toggle>

                <Dropdown.Menu className="shadow-lg border-0 mt-2 animate__animated animate__fadeIn">
                  <Dropdown.Item onClick={() => handleProfileClick('profile')}>
                    <PersonCircle className="me-2" /> Meu Perfil
                  </Dropdown.Item>

                  <Dropdown.Item onClick={() => handleProfileClick('favorites')}>
                    <Heart className="me-2" />  Favoritos
                  </Dropdown.Item>

                  <Dropdown.Item onClick={() => handleProfileClick('history')}>
                    <ClockHistory className="me-2" /> Histórico 
                  </Dropdown.Item>

                  <Dropdown.Divider />

                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <BoxArrowRight className="me-2" /> Sair
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Button
                variant="outline-light"
                as={Link}
                to="/login"
                className="rounded-pill px-4"
                onClick={() => setExpanded(false)}
              >
                Login
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;