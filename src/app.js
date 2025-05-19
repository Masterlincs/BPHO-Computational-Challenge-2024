import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar/Navbar';
import Challenge1 from './Challenge 1/Challenge1';
import Challenge2 from './Challenge 2/Challenge2';
import Challenge3 from './Challenge 3/Challenge3';
import Challenge4 from './Challenge 4/Challenge4';
import Challenge5 from './Challenge 5/Challenge5';
import Challenge6 from './Challenge 6/Challenge6';
import Challenge7 from './Challenge 7/Challenge7';
import Challenge8 from './Challenge 8/Challenge8';
import Challenge9 from './Challenge 9/Challenge9';
import BonusChallenge1 from './BonusChallenge1/BonusChallenge1';
import BonusChallenge2 from './BonusChallenge2/BonusChallenge2';


function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/Challenge1" element={<Challenge1 />} />
          <Route path="/Challenge2" element={<Challenge2 />} />
          <Route path="/Challenge3" element={<Challenge3 />} />
          <Route path="/Challenge4" element={<Challenge4 />} />
          <Route path="/Challenge5" element={<Challenge5 />} />
          <Route path="/Challenge6" element={<Challenge6 />} />
          <Route path="/Challenge7" element={<Challenge7 />} />
          <Route path="/Challenge8" element={<Challenge8 />} />
          <Route path="/Challenge9" element={<Challenge9 />} />
          <Route path="/BonusChallenge1" element={<BonusChallenge1 />} />
          <Route path="/BonusChallenge2" element={<BonusChallenge2 />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;