import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const [challengesOpen, setChallengesOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        <Link to="/" style={homeLinkStyle} className="navbar-link">Home</Link>
        <div style={dropdownContainerStyle}>
          <div style={dropdownStyle}>
            <button 
              style={dropdownButtonStyle} 
              onClick={() => setChallengesOpen(!challengesOpen)}
              className="navbar-link"
            >
              Challenges ▼
            </button>
            {challengesOpen && (
              <ul style={dropdownMenuStyle}>
                {[...Array(9)].reverse().map((_, index) => (
                  <li key={9 - index} style={liStyle}>
                    <Link to={`/Challenge${9 - index}`} style={linkStyle} className="navbar-link">Challenge {9 - index}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={dropdownStyle}>
            <button 
              style={dropdownButtonStyle} 
              onClick={() => setBonusOpen(!bonusOpen)}
              className="navbar-link"
            >
              Bonus Challenges ▼
            </button>
            {bonusOpen && (
              <ul style={dropdownMenuStyle}>
                {[2, 1].map((num) => (
                  <li key={`bonus${num}`} style={liStyle}>
                    <Link to={`/BonusChallenge${num}`} style={linkStyle} className="navbar-link">Bonus Challenge {num}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

const navStyle = {
  backgroundColor: '#0056b3',
  padding: '10px',
  boxShadow: '0 0 20px rgba(0, 86, 179, 0.2)',
  marginBottom: '20px',
};

const containerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  maxWidth: '100%',
  margin: '0 auto',
};

const dropdownContainerStyle = {
  display: 'flex',
  gap: '10px',
};

const dropdownStyle = {
  position: 'relative',
};

const dropdownButtonStyle = {
  backgroundColor: '#003d82',
  color: 'white',
  border: 'none',
  padding: '8px 15px',
  borderRadius: '4px',
  fontSize: '1em',
  cursor: 'pointer',
};

const dropdownMenuStyle = {
  position: 'absolute',
  top: '100%',
  right: 0,
  backgroundColor: '#0056b3',
  borderRadius: '4px',
  padding: '10px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  zIndex: 1,
};

const liStyle = {
  margin: '5px 0',
};

const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  padding: '8px 15px',
  borderRadius: '4px',
  fontSize: '1em',
  transition: 'background-color 0.3s ease',
  display: 'block',
  whiteSpace: 'nowrap',
};

const homeLinkStyle = {
  ...linkStyle,
  fontWeight: 'bold',
  fontSize: '1.1em',
  backgroundColor: '#003d82',
  display: 'inline-block',
};

// Add hover effect
const hoverStyle = `
  .navbar-link:hover {
    background-color: #003d82;
  }
`;

// Add style tag to the document head
const styleTag = document.createElement('style');
styleTag.type = 'text/css';
styleTag.appendChild(document.createTextNode(hoverStyle));
document.head.appendChild(styleTag);

export default Navbar;