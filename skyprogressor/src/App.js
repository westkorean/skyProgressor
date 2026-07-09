import Navbar from './Navbar';
import Home from './Home';

function App() {
  const TITLE = "skyProgressor";
  const DESC = "AI-powered Hypixel Skyblock Assistant";
  const SB_PROFILE = "https://sky.shiiyu.moe/stats/westkorean/Coconut#Gear";

  return (
    <div className="App">
      <Navbar />
      <div className="content">
        <Home />
        <h3>{DESC}</h3>
        
        <a href={SB_PROFILE}>My Profile</a>
      </div>
    </div>
  );
}

export default App;